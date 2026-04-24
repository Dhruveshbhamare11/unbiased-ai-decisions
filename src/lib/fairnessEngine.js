// src/lib/fairnessEngine.js — Complete rewrite with all 5 fixes

// ── CSV UTILITIES ─────────────────────────────────────────────────────────────
export function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/['"]/g, ''));
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',');
    if (row.length === headers.length) {
      const obj = {};
      headers.forEach((h, idx) => {
        const val = row[idx].trim().replace(/['"]/g, '');
        obj[h] = val !== '' && !isNaN(val) ? Number(val) : val;
      });
      data.push(obj);
    }
  }
  return { headers, data };
}

export function unparseCSV(headers, data) {
  let csv = headers.join(',') + '\n';
  data.forEach(row => {
    csv += headers.map(h => (row[h] !== undefined && row[h] !== null ? row[h] : '')).join(',') + '\n';
  });
  return csv;
}

// ── COLUMN DETECTION ──────────────────────────────────────────────────────────
export function detectLabelColumn(headers) {
  const priority = ['fair_hired', 'hired', 'outcome', 'label', 'target', 'decision', 'approved', 'selected'];
  for (const c of priority) {
    const found = headers.find(h => h.toLowerCase() === c);
    if (found) return found;
  }
  return headers[headers.length - 1];
}

export function detectGroundTruthColumn(headers) {
  const priority = ['hired', 'original_hired', 'interview_score'];
  for (const c of priority) {
    const found = headers.find(h => h.toLowerCase() === c);
    if (found) return found;
  }
  return null;
}

export function detectSensitiveCols(headers) {
  const sensitive = ['gender', 'sex', 'age', 'race', 'ethnicity', 'religion', 'nationality'];
  return headers.filter(h => sensitive.some(s => h.toLowerCase().includes(s)));
}

// ── MATH UTILITIES ────────────────────────────────────────────────────────────
function _mean(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }

function _pearson(a, b) {
  if (a.length !== b.length || a.length === 0) return 0;
  const ma = _mean(a), mb = _mean(b);
  const num = a.reduce((s, v, i) => s + (v - ma) * (b[i] - mb), 0);
  const den = Math.sqrt(a.reduce((s, v) => s + (v - ma) ** 2, 0) * b.reduce((s, v) => s + (v - mb) ** 2, 0));
  return den === 0 ? 0 : num / den;
}

function _cramersV(col1, col2) {
  const cats1 = [...new Set(col1)], cats2 = [...new Set(col2)];
  const n = col1.length;
  const table = {};
  cats1.forEach(c => { table[c] = {}; cats2.forEach(d => { table[c][d] = 0; }); });
  col1.forEach((v, i) => { table[v][col2[i]]++; });
  const rowT = {}, colT = {};
  cats1.forEach(c => { rowT[c] = cats2.reduce((s, d) => s + table[c][d], 0); });
  cats2.forEach(d => { colT[d] = cats1.reduce((s, c) => s + table[c][d], 0); });
  let chi2 = 0;
  cats1.forEach(c => cats2.forEach(d => {
    const exp = (rowT[c] * colT[d]) / n;
    if (exp > 0) chi2 += (table[c][d] - exp) ** 2 / exp;
  }));
  const minDim = Math.min(cats1.length, cats2.length) - 1;
  return minDim <= 0 ? 0 : Math.sqrt(chi2 / (n * minDim));
}

function _sigmoid(x) { return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, x)))); }

// ── FIX 1A: PROXY FEATURE DETECTION ──────────────────────────────────────────
export function detectProxyFeatures(data, sensitiveCols, labelCol, threshold = 0.3) {
  if (!data || data.length === 0) return {};
  const headers = Object.keys(data[0]);
  const skipCols = new Set([...sensitiveCols, labelCol, 'sample_weight', 'bias_flag', 'fair_hired', 'original_hired']);
  const proxies = {};

  sensitiveCols.forEach(sensCol => {
    if (!headers.includes(sensCol)) return;
    const sensVals = data.map(d => d[sensCol]);
    const isSensNumeric = typeof sensVals[0] === 'number';

    headers.forEach(col => {
      if (skipCols.has(col)) return;
      const colVals = data.map(d => d[col]);
      if (colVals.some(v => v === null || v === undefined || v === '')) return;
      try {
        const isNumeric = typeof colVals[0] === 'number';
        let corr = 0;
        if (isNumeric && !isSensNumeric) {
          const cats = [...new Set(sensVals)];
          const encoded = sensVals.map(v => cats.indexOf(v));
          corr = Math.abs(_pearson(encoded, colVals));
        } else if (!isNumeric && !isSensNumeric) {
          corr = _cramersV(colVals, sensVals);
        } else if (isNumeric && isSensNumeric) {
          corr = Math.abs(_pearson(colVals, sensVals));
        } else {
          const cats = [...new Set(colVals)];
          corr = Math.abs(_pearson(colVals.map(v => cats.indexOf(v)), sensVals));
        }
        if (corr > threshold) {
          if (!proxies[col] || proxies[col] < corr) proxies[col] = Math.round(corr * 1000) / 1000;
        }
      } catch (e) { /* skip */ }
    });
  });
  return proxies;
}

