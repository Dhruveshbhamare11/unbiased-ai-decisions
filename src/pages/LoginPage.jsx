import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Scale, LogIn, AlertTriangle, Briefcase, CreditCard, Stethoscope, GraduationCap, ShieldCheck, Activity, BrainCircuit } from 'lucide-react';
import { cn } from '../lib/utils';

const LoginPage = () => {
 const { loginWithGoogle, loading, error } = useAuth();
 const navigate = useNavigate();
 const [isLoading, setIsLoading] = React.useState(false);
 const [loginError, setLoginError] = React.useState(null);

 const handleLogin = async () => {
 try {
 setIsLoading(true);
 setLoginError(null);
 await loginWithGoogle();
 navigate('/dashboard');
 } catch (error) {
 setLoginError(error.message ||"Login failed. Please try again.");
 console.error("Login failed:", error);
 } finally {
 setIsLoading(false);
 }
 };

 return (
 <div className="flex min-h-screen bg-slate-950 font-sans overflow-hidden text-slate-200">
 {/* Left side: Login Panel */}
 <div className="w-full lg:w-[45%] flex flex-col justify-center items-center p-8 bg-slate-900 z-10 border-r border-slate-800 relative">
 <div className="max-w-md w-full space-y-10 relative z-10">
 <div className="text-center group">
 <div className="mx-auto h-28 w-28 bg-slate-800 rounded-3xl flex items-center justify-center border border-slate-700 relative overflow-hidden">
 <Scale className="h-14 w-14 text-white"/>
 </div>
 <h2 className="mt-10 text-5xl font-black tracking-tight text-white flex flex-col items-center">
 <span>FAIRLENS</span>
 <span className="text-blue-400 tracking-widest mt-1">AI</span>
 </h2>
 <p className="mt-5 text-sm text-slate-500 font-bold tracking-[0.2em] uppercase">
 AI Bias Detection & Mitigation Platform
 </p>
 </div>

 <div className="mt-12 relative group">
 <button
 onClick={handleLogin}
 disabled={isLoading || loading}
 className="relative w-full flex justify-center items-center py-4 px-4 rounded-xl text-lg font-bold text-white bg-slate-800 border border-slate-700 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {isLoading ? (
 <>
 <div className="h-6 w-6 mr-3 border-2 border-white border-t-transparent rounded-full"></div>
 Signing in...
 </>
 ) : (
 <>
 <img src="https://www.svgrepo.com/show/475656/google-color.svg"alt="Google"className="h-6 w-6 mr-3"/>
 Sign In with Google
 </>
 )}
 </button>
 </div>

 {(loginError || error) && (
 <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
 {loginError || error}
 </div>
 )}

 {/* Features */}
 <div className="mt-12 pt-8 border-t border-slate-800">
 <div className="grid grid-cols-2 gap-4">
 <div className="flex items-center space-x-3 text-sm font-semibold text-slate-300 bg-slate-800/50 p-3 rounded-xl border border-slate-700">
 <ShieldCheck className="w-5 h-5 text-white"/> <span>Bias Detection</span>
 </div>
 <div className="flex items-center space-x-3 text-sm font-semibold text-slate-300 bg-slate-800/50 p-3 rounded-xl border border-slate-700">
 <Activity className="w-5 h-5 text-white"/> <span>Fairness Score</span>
 </div>
 <div className="flex items-center space-x-3 text-sm font-semibold text-slate-300 bg-slate-800/50 p-3 rounded-xl border border-slate-700">
 <BrainCircuit className="w-5 h-5 text-white"/> <span>Mitigation Engine</span>
 </div>
 <div className="flex items-center space-x-3 text-sm font-semibold text-slate-300 bg-slate-800/50 p-3 rounded-xl border border-slate-700">
 <AlertTriangle className="w-5 h-5 text-white"/> <span>Compliance Check</span>
 </div>
 </div>
 </div>

 </div>
 </div>

 {/* Right side: Real-world cases */}
 <div className="hidden lg:flex flex-1 flex-col justify-center p-16 relative overflow-hidden bg-slate-950">
 <div className="max-w-3xl mx-auto relative z-10">
 <div className="mb-14">
 <h1 className="text-5xl font-black text-white tracking-tight mb-4 flex items-center">
 The Algorithmic Crisis
 </h1>
 <p className="text-slate-400 text-xl leading-relaxed max-w-2xl font-medium">
 Unchecked AI models are scaling human discrimination to unprecedented levels. Neutralizing bias is no longer optional; it is a regulatory mandate.
 </p>
 </div>

 <div className="grid grid-cols-2 gap-8">
 {[
 { icon: Briefcase, color:"text-red-400", bg:"bg-red-400/10", border:"border-red-400/20", title:"Hiring | Big Tech", desc:"AI penalized resumes containing 'women's'. Model trained on 10yrs of male-dominated tech history."},
 { icon: CreditCard, color:"text-yellow-400", bg:"bg-yellow-400/10", border:"border-yellow-400/20", title:"Finance | Elite Card", desc:"Algorithm systematically offered men up to 20x higher credit limits than women with identical profiles."},
 { icon: GraduationCap, color:"text-purple-400", bg:"bg-purple-400/10", border:"border-purple-400/20", title:"Education | UK Govt", desc:"Algorithmic grading downgraded 40% of predictions, penalizing students from lower-performing postcodes."},
 { icon: Stethoscope, color:"text-blue-400", bg:"bg-blue-400/10", border:"border-blue-400/20", title:"Health | Optum", desc:"Prioritized healthier White patients over sicker Black patients by using cost as a proxy for medical need."}
 ].map((item, idx) => (
 <div 
 key={idx}
 className={cn(
"p-6 rounded-2xl border bg-slate-900",
 item.border
 )}
 >
 <div className="flex items-center gap-4 mb-4">
 <div className={cn("p-3 rounded-xl", item.bg)}>
 <item.icon className={cn("h-6 w-6", item.color)} />
 </div>
 <h3 className="text-lg font-bold text-white leading-tight">{item.title}</h3>
 </div>
 <p className="text-sm text-slate-400 leading-relaxed font-medium">
 {item.desc}
 </p>
 </div>
 ))}
 </div>

 <div className="mt-14 flex gap-6">
 <div className="flex flex-col">
 <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Developed For</span>
 <div className="flex gap-3">
 <span className="px-3 py-1 rounded bg-slate-800 border border-slate-700 text-xs font-bold text-white">Google Solution Challenge 2026</span>
 </div>
 </div>
 </div>

 </div>
 </div>
 </div>
 );
};

export default LoginPage;
