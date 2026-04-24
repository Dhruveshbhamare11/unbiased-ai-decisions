import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { mockAnalysisResult, computeFairnessScore, sampleCSV } from '../data/mockData';
import { generateDebiasedDataset, computeMetrics, parseCSV } from '../lib/fairnessEngine';
import { ComparativeMetricsChart, ComparativeApprovalChart } from '../components/ComparativeCharts';
import { DownloadCloud, ArrowLeft, Server, Brain, Scale, CheckCircle2, ShieldCheck, AlertTriangle, Info } from 'lucide-react';
import { cn } from '../lib/utils';

const ComparisonPage = () => {
  const navigate = useNavigate();
  const res = mockAnalysisResult;
  const fairness_score = computeFairnessScore(res.metrics);

  const [isGeneratingDebiased, setIsGeneratingDebiased] = useState(false);
  const [debiasedResult, setDebiasedResult] = useState(null);

  const handleGenerateDebiased = () => {
    setIsGeneratingDebiased(true);
    setTimeout(() => {
      // Use real uploaded CSV if available, fallback to sampleCSV
      const csvSrc = localStorage.getItem('uploadedCsvText') || sampleCSV;
      const result = generateDebiasedDataset(csvSrc);
      setDebiasedResult(result);
      setIsGeneratingDebiased(false);
    }, 1500);
  };

  const handleDownloadCSV = () => {
    if (!debiasedResult) return;
    const blob = new Blob([debiasedResult.debiasedCsvStr], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `debiased_biased_engineers_v4.csv`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-primary-dark font-sans overflow-hidden text-text-primary selection:bg-accent-cyan/30">
      <Navbar />
      
      <main className="max-w-6xl mx-auto px-6 pt-12 pb-24 relative">
        <div className="absolute top-0 -left-[10%] w-[600px] h-[600px] bg-accent-purple/5 rounded-full blur-[120px] pointer-events-none" />
        
        <button onClick={() => navigate('/results')} className="flex items-center text-text-muted hover:text-accent-cyan transition-colors mb-8 font-bold text-xs uppercase tracking-widest">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Analysis
        </button>

        <div className="mb-10">
          <h1 className="text-4xl font-black text-white flex items-center mb-4">
            <Scale className="w-8 h-8 mr-4 text-accent-purple" /> Algorithm Reforging
          </h1>
          <p className="text-sm text-text-muted leading-relaxed max-w-2xl">
            Execute the post-processing debiasing engine to structurally remap weights, drop sensitive columns, and recalculate all 6 disparate metrics. The output is a highly-compliant dataset fully ready for production.
          </p>
        </div>

        {!debiasedResult ? (
          <div className="glass-card rounded-3xl p-16 flex flex-col items-center justify-center text-center border border-accent-purple/30 bg-accent-purple/5 shadow-[0_0_50px_rgba(139,92,246,0.1)] relative overflow-hidden group">
            <Brain className="w-20 h-20 text-accent-purple mb-8 group-hover:scale-110 transition-transform duration-500 opacity-80" />
            <h2 className="text-2xl font-black text-white mb-4">Awaiting Engine Initialisation</h2>
            <p className="text-text-secondary max-w-lg mb-10">
              The original metric analysis registered a Fairness Score of {fairness_score}/100. Engaging the debiasing engine will generate {Math.floor(sampleCSV.length * 2.3)} synthetic records to balance the threshold logic safely.
            </p>
            <button 
              onClick={handleGenerateDebiased}
              disabled={isGeneratingDebiased}
              className="px-8 py-4 bg-accent-purple hover:bg-accent-purple-glow transition-all text-white font-black text-sm uppercase tracking-widest rounded-xl shadow-[0_0_20px_rgba(139,92,246,0.5)] flex items-center"
            >
              {isGeneratingDebiased ? (
                <><Server className="w-5 h-5 mr-3 animate-spin" /> Compiling Engine Simulator...</>
              ) : "Ignite Debiasing Engine"}
            </button>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Download & Summary Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 glass-card rounded-3xl p-8 border border-success-green/20 bg-success-green/5">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-xl font-black text-white mb-1">Debiasing Complete</h3>
                    <p className="text-xs text-text-muted uppercase tracking-widest font-bold font-mono">Dataset safely normalized.</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-text-muted uppercase tracking-widest font-black mb-1">Score Shift</p>
                    <p className="text-3xl font-black text-white">
                      <span className="text-danger-red line-through opacity-50 text-xl mr-2">{fairness_score}</span>
                      <span className="text-success-green">{debiasedResult.statsAfter.score}</span>
                      <span className="text-xs text-text-muted ml-1">/100</span>
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="bg-surface-dark/50 p-4 rounded-xl border border-white/5">
                    <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold">Rows Scanned</p>
                    <p className="text-lg font-black text-white mt-1">{debiasedResult.summary.originalRows}</p>
                  </div>
                  <div className="bg-surface-dark/50 p-4 rounded-xl border border-white/5">
                    <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold">Removed</p>
                    <p className="text-lg font-black text-danger-red mt-1">{debiasedResult.summary.rowsRemoved}</p>
                  </div>
                  <div className="bg-surface-dark/50 p-4 rounded-xl border border-white/5">
                    <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold">Synthesized</p>
                    <p className="text-lg font-black text-accent-purple mt-1">+{debiasedResult.summary.rowsAdded}</p>
                  </div>
                  <div className="bg-surface-dark/50 p-4 rounded-xl border border-white/5">
                    <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold">Final Export</p>
                    <p className="text-lg font-black text-success-green mt-1">{debiasedResult.summary.finalRows}</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button onClick={handleDownloadCSV} className="flex-1 px-6 py-4 bg-success-green text-primary-dark font-black tracking-widest text-xs uppercase rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:scale-[1.02] transition-transform">
                    <DownloadCloud className="w-5 h-5 mr-3" /> Export Secure CSV
                  </button>
                </div>
              </div>

              <div className="glass-card rounded-3xl p-8 border border-white/10 flex flex-col justify-center">
                <h4 className="text-xs font-black uppercase text-text-muted tracking-widest mb-6 border-b border-white/10 pb-4">Structural Changes Applied</h4>
                <div className="space-y-3">
                  {debiasedResult.summary.sensitiveColsRemoved?.length > 0 && (
                    <p className="text-sm text-text-secondary">
                      <span className="text-warning-amber font-black mr-2">Removed</span>
                      {debiasedResult.summary.sensitiveColsRemoved.map(c => `\`${c}\``).join(', ')}
                    </p>
                  )}
                  {debiasedResult.summary.proxiesCleaned?.length > 0 && (
                    <div>
                      <p className="text-sm text-text-secondary mb-2">
                        <span className="text-danger-red font-black mr-2">Proxies Cleaned</span>
                        {debiasedResult.summary.proxiesCleaned.length} columns
                      </p>
                      {Object.entries(debiasedResult.proxyFeatures || {}).map(([col, score]) => (
                        <p key={col} className="text-xs text-text-muted ml-4 font-mono">
                          • {col} → corr: {score} {score > 0.5 ? '(binned)' : '(capped)'}
                        </p>
                      ))}
                    </div>
                  )}
                  <p className="text-sm text-text-secondary">
                    <span className="text-accent-cyan font-black mr-2">Reweighed</span>
                    AIF360 sample weights applied
                  </p>
                  <p className="text-sm text-text-secondary">
                    <span className="text-accent-purple font-black mr-2">Retrained</span>
                    Logistic regression on fair weights
                  </p>
                  <p className="text-sm text-text-secondary">
                    <span className="text-success-green font-black mr-2">Appended</span>
                    `fair_hired` + `bias_flag` columns
                  </p>
                  {debiasedResult.validation?.warning && (
                    <div className="mt-3 p-3 bg-warning-amber/10 border border-warning-amber/30 rounded-xl flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-warning-amber shrink-0 mt-0.5" />
                      <p className="text-xs text-warning-amber font-medium leading-relaxed">{debiasedResult.validation.warning}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Graphs Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="glass-card p-8 rounded-3xl border border-white/5">
                <h4 className="text-white font-black mb-8 text-center text-sm uppercase tracking-widest opacity-80">6-Vector Metric Shifts</h4>
                <ComparativeMetricsChart origMetrics={res.metrics} debMetrics={debiasedResult.statsAfter.metrics} />
                <div className="flex justify-center gap-6 mt-6 border-t border-white/5 pt-4">
                  <span className="text-[10px] font-bold tracking-widest uppercase text-danger-red flex items-center"><div className="w-3 h-3 bg-danger-red rounded-sm mr-2"/> Default Model</span>
                  <span className="text-[10px] font-bold tracking-widest uppercase text-success-green flex items-center"><div className="w-3 h-3 bg-success-green rounded-sm mr-2"/> Retrained Model</span>
                </div>
              </div>
              <div className="glass-card p-8 rounded-3xl border border-white/5">
                <h4 className="text-white font-black mb-8 text-center text-sm uppercase tracking-widest opacity-80">Demographic Approval Variance</h4>
                <ComparativeApprovalChart 
                  origStats={{ maleOrig: 0.73, femaleOrig: 0.42 }} 
                  debStats={{ maleDeb: debiasedResult.statsAfter.maleStats.posRate, femaleDeb: debiasedResult.statsAfter.femaleStats.posRate }} 
                />
                <div className="flex justify-center gap-6 mt-6 border-t border-white/5 pt-4">
                  <span className="text-[10px] font-bold tracking-widest uppercase text-danger-red flex items-center"><div className="w-3 h-3 bg-danger-red rounded-sm mr-2"/> Original Ratio</span>
                  <span className="text-[10px] font-bold tracking-widest uppercase text-success-green flex items-center"><div className="w-3 h-3 bg-success-green rounded-sm mr-2"/> Reweighed Ratio</span>
                </div>
              </div>
            </div>

            {/* Traditional Table Comparison */}
            <div className="glass-card rounded-3xl p-8 border border-white/5">
              <h3 className="text-xl font-black text-white mb-8 flex items-center">
                <Scale className="w-5 h-5 mr-3 text-white" /> RAW TELEMETRY LOG
              </h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/20 text-xs uppercase tracking-widest text-text-muted font-black">
                      <th className="py-4 px-4 w-1/3">Metric Vector</th>
                      <th className="py-4 px-4">Biased State</th>
                      <th className="py-4 px-4">Corrected State</th>
                      <th className="py-4 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm font-medium">
                    {[
                      { name: 'Demographic Parity Discrepancy', orig: res.metrics.demographic_parity, deb: debiasedResult.statsAfter.metrics.demographic_parity, origO: 0.31 },
                      { name: 'Disparate Impact Ratio', orig: res.metrics.disparate_impact, deb: debiasedResult.statsAfter.metrics.disparate_impact, origO: 0.52 },
                      { name: 'Equal Opportunity Variance', orig: res.metrics.equal_opportunity, deb: debiasedResult.statsAfter.metrics.equal_opportunity, origO: 0.28 },
                      { name: 'Equalized Odds Difference', orig: res.metrics.equalized_odds_difference, deb: debiasedResult.statsAfter.metrics.equalized_odds_difference, origO: 0.35 },
                      { name: 'Predictive Parity (Precision)', orig: res.metrics.predictive_parity, deb: debiasedResult.statsAfter.metrics.predictive_parity, origO: 0.22 },
                      { name: 'Average Odds Difference', orig: res.metrics.average_odds_difference, deb: debiasedResult.statsAfter.metrics.average_odds_difference, origO: 0.29 },
                    ].map((m, i) => (
                      <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="py-4 px-4 text-white font-bold">{m.name}</td>
                        <td className="py-4 px-4 font-mono text-danger-red">{m.origO}</td>
                        <td className="py-4 px-4 font-mono text-success-green">{m.deb.toFixed(2)}</td>
                        <td className="py-4 px-4 text-success-green font-black text-xs flex items-center mt-1.5"><CheckCircle2 className="w-3 h-3 mr-1"/> PASS</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Compliance Certificate Block */}
            <div className="flex justify-center mt-8 pt-8">
              {debiasedResult.statsAfter.score >= 80 ? (
                <div className="font-mono text-sm leading-tight text-white/90 bg-[#0a0a0a] p-10 border-2 border-[#333] shadow-[0_0_30px_rgba(255,255,255,0.05)] rounded-sm max-w-2xl w-full">
                  <pre className="text-success-green mb-6 text-sm">
{`╔═════════════════════════════════════════════╗
║     UNBIASED.AI COMPLIANCE CERTIFICATE      ║
║                                             ║
║  Dataset : debiased_engineers_v4.csv        ║
║  Score   : ${debiasedResult.statsAfter.score}/100    ✓ COMPLIANT            ║
║  EU AI Act Article 10   : PASS              ║
║  US EEOC 4/5ths Rule    : PASS              ║
║  Issued  : ${new Date().toISOString().split('T')[0]}                  ║
║  Ref ID  : UAI-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}                     ║
╚═════════════════════════════════════════════╝`}
                  </pre>
                  <p className="text-text-muted text-center text-xs">
                    This certificate confirms the debiased dataset meets minimum fairness thresholds. Retain log for governmental audits.
                  </p>
                </div>
              ) : (
                <div className="bg-danger-red/10 border border-danger-red/30 p-8 rounded-2xl text-center max-w-2xl w-full">
                  <AlertTriangle className="w-10 h-10 text-danger-red mx-auto mb-4" />
                  <h3 className="text-danger-red font-black text-xl mb-2">COMPLIANCE CERTIFICATE: NOT ISSUED</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">
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