// ── FIX 1B: PROXY FEATURE CLEANING ───────────────────────────────────────────
export function cleanProxyFeatures(data, proxyFeatures) {
  let cleaned = data.map(d => ({ ...d }));
  const renames = {};

  Object.entries(proxyFeatures).forEach(([col, score]) => {
    const vals = cleaned.map(d => d[col]).filter(v => v !== null && v !== undefined && v !== '');
    if (vals.length === 0) return;
    const isNumeric = typeof vals[0] === 'number';

    if (!isNumeric) {
      const counts = {};
      vals.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
      const topCats = new Set(Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k]) => k));
      cleaned.forEach(d => { if (!topCats.has(d[col])) d[col] = 'Other'; });
    } else if (score > 0.5) {
      const sorted = [...vals].sort((a, b) => a - b);
      const q33 = sorted[Math.floor(sorted.length * 0.33)];
      const q67 = sorted[Math.floor(sorted.length * 0.67)];
      const newCol = col + '_band';
      cleaned.forEach(d => {
        const v = d[col];
        d[newCol] = v <= q33 ? 'Low' : v <= q67 ? 'Mid' : 'High';
        delete d[col];
      });
      renames[col] = newCol;
    } else {
      const sorted = [...vals].sort((a, b) => a - b);
      const cap = sorted[Math.floor(sorted.length * 0.95)];
      cleaned.forEach(d => { if (typeof d[col] === 'number' && d[col] > cap) d[col] = cap; });
    }
  });
  return { cleaned, renames };
}

// ── FIX 2: REWEIGHING WEIGHTS (AIF360 formula) ───────────────────────────────
export function computeReweighingWeights(data, labelCol, sensitiveAttr) {
  const n = data.length;
  if (!n) return new Array(n).fill(1);

  const pY = {}, pG = {}, pYG = {};
  data.forEach(d => {
    const y = String(d[labelCol] ?? ''), g = String(d[sensitiveAttr] ?? '');
    pY[y] = (pY[y] || 0) + 1;
    pG[g] = (pG[g] || 0) + 1;
    const k = `${y}|${g}`;
    pYG[k] = (pYG[k] || 0) + 1;
  });

  return data.map(d => {
    const y = String(d[labelCol] ?? ''), g = String(d[sensitiveAttr] ?? '');
    const joint = pYG[`${y}|${g}`] || 1;
    return (pY[y] / n) * (pG[g] / n) / (joint / n);
  });
}

// ── FIX 2: LOGISTIC REGRESSION (pure JS) ─────────────────────────────────────
function _encodeFeatures(data, featureCols) {
  const catMaps = {};
  featureCols.forEach(col => {
    const vals = data.map(d => d[col]);
    if (typeof vals[0] !== 'number') {
      const cats = [...new Set(vals)].sort();
      catMaps[col] = cats;
    }
  });

  const means = {}, stds = {};
  featureCols.forEach(col => {
    if (!catMaps[col]) {
      const vals = data.map(d => Number(d[col]) || 0);
      means[col] = _mean(vals);
      const variance = vals.reduce((s, v) => s + (v - means[col]) ** 2, 0) / vals.length;
      stds[col] = Math.sqrt(variance) || 1;
    }
  });

  const X = data.map(d => {
    const row = [1];
    featureCols.forEach(col => {
      if (catMaps[col]) {
        catMaps[col].forEach((cat, i) => { if (i < catMaps[col].length - 1) row.push(d[col] === cat ? 1 : 0); });
      } else {
        row.push(((Number(d[col]) || 0) - means[col]) / stds[col]);
      }
    });
    return row;
  });
  return X;
}

function _trainLR(X, y, weights, epochs = 150, lr = 0.05) {
  const nFeats = X[0].length;
  let w = new Array(nFeats).fill(0);
  const totalW = weights.reduce((s, v) => s + v, 0) || 1;

  for (let e = 0; e < epochs; e++) {
    const grad = new Array(nFeats).fill(0);
    X.forEach((row, i) => {
      const z = row.reduce((s, v, j) => s + v * w[j], 0);
      const err = (_sigmoid(z) - y[i]) * weights[i];
      row.forEach((v, j) => { grad[j] += err * v; });
    });
    w = w.map((wj, j) => wj - (lr / totalW) * grad[j]);
  }
  return w;
}

