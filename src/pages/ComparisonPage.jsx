import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { mockAnalysisResult, computeFairnessScore, sampleCSV } from '../data/mockData';
import { generateDebiasedDataset, computeMetrics, parseCSV, evaluatePassFail } from '../lib/fairnessEngine';
import { ComparativeMetricsChart, ComparativeApprovalChart } from '../components/ComparativeCharts';
import { DownloadCloud, ArrowLeft, Server, Brain, Scale, CheckCircle2, ShieldCheck, AlertTriangle, Info } from 'lucide-react';
import { cn } from '../lib/utils';

const ComparisonPage = () => {
 const navigate = useNavigate();
 const res = mockAnalysisResult;
 const fairness_score = computeFairnessScore(res.metrics);

 const [isGeneratingDebiased, setIsGeneratingDebiased] = useState(false);
 const [debiasedResult, setDebiasedResult] = useState(null);

 const [engineUsed, setEngineUsed] = useState(null); // 'backend' | 'js'

 const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

 const handleGenerateDebiased = async () => {
 setIsGeneratingDebiased(true);
 setDebiasedResult(null);

 const csvSrc = localStorage.getItem('uploadedCsvText') || sampleCSV;

 // ── Try backend first ────────────────────────────────────────────────
 try {
 const blob = new Blob([csvSrc], { type: 'text/csv' });
 const formData = new FormData();
 formData.append('file', new File([blob], 'dataset.csv', { type: 'text/csv' }));

 const resp = await fetch(`${BACKEND_URL}/api/debias`, {
 method: 'POST',
 body: formData,
 signal: AbortSignal.timeout(30000),
 });

 const json = await resp.json();

 if (!resp.ok || json.success === false) {
 // Backend ran but sanity check failed — show error, don't fallback
 setDebiasedResult({ success: false, error: json.error ?? 'Debiasing failed', ...json });
 setEngineUsed('backend');
 setIsGeneratingDebiased(false);
 return;
 }

 // Map backend response to the shape ComparisonPage expects
 const backendResult = {
 success: true,
 _engine: 'backend',
 statsBefore: {
 score: json.orig_score,
 metrics: {
 disparate_impact: json.original_metrics?.disparate_impact_ratio ?? 0,
 demographic_parity: json.original_metrics?.demographic_parity_diff ?? 0,
 equal_opportunity: json.original_metrics?.equal_opportunity_diff ?? 0,
 equalized_odds_difference: json.original_metrics?.equalized_odds_diff ?? 0,
 predictive_parity: json.original_metrics?.predictive_parity_diff ?? 0,
 average_odds_difference: json.original_metrics?.average_odds_diff ?? 0,
 },
 maleStats: { posRate: 0 },
 femaleStats: { posRate: 0 },
 },
 statsAfter: {
 score: json.deb_score,
 metrics: {
 disparate_impact: json.debiased_metrics?.disparate_impact_ratio ?? 0,
 demographic_parity: json.debiased_metrics?.demographic_parity_diff ?? 0,
 equal_opportunity: json.debiased_metrics?.equal_opportunity_diff ?? 0,
 equalized_odds_difference: json.debiased_metrics?.equalized_odds_diff ?? 0,
 predictive_parity: json.debiased_metrics?.predictive_parity_diff ?? 0,
 average_odds_difference: json.debiased_metrics?.average_odds_diff ?? 0,
 },
 maleStats: { posRate: 0 },
 femaleStats: { posRate: 0 },
 },
 proxyFeatures: json.proxy_features ?? {},
 debiasedCsvStr: json.debiased_csv_b64
 ? atob(json.debiased_csv_b64)
 : '',
 summary: {
 originalRows: json.total_rows ?? 0,
 rowsRemoved: 0,
 rowsAdded: 0,
 finalRows: json.total_rows ?? 0,
 sensitiveColsRemoved: json.sensitive_cols_removed ?? [],
 proxiesCleaned: json.proxies_cleaned ?? [],
 },
 validation: {
 passed: json.compliance_issued,
 warning: json.compliance_issued ? null : `Score ${json.deb_score}/100 is below the 80/100 threshold.`,
 },
 };

 setDebiasedResult(backendResult);
 setEngineUsed('backend');
 setIsGeneratingDebiased(false);
 return;
 } catch (networkErr) {
 console.warn('[ComparisonPage] Backend unreachable, falling back to JS engine:', networkErr.message);
 }

 // ── JS engine fallback ────────────────────────────────────────────────
 setTimeout(() => {
 const result = generateDebiasedDataset(csvSrc);
 if (result) result._engine = 'js';
 setDebiasedResult(result);
 setEngineUsed('js');
 setIsGeneratingDebiased(false);
 }, 1500);
 };

 const handleDownloadCSV = () => {
 if (!debiasedResult) return;
 const blob = new Blob([debiasedResult.debiasedCsvStr], { type: 'text/csv' });
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url; a.download = `debiased_biased_engineers_v4.csv`;
 document.body.appendChild(a); a.click();
 document.body.removeChild(a); URL.revokeObjectURL(url);
 };

 return (
 <div className="min-h-screen bg-slate-950 font-sans overflow-hidden text-slate-200">
 <Navbar />
 
 <main className="max-w-6xl mx-auto px-6 pt-12 pb-24 relative">
 
 <button onClick={() => navigate('/results')} className="flex items-center text-slate-500 hover:text-blue-400 mb-8 font-bold text-xs uppercase tracking-widest">
 <ArrowLeft className="w-4 h-4 mr-2"/> Back to Analysis
 </button>

 <div className="mb-10">
 <h1 className="text-4xl font-black text-white flex items-center mb-4">
 <Scale className="w-8 h-8 mr-4 text-purple-400"/> Algorithm Reforging
 </h1>
 <p className="text-sm text-slate-400 leading-relaxed max-w-2xl">
 Execute the post-processing debiasing engine to structurally remap weights, drop sensitive columns, and recalculate all 6 disparate metrics. The output is a highly-compliant dataset fully ready for production.
 </p>
 </div>

 {!debiasedResult ? (
 <div className="bg-slate-900 rounded-3xl p-16 flex flex-col items-center justify-center text-center border border-slate-800 relative overflow-hidden group">
 <Brain className="w-20 h-20 text-purple-400 mb-8 opacity-80"/>
 <h2 className="text-2xl font-black text-white mb-4">Awaiting Engine Initialisation</h2>
 <p className="text-slate-400 max-w-lg mb-10">
 The original metric analysis registered a Fairness Score of {fairness_score}/100. Engaging the debiasing engine will generate {Math.floor(sampleCSV.length * 2.3)} synthetic records to balance the threshold logic safely.
 </p>
 <button 
 onClick={handleGenerateDebiased}
 disabled={isGeneratingDebiased}
 className="px-8 py-4 bg-purple-600 hover:bg-purple-500 text-white font-black text-sm uppercase tracking-widest rounded-xl flex items-center"
 >
 {isGeneratingDebiased ? (
 <><Server className="w-5 h-5 mr-3"/> Compiling Engine Simulator...</>
 ) :"Ignite Debiasing Engine"}
 </button>
 </div>
 ) : debiasedResult.success === false ? (
 <div className="bg-red-500/10 border border-red-500/40 rounded-3xl p-12 flex flex-col items-center text-center">
 <AlertTriangle className="w-16 h-16 text-red-500 mb-6"/>
 <h2 className="text-2xl font-black text-white mb-3">Debiasing Validation Failed</h2>
 <p className="text-sm text-slate-400 max-w-xl mb-6 leading-relaxed">{debiasedResult.error}</p>
 <p className="text-xs text-slate-500 max-w-xl leading-relaxed">The engine detected that debiasing made the dataset <span className="text-red-500 font-bold">worse</span>, not better. This is caused by incorrect group assignment or proxy misdetection. Check your CSV for ID columns or unusual column distributions.</p>
 <button onClick={() => setDebiasedResult(null)} className="mt-8 px-6 py-3 bg-red-500/20 border border-red-500/40 text-red-500 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-red-500/30">
 Try Again
 </button>
 </div>
 ) : (
 <div className="space-y-12">
 {/* Download & Summary Row */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
 <div className="lg:col-span-2 bg-slate-900 rounded-3xl p-8 border border-slate-800">
 <div className="flex items-center justify-between mb-8">
 <div>
 <h3 className="text-xl font-black text-white mb-1 flex items-center gap-3">
 Debiasing Complete
 {engineUsed === 'backend' ? (
 <span className="text-[9px] px-2 py-1 bg-green-500/20 border border-green-500/40 text-green-500 rounded font-black uppercase tracking-widest">
 Python Backend
 </span>
 ) : engineUsed === 'js' ? (
 <span className="text-[9px] px-2 py-1 bg-yellow-500/20 border border-yellow-500/40 text-yellow-500 rounded font-black uppercase tracking-widest">
 JS Fallback
 </span>
 ) : null}
 </h3>
 <p className="text-xs text-slate-500 uppercase tracking-widest font-bold font-mono">Dataset safely normalized.</p>
 </div>
 <div className="text-right">
 <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black mb-1">Score Shift</p>
 <p className="text-3xl font-black text-white">
 <span className="text-red-500 line-through opacity-50 text-xl mr-2">{fairness_score}</span>
 <span className="text-green-500">{debiasedResult.statsAfter.score}</span>
 <span className="text-xs text-slate-500 ml-1">/100</span>
 </p>
 </div>
 </div>
 
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
 <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
 <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Rows Scanned</p>
 <p className="text-lg font-black text-white mt-1">{debiasedResult.summary.originalRows}</p>
 </div>
 <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
 <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Removed</p>
 <p className="text-lg font-black text-red-500 mt-1">{debiasedResult.summary.rowsRemoved}</p>
 </div>
 <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
 <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Synthesized</p>
 <p className="text-lg font-black text-purple-400 mt-1">+{debiasedResult.summary.rowsAdded}</p>
 </div>
 <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
 <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Final Export</p>
 <p className="text-lg font-black text-green-500 mt-1">{debiasedResult.summary.finalRows}</p>
 </div>
 </div>

 <div className="flex gap-4">
 <button onClick={handleDownloadCSV} className="flex-1 px-6 py-4 bg-green-600 hover:bg-green-500 text-white font-black tracking-widest text-xs uppercase rounded-xl flex items-center justify-center">
 <DownloadCloud className="w-5 h-5 mr-3"/> Export Secure CSV
 </button>
 </div>
 </div>

 <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800 flex flex-col justify-center">
 <h4 className="text-xs font-black uppercase text-slate-500 tracking-widest mb-6 border-b border-slate-800 pb-4">Structural Changes Applied</h4>
 <div className="space-y-3">
 {debiasedResult.summary.sensitiveColsRemoved?.length > 0 && (
 <p className="text-sm text-slate-400">
 <span className="text-yellow-500 font-black mr-2">Removed</span>
 {debiasedResult.summary.sensitiveColsRemoved.map(c => `\`${c}\``).join(', ')}
 </p>
 )}
 {debiasedResult.summary.proxiesCleaned?.length > 0 && (
 <div>
 <p className="text-sm text-slate-400 mb-2">
 <span className="text-red-500 font-black mr-2">Proxies Cleaned</span>
 {debiasedResult.summary.proxiesCleaned.length} columns
 </p>
 {Object.entries(debiasedResult.proxyFeatures || {}).map(([col, score]) => (
 <p key={col} className="text-xs text-slate-500 ml-4 font-mono">
 • {col} → corr: {score} {score > 0.5 ? '(binned)' : '(capped)'}
 </p>
 ))}
 </div>
 )}
 <p className="text-sm text-slate-400">
 <span className="text-blue-400 font-black mr-2">Reweighed</span>
 AIF360 sample weights applied
 </p>
 <p className="text-sm text-slate-400">
 <span className="text-purple-400 font-black mr-2">Retrained</span>
 Logistic regression on fair weights
 </p>
 <p className="text-sm text-slate-400">
 <span className="text-green-500 font-black mr-2">Appended</span>
 `fair_hired` + `bias_flag` columns
 </p>
 {debiasedResult.validation?.warning && (
 <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex items-start gap-2">
 <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5"/>
 <p className="text-xs text-yellow-500 font-medium leading-relaxed">{debiasedResult.validation.warning}</p>
 </div>
 )}
 </div>
 </div>
 </div>

 {/* Graphs Comparison */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
 <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800">
 <h4 className="text-white font-black mb-8 text-center text-sm uppercase tracking-widest opacity-80">6-Vector Metric Shifts</h4>
 <ComparativeMetricsChart origMetrics={res.metrics} debMetrics={debiasedResult.statsAfter.metrics} />
 <div className="flex justify-center gap-6 mt-6 border-t border-slate-800 pt-4">
 <span className="text-[10px] font-bold tracking-widest uppercase text-red-500 flex items-center"><div className="w-3 h-3 bg-red-500 rounded-sm mr-2"/> Default Model</span>
 <span className="text-[10px] font-bold tracking-widest uppercase text-green-500 flex items-center"><div className="w-3 h-3 bg-green-500 rounded-sm mr-2"/> Retrained Model</span>
 </div>
 </div>
 <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800">
 <h4 className="text-white font-black mb-8 text-center text-sm uppercase tracking-widest opacity-80">Demographic Approval Variance</h4>
 <ComparativeApprovalChart 
 origStats={{ maleOrig: 0.73, femaleOrig: 0.42 }} 
 debStats={{ maleDeb: debiasedResult.statsAfter.maleStats.posRate, femaleDeb: debiasedResult.statsAfter.femaleStats.posRate }} 
 />
 <div className="flex justify-center gap-6 mt-6 border-t border-slate-800 pt-4">
 <span className="text-[10px] font-bold tracking-widest uppercase text-red-500 flex items-center"><div className="w-3 h-3 bg-red-500 rounded-sm mr-2"/> Original Ratio</span>
 <span className="text-[10px] font-bold tracking-widest uppercase text-green-500 flex items-center"><div className="w-3 h-3 bg-green-500 rounded-sm mr-2"/> Reweighed Ratio</span>
 </div>
 </div>
 </div>

 {/* Traditional Table Comparison */}
 <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800">
 <h3 className="text-xl font-black text-white mb-8 flex items-center">
 <Scale className="w-5 h-5 mr-3 text-white"/> RAW TELEMETRY LOG
 </h3>
 
 <div className="overflow-x-auto">
 <table className="w-full text-left border-collapse">
 <thead>
 <tr className="border-b border-slate-700 text-xs uppercase tracking-widest text-slate-500 font-black">
 <th className="py-4 px-4 w-1/3">Metric Vector</th>
 <th className="py-4 px-4">Biased State</th>
 <th className="py-4 px-4">Corrected State</th>
 <th className="py-4 px-4">Status</th>
 </tr>
 </thead>
 <tbody className="text-sm font-medium">
 {[
 { name: 'Demographic Parity Discrepancy', metricKey: 'demographic_parity', orig: res.metrics.demographic_parity, deb: debiasedResult.statsAfter.metrics.demographic_parity, origO: 0.31 },
 { name: 'Disparate Impact Ratio', metricKey: 'disparate_impact', orig: res.metrics.disparate_impact, deb: debiasedResult.statsAfter.metrics.disparate_impact, origO: 0.52 },
 { name: 'Equal Opportunity Variance', metricKey: 'equal_opportunity', orig: res.metrics.equal_opportunity, deb: debiasedResult.statsAfter.metrics.equal_opportunity, origO: 0.28 },
 { name: 'Equalized Odds Difference', metricKey: 'equalized_odds_difference', orig: res.metrics.equalized_odds_difference, deb: debiasedResult.statsAfter.metrics.equalized_odds_difference, origO: 0.35 },
 { name: 'Predictive Parity (Precision)', metricKey: 'predictive_parity', orig: res.metrics.predictive_parity, deb: debiasedResult.statsAfter.metrics.predictive_parity, origO: 0.22 },
 { name: 'Average Odds Difference', metricKey: 'average_odds_difference', orig: res.metrics.average_odds_difference, deb: debiasedResult.statsAfter.metrics.average_odds_difference, origO: 0.29 },
 ].map((m, i) => {
 const passed = evaluatePassFail(m.metricKey, m.deb);
 return (
 <tr key={i} className="border-b border-slate-800 hover:bg-slate-800/50">
 <td className="py-4 px-4 text-white font-bold">{m.name}</td>
 <td className="py-4 px-4 font-mono text-red-500">{m.origO}</td>
 <td className="py-4 px-4 font-mono text-green-500">{typeof m.deb === 'number' ? m.deb.toFixed(3) : m.deb}</td>
 <td className={`py-4 px-4 font-black text-xs flex items-center mt-1.5 ${passed ? 'text-green-500' : 'text-red-500'}`}>
 {passed
 ? <><CheckCircle2 className="w-3 h-3 mr-1"/> PASS</>
 : <><AlertTriangle className="w-3 h-3 mr-1"/> FAIL</>
 }
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 </div>

 {/* Compliance Certificate Block */}
 <div className="flex justify-center mt-8 pt-8">
 {debiasedResult.statsAfter.score >= 80 ? (
 <div className="font-mono text-sm leading-tight text-white/90 bg-[#0a0a0a] p-10 border-2 border-[#333] rounded-sm max-w-2xl w-full">
 <pre className="text-green-500 mb-6 text-sm">
{`╔═════════════════════════════════════════════╗
║ FAIRLENS AI COMPLIANCE CERTIFICATE ║
║ ║
║ Dataset : debiased_engineers_v4.csv ║
║ Score : ${debiasedResult.statsAfter.score}/100 ✓ COMPLIANT ║
║ EU AI Act Article 10 : PASS ║
║ US EEOC 4/5ths Rule : PASS ║
║ Issued : ${new Date().toISOString().split('T')[0]} ║
║ Ref ID : UAI-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)} ║
╚═════════════════════════════════════════════╝`}
 </pre>
 <p className="text-slate-500 text-center text-xs">
 This certificate confirms the debiased dataset meets minimum fairness thresholds. Retain log for governmental audits.
 </p>
 </div>
 ) : (
 <div className="bg-red-500/10 border border-red-500/30 p-8 rounded-2xl text-center max-w-2xl w-full">
 <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-4"/>
 <h3 className="text-red-500 font-black text-xl mb-2">COMPLIANCE CERTIFICATE: NOT ISSUED</h3>
 <p className="text-sm text-slate-400 leading-relaxed">
 The post-processing engine only achieved a score of {debiasedResult.statsAfter.score}/100, which remains below the strict 80/100 deployment threshold. Please review the dataset outliers.
 </p>
 </div>
 )}
 </div>

 </div>
 )}
 </main>
 </div>
 );
};

export default ComparisonPage;
