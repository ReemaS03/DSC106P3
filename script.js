let data = [];
let xScale, yScale;

// Choose which EXAM and BIOMETRIC
let selectedExam = "Final"; 
let selectedBiometric = "Final_HR";  
let selectedBiometricDisplay = "Average Heart Rate"; 

const allExams = ["Midterm1", "Midterm2", "Final"];
const allBiometrics = ["HR", "TEMP", "EDA", "BVP", "IBI"];
const formatExamName = (exam) => exam.replace(/(\D+)(\d+)/, "$1 $2"); 
const biometricDisplayMap = {
    "HR": "Average Heart Rate",
    "TEMP": "Average Temperature (°C)",
    "EDA": "Average Electrodermal Activity (μS)",
    "BVP": "Average Blood Volume Pulse",
    "IBI": "Average Inter-Beat Interval Duration (seconds)"
};

async function loadData() {
    data = await d3.csv('Data/stress_data.csv', d3.autoType);
    console.log("Loaded Data:", data); 
    createDropdowns(); 
    createScatterplot();
}

document.addEventListener('DOMContentLoaded', loadData);


function createDropdowns() {
    const plotContainer = d3.select("#plotContainer");
    let dropdownWrapper = plotContainer.select("#dropdownWrapper");

    if (dropdownWrapper.empty()) {
        dropdownWrapper = plotContainer.append("div")
            .attr("id", "dropdownWrapper");
    }

    // Remove previous dropdowns
    dropdownWrapper.html("");

    // Exam Dropdown
    const examGroup = dropdownWrapper.append("div").attr("class", "dropdown-group");
    examGroup.append("label").attr("for", "examDropdown").text("Exam (X-axis)");
    const examDropdown = examGroup.append("select").attr("id", "examDropdown");

    examDropdown.selectAll("option")
        .data(allExams)
        .enter()
        .append("option")
        .text(d => formatExamName(d))
        .attr("value", d => d)
        .property("selected", d => d === "Final");

    // Biometric Dropdown
    const biometricGroup = dropdownWrapper.append("div").attr("class", "dropdown-group");
    biometricGroup.append("label").attr("for", "biometricDropdown").text("Biometric (Y-axis)");
    const biometricDropdown = biometricGroup.append("select").attr("id", "biometricDropdown");

    biometricDropdown.selectAll("option")
        .data(allBiometrics)
        .enter()
        .append("option")
        .text(d => d)
        .attr("value", d => d)
        .property("selected", d => d === "HR");

    // Event Listeners
    examDropdown.on("change", function () {
        selectedExam = this.value;
        selectedBiometric = `${selectedExam}_${biometricDropdown.node().value}`;
        updateChart();
    });

    biometricDropdown.on("change", function () {
        selectedBiometric = `${selectedExam}_${this.value}`;
        selectedBiometricDisplay = biometricDisplayMap[this.value];
        updateChart();
    });
}

// Update the Scatterplot
function updateChart() {
    d3.select("svg").remove();  
    createScatterplot();  
}