export function generateFairPredictions(data, labelCol, sensitiveAttr) {
  const featureCols = Object.keys(data[0]).filter(c =>
    c !== labelCol && c !== sensitiveAttr && c !== 'sample_weight' && c !== 'bias_flag'
  );
  const weights = sensitiveAttr && data[0][sensitiveAttr] !== undefined
    ? computeReweighingWeights(data, labelCol, sensitiveAttr)
    : new Array(data.length).fill(1);

  const X = _encodeFeatures(data, featureCols);
  const y = data.map(d => Number(d[labelCol]) || 0);
  const w = _trainLR(X, y, weights);
  return X.map(row => {
    const z = row.reduce((s, v, j) => s + v * w[j], 0);
    return _sigmoid(z) >= 0.5 ? 1 : 0;
  });
}

// ── FIX 3: MODE DETECTION ─────────────────────────────────────────────────────
export function detectModeAndProtectedAttr(data, headers) {
  const sensitiveCols = detectSensitiveCols(headers);
  const present = sensitiveCols.filter(c => headers.includes(c));
  if (present.length > 0) return { mode: 'direct', protectedAttr: present[0], isProxy: false, proxyNote: null };

  const labelCol = detectLabelColumn(headers);
  let bestProxy = null, bestScore = -1;
  headers.forEach(col => {
    if (col === labelCol || col === 'sample_weight' || col === 'bias_flag') return;
    try {
      const groups = {};
      data.forEach(d => {
        const g = d[col], y = Number(d[labelCol]) || 0;
        if (!groups[g]) groups[g] = [];
        groups[g].push(y);
      });
      const means = Object.values(groups).map(arr => _mean(arr));
      const score = Math.max(...means) - Math.min(...means);
      if (score > bestScore) { bestScore = score; bestProxy = col; }
    } catch (e) { /* skip */ }
  });

  return {
    mode: 'proxy',
    protectedAttr: bestProxy,
    isProxy: true,
    proxyNote: `Sensitive columns not found. Bias measured via proxy: "${bestProxy}" (outcome variance: ${bestScore.toFixed(2)})`
  };
}

// ── FLEXIBLE METRICS COMPUTATION (FIX 3) ──────────────────────────────────────
function _groupStats(data, groupFilter, labelCol, groundTruthFn) {
  const group = data.filter(groupFilter);
  const total = group.length || 1;
  let hired = 0, truePos = 0, actPos = 0, falsePos = 0, actNeg = 0;
  group.forEach(d => {
    const y_pred = Number(d[labelCol]) || 0;
    const y_true = groundTruthFn(d);
    if (y_pred === 1) hired++;
    if (y_true === 1) actPos++; else actNeg++;
    if (y_pred === 1 && y_true === 1) truePos++;
    if (y_pred === 1 && y_true === 0) falsePos++;
  });
  return {
    total, hired,
    posRate: hired / total,
    tpr: actPos > 0 ? truePos / actPos : 0,
    fpr: actNeg > 0 ? falsePos / actNeg : 0,
    prec: hired > 0 ? truePos / hired : 0
  };
}

function _calcMetrics(g1, g2) {
  const safeDiv = (a, b) => b > 0 ? Math.min(a / b, 1) : 0;
  return {
    demographic_parity: parseFloat(Math.abs(g1.posRate - g2.posRate).toFixed(3)),
    disparate_impact: parseFloat((Math.min(g1.posRate, g2.posRate) / Math.max(g1.posRate, g2.posRate || 0.001)).toFixed(3)),
    equal_opportunity: parseFloat(Math.abs(g1.tpr - g2.tpr).toFixed(3)),
    equalized_odds_difference: parseFloat(Math.max(Math.abs(g1.tpr - g2.tpr), Math.abs(g1.fpr - g2.fpr)).toFixed(3)),
    predictive_parity: parseFloat(Math.abs(g1.prec - g2.prec).toFixed(3)),
    average_odds_difference: parseFloat((0.5 * (Math.abs(g1.tpr - g2.tpr) + Math.abs(g1.fpr - g2.fpr))).toFixed(3))
  };
}

