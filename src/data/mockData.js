export const sampleCSV = `age,gender,education,years_experience,previous_salary,interview_score,hired
28,Male,Bachelor,3,65000,7,1
32,Female,Master,5,72000,8,0
25,Male,Bachelor,1,58000,6,1
29,Female,Bachelor,4,61000,7,0
35,Male,Master,8,110000,9,1
27,Female,Bachelor,2,55000,7,0
31,Male,PhD,6,95000,8,1
30,Female,Master,5,82000,9,0
26,Male,Bachelor,2,63000,6,1
33,Female,PhD,7,105000,9,1
28,Male,High School,3,45000,5,1
24,Female,Bachelor,1,52000,6,0
36,Male,Master,9,120000,8,1
29,Female,Bachelor,4,62000,7,0
31,Male,Bachelor,5,78000,7,1
27,Female,Master,3,68000,8,0
34,Male,PhD,7,115000,9,1
26,Female,Bachelor,2,54000,6,0
30,Male,Bachelor,4,74000,7,1
28,Female,Master,4,70000,8,0
45,Male,Master,12,145000,8,1
41,Female,PhD,14,135000,9,0
23,Male,High School,1,40000,5,1
38,Female,Bachelor,8,85000,7,0`;

// ─────────────────────────────────────────────────────────────────────────────
//  FAIRNESS SCORE FORMULA (PRD-Spec)
//  • Lower-is-better metrics  → score = max(0, 100 − (value / threshold) × 100)
//  • Higher-is-better (DI)    → score = min(100, (value / 0.8) × 100)
//  • Weights: DI 30%, DP 25%, EO 20%, EOD 10%, PP 10%, AOD 5%
// ─────────────────────────────────────────────────────────────────────────────
export function computeFairnessScore(metrics) {
  const diScore  = Math.min(100, (metrics.disparate_impact / 0.8) * 100);
  const dpScore  = Math.max(0, 100 - (metrics.demographic_parity / 0.1) * 100);
  const eoScore  = Math.max(0, 100 - (metrics.equal_opportunity / 0.1) * 100);
  const eodScore = Math.max(0, 100 - (metrics.equalized_odds_difference / 0.1) * 100);
  const ppScore  = Math.max(0, 100 - (metrics.predictive_parity / 0.1) * 100);
  const aodScore = Math.max(0, 100 - (metrics.average_odds_difference / 0.1) * 100);

  return Math.round(
    0.30 * diScore  +
    0.25 * dpScore  +
    0.20 * eoScore  +
    0.10 * eodScore +
    0.10 * ppScore  +
    0.05 * aodScore
  );
}

