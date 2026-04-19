export const sampleCSV = `age,gender,education,years_experience,interview_score,hired
28,Male,Bachelor,3,7,1
32,Female,Master,5,8,0
25,Male,Bachelor,1,6,1
29,Female,Bachelor,4,7,0
35,Male,Master,8,9,1
27,Female,Bachelor,2,7,0
31,Male,PhD,6,8,1
30,Female,Master,5,9,0
26,Male,Bachelor,2,6,1
33,Female,PhD,7,9,1
28,Male,High School,3,5,1
24,Female,Bachelor,1,6,0
36,Male,Master,9,8,1
29,Female,Bachelor,4,7,0
31,Male,Bachelor,5,7,1
27,Female,Master,3,8,0
34,Male,PhD,7,9,1
26,Female,Bachelor,2,6,0
30,Male,Bachelor,4,7,1
28,Female,Master,4,8,0
45,Male,Master,12,8,1
41,Female,PhD,14,9,0
23,Male,High School,1,5,1
38,Female,Bachelor,8,7,0`;

export const mockAnalysisResult = {
  fairness_score: 34,
  risk_level: "High",
  biased_attributes: ["gender", "age"],
  total_rows: 24,
  outcome_column: "hired",
  metrics: {
    demographic_parity: 0.31,
    disparate_impact: 0.52,
    equal_opportunity: 0.28
  },
  group_stats: {
    Male: { hired: 68, not_hired: 32 },
    Female: { hired: 38, not_hired: 62 }
  },
  age_stats: {
    "Under 30": { hired: 72, not_hired: 28 },
    "30-40": { hired: 55, not_hired: 45 },
    "Over 40": { hired: 34, not_hired: 66 }
  },
  mitigation_suggestions: [
    {
      title: "Remove Direct Sensitive Attributes",
      desc: "Remove 'gender' and 'age' columns entirely from training data before model training. These attributes have no legitimate predictive value for job performance and are the primary direct cause of disparate outcomes. Removing them is the simplest and most effective first step.",
      impact: "High Impact",
      complexity: "Easy",
      improvement: "+28 points"
    },
    {
      title: "Rebalance Dataset with SMOTE",
      desc: "Apply Synthetic Minority Oversampling Technique (SMOTE) to generate synthetic samples for underrepresented groups. This corrects historical representation imbalance so the model receives equal learning exposure.",
      impact: "High Impact",
      complexity: "Medium",
      improvement: "+18 points"
    },
    {
      title: "Apply Fairlearn Reweighing",
      desc: "Use Fairlearn's ExponentiatedGradient or ThresholdOptimizer to assign higher sample weights to disadvantaged group members during training.",
      impact: "Medium Impact",
      complexity: "Medium",
      improvement: "+12 points"
    },
    {
      title: "Group-Specific Threshold Calibration",
      desc: "Apply different decision thresholds for different demographic groups to equalize false positive and false negative rates across groups. Corrects model-level bias without retraining.",
      impact: "Medium Impact",
      complexity: "Hard",
      improvement: "+10 points"
    }
  ]
};

export const mockHistory = [
  { id: 1, filename: 'q1_hiring_data.csv', date: 'Oct 24, 2025', score: 34, risk: 'High' },
  { id: 2, filename: 'engineering_roles_2025.csv', date: 'Oct 12, 2025', score: 85, risk: 'Low' },
  { id: 3, filename: 'intern_program_v2.csv', date: 'Sep 05, 2025', score: 62, risk: 'Moderate' },
];
