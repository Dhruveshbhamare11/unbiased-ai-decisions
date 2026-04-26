import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { mockHistory } from '../data/mockData';
import { Play, CopyCheck, AlertOctagon, ChevronRight, Scale, ShieldCheck, Zap, Activity } from 'lucide-react';
import Navbar from '../components/Navbar';
import { cn } from '../lib/utils';

const DashboardPage = () => {
 const { currentUser } = useAuth();
 const navigate = useNavigate();
 const firstName = currentUser?.displayName ? currentUser.displayName.split(' ')[0] : 'User';

 return (
 <div className="min-h-screen bg-slate-950 font-sans pb-12 text-slate-200">
 <Navbar />
 
 <main className="max-w-6xl mx-auto px-6 pt-10">
 <div className="mb-10 flex items-end justify-between">
 <div>
 <h1 className="text-4xl font-black text-white tracking-tight flex items-center">
 System Dashboard
 <div className="ml-4 px-3 py-1 bg-green-500/20 border border-green-500/50 text-green-400 text-xs rounded-full flex items-center">
 <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span> ONLINE
 </div>
 </h1>
 <p className="text-slate-400 mt-2 text-lg font-medium">Welcome back, {firstName}. Monitoring fairness compliance.</p>
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-12 gap-6 mb-6">
 {/* Main Action Block - Bento */}
 <div 
 onClick={() => navigate('/upload')}
 className="md:col-span-4 lg:col-span-8 cursor-pointer relative overflow-hidden bg-slate-900 p-8 rounded-3xl border border-slate-800 hover:border-slate-600 group"
 >
 <div className="relative z-10 flex flex-col justify-between h-full min-h-[200px]">
 <div>
 <div className="flex items-center text-blue-400 text-sm font-bold uppercase tracking-widest mb-4">
 <Zap className="w-4 h-4 mr-2"/> Quick Action
 </div>
 <h2 className="text-4xl font-black mb-3 text-white">Initialize Audit</h2>
 <p className="text-slate-400 mb-8 font-medium max-w-md text-lg">
 Deploy the engine to analyze your dataset for demographic bias and EU AI Act compliance.
 </p>
 </div>
 <div className="flex items-center text-sm font-black bg-white text-slate-900 px-6 py-3 w-max rounded-xl hover:bg-slate-200">
 <Play className="h-5 w-5 mr-2 fill-slate-900"/> COMMENCE SCAN
 </div>
 </div>
 <div className="absolute right-8 bottom-8 opacity-20">
 <Scale className="h-48 w-48 text-blue-500"/>
 </div>
 </div>

 {/* Stats Bento */}
 <div className="md:col-span-2 lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between group hover:border-slate-700">
 <div className="text-slate-400 text-xs font-bold tracking-widest uppercase mb-2">Total Scans</div>
 <div className="text-6xl font-black text-slate-300 flex flex-col mt-4">
 {mockHistory.length}
 <CopyCheck className="mt-4 text-purple-400/40 h-10 w-10 group-hover:text-purple-400/80"/>
 </div>
 </div>
 
 <div className="md:col-span-2 lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between hover:border-red-500/50 group">
 <div className="text-red-400/80 text-xs font-bold tracking-widest uppercase mb-2 flex justify-between">
 Critical Risks <AlertOctagon className="h-4 w-4 text-red-400"/>
 </div>
 <div className="text-6xl font-black text-red-500 flex flex-col mt-4">
 1 
 <span className="text-xs font-bold text-slate-500 mt-4 uppercase tracking-widest">Needs Action</span>
 </div>
 </div>
 </div>

 {/* Secondary Bento Grid */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
 {/* Recent Audits */}
 <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden flex flex-col">
 <div className="px-8 py-5 border-b border-slate-800 flex justify-between items-center bg-slate-900">
 <h3 className="font-black text-lg text-white flex items-center"><Activity className="w-5 h-5 mr-3 text-blue-400"/> Recent Telemetry</h3>
 <button onClick={() => navigate('/history')} className="text-blue-400 hover:text-blue-300 text-sm font-bold flex items-center">View Logs <ChevronRight className="w-4 h-4 ml-1"/></button>
 </div>
 <div className="divide-y divide-slate-800 flex-1 bg-slate-900/50">
 {mockHistory.slice(0,3).map(audit => (
 <div 
 key={audit.id} 
 onClick={() => navigate('/results')}
 className="px-8 py-5 flex items-center justify-between hover:bg-slate-800 cursor-pointer group"
 >
 <div className="flex flex-col">
 <span className="font-bold text-white text-base group-hover:text-blue-400">{audit.filename}</span>
 <span className="text-xs font-bold text-slate-500 mt-1 font-mono">{audit.date}</span>
 </div>
 <div className="flex items-center space-x-6">
 <div className="flex flex-col items-end">
 <span className="font-black text-white text-lg">{audit.score}<span className="text-xs text-slate-500 font-bold">/100</span></span>
 <span className={cn(
"text-[10px] uppercase font-black px-3 py-1 rounded mt-1 border",
 audit.risk === 'High' ? 'bg-red-500/10 border-red-500/30 text-red-500' : 
 audit.risk === 'Moderate' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500' : 
 'bg-green-500/10 border-green-500/30 text-green-500'
 )}>
 {audit.risk}
 </span>
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* Engine Capabilities */}
 <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 relative overflow-hidden">
 <h3 className="font-black text-lg text-white mb-6 relative z-10 flex items-center"><ShieldCheck className="w-5 h-5 mr-3 text-purple-400"/> Frameworks</h3>
 <div className="space-y-4 relative z-10">
 {[
 { n:"EU", t:"AI Act Compliance", bg:"bg-blue-500/20", text:"text-blue-400"},
 { n:"US", t:"EEOC Guidelines", bg:"bg-red-500/20", text:"text-red-400"},
 { n:"UN", t:"SDG 10 & 16", bg:"bg-purple-500/20", text:"text-purple-400"}
 ].map((item, i) => (
 <div key={i} className="flex items-center p-3 rounded-2xl bg-slate-800 border border-slate-700">
 <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm", item.bg, item.text)}>
 {item.n}
 </div>
 <span className="ml-4 font-bold text-sm text-slate-300">{item.t}</span>
 </div>
 ))}
 </div>
 </div>
 </div>

 </main>
 </div>
 );
};

export default DashboardPage;
