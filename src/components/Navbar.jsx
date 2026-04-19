import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Scale, LogOut, TerminalSquare } from 'lucide-react';
import { motion } from 'framer-motion';

const Navbar = () => {
  const { currentUser, logout } = useAuth();
  const location = useLocation();

  if (!currentUser) return null;

  const isActive = (path) => location.pathname === path;

  return (
    <motion.nav 
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
      className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 bg-primary-dark/60 backdrop-blur-xl border-b border-white/5 shadow-neo"
    >
      <Link to="/dashboard" className="flex items-center space-x-3 group text-decoration-none">
        <div className="relative flex items-center justify-center p-2 bg-gradient-to-br from-accent-cyan to-accent-purple rounded-xl shadow-glow-cyan transform group-hover:scale-105 transition-all duration-300">
          <Scale className="w-5 h-5 text-white" />
        </div>
        <span className="font-extrabold text-xl tracking-wide text-text-primary flex items-center">
          <span className="text-gradient pr-1">UNBIASED.AI</span> 
          <span className="text-text-muted text-sm font-semibold opacity-60"> // AUDIT</span>
        </span>
      </Link>
      
      <div className="hidden md:flex items-center space-x-2 bg-surface-dark/50 p-1 rounded-2xl border border-white/5">
        <Link 
          to="/dashboard" 
          className={`flex items-center px-4 py-1.5 rounded-xl text-sm font-bold transition-all duration-300 ${isActive('/dashboard') ? 'bg-white/10 text-accent-cyan shadow-sm border border-white/5' : 'text-text-secondary hover:text-text-primary hover:bg-white/5'}`}
        >
          <TerminalSquare className="w-4 h-4 mr-2 opacity-70" /> System
        </Link>
        <Link 
          to="/history" 
          className={`flex items-center px-4 py-1.5 rounded-xl text-sm font-bold transition-all duration-300 ${isActive('/history') ? 'bg-white/10 text-accent-purple shadow-sm border border-white/5' : 'text-text-secondary hover:text-text-primary hover:bg-white/5'}`}
        >
          History Logs
        </Link>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center bg-surface-dark/40 rounded-full pl-1.5 pr-4 py-1 border border-white/5 shadow-inner">
          <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gradient-to-tr from-surface-light to-surface-dark text-accent-cyan font-extrabold text-sm mr-3 shadow-inner ring-1 ring-white/10 relative overflow-hidden">
             <div className="absolute inset-0 bg-accent-cyan opacity-10 animate-pulse-slow"></div>
            {currentUser?.displayName ? currentUser.displayName[0].toUpperCase() : 'U'}
          </div>
          <span className="text-sm font-bold text-text-primary capitalize tracking-wider flex items-center">
            {currentUser?.displayName ? currentUser.displayName.split(' ')[0] : 'Admin'}
            <span className="h-2 w-2 rounded-full bg-success-green ml-3 shadow-glow-cyan blur-[1px]"></span>
            <span className="h-2 w-2 rounded-full bg-success-green ml-[-8px]"></span>
          </span>
        </div>
        <button 
          onClick={logout}
          className="p-2 text-text-muted hover:text-danger-red hover:bg-danger-red/10 rounded-xl transition-all duration-300 hover:shadow-glow-red"
          title="Disconnect Session"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </motion.nav>
  );
};

export default Navbar;
