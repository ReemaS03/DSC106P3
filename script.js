let data = [];
let xScale, yScale;

// Choose which EXAM and BIOMETRIC to analyze
const selectedExam = "Final"; // Options: "Midterm1", "Midterm2", "Final"
const selectedBiometric = "Final_HR";  // The column name in the CSV
const selectedBiometricDisplay = "Heart Rate";  // How it appears in the UI

async function loadData() {
    data = await d3.csv('Data/stress_data.csv', d3.autoType);
    console.log("Loaded Data:", data); // Debugging

    createScatterplot();
}

document.addEventListener('DOMContentLoaded', loadData);

function createScatterplot() {
    const width = 900; // Adjusted to make space for the legend
    const height = 600;
    
    const svg = d3
        .select('#chart')
        .append('svg')
        .attr('viewBox', `0 0 ${width + 200} ${height}`) // Extra space for legend
        .style('overflow', 'visible');

    // X-axis: Biometric (e.g., HR, Temp, EDA)
    xScale = d3
        .scaleLinear()
        .domain(d3.extent(data, d => d[selectedBiometric]))
        .range([50, width - 50])
        .nice();

    // Y-axis: Selected Exam Grade
    const selectedExamGrade = `${selectedExam}_Grade`;
    yScale = d3
        .scaleLinear()
        .domain([0, 100]) // Grades always range from 0 to 100
        .range([height - 50, 50])
        .nice();

    // Calculate Pearson correlation coefficient (r-value)
    const xData = data.map(d => d[selectedBiometric]); // X-axis data
    const yData = data.map(d => d[selectedExamGrade]); // Y-axis data
    const rValue = calculatePearsonCorrelation(xData, yData);

    // Update r-value display above the plot
    const rValueLabel = svg.append("text")
        .attr("class", "r-value-label")
        .attr("x", width - 40) // Move slightly more to the right
        .attr("y", 20) // Slightly above the plot
        .attr("text-anchor", "end")
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .style("fill", "black")
        .text(`${selectedExam} & ${selectedBiometricDisplay} Correlation: r = ${rValue.toFixed(2)}`);

    // Add a group for the legend and position it to the right
    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width + 20}, 50)`); // Move to the right

    // Add legend title
    legend.append("text")
        .attr("x", 0)
        .attr("y", 0)
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .text("Biometric Correlations");

    // Add legend items dynamically
    const legendData = [{ color: "steelblue", text: `${selectedExam} & ${selectedBiometricDisplay} (r = ${rValue.toFixed(2)})` }];

    legend.selectAll("legend-dots")
        .data(legendData)
        .enter()
        .append("circle")
        .attr("cx", 0)
        .attr("cy", (d, i) => (i + 1) * 20) // Space them out
        .attr("r", 6)
        .style("fill", d => d.color);

    legend.selectAll("legend-text")
        .data(legendData)
        .enter()
        .append("text")
        .attr("x", 15)
        .attr("y", (d, i) => (i + 1) * 20 + 5) // Align with circles
        .style("font-size", "14px")
        .text(d => d.text);

    // Add grid lines
    svg.append('g')
        .attr('class', 'grid')
        .attr('transform', `translate(50, 0)`)
        .call(d3.axisLeft(yScale).tickSize(-width + 100).tickFormat(''));

    // Add dots
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

    // Add X axis (Biometric Measure)
    svg.append('g')
        .attr('transform', `translate(0, ${height - 50})`)
        .call(d3.axisBottom(xScale))
        .append('text')
        .attr('x', width / 2)
        .attr('y', 40)
        .attr('fill', 'black')
        .attr('text-anchor', 'middle')
        .text(selectedBiometricDisplay);

    // Add Y axis (Selected Exam Grade)
    svg.append('g')
        .attr('transform', `translate(50, 0)`)
        .call(d3.axisLeft(yScale).tickValues(d3.range(0, 110, 10)))
        .append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -height / 2)
        .attr('y', -40)
        .attr('fill', 'black')
        .attr('text-anchor', 'middle')
        .text(`${selectedExam} Grade`);

    // Add trend line
    addTrendLine(svg, xScale, yScale, xData, yData);
}

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

function updateTooltipContent(d) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.innerHTML = `
        <dt>Student ID</dt><dd>${d.Student_ID}</dd>
        <dt>${selectedExam} Grade</dt><dd>${d[`${selectedExam}_Grade`]}</dd>
        <dt>${selectedBiometricDisplay}</dt><dd>${d[selectedBiometric].toFixed(2)}</dd>
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
