import os
import pandas as pd

# Define base directory where raw data is stored
base_dir = "Data"

# Manually input grades
grades = {
    "S1": {"Midterm1": 78, "Midterm2": 82, "Final": 182 / 2},  
    "S2": {"Midterm1": 82, "Midterm2": 85, "Final": 180 / 2},
    "S3": {"Midterm1": 77, "Midterm2": 90, "Final": 188 / 2},
    "S4": {"Midterm1": 75, "Midterm2": 77, "Final": 149 / 2},
    "S5": {"Midterm1": 67, "Midterm2": 77, "Final": 157 / 2},
    "S6": {"Midterm1": 71, "Midterm2": 64, "Final": 175 / 2},
    "S7": {"Midterm1": 64, "Midterm2": 33, "Final": 110 / 2},
    "S8": {"Midterm1": 92, "Midterm2": 88, "Final": 184 / 2},
    "S9": {"Midterm1": 80, "Midterm2": 39, "Final": 126 / 2},
    "S10": {"Midterm1": 89, "Midterm2": 64, "Final": 116 / 2},
}

# Initialize an empty list for processed data
processed_data = []

# Loop through each student folder (S01, S02, ..., S10)
for student in grades.keys():
    student_path = os.path.join(base_dir, student)

    # Initialize dictionary for storing student data
    student_data = {"Student_ID": student}
    
    # Store grades
    student_data["Midterm1_Grade"] = grades[student]["Midterm1"]
    student_data["Midterm2_Grade"] = grades[student]["Midterm2"]
    student_data["Final_Grade"] = grades[student]["Final"]

    # Loop through each exam
    for exam in ["Midterm 1", "Midterm 2", "Final"]:
        exam_path = os.path.join(student_path, exam)

        if os.path.exists(exam_path):  # Ensure the exam folder exists
            # List of biometric files to process
            biometrics = {
                "HR": "HR.csv",
                "Temp": "TEMP.csv",
                "EDA": "EDA.csv",
                "BVP": "BVP.csv",
                "ACC": "ACC.csv",
                "IBI": "IBI.csv"
            }

            # Process each biometric file
            for key, filename in biometrics.items():
                file_path = os.path.join(exam_path, filename)
                avg_value = None  # Default in case file is missing

                if os.path.exists(file_path):
                    df = pd.read_csv(file_path, header=None)

                    # Skip first row for IBI (time)
                    if key == "IBI":
                        df = df.iloc[1:, 1]  # Use only the second column (duration)
                    elif key == "ACC":
                        df = df.iloc[2:, :]  # Skip first two rows and keep all 3 columns
                        df = df.astype(float) / 64  # Convert from 1/64g to g
                        
                        # Compute mean for each axis
                        avg_x = df.iloc[:, 0].mean()
                        avg_y = df.iloc[:, 1].mean()
                        avg_z = df.iloc[:, 2].mean()
                        
                        # Compute acceleration magnitude
                        avg_magnitude = (df.iloc[:, 0]**2 + df.iloc[:, 1]**2 + df.iloc[:, 2]**2).mean()**0.5
                        
                        # Store results
                        student_data[f"{exam}_ACC_X"] = avg_x
                        student_data[f"{exam}_ACC_Y"] = avg_y
                        student_data[f"{exam}_ACC_Z"] = avg_z
                        student_data[f"{exam}_ACC_Magnitude"] = avg_magnitude

                    # Skip first two rows for all other biometrics
                    else:
                        df = df.iloc[2:, 0]  # Use only the first data column
                    if key != "ACC":
                        avg_value = df.astype(float).mean()  # Compute average

                        # Store the computed averages
                        student_data[f"{exam}_{key}"] = avg_value

    # Append student data to the final dataset
    processed_data.append(student_data)

# Convert list to DataFrame
df = pd.DataFrame(processed_data)
print(df)
# Save processed data as a single CSV file
output_path = "data/stress_data.csv"
os.makedirs("data", exist_ok=True)  # Create 'data' folder if it doesn't exist
df.to_csv(output_path, index=False)

print(f"Processed data saved to {output_path}")

