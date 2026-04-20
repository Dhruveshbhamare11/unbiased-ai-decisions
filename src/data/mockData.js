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
        { group: "Under 30", value: 0.72, label: "Positive Rate" },
        { group: "30–40",    value: 0.55, label: "Positive Rate" },
        { group: "Over 40",  value: 0.34, label: "Positive Rate" },
      ],
    },
    disparate_impact: {
      gender: [
        { group: "Male (ref.)",  value: 1.00, label: "Selection Rate" },
        { group: "Female",       value: 0.52, label: "Selection Rate" },
      ],
      age: [
        { group: "Under 30 (ref.)", value: 1.00, label: "Impact Ratio" },
        { group: "30–40",           value: 0.76, label: "Impact Ratio" },
        { group: "Over 40",         value: 0.47, label: "Impact Ratio" },
      ],
    },
    equal_opportunity: {
      gender: [
        { group: "Male",   value: 0.89, label: "True Positive Rate" },
        { group: "Female", value: 0.61, label: "True Positive Rate" },
      ],
      age: [
        { group: "Under 30", value: 0.91, label: "True Positive Rate" },
        { group: "30–40",    value: 0.72, label: "True Positive Rate" },
        { group: "Over 40",  value: 0.48, label: "True Positive Rate" },
      ],
    },
    equalized_odds_difference: {
      gender: [
        { group: "Male",   value: 0.54, label: "Avg(TPR, FPR)" },
        { group: "Female", value: 0.38, label: "Avg(TPR, FPR)" },
      ],
      age: [
        { group: "Under 30", value: 0.55, label: "Avg(TPR, FPR)" },
        { group: "30–40",    value: 0.43, label: "Avg(TPR, FPR)" },
        { group: "Over 40",  value: 0.31, label: "Avg(TPR, FPR)" },
      ],
    },
    predictive_parity: {
      gender: [
        { group: "Male",   value: 0.77, label: "Precision" },
        { group: "Female", value: 0.55, label: "Precision" },
      ],
      age: [
        { group: "Under 30", value: 0.79, label: "Precision" },
        { group: "30–40",    value: 0.64, label: "Precision" },
        { group: "Over 40",  value: 0.51, label: "Precision" },
      ],
    },
    average_odds_difference: {
      gender: [
        { group: "Male",   value: 0.54, label: "Avg Odds Score" },
        { group: "Female", value: 0.38, label: "Avg Odds Score" },
      ],
      age: [
        { group: "Under 30", value: 0.55, label: "Avg Odds Score" },
        { group: "30–40",    value: 0.43, label: "Avg Odds Score" },
        { group: "Over 40",  value: 0.31, label: "Avg Odds Score" },
      ],
    },
  },

  // ── SUBGROUP CHARTS DATA ──────────────────────────────────────────────────
  group_stats: {
    Male:   { hired: 68, not_hired: 32 },
    Female: { hired: 38, not_hired: 62 },
  },
  age_stats: {
    "Under 30": { hired: 72, not_hired: 28 },
    "30-40":    { hired: 55, not_hired: 45 },
    "Over 40":  { hired: 34, not_hired: 66 },
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
      title: "AIF360 Reweighing",
      desc: "Uses IBM AIF360's Reweighing algorithm (aif360.algorithms.preprocessing.Reweighing) to assign higher sample weights to disadvantaged group instances during training. Directly addresses demographic bias at the data level without modifying the model architecture. No synthetic data generation required.",
      impact: "High Impact",
      complexity: "Easy",
      improvement: "+18 points",
    },
    {
      title: "Fairlearn Exponentiated Gradient (In-Processing)",
      desc: "Unlike AIF360 Reweighing which adjusts the training data before the model sees it (pre-processing), Fairlearn's ExponentiatedGradient applies fairness constraints directly during the training loop itself. This forces the model to simultaneously optimize for accuracy and demographic parity — effective when pre-processing adjustments alone are insufficient to close the gap.",
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
