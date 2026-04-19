import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { mockHistory } from '../data/mockData';
import { Play, CopyCheck, AlertOctagon, ChevronRight, Scale, ShieldCheck, Zap, Activity } from 'lucide-react';
import Navbar from '../components/Navbar';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

const DashboardPage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const firstName = currentUser?.displayName ? currentUser.displayName.split(' ')[0] : 'User';

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
  };

  return (
    <div className="min-h-screen bg-primary-dark font-sans pb-12 selection:bg-accent-cyan/30 text-text-primary">
      <Navbar />
      
      <main className="max-w-6xl mx-auto px-6 pt-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 flex items-end justify-between"
        >
          <div>
            <h1 className="text-4xl font-black text-white tracking-tight flex items-center">
              System Dashboard
              <div className="ml-4 px-3 py-1 bg-success-green/20 border border-success-green/50 text-success-light text-xs rounded-full flex items-center shadow-glow-cyan">
                <span className="w-2 h-2 rounded-full bg-success-green mr-2 animate-pulse"></span> ONLINE
              </div>
            </h1>
            <p className="text-text-muted mt-2 text-lg font-medium">Welcome back, {firstName}. Monitoring fairness compliance.</p>
          </div>
        </motion.div>

        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-12 gap-6 mb-6"
        >
          {/* Main Action Block - Bento */}
          <motion.div 
            variants={item}
            onClick={() => navigate('/upload')}
            className="md:col-span-4 lg:col-span-8 cursor-pointer relative overflow-hidden bg-gradient-to-br from-surface-dark to-primary-dark p-8 rounded-3xl shadow-neo border border-white/10 hover:border-accent-cyan/50 hover:shadow-glow-cyan transition-all duration-500 group"
          >
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay"></div>
            <div className="absolute right-0 top-0 w-[500px] h-[500px] bg-accent-cyan/10 blur-[100px] rounded-full transform translate-x-1/2 -translate-y-1/2 group-hover:bg-accent-cyan/20 transition-all duration-700"></div>
            
            <div className="relative z-10 flex flex-col justify-between h-full min-h-[200px]">
              <div>
                <div className="flex items-center text-accent-cyan text-sm font-bold uppercase tracking-widest mb-4">
                  <Zap className="w-4 h-4 mr-2" /> Quick Action
                </div>
                <h2 className="text-4xl font-black mb-3 text-white">Initialize Audit</h2>
                <p className="text-text-secondary mb-8 font-medium max-w-md text-lg">
                  Deploy the engine to analyze your dataset for demographic bias and EU AI Act compliance.
                </p>
              </div>
              <div className="flex items-center text-sm font-black bg-white text-primary-dark px-6 py-3 w-max rounded-xl hover:scale-105 transition-transform duration-300 shadow-neo">
                <Play className="h-5 w-5 mr-2 fill-primary-dark" /> COMMENCE SCAN
              </div>
            </div>
            <div className="absolute right-8 bottom-8 opacity-20 transform group-hover:scale-110 group-hover:-rotate-6 transition-all duration-700">
              <Scale className="h-48 w-48 text-accent-cyan" />
            </div>
          </motion.div>

          {/* Stats Bento */}
          <motion.div variants={item} className="md:col-span-2 lg:col-span-2 glass-card rounded-3xl p-6 flex flex-col justify-between group hover:border-white/20 transition-all">
            <div className="text-text-muted text-xs font-bold tracking-widest uppercase mb-2">Total Scans</div>
            <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-text-muted flex flex-col mt-4">
              {mockHistory.length}
              <CopyCheck className="mt-4 text-accent-purple/40 h-10 w-10 group-hover:text-accent-purple/80 transition-colors" />
            </div>
          </motion.div>
          
          <motion.div variants={item} className="md:col-span-2 lg:col-span-2 glass-card rounded-3xl p-6 flex flex-col justify-between border-danger-red/20 hover:border-danger-red/50 hover:shadow-glow-red transition-all group">
            <div className="text-danger-red/80 text-xs font-bold tracking-widest uppercase mb-2 flex justify-between">
              Critical Risks <AlertOctagon className="h-4 w-4 text-danger-red animate-pulse" />
            </div>
            <div className="text-6xl font-black text-danger-red flex flex-col mt-4">
              1 
              <span className="text-xs font-bold text-text-muted mt-4 uppercase tracking-widest group-hover:text-danger-light transition-colors">Needs Action</span>
            </div>
          </motion.div>
        </motion.div>

        {/* Secondary Bento Grid */}
        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12"
        >
          {/* Recent Audits */}
          <motion.div variants={item} className="lg:col-span-2 glass-card rounded-3xl overflow-hidden flex flex-col">
            <div className="px-8 py-5 border-b border-white/5 flex justify-between items-center bg-surface-dark/50">
              <h3 className="font-black text-lg text-white flex items-center"><Activity className="w-5 h-5 mr-3 text-accent-cyan" /> Recent Telemetry</h3>
              <button onClick={() => navigate('/history')} className="text-accent-cyan hover:text-accent-cyan-glow text-sm font-bold flex items-center transition-colors">View Logs <ChevronRight className="w-4 h-4 ml-1" /></button>
            </div>
            <div className="divide-y divide-white/5 flex-1 bg-surface-dark/20">
              {mockHistory.slice(0,3).map(audit => (
                <div 
                  key={audit.id} 
                  onClick={() => navigate('/results')}
                  className="px-8 py-5 flex items-center justify-between hover:bg-white/5 cursor-pointer transition-all duration-200 group"
                >
                  <div className="flex flex-col">
                    <span className="font-bold text-white text-base group-hover:text-accent-cyan transition-colors">{audit.filename}</span>
                    <span className="text-xs font-bold text-text-muted mt-1 font-mono">{audit.date}</span>
                  </div>
                  <div className="flex items-center space-x-6">
                    <div className="flex flex-col items-end">
                      <span className="font-black text-white text-lg">{audit.score}<span className="text-xs text-text-muted font-bold">/100</span></span>
                      <span className={cn(
                        "text-[10px] uppercase font-black px-3 py-1 rounded shadow-neo mt-1 border",
                        audit.risk === 'High' ? 'bg-danger-red/10 border-danger-red/30 text-danger-red' : 
                        audit.risk === 'Moderate' ? 'bg-warning-amber/10 border-warning-amber/30 text-warning-amber' : 
                        'bg-success-green/10 border-success-green/30 text-success-green'
                      )}>
                        {audit.risk}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Engine Capabilities */}
          <motion.div variants={item} className="glass-card rounded-3xl p-8 relative overflow-hidden">
            <div className="absolute -right-20 -top-20 w-60 h-60 bg-accent-purple/10 rounded-full blur-[80px]"></div>
            <h3 className="font-black text-lg text-white mb-6 relative z-10 flex items-center"><ShieldCheck className="w-5 h-5 mr-3 text-accent-purple" /> Frameworks</h3>
            <div className="space-y-4 relative z-10">
              {[
                { n: "EU", t: "AI Act Compliance", bg: "from-blue-500/20 to-blue-600/20", text: "text-blue-400" },
                { n: "US", t: "EEOC Guidelines", bg: "from-red-500/20 to-red-600/20", text: "text-red-400" },
                { n: "UN", t: "SDG 10 & 16", bg: "from-accent-purple/20 to-accent-purple/30", text: "text-accent-purple" }
              ].map((item, i) => (
                <div key={i} className="flex items-center p-3 rounded-2xl bg-surface-dark border border-white/5 hover:border-white/20 transition-colors">
                  <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center font-black text-sm", item.bg, item.text)}>
                    {item.n}
                  </div>
                  <span className="ml-4 font-bold text-sm text-text-secondary">{item.t}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>

      </main>
    </div>
  );
};

export default DashboardPage;
