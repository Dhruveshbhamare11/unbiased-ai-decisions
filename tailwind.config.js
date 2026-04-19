export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary-dark': '#020617', // slate-950
        'secondary-dark': '#0f172a', // slate-900
        'surface-dark': '#1e293b', // slate-800
        'surface-light': '#334155', // slate-700
        'accent-cyan': '#06b6d4', // cyan-500
        'accent-cyan-glow': '#22d3ee', // cyan-400
        'accent-purple': '#8b5cf6', // violet-500
        'accent-purple-glow': '#a78bfa', // violet-400
        'success-green': '#10b981', // emerald-500
        'success-light': '#059669', // emerald-600
        'warning-amber': '#f59e0b', // amber-500
        'danger-red': '#ef4444', // red-500
        'danger-light': '#b91c1c', // red-700
        'text-primary': '#ffffff', // pure white for maximum pop
        'text-secondary': '#e2e8f0', // slate-200 for extremely readable secondary text
        'text-muted': '#cbd5e1', // slate-300 for muted but visible text
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'neo': '0 4px 30px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        'neo-hover': '0 10px 40px rgba(6, 182, 212, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
        'glow-cyan': '0 0 20px rgba(6, 182, 212, 0.4)',
        'glow-purple': '0 0 20px rgba(139, 92, 246, 0.4)',
        'glow-red': '0 0 20px rgba(239, 68, 68, 0.4)',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'spin-slow': 'spin 8s linear infinite',
        'spin-reverse': 'spin 3s linear infinite reverse',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [],
}
