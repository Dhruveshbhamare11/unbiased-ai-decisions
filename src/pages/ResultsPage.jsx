import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockAnalysisResult } from '../data/mockData';
import FairnessScore from '../components/FairnessScore';
import { GenderOutcomeChart, AgeOutcomeChart, MetricsThresholdChart, FairnessBreakdownChart } from '../components/BiasCharts';
import { AlertOctagon, DownloadCloud, Activity, Filter, Home, CheckCircle2, XCircle, AlertTriangle, Scale, Cpu, Share2 } from 'lucide-react';
import Navbar from '../components/Navbar';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

const ResultsPage = () => {
  const navigate = useNavigate();
  const res = mockAnalysisResult;

  const [isDownloading, setIsDownloading] = useState(false);

  const getRiskColor = (risk) => {
    if (risk === 'Low') return 'text-success-green bg-success-green/10 border-success-green/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]';
    if (risk === 'Moderate') return 'text-warning-amber bg-warning-amber/10 border-warning-amber/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]';
    return 'text-danger-red bg-danger-red/10 border-danger-red/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]';
  };

  const MetricRow = ({ name, value, threshold, isRatio }) => {
    const passed = isRatio ? value >= threshold : value <= threshold;
    const absVal = Math.abs(value);
    
    return (
      <div className="flex items-center justify-between p-4 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors group">
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
            Threshold: {isRatio ? `≥ ${threshold}` : `≤ ${threshold}`} <span className="mx-2 opacity-30">|</span> Actual: <span className="font-bold text-white bg-white/10 px-1.5 py-0.5 rounded">{value}</span>
          </div>
        </div>
        
        <div className="w-1/3 ml-6">
          <div className="h-1.5 w-full bg-surface-dark border border-white/5 rounded-full overflow-hidden">
            <div 
              className={cn("h-full transition-all duration-1000", passed ? 'bg-success-green shadow-[0_0_10px_rgba(16,185,129,0.8)]' : 'bg-danger-red shadow-[0_0_10px_rgba(239,68,68,0.8)]')} 
              style={{ width: `${Math.min(100, isRatio ? (value/1.5)*100 : (absVal/0.5)*100)}%` }}
            ></div>
          </div>
        </div>
      </div>
    );
  };

  const handleDownloadReport = () => {
    setIsDownloading(true);
    setTimeout(() => {
      setIsDownloading(false);
      
      // Actual blob generation for a functional download
      let reportContent = `UNBIASED.AI FAIRNESS AUDIT REPORT\n`;
      reportContent += `Generated: ${new Date().toISOString()}\n`;
      reportContent += `Dataset: biased_engineers_v4.csv\n`;
      reportContent += `====================================\n\n`;
      
      reportContent += `[ OVERALL COMPLIANCE ]\n`;
      reportContent += `Fairness Score: ${res.fairness_score}/100\n`;
      reportContent += `Risk Level: ${res.risk_level.toUpperCase()}\n`;
      reportContent += `Biased Attributes: ${res.biased_attributes.join(', ')}\n\n`;

      reportContent += `[ METRICS ]\n`;
      reportContent += `- Demographic Parity: ${res.metrics.demographic_parity} (Threshold: <= 0.1)\n`;
      reportContent += `- Disparate Impact Ratio: ${res.metrics.disparate_impact} (Threshold: >= 0.8)\n`;
      reportContent += `- Equal Opportunity: ${res.metrics.equal_opportunity} (Threshold: <= 0.1)\n\n`;

      reportContent += `[ REGULATORY WARNING ]\n`;
      reportContent += `The computed Disparate Impact Ratio (${res.metrics.disparate_impact}) violates the 4/5ths rule (< 0.8). Under the EU AI Act and US EEOC guidelines, deploying this system may trigger legal liability.\n\n`;

      reportContent += `[ RECOMMENDED MITIGATIONS ]\n`;
      res.mitigation_suggestions.forEach((m, idx) => {
        reportContent += `${idx + 1}. ${m.title} (Complexity: ${m.complexity}, Impact: ${m.impact})\n`;
        reportContent += `   ${m.desc}\n`;
      });

      const blob = new Blob([reportContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Audit_Manifest_${Date.now()}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-primary-dark font-sans overflow-hidden text-text-primary selection:bg-accent-cyan/30">
      <Navbar />

      <main className="max-w-6xl mx-auto px-6 pt-12 pb-24 relative">
        <div className="absolute top-1/4 -left-[20%] w-[800px] h-[800px] bg-danger-red/5 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-1/4 -right-[20%] w-[800px] h-[800px] bg-accent-cyan/5 rounded-full blur-[120px] pointer-events-none"></div>

        {/* Cyber Progress Indicator */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-12 relative px-4"
        >
          <div className="absolute left-8 right-8 top-1/2 h-[1px] bg-white/10 -z-10 transform -translate-y-1/2"></div>
          <div className="absolute left-8 right-8 top-1/2 w-full h-[2px] bg-gradient-to-r from-accent-cyan via-accent-purple to-success-green -z-10 transform -translate-y-1/2 shadow-glow-cyan"></div>
          
          {['Dashboard', 'Ingestion', 'Analysis', 'Metrics'].map((step, idx) => {
            const isDone = true;
            const isMetrics = idx === 3;
            return (
              <div key={step} className="flex flex-col items-center">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm shadow-neo z-10 border transition-all duration-300",
                  isMetrics ? "bg-success-green border-success-light text-primary-dark shadow-[0_0_20px_rgba(16,185,129,0.5)] scale-110" : "bg-surface-dark border-accent-cyan/50 text-accent-cyan shadow-glow-cyan"
                )}>
                  {isDone ? <CheckCircle2 className={cn("w-6 h-6", isMetrics ? "text-primary-dark" : "text-accent-cyan")} /> : null}
                </div>
                <span className={cn(
                  "text-[10px] font-black mt-4 tracking-[0.2em] uppercase text-text-primary text-shadow-sm"
                )}>{step}</span>
              </div>
            );
          })}
        </motion.div>

        {/* Global Action Buttons */}
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          className="flex justify-end mb-8 space-x-4 relative z-10"
        >
          <button onClick={() => navigate('/dashboard')} className="flex items-center px-6 py-3 bg-surface-dark/80 backdrop-blur-md border border-white/10 rounded-xl text-xs uppercase tracking-widest font-black text-white hover:bg-surface-light hover:border-accent-cyan transition-all shadow-neo">
            <Home className="w-4 h-4 mr-2 text-accent-cyan" /> Return Data
          </button>
          <button onClick={handleDownloadReport} className="flex items-center px-8 py-3 bg-gradient-to-r from-accent-cyan to-accent-purple rounded-xl text-xs uppercase tracking-widest font-black text-white hover:shadow-glow-cyan transition-all shadow-neo group relative overflow-hidden">
            <div className="absolute inset-0 bg-white/20 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            {isDownloading ? (
              <span className="flex items-center relative z-10"><Cpu className="w-4 h-4 text-white animate-pulse mr-2" /> Encrypting...</span>
            ) : (
              <span className="flex items-center relative z-10"><DownloadCloud className="w-4 h-4 mr-2" /> Export .TXT</span>
            )}
          </button>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-10 overflow-visible relative z-10"
        >
          {/* Top Level Score Card */}
          <div className="lg:col-span-4 glass-card rounded-3xl p-8 flex flex-col items-center justify-center text-center relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-48 h-48 bg-danger-red/10 rounded-full blur-[80px] pointer-events-none transition-all group-hover:bg-danger-red/20"></div>
            
            <h2 className="text-xs font-black text-text-muted mb-8 uppercase tracking-[0.3em] relative z-10">Fairness Index</h2>
            
            <div className="mb-10 transform scale-[1.3] relative z-10 filter drop-shadow-[0_0_20px_rgba(0,0,0,0.5)] mt-4">
              <FairnessScore score={res.fairness_score} />
            </div>
            
            <div className={`mt-4 font-black px-8 py-3 rounded-xl border flex items-center justify-center space-x-3 text-lg uppercase tracking-widest ${getRiskColor(res.risk_level)} relative z-10`}>
              {res.risk_level === 'High' && <AlertOctagon className="w-5 h-5 animate-pulse" />}
              {res.risk_level === 'Low' && <CheckCircle2 className="w-5 h-5" />}
              <span>{res.risk_level} Risk</span>
            </div>
            
            <p className="mt-8 text-sm text-text-secondary font-medium leading-relaxed max-w-xs relative z-10">
              Model demonstrates severe statistical bias against protected subgroups. <span className="text-danger-red font-bold block mt-2">DO NOT DEPLOY.</span>
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
          </div>

          {/* Metrics List */}
          <div className="lg:col-span-8 glass-card rounded-3xl p-10 flex flex-col relative overflow-hidden">
            <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-accent-cyan/10 rounded-full blur-[100px] pointer-events-none"></div>
            
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/10">
               <div>
                 <h3 className="text-3xl font-black text-white flex items-center"><Activity className="w-6 h-6 mr-3 text-accent-cyan" /> Algorithm Telemetry</h3>
                 <p className="text-sm text-text-muted mt-2 font-medium tracking-wide">Evaluated against global regulatory thresholds (EU AI Act).</p>
               </div>
            </div>
            
            <div className="flex-1 flex flex-col justify-around gap-2 relative z-10">
              <MetricRow 
                name="Demographic Parity Discrepancy" 
                value={res.metrics.demographic_parity} 
                threshold={0.10} 
                isRatio={false} 
              />
              <MetricRow 
                name="Disparate Impact Ratio" 
                value={res.metrics.disparate_impact} 
                threshold={0.80} 
                isRatio={true} 
              />
              <MetricRow 
                name="Equal Opportunity Variance" 
                value={res.metrics.equal_opportunity} 
                threshold={0.10} 
                isRatio={false} 
              />
            </div>
            
            {/* Regulatory Alert */}
            <div className="mt-10 bg-danger-red/10 border border-danger-red/40 rounded-2xl p-6 flex items-start shadow-glow-red relative z-10">
              <div className="bg-danger-red p-3 rounded-xl mr-5 shadow-lg relative overflow-hidden group shrink-0">
                <div className="absolute inset-0 bg-white/20 animate-pulse-slow"></div>
                <AlertTriangle className="w-6 h-6 text-white relative z-10" />
              </div>
              <div className="mt-1">
                <h4 className="text-sm font-black text-danger-red uppercase tracking-widest mb-2 flex items-center">
                   Regulatory Violation <span className="mx-3 opacity-30 text-white">|</span> EU AI Act & EEOC
                </h4>
                <p className="text-sm text-white/80 leading-relaxed font-medium">
                  The computed Disparate Impact Ratio (<span className="font-bold text-white bg-white/10 px-1 rounded">{res.metrics.disparate_impact}</span>) violates the legal 4/5ths rule (&lt; 0.8). Deploying this build will trigger compliance failure and legal liability under EU Article 10 guidelines.
                </p>
              </div>
            </div>

          </div>
        </motion.div>

        {/* Charts & Visualizations */}
        <motion.div 
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} // transition
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
                 <p className="text-[11px] text-accent-cyan text-center font-bold uppercase tracking-wider">Anomaly: Males selected at nearly 2x the rate of females.</p>
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
              <h4 className="text-white font-black mb-8 text-center text-sm uppercase tracking-widest opacity-80">Metrics vs Threshold</h4>
              <MetricsThresholdChart metrics={res.metrics} />
              <div className="mt-6 bg-surface-dark border border-white/5 p-3 rounded-xl">
                 <p className="text-[11px] text-warning-amber text-center font-bold uppercase tracking-wider">Disparate impact ratio critically below 0.8 passing line.</p>
              </div>
            </div>

            <div className="glass-card p-8 rounded-3xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
              <h4 className="text-white font-black mb-4 text-center text-sm uppercase tracking-widest opacity-80">Score Penalty Breakdown</h4>
              <div className="flex-1 min-h-[220px]"><FairnessBreakdownChart score={res.fairness_score} /></div>
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
              <h3 className="text-2xl font-black text-white">Patch Protocals</h3>
              <p className="text-xs font-bold text-text-muted mt-1 uppercase tracking-widest">Compiler suggesting algorithmic fixes</p>
            </div>
          </div>
          
          <div className="space-y-6">
            {res.mitigation_suggestions.map((mitigation, idx) => (
              <div key={idx} className="glass-card p-8 rounded-3xl hover:border-accent-cyan/50 hover:shadow-glow-cyan transition-all duration-500 overflow-hidden relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-accent-cyan/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <div className="flex flex-col md:flex-row md:items-center relative z-10">
                  <div className="w-16 h-16 rounded-2xl bg-surface-dark border border-white/10 text-white shadow-neo flex items-center justify-center font-black text-2xl mb-6 md:mb-0 md:mr-8 shrink-0 relative overflow-hidden group-hover:border-accent-cyan transition-colors">
                    <div className="absolute bottom-0 w-full h-1 bg-accent-cyan group-hover:h-full transition-all duration-500 opacity-20"></div>
                    {idx + 1}
                  </div>
                  
                  <div className="flex-1 pr-6">
                    <h4 className="text-xl font-black text-white mb-3 group-hover:text-accent-cyan transition-colors">{mitigation.title}</h4>
                    <p className="text-sm text-text-secondary font-medium leading-relaxed">
                      {mitigation.desc}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-6 mt-8 md:mt-0 p-5 rounded-2xl bg-surface-dark/50 border border-white/5 shrink-0">
                    <div className="flex flex-col text-right items-center">
                      <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-2">Delta</span>
                      <span className="text-2xl font-black text-success-green">{mitigation.improvement}</span>
                    </div>
                    <div className="h-12 w-px bg-white/10"></div>
                    <div className="flex flex-col gap-3">
                      <span className={cn(
                        "text-[9px] uppercase font-black px-3 py-1.5 rounded flex items-center justify-center shadow-neo border tracking-widest",
                        mitigation.impact.includes('High') ? 'bg-accent-purple/20 text-accent-purple-glow border-accent-purple/30' : 'bg-surface-light text-white border-white/10'
                      )}>
                        Impact <span className="mx-2 opacity-30">|</span> {mitigation.impact}
                      </span>
                      <span className={cn(
                        "text-[9px] uppercase font-black px-3 py-1.5 rounded flex justify-center shadow-neo border tracking-widest",
                        mitigation.complexity === 'Easy' ? 'bg-success-green/20 text-success-green border-success-green/30' : 
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

      </main>
    </div>
  );
};

export default ResultsPage;
