import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockAnalysisResult, computeFairnessScore } from '../data/mockData';
import FairnessScore from '../components/FairnessScore';
import { GenderOutcomeChart, AgeOutcomeChart, MetricsThresholdChart, FairnessBreakdownChart } from '../components/BiasCharts';
import { AlertOctagon, DownloadCloud, Activity, Filter, Home, CheckCircle2, XCircle, AlertTriangle, Scale, Cpu, ChevronDown, ChevronUp, Zap, Brain, ArrowRight, Info } from 'lucide-react';
import Navbar from '../components/Navbar';
import { cn } from '../lib/utils';

const ResultsPage = () => {
  const navigate = useNavigate();

  // ── Load real analysis result from localStorage, fallback to mock ──────────
  const [realResult, setRealResult] = useState(null);
  useEffect(() => {
    try {
      const stored = localStorage.getItem('analysisResult');
      if (stored) setRealResult(JSON.parse(stored));
    } catch (e) { /* use mock */ }
  }, []);

  const isRealData = !!realResult;
  const res = mockAnalysisResult;
  const fairness_score = isRealData ? (realResult.score ?? 0) : computeFairnessScore(res.metrics);
  const displayMetrics = isRealData ? realResult.metrics : res.metrics;
  const riskLevel = isRealData ? (realResult.riskLevel ?? 'High') : res.risk_level;
  const isProxyMode = isRealData && realResult.isProxy;
  const proxyNote = isRealData ? realResult.proxyNote : null;

  const [isDownloading, setIsDownloading] = useState(false);
  const [expandedMetric, setExpandedMetric] = useState(null);
  const [insights, setInsights] = useState(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [insightsError, setInsightsError] = useState(null);

  useEffect(() => {
    const fetchGeminiInsights = async () => {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) { setInsightsError('No Gemini API key found in .env.local'); return; }
      setIsLoadingInsights(true);
      const m = displayMetrics;
      const promptText = `SYSTEM: You are a fairness audit AI assistant. Explain AI bias findings to non-technical business stakeholders. Be specific, use actual numbers, be actionable.

USER: Fairness audit report for a hiring AI system:
- Fairness Score: ${fairness_score}/100
- Demographic Parity: ${m.demographic_parity} (threshold ≤ 0.10)
- Disparate Impact Ratio: ${m.disparate_impact} (threshold ≥ 0.80)
- Equal Opportunity Difference: ${m.equal_opportunity} (threshold ≤ 0.10)
- Equalized Odds Difference: ${m.equalized_odds_difference} (threshold ≤ 0.10)
- Predictive Parity: ${m.predictive_parity} (threshold ≤ 0.10)
- Average Odds Difference: ${m.average_odds_difference} (threshold ≤ 0.10)
${isProxyMode ? `- Note: This is a DEBIASED dataset. Bias measured via proxy column since sensitive columns were removed.` : `- Primary bias driver: gender (62% contribution)`}

Generate exactly 3 insight cards. Each card must have:
1. A short bold title (max 6 words)
2. A 2-3 sentence plain English explanation using actual numbers
3. One specific action the company should take

Format as JSON array EXACTLY like this:
[{"title": "...", "insight": "...", "action": "..."}]`;
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }], generationConfig: { responseMimeType: 'application/json' } })
        });
        const data = await response.json();
        if (data.candidates?.length > 0) {
          try { setInsights(JSON.parse(data.candidates[0].content.parts[0].text)); }
          catch (e) { setInsightsError('Failed to parse AI response.'); }
        } else { setInsightsError(data.error?.message ?? 'AI returned empty response.'); }
      } catch (err) { setInsightsError(err.message); }
      finally { setIsLoadingInsights(false); }
    };
    fetchGeminiInsights();
  }, [fairness_score, displayMetrics, isProxyMode]);

  const getRiskColor = (risk) => {
    if (risk === 'Low')      return 'text-success-green bg-success-green/10 border-success-green/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]';
    if (risk === 'Moderate') return 'text-warning-amber bg-warning-amber/10 border-warning-amber/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]';
    return 'text-danger-red bg-danger-red/10 border-danger-red/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]';
  };

  // Build the 6 metrics rows using real data if available
  const allMetrics = [
    { id: 'dp',  name: 'Demographic Parity Discrepancy',  value: displayMetrics.demographic_parity,        threshold: 0.10, isRatio: false, breakdown: res.metric_group_breakdown.demographic_parity },
    { id: 'di',  name: 'Disparate Impact Ratio',          value: displayMetrics.disparate_impact,           threshold: 0.80, isRatio: true,  breakdown: res.metric_group_breakdown.disparate_impact },
    { id: 'eo',  name: 'Equal Opportunity Variance',      value: displayMetrics.equal_opportunity,          threshold: 0.10, isRatio: false, breakdown: res.metric_group_breakdown.equal_opportunity },
    { id: 'eod', name: 'Equalized Odds Difference',       value: displayMetrics.equalized_odds_difference,  threshold: 0.10, isRatio: false, breakdown: res.metric_group_breakdown.equalized_odds_difference },
    { id: 'pp',  name: 'Predictive Parity (Precision)',   value: displayMetrics.predictive_parity,          threshold: 0.10, isRatio: false, breakdown: res.metric_group_breakdown.predictive_parity },
    { id: 'aod', name: 'Average Odds Difference',         value: displayMetrics.average_odds_difference,    threshold: 0.10, isRatio: false, breakdown: res.metric_group_breakdown.average_odds_difference },
  ];

  const failCount = allMetrics.filter(m => m.isRatio ? m.value < m.threshold : m.value > m.threshold).length;

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

  const MetricRow = ({ id, name, value, threshold, isRatio, breakdown }) => {
    const passed  = isRatio ? value >= threshold : value <= threshold;
    const absVal  = Math.abs(value);
    const isOpen  = expandedMetric === id;

    return (
      <div className="border-b border-white/5 last:border-0 overflow-hidden">
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

        {isOpen && breakdown && (
          <div className="px-4 pb-5 transition-all">
            <GroupBreakdown breakdown={breakdown} isRatio={isRatio} />
          </div>
        )}
      </div>
    );
  };

  const handleDownloadReport = () => {
    setIsDownloading(true);
    setTimeout(() => {
      setIsDownloading(false);
      let r = `UNBIASED.AI FAIRNESS AUDIT REPORT\n`;
      r += `Generated: ${new Date().toISOString()}\n`;
      const blob = new Blob([r], { type: 'text/plain' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `Audit_Manifest_${Date.now()}.txt`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
    }, 1200);
  };

  const bc = res.bias_contributors;

  return (
    <div className="min-h-screen bg-primary-dark font-sans overflow-hidden text-text-primary selection:bg-accent-cyan/30">
      <Navbar />

      <main className="max-w-6xl mx-auto px-6 pt-12 pb-24 relative">
        <div className="absolute top-1/4 -left-[20%] w-[800px] h-[800px] bg-danger-red/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 -right-[20%] w-[800px] h-[800px] bg-accent-cyan/5 rounded-full blur-[120px] pointer-events-none" />

        {/* Proxy Mode Banner */}
        {isProxyMode && proxyNote && (
          <div className="mb-6 flex items-start gap-3 px-5 py-4 bg-warning-amber/10 border border-warning-amber/30 rounded-2xl">
            <Info className="w-5 h-5 text-warning-amber shrink-0 mt-0.5" />
            <p className="text-xs text-white/80 font-medium leading-relaxed">
              <span className="text-warning-amber font-black uppercase tracking-widest mr-2">Proxy Analysis Mode</span>
              {proxyNote}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between mb-12 relative px-4">
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
        </div>

        <div className="flex justify-end mb-8 space-x-4 relative z-10">
          <button onClick={() => navigate('/dashboard')} className="flex items-center px-6 py-3 bg-surface-dark/80 backdrop-blur-md border border-white/10 rounded-xl text-xs uppercase tracking-widest font-black text-white hover:bg-surface-light hover:border-accent-cyan transition-all shadow-neo">
            <Home className="w-4 h-4 mr-2 text-accent-cyan" /> Return Data
          </button>
          <button onClick={handleDownloadReport} className="flex items-center px-8 py-3 bg-gradient-to-r from-accent-cyan to-accent-purple rounded-xl text-xs uppercase tracking-widest font-black text-white hover:shadow-glow-cyan transition-all shadow-neo group relative overflow-hidden">
            {isDownloading ? (
              <span className="flex items-center relative z-10"><Cpu className="w-4 h-4 text-white animate-pulse mr-2" /> Encrypting...</span>
            ) : (
              <span className="flex items-center relative z-10"><DownloadCloud className="w-4 h-4 mr-2" /> Export .TXT</span>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-10 overflow-visible relative z-10">
          <div className="lg:col-span-4 glass-card rounded-3xl p-8 flex flex-col items-center justify-center text-center relative overflow-hidden group">
            <h2 className="text-xs font-black text-text-muted mb-8 uppercase tracking-[0.3em] relative z-10">Fairness Index</h2>
            <div className="mb-6 transform scale-[1.3] relative z-10 filter drop-shadow-[0_0_20px_rgba(0,0,0,0.5)] mt-4">
              <FairnessScore score={fairness_score} />
            </div>
            <div className={`text-center px-4 py-3 mb-4 rounded-2xl relative z-10 border ${
              riskLevel === 'Low'
                ? 'bg-success-green/10 border-success-green/20'
                : riskLevel === 'Moderate'
                ? 'bg-warning-amber/10 border-warning-amber/20'
                : 'bg-danger-red/10 border-danger-red/20'
            }`}>
              <p className={`text-[11px] font-black uppercase tracking-widest mb-1 ${
                riskLevel === 'Low' ? 'text-success-green' : riskLevel === 'Moderate' ? 'text-warning-amber' : 'text-danger-red'
              }`}>Verdict</p>
              <p className="text-xs text-white/80 font-medium leading-relaxed">
                {riskLevel === 'Low'
                  ? <><span className="text-success-green font-black">Safe to deploy.</span> {failCount} of 6 metrics are flagged. Fairness thresholds met.</>  
                  : riskLevel === 'Moderate'
                  ? <><span className="text-warning-amber font-black">Review required.</span> {failCount} of 6 metrics indicate potential discrimination.</>  
                  : <><span className="text-danger-red font-black">NOT safe to deploy.</span> {failCount} of 6 metrics indicate severe discrimination.</>  
                }
              </p>
            </div>
            <div className={`mt-2 font-black px-8 py-3 rounded-xl border flex items-center justify-center space-x-3 text-lg uppercase tracking-widest ${getRiskColor(riskLevel)} relative z-10`}>
              <AlertOctagon className="w-5 h-5 animate-pulse" />
              <span>{riskLevel} Risk</span>
            </div>
            <div className="mt-8 pt-6 border-t border-white/5 w-full flex flex-col items-start text-left relative z-10">
              <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-4">
                {isProxyMode ? 'Proxy Columns Detected' : 'Quarantined Vectors'}
              </span>
              <div className="flex flex-wrap gap-3">
                {(isProxyMode
                  ? (realResult?.proxiesCleaned ?? [])
                  : res.biased_attributes
                ).map(attr => (
                  <span key={attr} className="px-4 py-2 bg-danger-red/20 text-danger-red shadow-glow-red text-[11px] font-black rounded-lg border border-danger-red/30 uppercase tracking-widest flex items-center">
                    <Filter className="w-3 h-3 mr-2 opacity-70" /> {attr}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 glass-card rounded-3xl p-10 flex flex-col relative overflow-hidden">
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

            {displayMetrics.disparate_impact < 0.8 ? (
              <div className="mt-8 bg-danger-red/10 border border-danger-red/40 rounded-2xl p-6 flex items-start shadow-glow-red relative z-10">
                <div className="bg-danger-red p-3 rounded-xl mr-5 shadow-lg relative overflow-hidden shrink-0">
                  <AlertTriangle className="w-6 h-6 text-white relative z-10" />
                </div>
                <div className="mt-1">
                  <h4 className="text-sm font-black text-danger-red uppercase tracking-widest mb-2 flex items-center">
                    Regulatory Violation <span className="mx-3 opacity-30 text-white">|</span> EU AI Act &amp; EEOC
                  </h4>
                  <p className="text-sm text-white/80 leading-relaxed font-medium">
                    Disparate Impact Ratio (<span className="font-bold text-white bg-white/10 px-1 rounded">{displayMetrics.disparate_impact}</span>) violates the legal 4/5ths rule (&lt; 0.8). {failCount} of 6 fairness metrics are failing their regulatory thresholds.
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-8 bg-success-green/10 border border-success-green/40 rounded-2xl p-6 flex items-start relative z-10">
                <div className="bg-success-green p-3 rounded-xl mr-5 shadow-lg shrink-0">
                  <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
                <div className="mt-1">
                  <h4 className="text-sm font-black text-success-green uppercase tracking-widest mb-2">
                    Regulatory Compliance <span className="mx-3 opacity-30 text-white">|</span> EU AI Act &amp; EEOC
                  </h4>
                  <p className="text-sm text-white/80 leading-relaxed font-medium">
                    Disparate Impact Ratio (<span className="font-bold text-white bg-white/10 px-1 rounded">{displayMetrics.disparate_impact}</span>) meets the legal 4/5ths rule (≥ 0.8). {isProxyMode ? 'Debiased dataset passes fairness thresholds.' : 'All key metrics within acceptable range.'}
                  </p>
                </div>
              </div>
            )}

              </div>
            </div>
          </div>
        </div>

        {/* FEATURE 3: GEMINI AI INSIGHTS MOVED TO THE TOP */}
        <div className="mb-12">
          <div className="glass-card rounded-3xl p-10 border border-accent-cyan/30 shadow-glow-cyan bg-accent-cyan/5">
            <h3 className="text-2xl font-black text-white mb-2 flex items-center">
              <Brain className="w-7 h-7 mr-3 text-accent-cyan" /> Executive Summary
            </h3>
            <p className="text-xs text-accent-cyan font-bold uppercase tracking-widest mb-8">AI-Generated Insights via Google Gemini</p>
            
            {isLoadingInsights ? (
              <div className="bg-surface-dark p-8 rounded-2xl border border-white/10 text-center flex flex-col items-center justify-center">
                <Brain className="w-10 h-10 text-accent-cyan animate-pulse mb-4" />
                <p className="text-accent-cyan text-sm font-bold tracking-widest uppercase mb-1">Connecting to Vertex AI...</p>
                <p className="text-text-muted text-xs">Translating telemetry into executive insights.</p>
              </div>
            ) : insightsError ? (
              <div className="bg-danger-red/10 border border-danger-red/30 p-6 rounded-xl">
                <p className="text-danger-red font-black flex items-center mb-2">
                  <AlertTriangle className="w-5 h-5 mr-2" /> Error generating AI insights
                </p>
                <p className="text-sm text-text-secondary">{insightsError}</p>
              </div>
            ) : insights ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {insights.map((card, idx) => (
                  <div key={idx} className="bg-surface-dark/80 border border-white/10 rounded-2xl p-6 hover:border-accent-cyan/50 hover:shadow-glow-cyan transition-all flex flex-col h-full">
                    <h4 className="text-white font-black text-lg mb-3 pb-3 border-b border-white/10">{card.title}</h4>
                    <p className="text-sm text-text-secondary leading-relaxed mb-6 flex-grow">{card.insight}</p>
                    <div className="bg-accent-cyan/10 border border-accent-cyan/30 p-4 rounded-xl mt-auto">
                      <p className="text-xs text-white font-medium flex items-start">
                        <span className="text-accent-cyan font-black uppercase tracking-widest mr-2 mt-0.5 shrink-0">Action:</span> 
                        {card.action}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {/* ── BIAS CONTRIBUTORS ─────────────────────────────────────────── */}
        <div className="mb-12">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-surface-dark border border-white/10 rounded-xl flex items-center justify-center mr-4 shadow-neo">
              <Brain className="w-6 h-6 text-accent-purple" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white">Bias Contributors</h3>
              <p className="text-xs font-bold text-text-muted mt-1 uppercase tracking-widest">SHAP-based feature attribution analysis</p>
            </div>
          </div>
          
          <div className="mb-6 px-5 py-3 bg-accent-purple/10 border border-accent-purple/20 rounded-2xl flex items-start gap-3">
            <Zap className="w-4 h-4 text-accent-purple shrink-0 mt-0.5" />
            <p className="text-xs text-text-secondary font-medium leading-relaxed">
              <span className="text-accent-purple font-black">What are SHAP values?</span> SHAP values indicate how strongly each feature pushes the model toward biased outcomes. Higher = worse.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
                      <div
                        className={cn("h-full rounded-full transition-all duration-1000", i === 0 ? 'bg-danger-red shadow-[0_0_10px_rgba(239,68,68,0.6)]' : 'bg-warning-amber shadow-[0_0_10px_rgba(245,158,11,0.6)]')}
                        style={{ width: `${driver.contribution}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

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
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Charts & Visualizations */}
        <div className="mb-12">
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
            </div>
            <div className="glass-card p-8 rounded-3xl hover:-translate-y-1 transition-all duration-300">
              <h4 className="text-white font-black mb-8 text-center text-sm uppercase tracking-widest opacity-80">Outcome: Age Vector</h4>
              <AgeOutcomeChart data={res.age_stats} />
            </div>
            <div className="glass-card p-8 rounded-3xl hover:-translate-y-1 transition-all duration-300">
              <h4 className="text-white font-black mb-8 text-center text-sm uppercase tracking-widest opacity-80">All 6 Metrics vs Threshold</h4>
              <MetricsThresholdChart metrics={res.metrics} />
            </div>
            <div className="glass-card p-8 rounded-3xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
              <h4 className="text-white font-black mb-4 text-center text-sm uppercase tracking-widest opacity-80">Score Penalty Breakdown</h4>
              <div className="flex-1 min-h-[220px]"><FairnessBreakdownChart score={fairness_score} /></div>
            </div>
          </div>
        </div>

        {/* Mitigation Subsystem */}
        <div className="mb-12">
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
                <div className="flex flex-col md:flex-row md:items-center relative z-10">
                  <div className="w-16 h-16 rounded-2xl bg-surface-dark border border-white/10 text-white shadow-neo flex items-center justify-center font-black text-2xl mb-6 md:mb-0 md:mr-8 shrink-0 relative overflow-hidden group-hover:border-accent-cyan transition-colors">
                    {idx + 1}
                  </div>
                  <div className="flex-1 pr-6">
                    <h4 className="text-xl font-black text-white mb-3 group-hover:text-accent-cyan transition-colors">{mitigation.title}</h4>
                    <p className="text-sm text-text-secondary font-medium leading-relaxed">{mitigation.desc}</p>
                  </div>
                  <div className="flex items-center gap-6 mt-8 md:mt-0 p-5 rounded-2xl bg-surface-dark/50 border border-white/5 shrink-0">
                    <div className="flex flex-col gap-3">
                      <span className={cn(
                        "text-[9px] uppercase font-black px-3 py-1.5 rounded flex items-center justify-center shadow-neo border tracking-widest border-surface-light text-white"
                      )}>
                        Impact: {mitigation.impact}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── NEXT STEPS ────────────────────────────────────────────── */}
        <div className="mb-14">
          <div className="glass-card rounded-3xl p-8 border border-success-green/20 bg-success-green/5 relative overflow-hidden">
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
                { step: 4, action: 'Save this report (Export .TXT above) for compliance records.',         urgency: 'Required',       color: 'text-success-green', bg: 'bg-success-green/10 border-success-green/20' },
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
        </div>

        {/* COMPARISON CTA */}
        <div className="text-center relative z-10 w-full mb-10">
          <div className="inline-block relative group">
            <div className="absolute inset-0 bg-accent-purple blur-xl opacity-30 group-hover:opacity-60 transition-opacity duration-1000"></div>
            <button 
              onClick={() => navigate('/comparison')} 
              className="relative px-12 py-6 bg-surface-dark border border-accent-purple/50 rounded-2xl flex items-center justify-center text-lg uppercase tracking-widest font-black text-white hover:bg-surface-light group-hover:border-accent-purple transition-all shadow-neo overflow-hidden w-full md:w-auto"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-accent-purple/10 to-accent-cyan/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              Launch Debiasing Analysis & Comparison <ArrowRight className="ml-4 w-6 h-6 text-accent-cyan group-hover:translate-x-2 transition-transform duration-300" />
            </button>
          </div>
        </div>

      </main>
    </div>
  );
};

export default ResultsPage;