export const mockAnalysisResult = {
  // fairness_score is now COMPUTED — call computeFairnessScore(metrics) instead
  risk_level: "High",
  biased_attributes: ["gender", "age"],
  total_rows: 24,
  outcome_column: "hired",

  // ── 6 FAIRNESS METRICS ───────────────────────────────────────────────────
  metrics: {
    demographic_parity:          0.31,   // ΔPositive-rate between groups   (threshold ≤ 0.10)
    disparate_impact:            0.52,   // Min-group / Max-group ratio      (threshold ≥ 0.80)
    equal_opportunity:           0.28,   // ΔTPR between groups              (threshold ≤ 0.10)
    equalized_odds_difference:   0.35,   // AIF360 equalized_odds_difference (threshold ≤ 0.10)
    predictive_parity:           0.22,   // ΔPrecision between groups        (threshold ≤ 0.10)
    average_odds_difference:     0.29,   // AIF360 average_odds_difference   (threshold ≤ 0.10)
  },

  // ── PER-GROUP BREAKDOWNS (for every metric × every biased attribute) ─────
  metric_group_breakdown: {
    demographic_parity: {
      gender: [
        { group: "Male",   value: 0.73, label: "Positive Rate" },
        { group: "Female", value: 0.42, label: "Positive Rate" },
      ],
      age: [
        { group: "Young (<35)",  value: 0.72, label: "Positive Rate" },
        { group: "Senior (35+)", value: 0.34, label: "Positive Rate" },
      ],
    },
    disparate_impact: {
      gender: [
        { group: "Male (ref.)",  value: 1.00, label: "Selection Rate" },
        { group: "Female",       value: 0.52, label: "Selection Rate" },
      ],
      age: [
        { group: "Young (ref.)",    value: 1.00, label: "Impact Ratio" },
        { group: "Senior",          value: 0.47, label: "Impact Ratio" },
      ],
    },
    equal_opportunity: {
      gender: [
        { group: "Male",   value: 0.89, label: "True Positive Rate" },
        { group: "Female", value: 0.61, label: "True Positive Rate" },
      ],
      age: [
        { group: "Young",  value: 0.91, label: "True Positive Rate" },
        { group: "Senior", value: 0.48, label: "True Positive Rate" },
      ],
    },
    equalized_odds_difference: {
      gender: [
        { group: "Male",   value: 0.54, label: "Avg(TPR, FPR)" },
        { group: "Female", value: 0.38, label: "Avg(TPR, FPR)" },
      ],
      age: [
        { group: "Young",  value: 0.55, label: "Avg(TPR, FPR)" },
        { group: "Senior", value: 0.31, label: "Avg(TPR, FPR)" },
      ],
    },
    predictive_parity: {
      gender: [
        { group: "Male",   value: 0.77, label: "Precision" },
        { group: "Female", value: 0.55, label: "Precision" },
      ],
      age: [
        { group: "Young",  value: 0.79, label: "Precision" },
        { group: "Senior", value: 0.51, label: "Precision" },
      ],
    },
    average_odds_difference: {
      gender: [
        { group: "Male",   value: 0.54, label: "Avg Odds Score" },
        { group: "Female", value: 0.38, label: "Avg Odds Score" },
      ],
      age: [
        { group: "Young",  value: 0.55, label: "Avg Odds Score" },
        { group: "Senior", value: 0.31, label: "Avg Odds Score" },
      ],
    },
  },

  // ── SUBGROUP CHARTS DATA ──────────────────────────────────────────────────
  group_stats: {
    Male:   { hired: 68, not_hired: 32 },
    Female: { hired: 38, not_hired: 62 },
  },
  age_stats: {
    "Young (<35)":  { hired: 72, not_hired: 28 },
    "Senior (35+)": { hired: 34, not_hired: 66 },
  },

  // ── BIAS CONTRIBUTORS (SHAP-based approximate attribution) ───────────────
  bias_contributors: {
    primary:   { attribute: "gender", contribution: 62 },
    secondary: { attribute: "age",    contribution: 38 },
    top_features: [
      { rank: 1, feature: "years_experience",   correlated_with: "age",    shap_score: 0.41 },
      { rank: 2, feature: "job_title_keywords", correlated_with: "gender", shap_score: 0.34 },
      { rank: 3, feature: "previous_salary",    correlated_with: "gender", shap_score: 0.29 },
      { rank: 4, feature: "education_level",    correlated_with: "gender", shap_score: 0.18 },
      { rank: 5, feature: "interview_score",    correlated_with: "age",    shap_score: 0.12 },
    ],
  },

  // ── MITIGATION SUGGESTIONS (SMOTE removed, AIF360 Reweighing added) ──────
  mitigation_suggestions: [
    {
      title: "Remove Direct Sensitive Attributes",
      desc: "Remove 'gender' and 'age' columns entirely from training data before model training. These attributes have no legitimate predictive value for job performance and are the primary direct cause of disparate outcomes. Removing them is the simplest and most effective first step.",
      impact: "High Impact",
      complexity: "Easy",
      improvement: "+28 points",
    },
    {
      title: "Mitigation 2: AIF360 Reweighing (Pre-Processing)",
      desc: "Uses IBM AIF360's Reweighing algorithm to assign higher sample weights to disadvantaged group instances BEFORE training. Directly addresses demographic bias at the data level by fixing the dataset rather than modifying the model architecture.",
      impact: "High Impact",
      complexity: "Easy",
      improvement: "+18 points",
    },
    {
      title: "Mitigation 3: Fairlearn Exponentiated Gradient (In-Processing)",
      desc: "Applies fairness constraints strictly DURING the training loop itself. This forces the model to simultaneously optimize for accuracy and demographic parity — effective when data-level pre-processing adjustments alone are insufficient.",
      impact: "Medium Impact",
      complexity: "Medium",
      improvement: "+12 points",
    },
    {
      title: "Group-Specific Threshold Calibration",
      desc: "Apply different decision thresholds for different demographic groups to equalize false positive and false negative rates across groups. Corrects model-level bias without retraining — only requires access to model probability outputs.",
      impact: "Medium Impact",
      complexity: "Hard",
      improvement: "+10 points",
    },
  ],
};

export const mockHistory = [
  { id: 1, filename: 'q1_hiring_data.csv',        date: 'Oct 24, 2025', score: 20, risk: 'High' },
  { id: 2, filename: 'engineering_roles_2025.csv', date: 'Oct 12, 2025', score: 85, risk: 'Low' },
  { id: 3, filename: 'intern_program_v2.csv',      date: 'Sep 05, 2025', score: 62, risk: 'Moderate' },
];
