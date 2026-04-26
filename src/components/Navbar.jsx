import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Scale, LogOut, TerminalSquare } from 'lucide-react';

const Navbar = () => {
 const { currentUser, logout } = useAuth();
 const location = useLocation();

 if (!currentUser) return null;

 const isActive = (path) => location.pathname === path;

 return (
 <nav 
 className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 bg-slate-900 border-b border-slate-800"
 >
 <Link to="/dashboard"className="flex items-center space-x-3 group text-decoration-none">
 <div className="relative flex items-center justify-center p-2 bg-slate-800 rounded-xl border border-slate-700">
 <Scale className="w-5 h-5 text-white"/>
 </div>
 <span className="font-extrabold text-xl tracking-wide text-white flex items-center">
 <span className="pr-1">FAIRLENS AI</span> 
 <span className="text-slate-400 text-sm font-semibold ml-2"> // AUDIT</span>
 </span>
 </Link>
 
 <div className="hidden md:flex items-center space-x-2 bg-surface-dark/50 p-1 rounded-2xl border border-white/5">
 <Link 
 to="/dashboard"
 className={`flex items-center px-4 py-1.5 rounded-xl text-sm font-bold ${isActive('/dashboard') ? 'bg-white/10 text-accent-cyan shadow-sm border border-white/5' : 'text-text-secondary hover:text-text-primary hover:bg-white/5'}`}
 >
 <TerminalSquare className="w-4 h-4 mr-2 opacity-70"/> System
 </Link>
 <Link 
 to="/history"
 className={`flex items-center px-4 py-1.5 rounded-xl text-sm font-bold ${isActive('/history') ? 'bg-white/10 text-accent-purple shadow-sm border border-white/5' : 'text-text-secondary hover:text-text-primary hover:bg-white/5'}`}
 >
 History Logs
 </Link>
 </div>

 <div className="flex items-center space-x-4">
 <div className="flex items-center bg-slate-800 rounded-full pl-1.5 pr-4 py-1 border border-slate-700">
 <div className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-700 text-white font-extrabold text-sm mr-3">
 {currentUser?.displayName ? currentUser.displayName[0].toUpperCase() : 'U'}
 </div>
 <span className="text-sm font-bold text-white capitalize tracking-wider flex items-center">
 {currentUser?.displayName ? currentUser.displayName.split(' ')[0] : 'Admin'}
 <span className="h-2 w-2 rounded-full bg-green-500 ml-3"></span>
 </span>
 </div>
 <button 
 onClick={logout}
 className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-xl"
 title="Disconnect Session"
 >
 <LogOut className="w-5 h-5"/>
 </button>
 </div>
 </nav>
 );
};

export default Navbar;
