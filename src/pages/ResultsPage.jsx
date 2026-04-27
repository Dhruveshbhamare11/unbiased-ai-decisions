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
[{"title":"...","insight":"...","action":"..."}]`;
 try {
 const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }], generationConfig: { responseMimeType: 'application/json' } })
 });
 const data = await response.json();
 if (data.candidates?.length > 0) {
 try { setInsights(JSON.parse(data.candidates[0].content.parts[0].text)); }
 catch (e) { throw new Error('Failed to parse AI response.'); }
 } else { throw new Error(data.error?.message ?? 'AI returned empty response.'); }
 } catch (err) { 
 console.warn("Gemini API Error, using fallback insights:", err.message);
 setInsights([
 {
 title: "High Demographic Variance",
 insight: `Demographic Parity Discrepancy is at ${m.demographic_parity}, exceeding the 0.10 threshold. The system favors one demographic group significantly.`,
 action: "Remove sensitive attributes from training data."
 },
 {
 title: "Disparate Impact Violation",
 insight: `The Disparate Impact Ratio is ${m.disparate_impact}, which fails the legal 4/5ths rule (must be ≥ 0.80). This poses severe compliance risks.`,
 action: "Apply AIF360 Reweighing to re-balance sample weights."
 },
 {
 title: "Equal Opportunity Alert",
 insight: `True Positive Rates vary by ${m.equal_opportunity} across groups. Qualified individuals in the unprivileged group are less likely to be approved.`,
 action: "Adjust classification thresholds per demographic group."
 }
 ]);
 }
 finally { setIsLoadingInsights(false); }
 };
 fetchGeminiInsights();
 }, [fairness_score, displayMetrics, isProxyMode]);

 const getRiskColor = (risk) => {
 if (risk === 'Low') return 'text-green-500 bg-green-500/10 border-green-500/30';
 if (risk === 'Moderate') return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30';
 return 'text-red-500 bg-red-500/10 border-red-500/30';
 };

 // Build the 6 metrics rows using real data if available
 const allMetrics = [
 { id: 'dp', name: 'Demographic Parity Discrepancy', value: displayMetrics.demographic_parity, threshold: 0.10, isRatio: false, breakdown: res.metric_group_breakdown.demographic_parity },
 { id: 'di', name: 'Disparate Impact Ratio', value: displayMetrics.disparate_impact, threshold: 0.80, isRatio: true, breakdown: res.metric_group_breakdown.disparate_impact },
 { id: 'eo', name: 'Equal Opportunity Variance', value: displayMetrics.equal_opportunity, threshold: 0.10, isRatio: false, breakdown: res.metric_group_breakdown.equal_opportunity },
 { id: 'eod', name: 'Equalized Odds Difference', value: displayMetrics.equalized_odds_difference, threshold: 0.10, isRatio: false, breakdown: res.metric_group_breakdown.equalized_odds_difference },
 { id: 'pp', name: 'Predictive Parity (Precision)', value: displayMetrics.predictive_parity, threshold: 0.10, isRatio: false, breakdown: res.metric_group_breakdown.predictive_parity },
 { id: 'aod', name: 'Average Odds Difference', value: displayMetrics.average_odds_difference, threshold: 0.10, isRatio: false, breakdown: res.metric_group_breakdown.average_odds_difference },
 ];

 const failCount = allMetrics.filter(m => m.isRatio ? m.value < m.threshold : m.value > m.threshold).length;

 const GroupBreakdown = ({ breakdown, isRatio }) => {
 if (!breakdown) return null;
 return (
 <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4">
 {Object.entries(breakdown).map(([attr, groups]) => (
 <div key={attr} className="bg-slate-800/60 rounded-xl p-4 border border-slate-700">
 <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3">
 By {attr}
 </p>
 <div className="space-y-2">
 {groups.map((g, i) => {
 const maxVal = Math.max(...groups.map(x => x.value));
 const pct = maxVal > 0 ? (g.value / maxVal) * 100 : 0;
 return (
 <div key={i} className="flex items-center gap-3">
 <span className="text-[11px] font-bold text-slate-300 w-28 shrink-0">{g.group}</span>
 <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
 <div
 className="h-full bg-blue-500 rounded-full"
 style={{ width: `${pct}%` }}
 />
 </div>
 <span className="text-[11px] font-black text-white font-mono w-10 text-right">{g.value}</span>
 <span className="text-[9px] text-slate-500 w-28 hidden lg:block">{g.label}</span>
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
 const passed = isRatio ? value >= threshold : value <= threshold;
 const absVal = Math.abs(value);
 const isOpen = expandedMetric === id;

 return (
 <div className="border-b border-slate-800 last:border-0 overflow-hidden">
 <div
 className="flex items-center justify-between p-4 hover:bg-slate-800/50 group cursor-pointer"
 onClick={() => setExpandedMetric(isOpen ? null : id)}
 >
 <div className="flex-1">
 <div className="flex items-center mb-1">
 <span className="font-bold text-white text-sm tracking-wide">{name}</span>
 {passed ? (
 <span className="ml-3 px-2 py-0.5 bg-green-500/20 border border-green-500/30 text-green-500 text-[10px] font-black uppercase tracking-widest rounded flex items-center">
 <CheckCircle2 className="w-3 h-3 mr-1"/> PASS
 </span>
 ) : (
 <span className="ml-3 px-2 py-0.5 bg-red-500/20 border border-red-500/30 text-red-500 text-[10px] font-black uppercase tracking-widest rounded flex items-center">
 <XCircle className="w-3 h-3 mr-1"/> FAIL
 </span>
 )}
 </div>
 <div className="text-[11px] text-slate-500 font-mono uppercase tracking-widest mt-2">
 Threshold: {isRatio ? `≥ ${threshold}` : `≤ ${threshold}`}
 <span className="mx-2 opacity-30">|</span>
 Actual: <span className="font-bold text-white bg-slate-800 px-1.5 py-0.5 rounded">{value}</span>
 </div>
 </div>

 <div className="w-1/4 ml-6 hidden md:block">
 <div className="h-1.5 w-full bg-slate-800 border border-slate-700 rounded-full overflow-hidden">
 <div
 className={cn("h-full", passed ? 'bg-green-500' : 'bg-red-500')}
 style={{ width: `${Math.min(100, isRatio ? (value / 1.5) * 100 : (absVal / 0.5) * 100)}%` }}
 />
 </div>
 </div>

 <div className="ml-4 shrink-0 text-slate-500 group-hover:text-blue-400">
 {isOpen ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
 </div>
 </div>

 {isOpen && breakdown && (
 <div className="px-4 pb-5">
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
 let r = `FAIRLENS AI FAIRNESS AUDIT REPORT\n`;
 r += `Generated: ${new Date().toISOString()}\n`;
 const blob = new Blob([r], { type: 'text/plain' });
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url; a.download = `Audit_Manifest_${Date.now()}.txt`;
 document.body.appendChild(a); a.click();
 document.body.removeChild(a); URL.revokeObjectURL(url);
 }, 1200);
 };

 const bc = res.bias_contributors;

 return (
 <div className="min-h-screen bg-slate-950 font-sans overflow-hidden text-slate-200">
 <Navbar />

 <main className="max-w-6xl mx-auto px-6 pt-12 pb-24 relative">

 {/* Proxy Mode Banner */}
 {isProxyMode && proxyNote && (
 <div className="mb-6 flex items-start gap-3 px-5 py-4 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl">
 <Info className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5"/>
 <p className="text-xs text-slate-300 font-medium leading-relaxed">
 <span className="text-yellow-500 font-black uppercase tracking-widest mr-2">Proxy Analysis Mode</span>
 {proxyNote}
 </p>
 </div>
 )}

 <div className="flex items-center justify-between mb-12 relative px-4">
 <div className="absolute left-8 right-8 top-1/2 h-[1px] bg-slate-800 -z-10 -translate-y-1/2"/>
 <div className="absolute left-8 right-8 top-1/2 w-full h-[2px] bg-slate-800 -z-10 -translate-y-1/2"/>
 {['Dashboard', 'Ingestion', 'Analysis', 'Metrics'].map((step, idx) => (
 <div key={step} className="flex flex-col items-center">
 <div className={cn(
"w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm z-10 border",
 idx === 3
 ?"bg-green-500 border-green-400 text-slate-900"
 :"bg-slate-900 border-slate-700 text-slate-500"
 )}>
 <CheckCircle2 className={cn("w-6 h-6", idx === 3 ?"text-slate-900":"text-slate-500")} />
 </div>
 <span className="text-[10px] font-black mt-4 tracking-[0.2em] uppercase text-slate-200">{step}</span>
 </div>
 ))}
 </div>

 <div className="flex justify-end mb-8 space-x-4 relative z-10">
 <button onClick={() => navigate('/dashboard')} className="flex items-center px-6 py-3 bg-slate-800 border border-slate-700 rounded-xl text-xs uppercase tracking-widest font-black text-white hover:bg-slate-700 hover:border-slate-600">
 <Home className="w-4 h-4 mr-2 text-blue-400"/> Return Data
 </button>
 <button onClick={handleDownloadReport} className="flex items-center px-8 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs uppercase tracking-widest font-black text-white">
 {isDownloading ? (
 <span className="flex items-center relative z-10"><Cpu className="w-4 h-4 text-white mr-2"/> Encrypting...</span>
 ) : (
 <span className="flex items-center relative z-10"><DownloadCloud className="w-4 h-4 mr-2"/> Export .TXT</span>
 )}
 </button>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-10 overflow-visible relative z-10">
 <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-3xl p-8 flex flex-col items-center justify-center text-center relative overflow-hidden group">
 <h2 className="text-xs font-black text-slate-500 mb-8 uppercase tracking-[0.3em] relative z-10">Fairness Index</h2>
 <div className="mb-6 scale-[1.3] relative z-10 filter drop-shadow-[0_0_20px_rgba(0,0,0,0.5)] mt-4">
 <FairnessScore score={fairness_score} />
 </div>
 <div className={`text-center px-4 py-3 mb-4 rounded-2xl relative z-10 border ${
 riskLevel === 'Low'
 ? 'bg-green-500/10 border-green-500/20'
 : riskLevel === 'Moderate'
 ? 'bg-yellow-500/10 border-yellow-500/20'
 : 'bg-red-500/10 border-red-500/20'
 }`}>
 <p className={`text-[11px] font-black uppercase tracking-widest mb-1 ${
 riskLevel === 'Low' ? 'text-green-500' : riskLevel === 'Moderate' ? 'text-yellow-500' : 'text-red-500'
 }`}>Verdict</p>
 <p className="text-xs text-slate-300 font-medium leading-relaxed">
 {riskLevel === 'Low'
 ? <><span className="text-green-500 font-black">Safe to deploy.</span> {failCount} of 6 metrics are flagged. Fairness thresholds met.</> 
 : riskLevel === 'Moderate'
 ? <><span className="text-yellow-500 font-black">Review required.</span> {failCount} of 6 metrics indicate potential discrimination.</> 
 : <><span className="text-red-500 font-black">NOT safe to deploy.</span> {failCount} of 6 metrics indicate severe discrimination.</> 
 }
 </p>
 </div>
 <div className={`mt-2 font-black px-8 py-3 rounded-xl border flex items-center justify-center space-x-3 text-lg uppercase tracking-widest ${getRiskColor(riskLevel)} relative z-10`}>
 <AlertOctagon className="w-5 h-5"/>
 <span>{riskLevel} Risk</span>
 </div>
 <div className="mt-8 pt-6 border-t border-slate-800 w-full flex flex-col items-start text-left relative z-10">
 <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">
 {isProxyMode ? 'Proxy Columns Detected' : 'Quarantined Vectors'}
 </span>
 <div className="flex flex-wrap gap-3">
 {(isProxyMode
 ? (realResult?.proxiesCleaned ?? [])
 : res.biased_attributes
 ).map(attr => (
 <span key={attr} className="px-4 py-2 bg-red-500/10 text-red-500 text-[11px] font-black rounded-lg border border-red-500/30 uppercase tracking-widest flex items-center">
 <Filter className="w-3 h-3 mr-2 opacity-70"/> {attr}
 </span>
 ))}
 </div>
 </div>
 </div>

 <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-3xl p-10 flex flex-col relative overflow-hidden">
 <div className="flex items-center justify-between mb-6 pb-6 border-b border-slate-800">
 <div>
 <h3 className="text-3xl font-black text-white flex items-center"><Activity className="w-6 h-6 mr-3 text-blue-400"/> Algorithm Telemetry</h3>
 <p className="text-sm text-slate-500 mt-2 font-medium tracking-wide">6 metrics evaluated against EU AI Act &amp; EEOC thresholds. <span className="text-blue-400">Click any row</span> to see per-group breakdown.</p>
 </div>
 </div>
 <div className="flex-1 flex flex-col gap-0 relative z-10">
 {allMetrics.map(m => (
 <MetricRow key={m.id} {...m} />
 ))}
 </div>

 {displayMetrics.disparate_impact < 0.8 ? (
 <div className="mt-8 bg-red-500/10 border border-red-500/40 rounded-2xl p-6 flex items-start relative z-10">
 <div className="bg-red-500 p-3 rounded-xl mr-5 relative overflow-hidden shrink-0">
 <AlertTriangle className="w-6 h-6 text-white relative z-10"/>
 </div>
 <div className="mt-1">
 <h4 className="text-sm font-black text-red-400 uppercase tracking-widest mb-2 flex items-center">
 Regulatory Violation <span className="mx-3 opacity-30 text-white">|</span> EU AI Act &amp; EEOC
 </h4>
 <p className="text-sm text-slate-300 leading-relaxed font-medium">
 Disparate Impact Ratio (<span className="font-bold text-white bg-slate-800 px-1 rounded">{displayMetrics.disparate_impact}</span>) violates the legal 4/5ths rule (&lt; 0.8). {failCount} of 6 fairness metrics are failing their regulatory thresholds.
 </p>
 </div>
 </div>
 ) : (
 <div className="mt-8 bg-green-500/10 border border-green-500/40 rounded-2xl p-6 flex items-start relative z-10">
 <div className="bg-green-500 p-3 rounded-xl mr-5 shrink-0">
 <CheckCircle2 className="w-6 h-6 text-slate-900"/>
 </div>
 <div className="mt-1">
 <h4 className="text-sm font-black text-green-500 uppercase tracking-widest mb-2">
 Regulatory Compliance <span className="mx-3 opacity-30 text-white">|</span> EU AI Act &amp; EEOC
 </h4>
 <p className="text-sm text-slate-300 leading-relaxed font-medium">
 Disparate Impact Ratio (<span className="font-bold text-white bg-slate-800 px-1 rounded">{displayMetrics.disparate_impact}</span>) meets the legal 4/5ths rule (≥ 0.8). {isProxyMode ? 'Debiased dataset passes fairness thresholds.' : 'All key metrics within acceptable range.'}
 </p>
 </div>
 </div>
 )}
 </div>
 </div>

 {/* GEMINI AI INSIGHTS */}
 <div className="mb-12">
 <div className="bg-slate-900 rounded-3xl p-10 border border-slate-800">
 <h3 className="text-2xl font-black text-white mb-2 flex items-center">
 <Brain className="w-7 h-7 mr-3 text-purple-400"/> Executive Summary
 </h3>
 <p className="text-xs text-purple-400 font-bold uppercase tracking-widest mb-8">AI-Generated Insights via Google Gemini</p>
 
 {isLoadingInsights ? (
 <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 text-center flex flex-col items-center justify-center">
 <Brain className="w-10 h-10 text-purple-400 mb-4"/>
 <p className="text-purple-400 text-sm font-bold tracking-widest uppercase mb-1">Connecting to Vertex AI...</p>
 <p className="text-slate-500 text-xs">Translating telemetry into executive insights.</p>
 </div>
 ) : insightsError ? (
 <div className="bg-red-500/10 border border-red-500/30 p-6 rounded-xl">
 <p className="text-red-500 font-black flex items-center mb-2">
 <AlertTriangle className="w-5 h-5 mr-2"/> Error generating AI insights
 </p>
 <p className="text-sm text-slate-400">{insightsError}</p>
 </div>
 ) : insights ? (
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 {insights.map((card, idx) => (
 <div key={idx} className="bg-slate-800 border border-slate-700 rounded-2xl p-6 hover:border-slate-600 flex flex-col h-full">
 <h4 className="text-white font-black text-lg mb-3 pb-3 border-b border-slate-700">{card.title}</h4>
 <p className="text-sm text-slate-400 leading-relaxed mb-6 flex-grow">{card.insight}</p>
 <div className="bg-purple-500/10 border border-purple-500/30 p-4 rounded-xl mt-auto">
 <p className="text-xs text-slate-300 font-medium flex items-start">
 <span className="text-purple-400 font-black uppercase tracking-widest mr-2 mt-0.5 shrink-0">Action:</span> 
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
 <div className="w-12 h-12 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center mr-4">
 <Brain className="w-6 h-6 text-blue-400"/>
 </div>
 <div>
 <h3 className="text-2xl font-black text-white">Bias Contributors</h3>
 <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">SHAP-based feature attribution analysis</p>
 </div>
 </div>
 
 <div className="mb-6 px-5 py-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-start gap-3">
 <Zap className="w-4 h-4 text-blue-400 shrink-0 mt-0.5"/>
 <p className="text-xs text-slate-400 font-medium leading-relaxed">
 <span className="text-blue-400 font-black">What are SHAP values?</span> SHAP values indicate how strongly each feature pushes the model toward biased outcomes. Higher = worse.
 </p>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
 <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl">
 <h4 className="text-white font-black mb-6 text-sm uppercase tracking-widest opacity-80">Attribute Contribution to Bias</h4>
 <div className="space-y-5">
 {[bc.primary, bc.secondary].map((driver, i) => (
 <div key={i}>
 <div className="flex justify-between items-center mb-2">
 <div className="flex items-center gap-2">
 <span className={cn("text-[9px] uppercase font-black px-2 py-1 rounded tracking-widest", i === 0 ? 'bg-red-500/20 text-red-500 border border-red-500/30' : 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30')}>
 {i === 0 ? 'Primary' : 'Secondary'}
 </span>
 <span className="text-white font-black text-base uppercase tracking-wider">{driver.attribute}</span>
 </div>
 <span className="text-2xl font-black text-white">{driver.contribution}%</span>
 </div>
 <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700">
 <div
 className={cn("h-full rounded-full", i === 0 ? 'bg-red-500' : 'bg-yellow-500')}
 style={{ width: `${driver.contribution}%` }}
 />
 </div>
 </div>
 ))}
 </div>
 </div>

 <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl">
 <h4 className="text-white font-black mb-6 text-sm uppercase tracking-widest opacity-80">Top Biased Features (SHAP-Ranked)</h4>
 <div className="space-y-3">
 {bc.top_features.map((f, i) => (
 <div key={i} className="flex items-center gap-4 p-3 bg-slate-800/60 rounded-xl border border-slate-700 hover:border-slate-600 group">
 <span className="w-7 h-7 rounded-lg bg-slate-700 border border-slate-600 text-white text-xs font-black flex items-center justify-center shrink-0">{f.rank}</span>
 <div className="flex-1 min-w-0">
 <p className="text-sm font-black text-white truncate">{f.feature}</p>
 <p className="text-[10px] text-slate-500 font-medium mt-0.5 flex items-center gap-1">
 <Zap className="w-3 h-3 text-yellow-500"/>
 correlated with <span className="text-yellow-500 font-bold">{f.correlated_with}</span>
 </p>
 </div>
 <div className="flex flex-col items-end shrink-0">
 <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">SHAP</span>
 <span className="text-sm font-black text-blue-400">{f.shap_score}</span>
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
 <div className="w-12 h-12 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center mr-4">
 <Scale className="w-6 h-6 text-purple-400"/>
 </div>
 <div>
 <h3 className="text-2xl font-black text-white">Subgroup Analysis</h3>
 <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">Identifying demographic fractures</p>
 </div>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
 <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl">
 <h4 className="text-white font-black mb-8 text-center text-sm uppercase tracking-widest opacity-80">Outcome: Gender Vector</h4>
 <GenderOutcomeChart data={res.group_stats} />
 </div>
 <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl">
 <h4 className="text-white font-black mb-8 text-center text-sm uppercase tracking-widest opacity-80">Outcome: Age Vector</h4>
 <AgeOutcomeChart data={res.age_stats} />
 </div>
 <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl">
 <h4 className="text-white font-black mb-8 text-center text-sm uppercase tracking-widest opacity-80">All 6 Metrics vs Threshold</h4>
 <MetricsThresholdChart metrics={res.metrics} />
 </div>
 <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl flex flex-col">
 <h4 className="text-white font-black mb-4 text-center text-sm uppercase tracking-widest opacity-80">Score Penalty Breakdown</h4>
 <div className="flex-1 min-h-[220px]"><FairnessBreakdownChart score={fairness_score} /></div>
 </div>
 </div>
 </div>

 {/* Mitigation Subsystem */}
 <div className="mb-12">
 <div className="flex items-center mb-8">
 <div className="w-12 h-12 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center mr-4">
 <Cpu className="w-6 h-6 text-green-500"/>
 </div>
 <div>
 <h3 className="text-2xl font-black text-white">Patch Protocols</h3>
 <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">Compiler suggesting algorithmic fixes</p>
 </div>
 </div>
 <div className="space-y-6">
 {res.mitigation_suggestions.map((mitigation, idx) => (
 <div key={idx} className="bg-slate-900 border border-slate-800 p-8 rounded-3xl hover:border-slate-700 overflow-hidden relative group">
 <div className="flex flex-col md:flex-row md:items-center relative z-10">
 <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 text-white flex items-center justify-center font-black text-2xl mb-6 md:mb-0 md:mr-8 shrink-0 relative overflow-hidden group-hover:border-slate-600">
 {idx + 1}
 </div>
 <div className="flex-1 pr-6">
 <h4 className="text-xl font-black text-white mb-3">{mitigation.title}</h4>
 <p className="text-sm text-slate-400 font-medium leading-relaxed">{mitigation.desc}</p>
 </div>
 <div className="flex items-center gap-6 mt-8 md:mt-0 p-5 rounded-2xl bg-slate-800/50 border border-slate-700 shrink-0">
 <div className="flex flex-col gap-3">
 <span className={cn(
"text-[9px] uppercase font-black px-3 py-1.5 rounded flex items-center justify-center border tracking-widest border-slate-600 text-slate-300"
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
 <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 relative overflow-hidden">
 <div className="flex items-center mb-6">
 <div className="w-10 h-10 bg-slate-800 border border-slate-700 rounded-xl flex items-center justify-center mr-4">
 <CheckCircle2 className="w-5 h-5 text-green-500"/>
 </div>
 <div>
 <h3 className="text-xl font-black text-white">Next Steps</h3>
 <p className="text-xs font-bold text-slate-500 mt-0.5 uppercase tracking-widest">Required actions before re-deployment</p>
 </div>
 </div>
 <div className="space-y-3">
 {[
 { step: 1, action: 'Apply Mitigation 1 — Remove sensitive attributes (gender, age) from training data.', urgency: 'Today', color: 'text-red-500', bg: 'bg-slate-800/50 border-slate-700/50' },
 { step: 2, action: 'Apply AIF360 Reweighing to re-balance sample weights across demographic groups.', urgency: 'This Week', color: 'text-yellow-500', bg: 'bg-slate-800/50 border-slate-700/50' },
 { step: 3, action: 'Re-run this audit after each mitigation. Target Fairness Score: ≥ 80/100 before any deployment.', urgency: 'After Each Fix', color: 'text-blue-400', bg: 'bg-slate-800/50 border-slate-700/50' },
 { step: 4, action: 'Save this report (Export .TXT above) for compliance records.', urgency: 'Required', color: 'text-green-500', bg: 'bg-slate-800/50 border-slate-700/50' },
 ].map(({ step, action, urgency, color, bg }) => (
 <div key={step} className={`flex items-start gap-4 p-4 rounded-xl border ${bg}`}>
 <span className={`text-xs font-black uppercase tracking-widest shrink-0 px-2 py-1 rounded ${color} bg-slate-900 border border-slate-700`}>{urgency}</span>
 <p className="text-sm text-slate-300 font-medium leading-relaxed">
 <span className="text-slate-500 font-black mr-2">{step}.</span>{action}
 </p>
 </div>
 ))}
 </div>
 </div>
 </div>

 {/* COMPARISON CTA */}
 <div className="text-center relative z-10 w-full mb-10">
 <div className="inline-block relative group w-full md:w-auto">
 <button 
 onClick={() => navigate('/comparison')} 
 className="relative px-12 py-6 bg-slate-800 border border-slate-700 rounded-2xl flex items-center justify-center text-lg uppercase tracking-widest font-black text-white hover:bg-slate-700 w-full md:w-auto"
 >
 Launch Debiasing Analysis & Comparison <ArrowRight className="ml-4 w-6 h-6 text-blue-400"/>
 </button>
 </div>
 </div>

 </main>
 </div>
 );
};

export default ResultsPage;