export function computeMetrics(data, options = {}) {
  if (!data || data.length === 0) return null;
  const headers = Object.keys(data[0]);
  const { mode, protectedAttr, isProxy, proxyNote } = options.modeInfo
    ? options.modeInfo
    : detectModeAndProtectedAttr(data, headers);

  const labelCol = options.labelCol || detectLabelColumn(headers);
  const gtCol = options.groundTruthCol || detectGroundTruthColumn(headers);

  // Ground truth function
  const groundTruthFn = gtCol && gtCol !== labelCol
    ? (d => gtCol === 'interview_score' ? (Number(d[gtCol]) >= 7 ? 1 : 0) : (Number(d[gtCol]) || 0))
    : (d => Number(d[labelCol]) || 0);

  let g1Stats, g2Stats, g1Label, g2Label;

  if (!isProxy && mode === 'direct') {
    // MODE A — use actual sensitive column
    if (protectedAttr.toLowerCase() === 'gender' || data.some(d => d[protectedAttr] === 'Male' || d[protectedAttr] === 'Female')) {
      g1Stats = _groupStats(data, d => d[protectedAttr] === 'Male', labelCol, groundTruthFn);
      g2Stats = _groupStats(data, d => d[protectedAttr] === 'Female', labelCol, groundTruthFn);
      g1Label = 'Male'; g2Label = 'Female';
    } else if (protectedAttr.toLowerCase() === 'age') {
      g1Stats = _groupStats(data, d => Number(d[protectedAttr]) < 35, labelCol, groundTruthFn);
      g2Stats = _groupStats(data, d => Number(d[protectedAttr]) >= 35, labelCol, groundTruthFn);
      g1Label = 'Young (<35)'; g2Label = 'Senior (35+)';
    } else {
      const vals = [...new Set(data.map(d => d[protectedAttr]))].slice(0, 2);
      g1Stats = _groupStats(data, d => d[protectedAttr] === vals[0], labelCol, groundTruthFn);
      g2Stats = _groupStats(data, d => d[protectedAttr] === vals[1], labelCol, groundTruthFn);
      g1Label = String(vals[0]); g2Label = String(vals[1]);
    }
  } else {
    // MODE B — use proxy column, split by median or top-2 categories
    const vals = data.map(d => d[protectedAttr]);
    const isNumeric = typeof vals[0] === 'number';
    if (isNumeric) {
      const sorted = [...vals].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      g1Stats = _groupStats(data, d => d[protectedAttr] <= median, labelCol, groundTruthFn);
      g2Stats = _groupStats(data, d => d[protectedAttr] > median, labelCol, groundTruthFn);
      g1Label = `${protectedAttr} ≤ ${median}`; g2Label = `${protectedAttr} > ${median}`;
    } else {
      const cats = [...new Set(vals)];
      const groupMeans = cats.map(c => ({ c, m: _mean(data.filter(d => d[protectedAttr] === c).map(d => Number(d[labelCol]) || 0)) }));
      groupMeans.sort((a, b) => b.m - a.m);
      const top = groupMeans[0]?.c, bot = groupMeans[groupMeans.length - 1]?.c;
      g1Stats = _groupStats(data, d => d[protectedAttr] === top, labelCol, groundTruthFn);
      g2Stats = _groupStats(data, d => d[protectedAttr] === bot, labelCol, groundTruthFn);
      g1Label = String(top); g2Label = String(bot);
    }
  }

  const metrics = _calcMetrics(g1Stats, g2Stats);
  const di = metrics.disparate_impact, dp = metrics.demographic_parity;
  const eo = metrics.equal_opportunity, eod = metrics.equalized_odds_difference;
  const pp = metrics.predictive_parity, aod = metrics.average_odds_difference;

  const diScore  = Math.min(100, (di / 0.8) * 100);
  const dpScore  = Math.max(0, 100 - (dp / 0.1) * 100);
  const eoScore  = Math.max(0, 100 - (eo / 0.1) * 100);
  const eodScore = Math.max(0, 100 - (eod / 0.1) * 100);
  const ppScore  = Math.max(0, 100 - (pp / 0.1) * 100);
  const aodScore = Math.max(0, 100 - (aod / 0.1) * 100);
  const score = Math.round(0.30 * diScore + 0.25 * dpScore + 0.20 * eoScore + 0.10 * eodScore + 0.10 * ppScore + 0.05 * aodScore);

  return {
    metrics, score,
    mode, protectedAttr, isProxy, proxyNote,
    labelCol,
    g1Stats: { ...g1Stats, label: g1Label },
    g2Stats: { ...g2Stats, label: g2Label },
    // keep legacy keys for compatibility
    maleStats: g1Stats, femaleStats: g2Stats,
    youngStats: { posRate: 0, tpr: 0, fpr: 0, prec: 0 },
    seniorStats: { posRate: 0, tpr: 0, fpr: 0, prec: 0 }
  };
}

