import pandas as pd
import numpy as np
import requests

# Generate biased dataset
np.random.seed(42)
n = 1000
gender = np.random.choice(['Male', 'Female'], n)
# bias: males have higher experience
years_exp = np.where(gender == 'Male', np.random.normal(10, 3, n), np.random.normal(5, 3, n))
years_exp = np.clip(years_exp, 0, 30)

# bias: males have higher interview scores
interview_score = np.where(gender == 'Male', np.random.normal(85, 10, n), np.random.normal(70, 10, n))
interview_score = np.clip(interview_score, 0, 100)

previous_salary = years_exp * 5000 + np.random.normal(0, 5000, n)
job_title = np.random.choice(['Engineer', 'Senior Engineer', 'Manager'], n)

# outcome: hired if score > 75 and exp > 5
hired = ((interview_score > 75) & (years_exp > 5)).astype(int)

df = pd.DataFrame({
    'gender': gender,
    'years_experience': years_exp,
    'interview_score': interview_score,
    'previous_salary': previous_salary,
    'job_title_keywords': job_title,
    'fair_hired': hired
})

df.to_csv('biased_engineers_v5.csv', index=False)
print("Generated biased_engineers_v5.csv")
