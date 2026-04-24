import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, FileText, CheckCircle, Search, Activity, ShieldAlert, Cpu, Database, AlertCircle, Link as LinkIcon, Server, Settings2 } from 'lucide-react';
import Navbar from '../components/Navbar';
import { sampleCSV } from '../data/mockData';
import { motion, AnimatePresence } from 'framer-motion';
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
  
  // Backend config stub for friend to use
  const [useBackend, setUseBackend] = useState(false);
  const [apiUrl, setApiUrl] = useState('http://localhost:8000/api/analyze');

  const loadingSteps = [
    useBackend ? "Connecting to external Model API..." : "Establishing secure local instance...",
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

  const startAnalysis = () => {
    if (!file) return;
    setIsAnalyzing(true);
    let step = 0;

    const possibleSensitive = csvHeaders.filter(h =>
      ['gender', 'sex', 'race', 'ethnicity', 'age', 'zip', 'zipcode'].some(s => h.toLowerCase().includes(s))
    );

    const dynamicLogs = [
      useBackend ? `[SYS] Hooking into remote API at ${apiUrl}...` : `[SYS] Initializing Local Audit Engine...`,
      `[FS] Loaded ${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
      `[DATA] Detected ${csvHeaders.length} columns`,
      `[WARN] Potential sensitive features isolated: [${possibleSensitive.length ? possibleSensitive.join(', ') : 'Inferred Proxies'}]`,
      `[PROC] Running fairness matrices...`,
      `[PROC] Executing bias classifiers...`,
      `[PROC] Detecting proxy features & computing metrics...`,
      `[SYS] Compiling mitigation manifest...`
    ];

    setMockConsole([dynamicLogs[0]]);

    // Run real analysis in background
    const runRealAnalysis = () => {
      try {
        const src = csvText || localStorage.getItem('uploadedCsvText') || '';
        if (src) {
          const { data } = parseCSV(src);
          if (data && data.length > 0) {
            const result = computeMetrics(data);
            if (result) {
              // Determine risk level from score
              const riskLevel = result.score >= 80 ? 'Low' : result.score >= 60 ? 'Moderate' : 'High';
              localStorage.setItem('analysisResult', JSON.stringify({ ...result, riskLevel, filename: file.name }));
            }
          }
        }
      } catch (e) {
        console.error('Analysis error:', e);
      }
    };

    const interval = setInterval(() => {
      step++;
      setLoadingStep(step);
      if (step < dynamicLogs.length) setMockConsole(prev => [...prev, dynamicLogs[step]]);
      if (step === Math.floor(loadingSteps.length / 2)) runRealAnalysis();
      if (step >= loadingSteps.length) {
        clearInterval(interval);
        setTimeout(() => navigate('/results'), 1200);
      }
    }, 900);
  };

  return (
    <div className="min-h-screen bg-primary-dark font-sans overflow-hidden text-text-primary selection:bg-accent-cyan/30">
      <Navbar />

      <main className="max-w-6xl mx-auto px-6 pt-12 relative pb-20">
        {/* Glow effect behind main area */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-accent-cyan/5 blur-[200px] pointer-events-none"></div>

        {/* Cyber Progress Indicator */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-12 relative px-4"
        >
          <div className="absolute left-8 right-8 top-1/2 h-[1px] bg-white/10 -z-10 transform -translate-y-1/2"></div>
          <div className="absolute left-8 right-8 top-1/2 w-1/3 h-[2px] bg-gradient-to-r from-accent-cyan to-accent-purple -z-10 transform -translate-y-1/2 shadow-glow-cyan"></div>
          
          {['Dashboard', 'Ingestion', 'Analysis', 'Metrics'].map((step, idx) => {
            const isActive = idx === 1;
            const isDone = idx === 0;
            const isCurrentAnalysis = isAnalyzing && idx === 2;
            return (
              <div key={step} className="flex flex-col items-center">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm shadow-neo z-10 border transition-all duration-300",
                  isDone || isCurrentAnalysis ? "bg-surface-dark border-accent-cyan text-accent-cyan shadow-glow-cyan" : 
                  isActive && !isAnalyzing ? "bg-accent-cyan border-accent-cyan-glow text-primary-dark shadow-glow-cyan scale-110" : 
                  "bg-surface-dark border-white/5 text-text-muted"
                )}>
                  {isCurrentAnalysis ? <Cpu className="w-5 h-5 animate-pulse" /> : idx + 1}
                </div>
                <span className={cn(
                  "text-[10px] font-black mt-4 tracking-[0.2em] uppercase",
                  isActive || isCurrentAnalysis || isDone ? "text-text-primary text-shadow-sm" : "text-text-muted"
                )}>{step}</span>
              </div>
            );
          })}
        </motion.div>

        <AnimatePresence mode="wait">
          {!isAnalyzing ? (
            <motion.div 
              key="upload"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, y: -50, filter: "blur(10px)" }}
              transition={{ duration: 0.4 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              
              <div className="lg:col-span-8 flex flex-col space-y-8">
                {/* Upload Zone */}
                <div className="glass-card rounded-3xl p-10 border-white/10 relative overflow-hidden h-full flex flex-col">
                  <div className="absolute top-0 right-0 p-4 border-l border-b border-white/5 rounded-bl-3xl bg-surface-dark/50">
                     <Database className="w-6 h-6 text-accent-cyan opacity-50" />
                  </div>
                  
                  <h2 className="text-3xl font-black text-white mb-2">Dataset Ingestion</h2>
                  <p className="text-text-secondary mb-8 font-medium">Inject your historical training data (CSV format) to detect underlying bias vectors.</p>
                  
                  <div 
                    className={cn(
                      "flex-1 border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center text-center transition-all duration-300 relative overflow-hidden group min-h-[300px]",
                      isDragging ? "border-accent-cyan bg-accent-cyan/5 scale-[1.02] shadow-glow-cyan" : "border-white/20 bg-surface-dark/30 hover:border-accent-cyan/50 hover:bg-surface-dark/60 focus-within:border-accent-purple focus-within:shadow-glow-purple"
                    )}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <UploadCloud className={cn(
                      "h-24 w-24 mb-6 transition-all duration-500",
                      isDragging ? "text-accent-cyan animate-bounce filter drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]" : "text-text-muted group-hover:text-accent-cyan group-hover:scale-110"
                    )} />
                    <h3 className="text-2xl font-black text-white mb-2 tracking-tight">Drop your payload here</h3>
                    <p className="text-sm text-text-secondary mb-8 font-medium">Maximum volume constraint: 50MB</p>
                    
                    <div className="flex relative z-10 w-full sm:w-auto">
                      <label className="flex-1 sm:flex-none flex justify-center items-center bg-surface-dark border border-white/10 text-white font-bold py-3 px-8 rounded-xl cursor-pointer hover:border-accent-cyan hover:bg-surface-light transition-all shadow-neo">
                        Browse Files
                        <input type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
                      </label>
                    </div>
                  </div>

                  <AnimatePresence>
                    {error && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-6 p-4 bg-danger-red/10 border border-danger-red/30 text-danger-red rounded-xl text-sm font-bold flex items-center shadow-neo"
                      >
                        <AlertCircle className="h-5 w-5 mr-3 shrink-0" /> {error}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {file && !error && (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="mt-8 p-5 border border-success-green/30 bg-success-green/10 rounded-2xl flex flex-col md:flex-row items-center justify-between shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                      >
                        <div className="flex items-center w-full md:w-auto mb-4 md:mb-0">
                          <div className="bg-success-green/20 p-3 rounded-xl mr-4 border border-success-green/30 shadow-glow-cyan">
                            <FileText className="h-8 w-8 text-success-green" />
                          </div>
                          <div className="flex-1">
                            <p className="text-lg font-black text-white">{file.name}</p>
                            <div className="text-sm text-success-green font-mono mt-1 font-bold">
                              {(file.size / 1024).toFixed(1)} KB • {csvHeaders.length ? `${csvHeaders.length} Columns Detected` : 'Ready'}
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={startAnalysis}
                          className="w-full md:w-auto bg-success-green text-primary-dark font-black py-4 px-8 rounded-xl hover:bg-success-light transition-all shadow-neo flex items-center justify-center hover:shadow-[0_0_30px_rgba(16,185,129,0.6)] hover:scale-105"
                        >
                          EXECUTE AUDIT <Search className="ml-3 h-5 w-5 fill-current" />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="lg:col-span-4 flex flex-col space-y-6">
                {/* Dataset Library */}
                <div className="glass-card rounded-3xl p-8 border-white/10 flex-1 relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-accent-purple/10 rounded-full blur-[50px] pointer-events-none"></div>
                   <h3 className="text-xl font-black text-white flex items-center mb-6"><LinkIcon className="w-5 h-5 mr-2 text-accent-purple" /> Dataset Library</h3>
                   <div className="space-y-3">
                     {[
                       { id: 1, name: 'HR_Biased_Engineers_v4.csv', type: 'HR Tech', size: '1.2 MB' },
                       { id: 2, name: 'Credit_Scoring_2023.csv', type: 'Finance', size: '3.4 MB' },
                       { id: 3, name: 'Healthcare_Triage_Logs.csv', type: 'Health', size: '8.1 MB' }
                     ].map(ds => (
                       <div key={ds.id} onClick={() => selectLibraryDataset(ds.name)} className="bg-surface-dark border border-white/5 hover:border-accent-purple/50 p-4 rounded-xl cursor-pointer transition-all hover:-translate-y-1 shadow-neo group relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-r from-accent-purple/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                          <div className="flex justify-between items-start relative z-10">
                            <div>
                              <p className="text-sm font-black text-white group-hover:text-accent-purple transition-colors truncate">{ds.name}</p>
                              <div className="flex items-center gap-3 mt-2">
                                <span className="text-[10px] uppercase font-bold text-accent-purple-glow px-2 py-0.5 rounded bg-accent-purple/20 border border-accent-purple/30">{ds.type}</span>
                                <span className="text-[10px] text-text-muted font-bold font-mono">{ds.size}</span>
                              </div>
                            </div>
                          </div>
                       </div>
                     ))}
                   </div>
                </div>

                {/* Backend Integration Hub */}
                <div className="glass-card rounded-3xl p-8 border-warning-amber/20 relative overflow-hidden group hover:border-warning-amber/50 transition-colors">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-warning-amber to-transparent opacity-30 group-hover:opacity-100 transition-opacity"></div>
                  <h3 className="text-xl font-black text-white flex items-center mb-4"><Settings2 className="w-5 h-5 mr-2 text-warning-amber" /> Engine Config</h3>
                  
                  <p className="text-xs text-text-muted font-medium mb-5">
                    Connect an external Python FastAPI backend to process large telemetry sets dynamically via neural net endpoints.
                  </p>
                  
                  <div className="space-y-4">
                    <label className="flex items-center cursor-pointer group/toggle">
                      <div className="relative">
                        <input type="checkbox" className="sr-only" checked={useBackend} onChange={(e) => setUseBackend(e.target.checked)} />
                        <div className={cn("block w-10 h-6 rounded-full transition-colors", useBackend ? "bg-warning-amber shadow-glow-cyan" : "bg-surface-light")}></div>
                        <div className={cn("dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform", useBackend ? "transform translate-x-4" : "")}></div>
                      </div>
                      <div className="ml-3 text-sm font-bold text-white group-hover/toggle:text-warning-amber flex items-center">
                        <Server className="w-4 h-4 mr-2 opacity-50" /> Enable Remote API
                      </div>
                    </label>

                    <AnimatePresence>
                      {useBackend && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                           <div className="mt-3">
                             <label className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-1 block">API Endpoint URL</label>
                             <input 
                               type="text" 
                               value={apiUrl}
                               onChange={(e) => setApiUrl(e.target.value)}
                               className="w-full bg-primary-dark border border-white/10 rounded-lg p-2.5 text-xs text-white font-mono focus:border-warning-amber focus:outline-none transition-colors"
                             />
                           </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

            </motion.div>
          ) : (
            /* Cyber Loading Screen */
            <motion.div 
              key="analyzing"
              initial={{ opacity: 0, filter: "blur(20px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              className="glass-card rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.15)] flex flex-col border border-accent-cyan/20 bg-surface-dark relative"
            >
              <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-accent-cyan to-transparent animate-pulse-slow"></div>

              <div className="p-12 flex flex-col items-center justify-center text-center bg-primary-dark/50 relative">
                 <div className="absolute inset-0 bg-accent-cyan/5 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-accent-cyan/10 to-transparent pointer-events-none blur-3xl"></div>

                <div className="relative w-36 h-36 mb-10">
                  <div className="absolute inset-0 border-[4px] border-accent-cyan/30 border-t-accent-cyan rounded-full animate-spin-slow"></div>
                  <div className="absolute inset-4 border-[4px] border-accent-purple/30 border-b-accent-purple rounded-full animate-spin-reverse"></div>
                  <div className="absolute inset-8 border border-white/10 rounded-full bg-surface-dark flex items-center justify-center shadow-neo">
                    <Cpu className="text-accent-cyan h-10 w-10 animate-pulse drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
                  </div>
                </div>
                
                <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-accent-cyan to-accent-purple mb-2 tracking-tight">Audit Engine Online</h2>
                <p className="text-text-muted font-bold tracking-widest uppercase text-xs">Do not terminate session</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/10 border-t border-white/10">
                <div className="p-8 bg-surface-dark/50">
                  <h4 className="text-text-muted font-bold uppercase tracking-widest text-xs mb-6">Execution Steps</h4>
                  <div className="flex flex-col space-y-4">
                    {loadingSteps.map((step, idx) => (
                      <div key={idx} className={cn(
                        "flex items-start transition-all duration-300",
                        idx > loadingStep ? "opacity-20" : idx === loadingStep ? "opacity-100 scale-105" : "opacity-50"
                      )}>
                        {idx < loadingStep ? (
                          <CheckCircle className="h-5 w-5 text-success-green mr-4 shrink-0 shadow-glow-cyan" />
                        ) : idx === loadingStep ? (
                          <div className="h-5 w-5 border-2 border-accent-cyan border-t-transparent rounded-full animate-spin mr-4 shrink-0"></div>
                        ) : (
                          <div className="h-4 w-4 rounded-full border border-white/20 mr-4 shrink-0 mt-0.5"></div>
                        )}
                        <span className={cn(
                          "text-sm font-bold",
                          idx === loadingStep ? "text-accent-cyan" : "text-text-secondary"
                        )}>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-8 bg-black/50 font-mono text-xs text-success-green flex flex-col justify-end overflow-hidden relative min-h-[300px]">
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black pointer-events-none z-10"></div>
                  <div className="space-y-2 opacity-80 pb-4">
                    {mockConsole.map((log, i) => (
                      <motion.div 
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                      >
                        <span className="opacity-50 mr-2">{'>'}</span>{log}
                      </motion.div>
                    ))}
                    <motion.div
                      animate={{ opacity: [1, 0] }}
                      transition={{ repeat: Infinity, duration: 0.8 }}
                    >
                      <span className="opacity-50 mr-2">{'>'}</span>_
                    </motion.div>
                  </div>
                </div>
              </div>

            </motion.div>
          )}
        </AnimatePresence>

      </main>
    </div>
  );
};

export default UploadPage;