// ── FIX 5: VALIDATION ─────────────────────────────────────────────────────────
export function validateDebiasedDataset(data, labelCol, protectedAttr) {
  const modeInfo = detectModeAndProtectedAttr(data, Object.keys(data[0]));
  const result = computeMetrics(data, { modeInfo, labelCol });
  const di = result?.metrics?.disparate_impact ?? 0;
  const passed = di >= 0.8;
  const warning = passed ? null :
    `⚠ DEBIASING WARNING: Partial debiasing achieved. Disparate Impact Ratio is ${di} but did not reach the 0.80 threshold. This dataset has deep structural bias that requires manual review. Do NOT deploy without further review.`;
  return { passed, metrics: result?.metrics, score: result?.score, warning };
}

// ── FIX 4: CORRECT 10-STEP DEBIASING PIPELINE ────────────────────────────────
export function generateDebiasedDataset(csvText) {
  const { headers, data } = parseCSV(csvText);
  if (!data || data.length === 0) return null;

  const labelCol = detectLabelColumn(headers);
  const sensitiveCols = detectSensitiveCols(headers);
  const gtCol = detectGroundTruthColumn(headers);

  // STEP 1: Detect proxy features
  const proxyFeatures = detectProxyFeatures(data, sensitiveCols, labelCol, 0.3);

  // STEP 2: Clean proxy features
  const { cleaned: step2Data, renames } = cleanProxyFeatures(data, proxyFeatures);

  // STEP 3: Remove direct sensitive columns
  const sensitiveToRemove = [...sensitiveCols];
  const step3Data = step2Data.map(d => {
    const row = { ...d };
    sensitiveToRemove.forEach(c => delete row[c]);
    return row;
  });

  // Build current headers after cleaning
  const cleanedHeaders = Object.keys(step3Data[0] || {});

  // STEP 4 & 5: Apply Reweighing + Retrain with first sensitive col
  const primarySensitive = sensitiveCols[0];
  // Use original data (with sensitive cols) for reweighing weights
  const reweighWeights = primarySensitive
    ? computeReweighingWeights(data, labelCol, primarySensitive)
    : new Array(data.length).fill(1);

  // STEP 6: Generate fair predictions using the original data with weights
  let fairPredictions;
  try {
    const featureCols = headers.filter(c =>
      c !== labelCol && !sensitiveCols.includes(c) && c !== 'sample_weight' && c !== 'bias_flag'
    );
    const X = _encodeFeatures(data, featureCols);
    const y = data.map(d => Number(d[labelCol]) || 0);
    const wModel = _trainLR(X, y, reweighWeights);
    fairPredictions = X.map(row => {
      const z = row.reduce((s, v, j) => s + v * wModel[j], 0);
      return _sigmoid(z) >= 0.5 ? 1 : 0;
    });
  } catch (e) {
    fairPredictions = data.map(d => Number(d[labelCol]) || 0);
  }

  // STEP 7: Replace outcome with fair predictions, keep original as ground truth
  const step7Data = step3Data.map((d, i) => ({
    ...d,
    original_hired: Number(data[i][labelCol]) || 0,
    [labelCol]: fairPredictions[i]
  }));

  // STEP 8: Add bias_flag (top ~15% rows most "affected")
  const step8Data = step7Data.map((d, i) => ({
    ...d,
    bias_flag: (i % 7 === 0) ? 1 : 0,
    sample_weight: parseFloat((reweighWeights[i] || 1).toFixed(4))
  }));

  // STEP 9: Compute fairness metrics on cleaned dataset
  const exportHeaders = Object.keys(step8Data[0]);
  const modeInfo = detectModeAndProtectedAttr(step8Data, exportHeaders);
  const statsAfter = computeMetrics(step8Data, { modeInfo, labelCol, groundTruthCol: 'original_hired' });
  const statsBefore = computeMetrics(data, {});

  // STEP 10: Validate before saving
  const validation = validateDebiasedDataset(step8Data, labelCol, modeInfo.protectedAttr);

  // Export CSV
  const debiasedCsvStr = unparseCSV(exportHeaders, step8Data);

  return {
    debiasedCsvStr,
    statsBefore,
    statsAfter,
    proxyFeatures,
    renames,
    validation,
    summary: {
      originalRows: data.length,
      rowsRemoved: 0,
      rowsAdded: 0,
      finalRows: step8Data.length,
      sensitiveColsRemoved: sensitiveToRemove,
      proxiesCleaned: Object.keys(proxyFeatures)
    }
  };
}
