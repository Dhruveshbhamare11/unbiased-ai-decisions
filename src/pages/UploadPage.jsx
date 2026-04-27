import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, FileText, CheckCircle, Search, Activity, ShieldAlert, Cpu, Database, AlertCircle, Link as LinkIcon, Server } from 'lucide-react';
import Navbar from '../components/Navbar';
import { sampleCSV } from '../data/mockData';
import { cn } from '../lib/utils';
import { parseCSV, computeMetrics } from '../lib/fairnessEngine';

const UploadPage = () => {
 const navigate = useNavigate();
 const [file, setFile] = useState(null);
 const [error, setError] = useState('');
 const [isDragging, setIsDragging] = useState(false);
 const [isAnalyzing, setIsAnalyzing] = useState(false);
 const [loadingStep, setLoadingStep] = useState(0);
 const [csvHeaders, setCsvHeaders] = useState([]);
 const [mockConsole, setMockConsole] = useState([]);
 const [csvText, setCsvText] = useState('');

 const loadingSteps = [
"Connecting to Python backend...",
"Validating dataset schema...",
"Scanning for protected attributes (Gender, Age, Race)...",
"Isolating primary decision outcome vectors...",
"Computing Demographic Parity vectors...",
"Calculating Disparate Impact Discrepancies...",
"Cross-validating Equal Opportunity scores...",
"Synthesizing Mitigation Protocols..."
 ];

 const handleDragOver = (e) => {
 e.preventDefault();
 setIsDragging(true);
 };

 const handleDragLeave = (e) => {
 e.preventDefault();
 setIsDragging(false);
 };

 const handleDrop = (e) => {
 e.preventDefault();
 setIsDragging(false);
 const droppedFile = e.dataTransfer.files[0];
 validateAndSetFile(droppedFile);
 };

 const handleFileChange = (e) => {
 const selectedFile = e.target.files[0];
 validateAndSetFile(selectedFile);
 };

 const validateAndSetFile = (f) => {
 setError('');
 if (!f) return;
 if (f.type !== 'text/csv' && !f.name.endsWith('.csv')) {
 setError('Invalid format. System requires a CSV dataset.');
 return;
 }
 if (f.size > 50 * 1024 * 1024) {
 setError('Dataset exceeds maximum local processing limit (50MB).');
 return;
 }
 setFile(f);
 
 // Read full CSV text for real analysis
 const reader = new FileReader();
 reader.onload = (e) => {
 const text = e.target.result;
 setCsvText(text);
 localStorage.setItem('uploadedCsvText', text);
 const firstLine = text.split('\n')[0];
 if (firstLine) {
 setCsvHeaders(firstLine.split(',').map(h => h.trim().replace(/['"]/g, '')).filter(h => h));
 }
 };
 reader.readAsText(f);
 };

 const selectLibraryDataset = (datasetName) => {
 setCsvText(sampleCSV);
 localStorage.setItem('uploadedCsvText', sampleCSV);
 const blob = new Blob([sampleCSV], { type: 'text/csv' });
 const sampleFile = new File([blob], datasetName, { type: 'text/csv' });
 validateAndSetFile(sampleFile);
 };

 const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

 const startAnalysis = async () => {
 if (!file) return;
 setIsAnalyzing(true);
 let step = 0;

 const possibleSensitive = csvHeaders.filter(h =>
 ['gender', 'sex', 'race', 'ethnicity', 'age', 'zip', 'zipcode'].some(s => h.toLowerCase().includes(s))
 );

 const dynamicLogs = [
 `[SYS] Connecting to Python backend at ${BACKEND_URL}...`,
 `[FS] Loaded ${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
 `[DATA] Detected ${csvHeaders.length} columns`,
 `[WARN] Potential sensitive features: [${possibleSensitive.length ? possibleSensitive.join(', ') : 'Scanning...'}]`,
 `[PROC] Running fairness matrices...`,
 `[PROC] Executing bias classifiers...`,
 `[PROC] Detecting proxy features & computing metrics...`,
 `[SYS] Compiling mitigation manifest...`
 ];

 setMockConsole([dynamicLogs[0]]);

 // ── Try backend first ────────────────────────────────────────────────
 const runBackendAnalysis = async () => {
 try {
 const formData = new FormData();
 formData.append('file', file);
 const resp = await fetch(`${BACKEND_URL}/api/analyze`, {
 method: 'POST',
 body: formData,
 signal: AbortSignal.timeout(20000),
 });
 if (!resp.ok) throw new Error(`Backend HTTP ${resp.status}`);
 const data = await resp.json();

 // Map backend response → analysisResult shape used by ResultsPage
 const mapped = {
 score: data.fairness_score,
 riskLevel: data.risk_level,
 isProxy: data.is_proxy ?? false,
 proxyNote: data.proxy_note ?? null,
 proxiesCleaned: [],
 metrics: {
 disparate_impact: data.metrics?.disparate_impact_ratio ?? 0,
 demographic_parity: data.metrics?.demographic_parity_diff ?? 0,
 equal_opportunity: data.metrics?.equal_opportunity_diff ?? 0,
 equalized_odds_difference: data.metrics?.equalized_odds_diff ?? 0,
 predictive_parity: data.metrics?.predictive_parity_diff ?? 0,
 average_odds_difference: data.metrics?.average_odds_diff ?? 0,
 },
 filename: file.name,
 _engine: 'backend',
 };
 localStorage.setItem('analysisResult', JSON.stringify(mapped));
 console.log('[UploadPage] Backend analysis OK:', mapped);
 return true;
 } catch (err) {
 console.warn('[UploadPage] Backend unavailable, using JS engine:', err.message);
 return false;
 }
 };

 // ── JS engine fallback ────────────────────────────────────────────────
 const runJsAnalysis = () => {
 try {
 const src = csvText || localStorage.getItem('uploadedCsvText') || '';
 if (src) {
 const { data } = parseCSV(src);
 if (data && data.length > 0) {
 const result = computeMetrics(data);
 if (result) {
 const riskLevel = result.score >= 80 ? 'Low' : result.score >= 60 ? 'Moderate' : 'High';
 localStorage.setItem('analysisResult', JSON.stringify({
 ...result,
 riskLevel,
 filename: file.name,
 _engine: 'js',
 }));
 }
 }
 }
 } catch (e) {
 console.error('[UploadPage] JS analysis error:', e);
 }
 };

 const interval = setInterval(() => {
 step++;
 setLoadingStep(step);
 if (step < dynamicLogs.length) setMockConsole(prev => [...prev, dynamicLogs[step]]);
 if (step === Math.floor(loadingSteps.length / 2)) {
 // Run analysis mid-way through the loading animation
 runBackendAnalysis().then(ok => { if (!ok) runJsAnalysis(); });
 }
 if (step >= loadingSteps.length) {
 clearInterval(interval);
 setTimeout(() => navigate('/results'), 1200);
 }
 }, 900);
 };

 return (
 <div className="min-h-screen bg-slate-950 font-sans overflow-hidden text-slate-200">
 <Navbar />

 <main className="max-w-6xl mx-auto px-6 pt-12 relative pb-20">
 {/* Progress Indicator */}
 <div className="flex items-center justify-between mb-12 relative px-4">
 <div className="absolute left-8 right-8 top-1/2 h-[1px] bg-slate-800 -z-10 -translate-y-1/2"></div>
 
 {['Dashboard', 'Ingestion', 'Analysis', 'Metrics'].map((step, idx) => {
 const isActive = idx === 1;
 const isDone = idx === 0;
 const isCurrentAnalysis = isAnalyzing && idx === 2;
 return (
 <div key={step} className="flex flex-col items-center">
 <div className={cn(
"w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm z-10 border",
 isDone || isCurrentAnalysis ?"bg-slate-800 border-blue-500 text-blue-400": 
 isActive && !isAnalyzing ?"bg-blue-500 border-blue-400 text-slate-900": 
"bg-slate-900 border-slate-800 text-slate-500"
 )}>
 {isCurrentAnalysis ? <Cpu className="w-5 h-5"/> : idx + 1}
 </div>
 <span className={cn(
"text-[10px] font-black mt-4 tracking-[0.2em] uppercase",
 isActive || isCurrentAnalysis || isDone ?"text-slate-300 text-shadow-sm":"text-slate-500"
 )}>{step}</span>
 </div>
 );
 })}
 </div>

 {!isAnalyzing ? (
 <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
 <div className="lg:col-span-8 flex flex-col space-y-8">
 {/* Upload Zone */}
 <div className="bg-slate-900 rounded-3xl p-10 border border-slate-800 relative overflow-hidden h-full flex flex-col">
 <div className="absolute top-0 right-0 p-4 border-l border-b border-slate-800 rounded-bl-3xl bg-slate-800/50">
 <Database className="w-6 h-6 text-blue-400 opacity-50"/>
 </div>
 
 <h2 className="text-3xl font-black text-white mb-2">Dataset Ingestion</h2>
 <p className="text-slate-400 mb-8 font-medium">Inject your historical training data (CSV format) to detect underlying bias vectors.</p>
 
 <div 
 className={cn(
"flex-1 border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center text-center relative overflow-hidden group min-h-[300px]",
 isDragging ?"border-blue-400 bg-blue-500/10":"border-slate-700 bg-slate-900 hover:border-slate-600 hover:bg-slate-800/50"
 )}
 onDragOver={handleDragOver}
 onDragLeave={handleDragLeave}
 onDrop={handleDrop}
 >
 <UploadCloud className={cn(
"h-24 w-24 mb-6",
 isDragging ?"text-blue-400":"text-slate-500 group-hover:text-blue-400"
 )} />
 <h3 className="text-2xl font-black text-white mb-2 tracking-tight">Drop your payload here</h3>
 <p className="text-sm text-slate-500 mb-8 font-medium">Maximum volume constraint: 50MB</p>
 
 <div className="flex relative z-10 w-full sm:w-auto">
 <label className="flex-1 sm:flex-none flex justify-center items-center bg-slate-800 border border-slate-700 text-white font-bold py-3 px-8 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-slate-700">
 Browse Files
 <input type="file"accept=".csv"className="hidden"onChange={handleFileChange} />
 </label>
 </div>
 </div>

 {error && (
 <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-sm font-bold flex items-center">
 <AlertCircle className="h-5 w-5 mr-3 shrink-0"/> {error}
 </div>
 )}

 {file && !error && (
 <div className="mt-8 p-5 border border-green-500/30 bg-green-500/10 rounded-2xl flex flex-col md:flex-row items-center justify-between">
 <div className="flex items-center w-full md:w-auto mb-4 md:mb-0">
 <div className="bg-green-500/20 p-3 rounded-xl mr-4 border border-green-500/30">
 <FileText className="h-8 w-8 text-green-500"/>
 </div>
 <div className="flex-1">
 <p className="text-lg font-black text-white">{file.name}</p>
 <div className="text-sm text-green-500 font-mono mt-1 font-bold">
 {(file.size / 1024).toFixed(1)} KB • {csvHeaders.length ? `${csvHeaders.length} Columns Detected` : 'Ready'}
 </div>
 </div>
 </div>
 <button 
 onClick={startAnalysis}
 className="w-full md:w-auto bg-green-500 text-slate-900 font-black py-4 px-8 rounded-xl hover:bg-green-400 flex items-center justify-center"
 >
 EXECUTE AUDIT <Search className="ml-3 h-5 w-5 fill-current"/>
 </button>
 </div>
 )}
 </div>
 </div>

 <div className="lg:col-span-4 flex flex-col space-y-6">
 {/* Dataset Library */}
 <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800 flex-1 relative overflow-hidden">
 <h3 className="text-xl font-black text-white flex items-center mb-6"><LinkIcon className="w-5 h-5 mr-2 text-purple-400"/> Dataset Library</h3>
 <div className="space-y-3">
 {[
 { id: 1, name: 'HR_Biased_Engineers_v4.csv', type: 'HR Tech', size: '1.2 MB' },
 { id: 2, name: 'Credit_Scoring_2023.csv', type: 'Finance', size: '3.4 MB' },
 { id: 3, name: 'Healthcare_Triage_Logs.csv', type: 'Health', size: '8.1 MB' }
 ].map(ds => (
 <div key={ds.id} onClick={() => selectLibraryDataset(ds.name)} className="bg-slate-800 border border-slate-700 hover:border-purple-400/50 p-4 rounded-xl cursor-pointer group relative overflow-hidden">
 <div className="flex justify-between items-start relative z-10">
 <div>
 <p className="text-sm font-black text-white group-hover:text-purple-400 truncate">{ds.name}</p>
 <div className="flex items-center gap-3 mt-2">
 <span className="text-[10px] uppercase font-bold text-purple-300 px-2 py-0.5 rounded bg-purple-500/20 border border-purple-500/30">{ds.type}</span>
 <span className="text-[10px] text-slate-500 font-bold font-mono">{ds.size}</span>
 </div>
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* Backend Status — always on */}
 <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800 relative overflow-hidden group hover:border-green-500/40">
 <h3 className="text-xl font-black text-white flex items-center mb-4">
 <Server className="w-5 h-5 mr-2 text-green-500"/> Engine Config
 </h3>
 <p className="text-xs text-slate-500 font-medium mb-5">
 Python FastAPI backend is automatically used for all analysis. Falls back to JS engine if backend is unreachable.
 </p>
 <div className="space-y-3">
 <div className="flex items-center justify-between p-3 bg-slate-800 rounded-xl border border-green-500/20">
 <span className="text-xs font-bold text-slate-400 flex items-center">
 <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
 Backend Auto-Connect
 </span>
 <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">Active</span>
 </div>
 <div className="p-3 bg-slate-800 rounded-xl border border-slate-700">
 <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">API Endpoint</p>
 <p className="text-xs font-mono text-blue-400">/api/analyze</p>
 </div>
 </div>
 </div>
 </div>

 </div>
 ) : (
 /* Loading Screen */
 <div className="bg-slate-900 rounded-3xl overflow-hidden flex flex-col border border-slate-800">
 <div className="p-12 flex flex-col items-center justify-center text-center bg-slate-950/50 relative">
 <div className="relative w-36 h-36 mb-10">
 <div className="absolute inset-0 border-[4px] border-blue-500/30 border-t-blue-500 rounded-full"></div>
 <div className="absolute inset-4 border-[4px] border-purple-500/30 border-b-purple-500 rounded-full"></div>
 <div className="absolute inset-8 border border-slate-700 rounded-full bg-slate-900 flex items-center justify-center">
 <Cpu className="text-blue-500 h-10 w-10"/>
 </div>
 </div>
 
 <h2 className="text-3xl font-black text-white mb-2 tracking-tight">Audit Engine Online</h2>
 <p className="text-slate-500 font-bold tracking-widest uppercase text-xs">Do not terminate session</p>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800 border-t border-slate-800">
 <div className="p-8 bg-slate-900/50">
 <h4 className="text-slate-500 font-bold uppercase tracking-widest text-xs mb-6">Execution Steps</h4>
 <div className="flex flex-col space-y-4">
 {loadingSteps.map((step, idx) => (
 <div key={idx} className={cn(
"flex items-start",
 idx > loadingStep ?"opacity-20": idx === loadingStep ?"opacity-100 scale-105":"opacity-50"
 )}>
 {idx < loadingStep ? (
 <CheckCircle className="h-5 w-5 text-green-500 mr-4 shrink-0"/>
 ) : idx === loadingStep ? (
 <div className="h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full mr-4 shrink-0"></div>
 ) : (
 <div className="h-4 w-4 rounded-full border border-slate-700 mr-4 shrink-0 mt-0.5"></div>
 )}
 <span className={cn(
"text-sm font-bold",
 idx === loadingStep ?"text-blue-400":"text-slate-400"
 )}>{step}</span>
 </div>
 ))}
 </div>
 </div>

 <div className="p-8 bg-black/50 font-mono text-xs text-green-500 flex flex-col justify-end overflow-hidden relative min-h-[300px]">
 <div className="space-y-2 opacity-80 pb-4">
 {mockConsole.map((log, i) => (
 <div key={i}>
 <span className="opacity-50 mr-2">{'>'}</span>{log}
 </div>
 ))}
 <div>
 <span className="opacity-50 mr-2">{'>'}</span>_
 </div>
 </div>
 </div>
 </div>

 </div>
 )}
 </main>
 </div>
 );
};

export default UploadPage;
