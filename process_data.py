import os
import pandas as pd

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

processed_data = []

# Loop through each student folder 
for student in grades.keys():
    student_path = os.path.join(base_dir, student)

    student_data = {"Student_ID": student}
    
    student_data["Midterm1_Grade"] = grades[student]["Midterm1"]
    student_data["Midterm2_Grade"] = grades[student]["Midterm2"]
    student_data["Final_Grade"] = grades[student]["Final"]

    # Loop through each exam
    for exam in ["Midterm 1", "Midterm 2", "Final"]:
        exam_path = os.path.join(student_path, exam)

        if os.path.exists(exam_path):  
            biometrics = {
                "HR": "HR.csv",
                "Temp": "TEMP.csv",
                "EDA": "EDA.csv",
                "BVP": "BVP.csv",
                "ACC": "ACC.csv",
                "IBI": "IBI.csv"
            }

            for key, filename in biometrics.items():
                file_path = os.path.join(exam_path, filename)
                avg_value = None 

                if os.path.exists(file_path):
                    df = pd.read_csv(file_path, header=None)

                    if key == "IBI":
                        df = df.iloc[1:, 1] 
                    elif key == "ACC":
                        df = df.iloc[2:, :] 
                        df = df.astype(float) / 64  
                        
                        avg_x = df.iloc[:, 0].mean()
                        avg_y = df.iloc[:, 1].mean()
                        avg_z = df.iloc[:, 2].mean()
                        
                        avg_magnitude = (df.iloc[:, 0]**2 + df.iloc[:, 1]**2 + df.iloc[:, 2]**2).mean()**0.5
                        
                        student_data[f"{exam}_ACC_X"] = avg_x
                        student_data[f"{exam}_ACC_Y"] = avg_y
                        student_data[f"{exam}_ACC_Z"] = avg_z
                        student_data[f"{exam}_ACC_Magnitude"] = avg_magnitude

                    else:
                        df = df.iloc[2:, 0]  
                    if key != "ACC":
                        avg_value = df.astype(float).mean() 

                        student_data[f"{exam}_{key}"] = avg_value

    processed_data.append(student_data)

df = pd.DataFrame(processed_data)
print(df)
output_path = "data/stress_data.csv"
os.makedirs("data", exist_ok=True) 
df.to_csv(output_path, index=False)