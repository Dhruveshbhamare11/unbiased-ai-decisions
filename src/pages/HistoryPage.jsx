import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockHistory } from '../data/mockData';
import Navbar from '../components/Navbar';
import { Trash2, Search, Filter, AlertOctagon, CheckCircle2, AlertTriangle, FileText, ChevronRight } from 'lucide-react';

const HistoryPage = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState(mockHistory);
  const [filter, setFilter] = useState('All');

  const totalAudits = history.length;
  const highRisk = history.filter(h => h.risk === 'High').length;
  const lowRisk = history.filter(h => h.risk === 'Low').length;

  const filteredHistory = filter === 'All' ? history : history.filter(h => h.risk === filter);

  const clearAll = () => {
    if (window.confirm('Are you sure you want to clear all your audit history? This action cannot be undone.')) {
      setHistory([]);
    }
  };

  const getRiskBadge = (risk) => {
    if (risk === 'High') return <span className="bg-danger-light text-danger-red px-3 py-1 rounded-full text-xs font-bold flex items-center"><AlertOctagon className="w-3 h-3 mr-1" /> High Risk</span>;
    if (risk === 'Moderate') return <span className="bg-warning-light text-warning-amber px-3 py-1 rounded-full text-xs font-bold flex items-center"><AlertTriangle className="w-3 h-3 mr-1" /> Moderate Risk</span>;
    return <span className="bg-success-light text-success-green px-3 py-1 rounded-full text-xs font-bold flex items-center"><CheckCircle2 className="w-3 h-3 mr-1" /> Low Risk</span>;
  };

  return (
    <div className="min-h-screen bg-transparent pb-16 font-sans">
      <Navbar />

      <main className="max-w-6xl mx-auto px-6 pt-10 animate-fade-in-up">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight">Audit History</h1>
            <p className="text-slate-500 mt-2 font-medium text-lg">Review your past fairness evaluations and regulatory reports.</p>
          </div>
          <div className="mt-4 md:mt-0">
            <button 
              onClick={clearAll}
              disabled={history.length === 0}
              className={`flex items-center px-5 py-2.5 bg-white/80 backdrop-blur border border-slate-300 rounded-xl text-sm font-bold transition-all shadow-sm ${history.length === 0 ? 'opacity-50 cursor-not-allowed text-slate-400' : 'text-danger-red hover:bg-danger-light hover:border-danger-red cursor-pointer hover:shadow-md hover:-translate-y-0.5'}`}
            >
              <Trash2 className="w-4 h-4 mr-2" /> Clear All History
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 overflow-visible animate-fade-in-up animate-delay-100">
          <div className="glass-card p-6 rounded-3xl shadow-premium flex items-center hover:-translate-y-1 transition-transform">
            <div className="bg-gradient-to-br from-slate-100 to-slate-200 p-4 rounded-2xl mr-5 shadow-inner">
              <FileText className="w-7 h-7 text-slate-500" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Audits</div>
              <div className="text-3xl font-extrabold text-slate-700">{totalAudits}</div>
            </div>
          </div>
          <div className="glass-card p-6 rounded-3xl shadow-premium flex items-center hover:-translate-y-1 transition-transform">
            <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 p-4 rounded-2xl mr-5 shadow-inner">
              <AlertOctagon className="w-7 h-7 text-danger-red" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">High Risk</div>
              <div className="text-3xl font-extrabold text-danger-red">{highRisk}</div>
            </div>
          </div>
          <div className="glass-card p-6 rounded-3xl shadow-premium flex items-center hover:-translate-y-1 transition-transform">
            <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 p-4 rounded-2xl mr-5 shadow-inner">
              <CheckCircle2 className="w-7 h-7 text-success-green" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Low Risk</div>
              <div className="text-3xl font-extrabold text-success-green">{lowRisk}</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-3 mb-8 overflow-x-auto pb-2 animate-fade-in-up animate-delay-200">
          <Filter className="w-6 h-6 text-slate-400 mr-2" />
          {['All', 'High', 'Moderate', 'Low'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-5 py-2.5 rounded-xl text-sm font-extrabold transition-all duration-300 whitespace-nowrap shadow-sm ${
                filter === f 
                  ? 'bg-mid-blue text-white shadow-md transform scale-105' 
                  : 'bg-white/80 backdrop-blur border border-white text-slate-600 hover:bg-slate-50 hover:-translate-y-0.5'
              }`}
            >
              {f === 'All' ? 'All Audits' : `${f} Risk`}
            </button>
          ))}
        </div>

        {/* History List */}
        <div className="glass-card rounded-3xl shadow-premium overflow-hidden animate-fade-in-up animate-delay-300">
          {filteredHistory.length === 0 ? (
            <div className="p-20 flex flex-col items-center justify-center text-center">
              <div className="bg-slate-100 p-8 rounded-full mb-6">
                <Search className="w-12 h-12 text-slate-400 animate-pulse-slow" />
              </div>
              <h3 className="text-2xl font-extrabold text-slate-700 mb-3">No audits found</h3>
              <p className="text-slate-500 mb-8 max-w-md font-medium">You haven't run any fairness audits yet, or none match your selected filter.</p>
              <button 
                onClick={() => navigate('/upload')}
                className="bg-gradient-to-r from-primary-blue to-mid-blue text-white px-8 py-3 rounded-xl font-extrabold hover:shadow-premium-hover hover:-translate-y-1 transition-all"
              >
                Start New Audit
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-200/50">
              {filteredHistory.map(audit => (
                <div 
                  key={audit.id} 
                  onClick={() => navigate('/results')}
                  className="p-8 flex flex-col md:flex-row md:items-center justify-between hover:bg-white/80 cursor-pointer transition-all duration-300 group"
                >
                  <div className="flex items-center flex-1">
                    <div className="relative w-14 h-14 mr-6 flex-shrink-0 flex items-center justify-center rounded-full bg-white shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
                      <svg height="48" width="48" className="transform -rotate-90">
                        <circle stroke="#f1f5f9" fill="transparent" strokeWidth="4" r="20" cx="24" cy="24" />
                        <circle 
                          stroke={audit.risk === 'High' ? '#FF3B30' : audit.risk === 'Moderate' ? '#FF9900' : '#00B976'} 
                          fill="transparent" 
                          strokeWidth="4" 
                          strokeDasharray={`${2 * Math.PI * 20}`}
                          strokeDashoffset={`${2 * Math.PI * 20 - (audit.score / 100) * (2 * Math.PI * 20)}`}
                          strokeLinecap="round" 
                          r="20" cx="24" cy="24" 
                        />
                      </svg>
                      <span className="absolute text-xs font-extrabold text-slate-600">{audit.score}</span>
                    </div>
                    
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-xl group-hover:text-mid-blue transition-colors">{audit.filename}</h4>
                      <p className="text-sm text-slate-500 mt-1 font-medium">Audited on {audit.date}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-end mt-4 md:mt-0 space-x-6 md:w-1/3">
                    {getRiskBadge(audit.risk)}
                    <div className="bg-slate-100 p-2 rounded-full group-hover:bg-mid-blue transition-colors">
                      <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  );
};

export default HistoryPage;
