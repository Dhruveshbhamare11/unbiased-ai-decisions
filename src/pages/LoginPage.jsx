import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Scale, LogIn, AlertTriangle, Briefcase, CreditCard, Stethoscope, GraduationCap, ShieldCheck, Activity, BrainCircuit } from 'lucide-react';
import { motion } from 'framer-motion';
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
      setLoginError(error.message || "Login failed. Please try again.");
      console.error("Login failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } }
  };

  return (
    <div className="flex min-h-screen bg-primary-dark font-sans overflow-hidden text-text-primary selection:bg-accent-cyan/30">
      {/* Left side: Login Panel */}
      <div className="w-full lg:w-[45%] flex flex-col justify-center items-center p-8 bg-surface-dark/40 backdrop-blur-3xl shadow-neo z-10 border-r border-white/5 relative">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-accent-cyan to-transparent opacity-50"></div>
        
        <motion.div 
          className="max-w-md w-full space-y-10 relative z-10"
          initial="hidden"
          animate="show"
          variants={containerVariants}
        >
          <motion.div variants={itemVariants} className="text-center group">
            <div className="mx-auto h-28 w-28 bg-gradient-to-br from-surface-light/50 to-surface-dark rounded-3xl flex items-center justify-center shadow-neo border border-white/10 relative overflow-hidden transform perspective-1000">
               <div className="absolute inset-0 bg-gradient-to-tr from-accent-cyan/20 to-accent-purple/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
              <Scale className="h-14 w-14 text-accent-cyan drop-shadow-[0_0_15px_rgba(6,182,212,0.6)] group-hover:scale-110 transition-transform duration-500" />
            </div>
            <h2 className="mt-10 text-5xl font-black tracking-tight text-white flex flex-col items-center">
              <span>UNBIASED</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-cyan via-accent-cyan-glow to-accent-purple tracking-widest mt-1">DECISION</span>
            </h2>
            <p className="mt-5 text-sm text-text-muted font-bold tracking-[0.2em] uppercase">
              Algorithmic Fairness Protocol
            </p>
          </motion.div>

          <motion.div variants={itemVariants} className="mt-12 relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-accent-cyan to-accent-purple rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <button
              onClick={handleLogin}
              disabled={isLoading || loading}
              className="relative w-full flex justify-center items-center py-4 px-4 rounded-xl shadow-neo text-lg font-bold text-white bg-surface-dark border border-white/10 hover:bg-surface-light transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="h-6 w-6 mr-3 border-2 border-accent-cyan border-t-transparent rounded-full animate-spin"></div>
                  Signing in...
                </>
              ) : (
                <>
                  <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="h-6 w-6 mr-3 group-hover:scale-125 transition-transform duration-500" />
                  Sign In with Google
                </>
              )}
            </button>
          </motion.div>

          {(loginError || error) && (
            <motion.div 
              variants={itemVariants} 
              className="p-4 bg-warning-amber/10 border border-warning-amber/30 rounded-lg text-warning-amber text-sm"
            >
              {loginError || error}
            </motion.div>
          )}

          {/* Features */}
          <motion.div variants={itemVariants} className="mt-12 pt-8 border-t border-white/10">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-3 text-sm font-semibold text-text-secondary bg-surface-dark/50 p-3 rounded-xl border border-white/5">
                <ShieldCheck className="w-5 h-5 text-accent-cyan" /> <span>Bias Detection</span>
              </div>
              <div className="flex items-center space-x-3 text-sm font-semibold text-text-secondary bg-surface-dark/50 p-3 rounded-xl border border-white/5">
                <Activity className="w-5 h-5 text-accent-purple" /> <span>Fairness Score</span>
              </div>
              <div className="flex items-center space-x-3 text-sm font-semibold text-text-secondary bg-surface-dark/50 p-3 rounded-xl border border-white/5">
                <BrainCircuit className="w-5 h-5 text-success-green" /> <span>Mitigation Engine</span>
              </div>
              <div className="flex items-center space-x-3 text-sm font-semibold text-text-secondary bg-surface-dark/50 p-3 rounded-xl border border-white/5">
                <AlertTriangle className="w-5 h-5 text-warning-amber" /> <span>Compliance Check</span>
              </div>
            </div>
          </motion.div>

        </motion.div>
      </div>

      {/* Right side: Real-world cases */}
      <div className="hidden lg:flex flex-1 flex-col justify-center p-16 relative overflow-hidden bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-surface-dark via-primary-dark to-primary-dark">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-screen"></div>
        
        {/* Decorative Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_10%,transparent_100%)]"></div>
        
        <div className="max-w-3xl mx-auto relative z-10">
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mb-14"
          >
            <h1 className="text-5xl font-black text-white tracking-tight mb-4 flex items-center">
              <span className="w-3 h-12 bg-danger-red rounded-full mr-6 shadow-glow-red blur-[1px]"></span>
              The Algorithmic Crisis
            </h1>
            <p className="text-text-muted text-xl leading-relaxed max-w-2xl font-medium pl-9">
              Unchecked AI models are scaling human discrimination to unprecedented levels. Neutralizing bias is no longer optional; it is a regulatory mandate.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 gap-8 pl-9">
            {[
              { icon: Briefcase, color: "text-danger-red", bg: "bg-danger-red/10", border: "border-danger-red/20", title: "Hiring | Big Tech", desc: "AI penalized resumes containing 'women's'. Model trained on 10yrs of male-dominated tech history." },
              { icon: CreditCard, color: "text-warning-amber", bg: "bg-warning-amber/10", border: "border-warning-amber/20", title: "Finance | Elite Card", desc: "Algorithm systematically offered men up to 20x higher credit limits than women with identical profiles." },
              { icon: GraduationCap, color: "text-accent-purple", bg: "bg-accent-purple/10", border: "border-accent-purple/20", title: "Education | UK Govt", desc: "Algorithmic grading downgraded 40% of predictions, penalizing students from lower-performing postcodes." },
              { icon: Stethoscope, color: "text-accent-cyan", bg: "bg-accent-cyan/10", border: "border-accent-cyan/20", title: "Health | Optum", desc: "Prioritized healthier White patients over sicker Black patients by using cost as a proxy for medical need." }
            ].map((item, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 + (idx * 0.1) }}
                className={cn(
                  "p-6 rounded-2xl border backdrop-blur-md bg-surface-dark/30 hover:bg-surface-dark/60 transition-all duration-300",
                  item.border
                )}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className={cn("p-3 rounded-xl", item.bg)}>
                    <item.icon className={cn("h-6 w-6", item.color)} />
                  </div>
                  <h3 className="text-lg font-bold text-white leading-tight">{item.title}</h3>
                </div>
                <p className="text-sm text-text-secondary leading-relaxed font-medium">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-14 pl-9 flex gap-6"
          >
            <div className="flex flex-col">
              <span className="text-xs font-bold text-text-muted uppercase tracking-widest mb-2">Developed For</span>
              <div className="flex gap-3">
                <span className="px-3 py-1 rounded bg-white/5 border border-white/10 text-xs font-bold text-white">Google Solution Challenge 2026</span>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
};

export default LoginPage;
