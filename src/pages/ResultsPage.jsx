import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockAnalysisResult, computeFairnessScore } from '../data/mockData';
import FairnessScore from '../components/FairnessScore';
import { GenderOutcomeChart, AgeOutcomeChart, MetricsThresholdChart, FairnessBreakdownChart } from '../components/BiasCharts';
import { AlertOctagon, DownloadCloud, Activity, Filter, Home, CheckCircle2, XCircle, AlertTriangle, Scale, Cpu, ChevronDown, ChevronUp, Zap, Brain } from 'lucide-react';
import Navbar from '../components/Navbar';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

const ResultsPage = () => {
  const navigate = useNavigate();
  const res = mockAnalysisResult;
  const fairness_score = computeFairnessScore(res.metrics);

  const [isDownloading, setIsDownloading] = useState(false);
  const [expandedMetric, setExpandedMetric] = useState(null);

  const getRiskColor = (risk) => {
    if (risk === 'Low')      return 'text-success-green bg-success-green/10 border-success-green/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]';
    if (risk === 'Moderate') return 'text-warning-amber bg-warning-amber/10 border-warning-amber/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]';
    return 'text-danger-red bg-danger-red/10 border-danger-red/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]';
  };

  // ── Per-group breakdown sub-component ────────────────────────────────────
  const GroupBreakdown = ({ breakdown, isRatio }) => {
    if (!breakdown) return null;
    return (
      <div className="mt-3 pt-3 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(breakdown).map(([attr, groups]) => (
          <div key={attr} className="bg-primary-dark/60 rounded-xl p-4 border border-white/5">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-text-muted mb-3">
              By {attr}
            </p>
            <div className="space-y-2">
              {groups.map((g, i) => {
                const maxVal = Math.max(...groups.map(x => x.value));
                const pct    = maxVal > 0 ? (g.value / maxVal) * 100 : 0;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-[11px] font-bold text-text-secondary w-28 shrink-0">{g.group}</span>
                    <div className="flex-1 h-1.5 bg-surface-dark rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent-cyan rounded-full transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-black text-white font-mono w-10 text-right">{g.value}</span>
                    <span className="text-[9px] text-text-muted w-28 hidden lg:block">{g.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ── Metric row with expandable per-group breakdown ────────────────────────
  const MetricRow = ({ id, name, value, threshold, isRatio, breakdown }) => {
    const passed  = isRatio ? value >= threshold : value <= threshold;
    const absVal  = Math.abs(value);
    const isOpen  = expandedMetric === id;

    return (
      <div className="border-b border-white/5 last:border-0">
        <div
          className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors group cursor-pointer"
          onClick={() => setExpandedMetric(isOpen ? null : id)}
        >
          <div className="flex-1">
            <div className="flex items-center mb-1">
              <span className="font-bold text-white text-sm tracking-wide">{name}</span>
              {passed ? (
                <span className="ml-3 px-2 py-0.5 bg-success-green/20 border border-success-green/30 text-success-green text-[10px] font-black uppercase tracking-widest rounded flex items-center">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> PASS
                </span>
              ) : (
                <span className="ml-3 px-2 py-0.5 bg-danger-red/20 border border-danger-red/30 text-danger-red text-[10px] font-black uppercase tracking-widest rounded flex items-center shadow-glow-red">
                  <XCircle className="w-3 h-3 mr-1" /> FAIL
                </span>
              )}
            </div>
            <div className="text-[11px] text-text-muted font-mono uppercase tracking-widest mt-2">
              Threshold: {isRatio ? `≥ ${threshold}` : `≤ ${threshold}`}
              <span className="mx-2 opacity-30">|</span>
              Actual: <span className="font-bold text-white bg-white/10 px-1.5 py-0.5 rounded">{value}</span>
            </div>
          </div>

          <div className="w-1/4 ml-6 hidden md:block">
            <div className="h-1.5 w-full bg-surface-dark border border-white/5 rounded-full overflow-hidden">
              <div
                className={cn("h-full transition-all duration-1000", passed ? 'bg-success-green shadow-[0_0_10px_rgba(16,185,129,0.8)]' : 'bg-danger-red shadow-[0_0_10px_rgba(239,68,68,0.8)]')}
                style={{ width: `${Math.min(100, isRatio ? (value / 1.5) * 100 : (absVal / 0.5) * 100)}%` }}
              />
            </div>
          </div>

          <div className="ml-4 shrink-0 text-text-muted group-hover:text-accent-cyan transition-colors">
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>

        <AnimatePresence>
          {isOpen && breakdown && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-5">
                <GroupBreakdown breakdown={breakdown} isRatio={isRatio} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  // ── Download report ───────────────────────────────────────────────────────
  const handleDownloadReport = () => {
    setIsDownloading(true);
    setTimeout(() => {
      setIsDownloading(false);

      let r = `UNBIASED.AI FAIRNESS AUDIT REPORT\n`;
      r += `Generated: ${new Date().toISOString()}\n`;
      r += `Dataset: biased_engineers_v4.csv\n`;
      r += `====================================\n\n`;

      r += `[ OVERALL COMPLIANCE ]\n`;
      r += `Fairness Score: ${fairness_score}/100  (formula: weighted avg of 6 metrics)\n`;
      r += `Risk Level:     ${res.risk_level.toUpperCase()}\n`;
      r += `Biased Attrs:   ${res.biased_attributes.join(', ')}\n\n`;

      r += `[ METRICS (6 total) ]\n`;
      const m = res.metrics;
      r += `- Demographic Parity Discrepancy : ${m.demographic_parity}  (threshold ≤ 0.10)  → FAIL\n`;
      r += `  [Gender] Male:0.73  Female:0.42  Δ=${m.demographic_parity}\n`;
      r += `  [Age]    Under30:0.72  30-40:0.55  Over40:0.34\n`;
      r += `- Disparate Impact Ratio         : ${m.disparate_impact}  (threshold ≥ 0.80)  → FAIL\n`;
      r += `  [Gender] Male(ref):1.00  Female:0.52\n`;
      r += `  [Age]    Under30(ref):1.00  30-40:0.76  Over40:0.47\n`;
      r += `- Equal Opportunity Variance     : ${m.equal_opportunity}  (threshold ≤ 0.10)  → FAIL\n`;
      r += `  [Gender] Male TPR:0.89  Female TPR:0.61  Δ=${m.equal_opportunity}\n`;
      r += `  [Age]    Under30 TPR:0.91  30-40:0.72  Over40:0.48\n`;
      r += `- Equalized Odds Difference      : ${m.equalized_odds_difference}  (threshold ≤ 0.10)  → FAIL\n`;
      r += `  [Gender] Male Avg(TPR,FPR):0.54  Female:0.38  Δ=${m.equalized_odds_difference}\n`;
      r += `  [Age]    Under30:0.55  30-40:0.43  Over40:0.31\n`;
      r += `- Predictive Parity (Precision)  : ${m.predictive_parity}  (threshold ≤ 0.10)  → FAIL\n`;
      r += `  [Gender] Male Precision:0.77  Female:0.55  Δ=${m.predictive_parity}\n`;
      r += `  [Age]    Under30:0.79  30-40:0.64  Over40:0.51\n`;
      r += `- Average Odds Difference        : ${m.average_odds_difference}  (threshold ≤ 0.10)  → FAIL\n`;
      r += `  [Gender] Male:0.54  Female:0.38  Δ=${m.average_odds_difference}\n`;
      r += `  [Age]    Under30:0.55  30-40:0.43  Over40:0.31\n\n`;

      r += `[ FAIRNESS SCORE FORMULA ]\n`;
      r += `DI score  = min(100, ${m.disparate_impact}/0.8 × 100)     = ${Math.round(Math.min(100,(m.disparate_impact/0.8)*100))}\n`;
      r += `DP score  = max(0,  100 − ${m.demographic_parity}/0.1 × 100) = 0\n`;
      r += `EO score  = max(0,  100 − ${m.equal_opportunity}/0.1 × 100)  = 0\n`;
      r += `EOD score = max(0,  100 − ${m.equalized_odds_difference}/0.1 × 100) = 0\n`;
      r += `PP score  = max(0,  100 − ${m.predictive_parity}/0.1 × 100) = 0\n`;
      r += `AOD score = max(0,  100 − ${m.average_odds_difference}/0.1 × 100) = 0\n`;
      r += `Weighted  = 0.30×DI + 0.25×DP + 0.20×EO + 0.10×EOD + 0.10×PP + 0.05×AOD = ${fairness_score}\n\n`;

      r += `[ REGULATORY WARNING ]\n`;
      r += `Disparate Impact (${m.disparate_impact}) violates 4/5ths rule (< 0.8).\n`;
      r += `EU AI Act Article 10 and US EEOC guidelines triggered.\n\n`;

      const bc = res.bias_contributors;
      r += `[ BIAS CONTRIBUTORS ]\n`;
      r += `Primary driver:   ${bc.primary.attribute}  → ${bc.primary.contribution}% contribution to bias\n`;
      r += `Secondary driver: ${bc.secondary.attribute} → ${bc.secondary.contribution}% contribution to bias\n\n`;
      r += `Top biased features (SHAP-ranked):\n`;
      bc.top_features.forEach(f => {
        r += `  ${f.rank}. ${f.feature} (correlated with ${f.correlated_with}, SHAP=${f.shap_score})\n`;
      });
      r += `\n`;

      r += `[ RECOMMENDED MITIGATIONS ]\n`;
      res.mitigation_suggestions.forEach((m, idx) => {
        r += `${idx + 1}. ${m.title} (Complexity: ${m.complexity}, Impact: ${m.impact})\n`;
        r += `   ${m.desc}\n\n`;
      });

      const blob = new Blob([r], { type: 'text/plain' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `Audit_Manifest_${Date.now()}.txt`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
    }, 1200);
  };

  const allMetrics = [
    { id: 'dp',  name: 'Demographic Parity Discrepancy',  value: res.metrics.demographic_parity,        threshold: 0.10, isRatio: false, breakdown: res.metric_group_breakdown.demographic_parity },
    { id: 'di',  name: 'Disparate Impact Ratio',          value: res.metrics.disparate_impact,           threshold: 0.80, isRatio: true,  breakdown: res.metric_group_breakdown.disparate_impact },
    { id: 'eo',  name: 'Equal Opportunity Variance',      value: res.metrics.equal_opportunity,          threshold: 0.10, isRatio: false, breakdown: res.metric_group_breakdown.equal_opportunity },
    { id: 'eod', name: 'Equalized Odds Difference',       value: res.metrics.equalized_odds_difference,  threshold: 0.10, isRatio: false, breakdown: res.metric_group_breakdown.equalized_odds_difference },
    { id: 'pp',  name: 'Predictive Parity (Precision)',   value: res.metrics.predictive_parity,          threshold: 0.10, isRatio: false, breakdown: res.metric_group_breakdown.predictive_parity },
    { id: 'aod', name: 'Average Odds Difference',         value: res.metrics.average_odds_difference,    threshold: 0.10, isRatio: false, breakdown: res.metric_group_breakdown.average_odds_difference },
  ];

  const bc = res.bias_contributors;

  return (
    <div className="min-h-screen bg-primary-dark font-sans overflow-hidden text-text-primary selection:bg-accent-cyan/30">
      <Navbar />

      <main className="max-w-6xl mx-auto px-6 pt-12 pb-24 relative">
        <div className="absolute top-1/4 -left-[20%] w-[800px] h-[800px] bg-danger-red/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 -right-[20%] w-[800px] h-[800px] bg-accent-cyan/5 rounded-full blur-[120px] pointer-events-none" />

        {/* Progress Indicator */}
        <motion.div
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-12 relative px-4"
        >
          <div className="absolute left-8 right-8 top-1/2 h-[1px] bg-white/10 -z-10 transform -translate-y-1/2" />
          <div className="absolute left-8 right-8 top-1/2 w-full h-[2px] bg-gradient-to-r from-accent-cyan via-accent-purple to-success-green -z-10 transform -translate-y-1/2 shadow-glow-cyan" />
          {['Dashboard', 'Ingestion', 'Analysis', 'Metrics'].map((step, idx) => (
            <div key={step} className="flex flex-col items-center">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm shadow-neo z-10 border transition-all duration-300",
                idx === 3
                  ? "bg-success-green border-success-light text-primary-dark shadow-[0_0_20px_rgba(16,185,129,0.5)] scale-110"
                  : "bg-surface-dark border-accent-cyan/50 text-accent-cyan shadow-glow-cyan"
              )}>
                <CheckCircle2 className={cn("w-6 h-6", idx === 3 ? "text-primary-dark" : "text-accent-cyan")} />
              </div>
              <span className="text-[10px] font-black mt-4 tracking-[0.2em] uppercase text-text-primary">{step}</span>
            </div>
          ))}
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          className="flex justify-end mb-8 space-x-4 relative z-10"
        >
          <button onClick={() => navigate('/dashboard')} className="flex items-center px-6 py-3 bg-surface-dark/80 backdrop-blur-md border border-white/10 rounded-xl text-xs uppercase tracking-widest font-black text-white hover:bg-surface-light hover:border-accent-cyan transition-all shadow-neo">
            <Home className="w-4 h-4 mr-2 text-accent-cyan" /> Return Data
          </button>
          <button onClick={handleDownloadReport} className="flex items-center px-8 py-3 bg-gradient-to-r from-accent-cyan to-accent-purple rounded-xl text-xs uppercase tracking-widest font-black text-white hover:shadow-glow-cyan transition-all shadow-neo group relative overflow-hidden">
            <div className="absolute inset-0 bg-white/20 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            {isDownloading ? (
              <span className="flex items-center relative z-10"><Cpu className="w-4 h-4 text-white animate-pulse mr-2" /> Encrypting...</span>
            ) : (
              <span className="flex items-center relative z-10"><DownloadCloud className="w-4 h-4 mr-2" /> Export .TXT</span>
            )}
          </button>
        </motion.div>

        {/* Score + Metrics Grid */}
        <motion.div
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-10 overflow-visible relative z-10"
        >
          {/* Score Card */}
          <div className="lg:col-span-4 glass-card rounded-3xl p-8 flex flex-col items-center justify-center text-center relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-48 h-48 bg-danger-red/10 rounded-full blur-[80px] pointer-events-none transition-all group-hover:bg-danger-red/20" />
            <h2 className="text-xs font-black text-text-muted mb-8 uppercase tracking-[0.3em] relative z-10">Fairness Index</h2>
            <div className="mb-6 transform scale-[1.3] relative z-10 filter drop-shadow-[0_0_20px_rgba(0,0,0,0.5)] mt-4">
              <FairnessScore score={fairness_score} />
            </div>
            {/* Verdict line */}
            <div className="text-center px-4 py-3 mb-4 bg-danger-red/10 border border-danger-red/20 rounded-2xl relative z-10">
              <p className="text-[11px] font-black text-danger-red uppercase tracking-widest mb-1">Verdict</p>
              <p className="text-xs text-white/80 font-medium leading-relaxed">
                This model is <span className="text-danger-red font-black">NOT safe to deploy.</span> 5 of 6 metrics indicate severe discrimination against female candidates. <span className="text-warning-amber font-bold">Immediate remediation required</span> before any production use.
              </p>
            </div>
            <div className={`mt-2 font-black px-8 py-3 rounded-xl border flex items-center justify-center space-x-3 text-lg uppercase tracking-widest ${getRiskColor(res.risk_level)} relative z-10`}>
              <AlertOctagon className="w-5 h-5 animate-pulse" />
              <span>{res.risk_level} Risk</span>
            </div>
            <p className="mt-8 text-sm text-text-secondary font-medium leading-relaxed max-w-xs relative z-10">
              Model demonstrates severe statistical bias against protected subgroups.
              <span className="text-danger-red font-bold block mt-2">DO NOT DEPLOY.</span>
            </p>
            <div className="mt-8 pt-6 border-t border-white/5 w-full flex flex-col items-start text-left relative z-10">
              <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-4">Quarantined Vectors</span>
              <div className="flex flex-wrap gap-3">
                {res.biased_attributes.map(attr => (
                  <span key={attr} className="px-4 py-2 bg-danger-red/20 text-danger-red shadow-glow-red text-[11px] font-black rounded-lg border border-danger-red/30 uppercase tracking-widest flex items-center">
                    <Filter className="w-3 h-3 mr-2 opacity-70" /> {attr}
                  </span>
                ))}
              </div>
            </div>

            {/* Formula breakdown mini-panel */}
            <div className="mt-6 pt-6 border-t border-white/5 w-full text-left relative z-10">
              <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-3 block">Score Formula Weights</span>
              {[
                { label: 'Disparate Impact', weight: '30%', score: Math.round(Math.min(100, (res.metrics.disparate_impact / 0.8) * 100)) },
                { label: 'Demographic Parity', weight: '25%', score: 0 },
                { label: 'Equal Opportunity', weight: '20%', score: 0 },
                { label: 'Equalized Odds', weight: '10%', score: 0 },
                { label: 'Predictive Parity', weight: '10%', score: 0 },
                { label: 'Avg Odds Diff', weight: '5%', score: 0 },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-text-secondary font-medium">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-text-muted font-mono">{item.weight}</span>
                    <span className={cn("text-[10px] font-black px-1.5 py-0.5 rounded", item.score > 0 ? 'text-success-green bg-success-green/10' : 'text-danger-red bg-danger-red/10')}>{item.score}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* All 6 Metrics */}
          <div className="lg:col-span-8 glass-card rounded-3xl p-10 flex flex-col relative overflow-hidden">
            <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-accent-cyan/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="flex items-center justify-between mb-6 pb-6 border-b border-white/10">
              <div>
                <h3 className="text-3xl font-black text-white flex items-center"><Activity className="w-6 h-6 mr-3 text-accent-cyan" /> Algorithm Telemetry</h3>
                <p className="text-sm text-text-muted mt-2 font-medium tracking-wide">6 metrics evaluated against EU AI Act &amp; EEOC thresholds. <span className="text-accent-cyan">Click any row</span> to see per-group breakdown.</p>
              </div>
            </div>
            <div className="flex-1 flex flex-col gap-0 relative z-10">
              {allMetrics.map(m => (
                <MetricRow key={m.id} {...m} />
              ))}
            </div>

            {/* Regulatory Alert */}
            <div className="mt-8 bg-danger-red/10 border border-danger-red/40 rounded-2xl p-6 flex items-start shadow-glow-red relative z-10">
              <div className="bg-danger-red p-3 rounded-xl mr-5 shadow-lg relative overflow-hidden shrink-0">
                <div className="absolute inset-0 bg-white/20 animate-pulse-slow" />
                <AlertTriangle className="w-6 h-6 text-white relative z-10" />
              </div>
              <div className="mt-1">
                <h4 className="text-sm font-black text-danger-red uppercase tracking-widest mb-2 flex items-center">
                  Regulatory Violation <span className="mx-3 opacity-30 text-white">|</span> EU AI Act &amp; EEOC
                </h4>
                <p className="text-sm text-white/80 leading-relaxed font-medium">
                  Disparate Impact Ratio (<span className="font-bold text-white bg-white/10 px-1 rounded">{res.metrics.disparate_impact}</span>) violates the legal 4/5ths rule (&lt; 0.8). All 6 fairness metrics are failing their regulatory thresholds. Deploying this system triggers compliance failure under EU Article 10.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── BIAS CONTRIBUTORS ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="mb-12"
        >
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-surface-dark border border-white/10 rounded-xl flex items-center justify-center mr-4 shadow-neo">
              <Brain className="w-6 h-6 text-accent-purple" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white">Bias Contributors</h3>
              <p className="text-xs font-bold text-text-muted mt-1 uppercase tracking-widest">SHAP-based feature attribution analysis</p>
            </div>
          </div>
          {/* SHAP explanation for non-technical users */}
          <div className="mb-6 px-5 py-3 bg-accent-purple/10 border border-accent-purple/20 rounded-2xl flex items-start gap-3">
            <Zap className="w-4 h-4 text-accent-purple shrink-0 mt-0.5" />
            <p className="text-xs text-text-secondary font-medium leading-relaxed">
              <span className="text-accent-purple font-black">What are SHAP values?</span> They indicate how strongly each feature pushes the model toward a biased outcome. A higher SHAP score = that feature is a stronger driver of discrimination. Values above 0.3 are significant.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Attribute Contribution */}
            <div className="glass-card p-8 rounded-3xl">
              <h4 className="text-white font-black mb-6 text-sm uppercase tracking-widest opacity-80">Attribute Contribution to Bias</h4>
              <div className="space-y-5">
                {[bc.primary, bc.secondary].map((driver, i) => (
                  <div key={i}>
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <span className={cn("text-[9px] uppercase font-black px-2 py-1 rounded tracking-widest", i === 0 ? 'bg-danger-red/20 text-danger-red border border-danger-red/30' : 'bg-warning-amber/20 text-warning-amber border border-warning-amber/30')}>
                          {i === 0 ? 'Primary' : 'Secondary'}
                        </span>
                        <span className="text-white font-black text-base uppercase tracking-wider">{driver.attribute}</span>
                      </div>
                      <span className="text-2xl font-black text-white">{driver.contribution}%</span>
                    </div>
                    <div className="h-3 w-full bg-surface-dark rounded-full overflow-hidden border border-white/5">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${driver.contribution}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, delay: i * 0.2 }}
                        className={cn("h-full rounded-full", i === 0 ? 'bg-danger-red shadow-[0_0_10px_rgba(239,68,68,0.6)]' : 'bg-warning-amber shadow-[0_0_10px_rgba(245,158,11,0.6)]')}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Biased Features */}
            <div className="glass-card p-8 rounded-3xl">
              <h4 className="text-white font-black mb-6 text-sm uppercase tracking-widest opacity-80">Top Biased Features (SHAP-Ranked)</h4>
              <div className="space-y-3">
                {bc.top_features.map((f, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 bg-surface-dark/60 rounded-xl border border-white/5 hover:border-accent-cyan/30 transition-colors group">
                    <span className="w-7 h-7 rounded-lg bg-accent-cyan/10 border border-accent-cyan/20 text-accent-cyan text-xs font-black flex items-center justify-center shrink-0">{f.rank}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-white truncate">{f.feature}</p>
                      <p className="text-[10px] text-text-muted font-medium mt-0.5 flex items-center gap-1">
                        <Zap className="w-3 h-3 text-warning-amber" />
                        correlated with <span className="text-warning-amber font-bold">{f.correlated_with}</span>
                      </p>
                    </div>
                    <div className="flex flex-col items-end shrink-0">
                      <span className="text-[10px] text-text-muted uppercase tracking-widest font-bold">SHAP</span>
                      <span className="text-sm font-black text-accent-cyan">{f.shap_score}</span>
                    </div>
                    <div className="w-16 h-1.5 bg-surface-dark rounded-full overflow-hidden hidden md:block">
                      <div className="h-full bg-accent-cyan/70 rounded-full" style={{ width: `${(f.shap_score / 0.41) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Charts & Visualizations */}
        <motion.div
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          className="mb-12"
        >
          <div className="flex items-center mb-8">
            <div className="w-12 h-12 bg-surface-dark border border-white/10 rounded-xl flex items-center justify-center mr-4 shadow-neo">
              <Scale className="w-6 h-6 text-accent-purple" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white">Subgroup Analysis</h3>
              <p className="text-xs font-bold text-text-muted mt-1 uppercase tracking-widest">Identifying demographic fractures</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="glass-card p-8 rounded-3xl hover:-translate-y-1 transition-all duration-300">
              <h4 className="text-white font-black mb-8 text-center text-sm uppercase tracking-widest opacity-80">Outcome: Gender Vector</h4>
              <GenderOutcomeChart data={res.group_stats} />
              <div className="mt-6 bg-surface-dark border border-white/5 p-3 rounded-xl">
                <p className="text-[11px] text-accent-cyan text-center font-bold uppercase tracking-wider">Anomaly: Males selected at nearly 2× the rate of females.</p>
              </div>
            </div>
            <div className="glass-card p-8 rounded-3xl hover:-translate-y-1 transition-all duration-300">
              <h4 className="text-white font-black mb-8 text-center text-sm uppercase tracking-widest opacity-80">Outcome: Age Vector</h4>
              <AgeOutcomeChart data={res.age_stats} />
              <div className="mt-6 bg-surface-dark border border-white/5 p-3 rounded-xl">
                <p className="text-[11px] text-accent-purple text-center font-bold uppercase tracking-wider">Anomaly: Negative correlation against candidates &gt;40.</p>
              </div>
            </div>
            <div className="glass-card p-8 rounded-3xl hover:-translate-y-1 transition-all duration-300">
              <h4 className="text-white font-black mb-8 text-center text-sm uppercase tracking-widest opacity-80">All 6 Metrics vs Threshold</h4>
              <MetricsThresholdChart metrics={res.metrics} />
              <div className="mt-6 bg-surface-dark border border-white/5 p-3 rounded-xl">
                <p className="text-[11px] text-warning-amber text-center font-bold uppercase tracking-wider">All 6 metrics breaching regulatory thresholds.</p>
              </div>
            </div>
            <div className="glass-card p-8 rounded-3xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
              <h4 className="text-white font-black mb-4 text-center text-sm uppercase tracking-widest opacity-80">Score Penalty Breakdown</h4>
              <div className="flex-1 min-h-[220px]"><FairnessBreakdownChart score={fairness_score} /></div>
              <div className="mt-2 bg-surface-dark border border-white/5 p-3 rounded-xl">
                <p className="text-[11px] text-danger-red text-center font-bold uppercase tracking-wider">Significant margin lost due to bias penalties.</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Mitigation Subsystem */}
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
          <div className="flex items-center mb-8">
            <div className="w-12 h-12 bg-surface-dark border border-white/10 rounded-xl flex items-center justify-center mr-4 shadow-neo">
              <Cpu className="w-6 h-6 text-success-green" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white">Patch Protocols</h3>
              <p className="text-xs font-bold text-text-muted mt-1 uppercase tracking-widest">Compiler suggesting algorithmic fixes</p>
            </div>
          </div>
          <div className="space-y-6">
            {res.mitigation_suggestions.map((mitigation, idx) => (
              <div key={idx} className="glass-card p-8 rounded-3xl hover:border-accent-cyan/50 hover:shadow-glow-cyan transition-all duration-500 overflow-hidden relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-accent-cyan/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="flex flex-col md:flex-row md:items-center relative z-10">
                  <div className="w-16 h-16 rounded-2xl bg-surface-dark border border-white/10 text-white shadow-neo flex items-center justify-center font-black text-2xl mb-6 md:mb-0 md:mr-8 shrink-0 relative overflow-hidden group-hover:border-accent-cyan transition-colors">
                    <div className="absolute bottom-0 w-full h-1 bg-accent-cyan group-hover:h-full transition-all duration-500 opacity-20" />
                    {idx + 1}
                  </div>
                  <div className="flex-1 pr-6">
                    <h4 className="text-xl font-black text-white mb-3 group-hover:text-accent-cyan transition-colors">{mitigation.title}</h4>
                    <p className="text-sm text-text-secondary font-medium leading-relaxed">{mitigation.desc}</p>
                  </div>
                  <div className="flex items-center gap-6 mt-8 md:mt-0 p-5 rounded-2xl bg-surface-dark/50 border border-white/5 shrink-0">
                    <div className="flex flex-col text-right items-center">
                      <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-2">Delta</span>
                      <span className="text-2xl font-black text-success-green">{mitigation.improvement}</span>
                    </div>
                    <div className="h-12 w-px bg-white/10" />
                    <div className="flex flex-col gap-3">
                      <span className={cn(
                        "text-[9px] uppercase font-black px-3 py-1.5 rounded flex items-center justify-center shadow-neo border tracking-widest",
                        mitigation.impact.includes('High') ? 'bg-accent-purple/20 text-accent-purple-glow border-accent-purple/30' : 'bg-surface-light text-white border-white/10'
                      )}>
                        Impact <span className="mx-2 opacity-30">|</span> {mitigation.impact}
                      </span>
                      <span className={cn(
                        "text-[9px] uppercase font-black px-3 py-1.5 rounded flex justify-center shadow-neo border tracking-widest",
                        mitigation.complexity === 'Easy'   ? 'bg-success-green/20 text-success-green border-success-green/30' :
                        mitigation.complexity === 'Medium' ? 'bg-warning-amber/20 text-warning-amber border-warning-amber/30' :
                        'bg-danger-red/20 text-danger-red border-danger-red/30'
                      )}>
                        Effort <span className="mx-2 opacity-30">|</span> {mitigation.complexity}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── NEXT STEPS ────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="mt-12"
        >
          <div className="glass-card rounded-3xl p-8 border border-success-green/20 bg-success-green/5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-success-green via-accent-cyan to-transparent opacity-60" />
            <div className="flex items-center mb-6">
              <div className="w-10 h-10 bg-success-green/20 border border-success-green/30 rounded-xl flex items-center justify-center mr-4">
                <CheckCircle2 className="w-5 h-5 text-success-green" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">Next Steps</h3>
                <p className="text-xs font-bold text-text-muted mt-0.5 uppercase tracking-widest">Required actions before re-deployment</p>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { step: 1, action: 'Apply Mitigation 1 — Remove sensitive attributes (gender, age) from training data.', urgency: 'Today',         color: 'text-danger-red',    bg: 'bg-danger-red/10 border-danger-red/20' },
                { step: 2, action: 'Apply AIF360 Reweighing to re-balance sample weights across demographic groups.',  urgency: 'This Week',      color: 'text-warning-amber', bg: 'bg-warning-amber/10 border-warning-amber/20' },
                { step: 3, action: 'Re-run this audit after each mitigation. Target Fairness Score: ≥ 80/100 before any deployment.',            urgency: 'After Each Fix', color: 'text-accent-cyan',  bg: 'bg-accent-cyan/10 border-accent-cyan/20' },
                { step: 4, action: 'Save this report (Export .TXT above) for compliance records — required under EU AI Act Article 13.',         urgency: 'Required',       color: 'text-success-green', bg: 'bg-success-green/10 border-success-green/20' },
              ].map(({ step, action, urgency, color, bg }) => (
                <div key={step} className={`flex items-start gap-4 p-4 rounded-xl border ${bg}`}>
                  <span className={`text-xs font-black uppercase tracking-widest shrink-0 px-2 py-1 rounded ${color} bg-black/20 border border-current/20`}>{urgency}</span>
                  <p className="text-sm text-white/90 font-medium leading-relaxed">
                    <span className="text-text-muted font-black mr-2">{step}.</span>{action}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

      </main>
    </div>
  );
};

export default ResultsPage;
