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
 if (risk === 'High') return <span className="bg-red-500/10 text-red-500 px-3 py-1 rounded-full text-xs font-bold flex items-center"><AlertOctagon className="w-3 h-3 mr-1"/> High Risk</span>;
 if (risk === 'Moderate') return <span className="bg-yellow-500/10 text-yellow-500 px-3 py-1 rounded-full text-xs font-bold flex items-center"><AlertTriangle className="w-3 h-3 mr-1"/> Moderate Risk</span>;
 return <span className="bg-green-500/10 text-green-500 px-3 py-1 rounded-full text-xs font-bold flex items-center"><CheckCircle2 className="w-3 h-3 mr-1"/> Low Risk</span>;
 };

 return (
 <div className="min-h-screen bg-slate-950 pb-16 font-sans text-slate-200">
 <Navbar />

 <main className="max-w-6xl mx-auto px-6 pt-10">
 
 <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
 <div>
 <h1 className="text-4xl font-extrabold text-white tracking-tight">Audit History</h1>
 <p className="text-slate-400 mt-2 font-medium text-lg">Review your past fairness evaluations and regulatory reports.</p>
 </div>
 <div className="mt-4 md:mt-0">
 <button 
 onClick={clearAll}
 disabled={history.length === 0}
 className={`flex items-center px-5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm font-bold ${history.length === 0 ? 'opacity-50 cursor-not-allowed text-slate-500' : 'text-red-500 hover:bg-red-500/10 hover:border-red-500/30 cursor-pointer'}`}
 >
 <Trash2 className="w-4 h-4 mr-2"/> Clear All History
 </button>
 </div>
 </div>

 {/* Stats */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 overflow-visible">
 <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex items-center">
 <div className="bg-slate-800 p-4 rounded-2xl mr-5">
 <FileText className="w-7 h-7 text-slate-400"/>
 </div>
 <div>
 <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Total Audits</div>
 <div className="text-3xl font-extrabold text-white">{totalAudits}</div>
 </div>
 </div>
 <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex items-center">
 <div className="bg-slate-800 p-4 rounded-2xl mr-5">
 <AlertOctagon className="w-7 h-7 text-red-500"/>
 </div>
 <div>
 <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">High Risk</div>
 <div className="text-3xl font-extrabold text-red-500">{highRisk}</div>
 </div>
 </div>
 <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex items-center">
 <div className="bg-slate-800 p-4 rounded-2xl mr-5">
 <CheckCircle2 className="w-7 h-7 text-green-500"/>
 </div>
 <div>
 <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Low Risk</div>
 <div className="text-3xl font-extrabold text-green-500">{lowRisk}</div>
 </div>
 </div>
 </div>

 {/* Filters */}
 <div className="flex items-center space-x-3 mb-8 overflow-x-auto pb-2">
 <Filter className="w-6 h-6 text-slate-500 mr-2"/>
 {['All', 'High', 'Moderate', 'Low'].map(f => (
 <button
 key={f}
 onClick={() => setFilter(f)}
 className={`px-5 py-2.5 rounded-xl text-sm font-extrabold whitespace-nowrap ${
 filter === f 
 ? 'bg-blue-600 text-white' 
 : 'bg-slate-900 border border-slate-800 text-slate-400 hover:bg-slate-800'
 }`}
 >
 {f === 'All' ? 'All Audits' : `${f} Risk`}
 </button>
 ))}
 </div>

 {/* History List */}
 <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
 {filteredHistory.length === 0 ? (
 <div className="p-20 flex flex-col items-center justify-center text-center">
 <div className="bg-slate-800 p-8 rounded-full mb-6">
 <Search className="w-12 h-12 text-slate-500"/>
 </div>
 <h3 className="text-2xl font-extrabold text-white mb-3">No audits found</h3>
 <p className="text-slate-400 mb-8 max-w-md font-medium">You haven't run any fairness audits yet, or none match your selected filter.</p>
 <button 
 onClick={() => navigate('/upload')}
 className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-extrabold"
 >
 Start New Audit
 </button>
 </div>
 ) : (
 <div className="divide-y divide-slate-800">
 {filteredHistory.map(audit => (
 <div 
 key={audit.id} 
 onClick={() => navigate('/results')}
 className="p-8 flex flex-col md:flex-row md:items-center justify-between hover:bg-slate-800/50 cursor-pointer group"
 >
 <div className="flex items-center flex-1">
 <div className="relative w-14 h-14 mr-6 flex-shrink-0 flex items-center justify-center rounded-full bg-slate-800 border border-slate-700">
 <svg height="48"width="48"className="-rotate-90">
 <circle stroke="#1e293b"fill="transparent"strokeWidth="4"r="20"cx="24"cy="24"/>
 <circle 
 stroke={audit.risk === 'High' ? '#ef4444' : audit.risk === 'Moderate' ? '#eab308' : '#22c55e'} 
 fill="transparent"
 strokeWidth="4"
 strokeDasharray={`${2 * Math.PI * 20}`}
 strokeDashoffset={`${2 * Math.PI * 20 - (audit.score / 100) * (2 * Math.PI * 20)}`}
 strokeLinecap="round"
 r="20"cx="24"cy="24"
 />
 </svg>
 <span className="absolute text-xs font-extrabold text-slate-300">{audit.score}</span>
 </div>
 
 <div>
 <h4 className="font-extrabold text-white text-xl group-hover:text-blue-400">{audit.filename}</h4>
 <p className="text-sm text-slate-400 mt-1 font-medium">Audited on {audit.date}</p>
 </div>
 </div>
 
 <div className="flex items-center justify-end mt-4 md:mt-0 space-x-6 md:w-1/3">
 {getRiskBadge(audit.risk)}
 <div className="bg-slate-800 p-2 rounded-full group-hover:bg-blue-600">
 <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-white"/>
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