function createScatterplot() {
    const width = 900; 
    const height = 600;
    
    const svg = d3
        .select('#chart')
        .append('svg')
        .attr('preserveAspectRatio', 'xMinYMin meet')  
        .attr('viewBox', `0 0 ${width + 250} ${height}`);


    // X-axis: Biometric 
    xScale = d3
        .scaleLinear()
        .domain(d3.extent(data, d => d[selectedBiometric]))
        .range([50, width - 50])
        .nice();

    // Y-axis: Exam Grade
    const selectedExamGrade = `${selectedExam}_Grade`;
    yScale = d3
        .scaleLinear()
        .domain([0, 100]) 
        .range([height - 50, 50])
        .nice();

    const xData = data.map(d => d[selectedBiometric]); 
    const yData = data.map(d => d[selectedExamGrade]); 
    const rValue = calculatePearsonCorrelation(xData, yData);

    // Display the correlation value above the plot
    svg.append("text")
        .attr("class", "r-value-label")
        .attr("x", width - 20) 
        .attr("y", 20) 
        .attr("text-anchor", "end")
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .style("fill", "black")
        .text(`${formatExamName(selectedExam)} & ${selectedBiometricDisplay} Correlation: r = ${rValue.toFixed(2)}`);

    // Generate correlation values for all possible exam-biometric pairs
    const allRValues = calculateAllCorrelations(data);

    // Append legend group
    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width + 20}, 50)`);

        legend.append("text")
        .attr("y", 0)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .selectAll("tspan")
        .data(["Biometric Correlations", "From Most Positive", "to Most Negative"])
        .enter()
        .append("tspan")
        .attr("x", 90)  
        .attr("dy", (d, i) => i === 0 ? 0 : 18) 
        .text(d => d);
    
        const legendData = allRValues
            .map(({ exam, biometric, r }) => ({
                color: (exam === selectedExam && `${exam}_${biometric}` === selectedBiometric) ? "steelblue" : "gray",
                text: `${formatExamName(exam)} & ${biometric} (r = ${r.toFixed(2)})`,
                r: r  
            }))
            .sort((a, b) => b.r - a.r);


    legend.selectAll("legend-dots")
        .data(legendData)
        .enter()
        .append("circle")
        .attr("cx", 0)
        .attr("cy", (d, i) => (i + 2) * 30) 
        .attr("r", 8)
        .style("fill", d => d.color);

    legend.selectAll("legend-text")
        .data(legendData)
        .enter()
        .append("text")
        .attr("x", 15)
        .attr("y", (d, i) => (i + 2) * 30 + 5)
        .style("font-size", "14px")
        .text(d => d.text);

    // Add grid lines
    svg.append('g')
        .attr('class', 'grid')
        .attr('transform', `translate(50, 0)`)
        .call(d3.axisLeft(yScale).tickSize(-width + 100).tickFormat(''));

    // Add scatter plot points
    const dots = svg.append('g').attr('class', 'dots');

    dots
        .selectAll('circle')
        .data(data)
        .join('circle')
        .attr('cx', d => xScale(d[selectedBiometric]))
        .attr('cy', d => yScale(d[selectedExamGrade]))
        .attr('fill', 'steelblue')
        .attr('r', 8)
        .style('fill-opacity', 0.7)
        .on('mouseenter', (event, d) => {
            updateTooltipContent(d);
            updateTooltipVisibility(true);
            updateTooltipPosition(event);
        })
        .on('mouseleave', () => {
            updateTooltipVisibility(false);
        });

    // X axis
    svg.append('g')
        .attr('transform', `translate(0, ${height - 50})`)
        .call(d3.axisBottom(xScale))
        .append('text')
        .attr('x', width / 2)
        .attr('y', 40)
        .attr('fill', 'black')
        .attr('text-anchor', 'middle')
        .text(selectedBiometricDisplay);

    // Y axis
    svg.append('g')
        .attr('transform', `translate(50, 0)`)
        .call(d3.axisLeft(yScale).tickValues(d3.range(0, 110, 10)))
        .append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -height / 2)
        .attr('y', -40)
        .attr('fill', 'black')
        .attr('text-anchor', 'middle')
        .text(`${formatExamName(selectedExam)} Grade`);

    addTrendLine(svg, xScale, yScale, xData, yData);
}

// Compute Pearson correlation coefficient
function calculatePearsonCorrelation(xData, yData) {
    const n = xData.length;
    const meanX = d3.mean(xData);
    const meanY = d3.mean(yData);

    const numerator = d3.sum(xData.map((x, i) => (x - meanX) * (yData[i] - meanY)));
    const denominator = Math.sqrt(
        d3.sum(xData.map(x => (x - meanX) ** 2)) *
        d3.sum(yData.map(y => (y - meanY) ** 2))
    );

    return denominator === 0 ? 0 : numerator / denominator;
}

// Compute all correlations
function calculateAllCorrelations(data) {
    let results = [];
    allExams.forEach(exam => {
        allBiometrics.forEach(biometric => {
            const examGrade = `${exam}_Grade`;
            const biometricCol = `${exam}_${biometric}`;

            if (data[0][biometricCol] !== undefined) {
                const xData = data.map(d => d[biometricCol]);
                const yData = data.map(d => d[examGrade]);
                const rValue = calculatePearsonCorrelation(xData, yData);
                results.push({ exam, biometric, r: rValue });
            }
        });
    });
    return results;
}

// Add trend line
function addTrendLine(svg, xScale, yScale, xData, yData) {
    const xMean = d3.mean(xData);
    const yMean = d3.mean(yData);
    const slope =
        d3.sum(xData.map((x, i) => (x - xMean) * (yData[i] - yMean))) /
        d3.sum(xData.map(x => (x - xMean) ** 2));
    const intercept = yMean - slope * xMean;

    const xMin = d3.min(xData);
    const xMax = d3.max(xData);
    const yMin = slope * xMin + intercept;
    const yMax = slope * xMax + intercept;

    svg.append('line')
        .attr('x1', xScale(xMin))
        .attr('y1', yScale(yMin))
        .attr('x2', xScale(xMax))
        .attr('y2', yScale(yMax))
        .attr('stroke', 'red')
        .attr('stroke-width', 2);
}

// Tooltip Functions
function updateTooltipContent(d) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.innerHTML = `
        <dt>Student ID</dt><dd>${d.Student_ID}</dd>
        <dt>${selectedExam} Grade</dt><dd>${d[`${selectedExam}_Grade`]}</dd>
        <dt>${selectedBiometricDisplay}</dt><dd>${d[selectedBiometric].toFixed(3)}</dd>
    `;
}

function updateTooltipVisibility(isVisible) {
    document.getElementById('commit-tooltip').hidden = !isVisible;
}

function updateTooltipPosition(event) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.style.left = `${event.clientX}px`;
    tooltip.style.top = `${event.clientY}px`;
}



document.addEventListener("DOMContentLoaded", function () {
    let step = 0;
    const introText = d3.select("#introText");
    const nextButton = d3.select("#nextButton");
    const overlay = d3.select("#overlay");
    const plotContainer = d3.select("#plotContainer");
    const siteTitle = d3.select("#siteTitle");
    const doneButton = d3.select("#doneButton"); 

    function showNextButton() {
        nextButton.transition().duration(500).style("opacity", 1).style("display", "block");
    }

    function hideNextButton() {
        nextButton.style("opacity", 0).style("display", "none");
    }

    function nextStep() {
        step++;
        hideNextButton();
        introText.html(""); 
    
        switch (step) {
            case 1:
                introText.html("Can a single biometric measure predict your exam grade?")
                         .style("opacity", 0)
                         .transition().duration(50).style("opacity", 1)
                         .on("end", showNextButton);
                break;
    
            case 2:
                introText.transition().duration(200).style("opacity", 0)
                         .on("end", function() {
                             introText.html("For example, some believe that a lower heart rate means better exam performance.")
                                      .style("opacity", 0)
                                      .transition().duration(1000).style("opacity", 1)
                                      .on("end", showNextButton);
                         });
                break;
    
            case 3:
                introText.transition().duration(200).style("opacity", 0)
                         .on("end", function() {
                             introText.html("That sounds too good to be true…")
                                      .style("opacity", 0)
                                      .transition().duration(1000).style("opacity", 1);
    
                             setTimeout(() => {
                                 introText.html("That sounds too good to be true… <br><br> But let’s explore the data ourselves!")
                                          .style("opacity", 0)
                                          .transition().duration(1000).style("opacity", 1)
                                          .on("end", showNextButton);
                             }, 1500);
                         });
                break;
    
            case 4:
                introText.transition().duration(200).style("opacity", 0)
                         .on("end", function() {
                             introText.html("You can explore the relationship between exam grades and biometrics.")
                                      .style("opacity", 0)
                                      .transition().duration(1000).style("opacity", 1);
    
                             setTimeout(() => {
                                 introText.html("You can explore the relationship between exam grades and biometrics.<br><br> We have data from 10 students, across 3 exams and 5 biometric measures.")
                                          .style("opacity", 0)
                                          .transition().duration(1000).style("opacity", 1);
                             }, 1500);
    
                             setTimeout(() => {
                                 introText.html("You can explore the relationship between exam grades and biometrics.<br><br> We have data from 10 students, across 3 exams and 5 biometric measures.<br><br> Although a larger sample would be ideal for strong conclusions, <br><br> this dataset allows us to observe patterns and think critically about these relationships.")
                                          .style("opacity", 0)
                                          .transition().duration(1000).style("opacity", 1)
                                          .on("end", showNextButton);
                             }, 3000);
                         });
                break;
    
            case 5:  
                introText.transition().duration(200).style("opacity", 0)
                         .on("end", function() {
                             d3.select("#overlay").transition().duration(500).style("opacity", 0)
                                .on("end", function() {
                                    d3.select("#overlay").style("display", "none");
                                    d3.select("#siteTitle").style("display", "block");
                                    d3.select("#plotContainer").transition().duration(500).style("opacity", 1).style("display", "block");
                                    setTimeout(() => {
                                        d3.select("#doneButton")
                                            .style("display", "block")
                                            .transition().duration(1000).style("opacity", 1);
                                    }, 1000);
                                });
                         });
                break;
        }
    }
    

    // Click for "Next" button
    nextButton.on("click", nextStep);

    // Full-Screen Prompt Buttons
    d3.select("#enterFullScreen").on("click", function () {
        document.documentElement.requestFullscreen();
        d3.select("#fullScreenPrompt").style("display", "none");
        nextStep();
    });

    d3.select("#skipFullScreen").on("click", function () {
        d3.select("#fullScreenPrompt").style("display", "none"); 
        nextStep(); 
    });
    

    d3.select("#skipToPlot").on("click", function () {
        d3.select("#fullScreenPrompt").style("display", "none"); 
        d3.select("#overlay").style("display", "none");  
        d3.select("#siteTitle").style("display", "block");  
        d3.select("#plotContainer").transition().duration(500).style("opacity", 1).style("display", "block");
    
        // Allow scrolling
        document.body.style.overflow = "auto";  
        document.documentElement.style.overflow = "auto";  
    
        // Ensure "I'm Done" button appears after 1 sec
        setTimeout(() => {
            d3.select("#doneButton").style("display", "block")
                .transition().duration(1000).style("opacity", 1);
        }, 1000);
    });
    

    doneButton.on("click", showConclusionScreen);
});

// Show Conclusion
function showConclusionScreen() {
    d3.select("#plotContainer").style("display", "none");
    d3.select("#doneButton").style("display", "none");
    d3.select("#conclusionOverlay").style("display", "block").style("opacity", 0)
        .transition().duration(1000).style("opacity", 1);
}

// "Try Again" button: returns user to the plot
d3.select("#tryAgainButton").on("click", function () {
    d3.select("#conclusionOverlay").style("display", "none");
    d3.select("#plotContainer").style("display", "block");
    d3.select("#doneButton").style("display", "block");
});

// "Start Over" button: restarts the entire experience
d3.select("#startOverButton").on("click", function () {
    location.reload(); 
});

document.getElementById("writeupButton").addEventListener("click", function () {
    d3.select("#conclusionOverlay").style("display", "none");
    d3.select("#writeupSection").style("display", "block");
});

document.getElementById("backToConclusion").addEventListener("click", function () {
    d3.select("#writeupSection").style("display", "none");
    d3.select("#conclusionOverlay").style("display", "block");
});

document.getElementById("startOverButton2").addEventListener("click", function () {
    location.reload();
});
