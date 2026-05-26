import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import useAuthStore from '../context/authStore';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(email, password);
    if (result.success) {
      toast.success('Welcome back! 🎉');
      navigate('/dashboard');
    } else {
      toast.error(result.message);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg,#0b1120 0%,#0c4a6e 50%,#0369a1 100%)' }}>
      {/* Left — decorative panel (hidden on mobile) */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-0 left-0 w-72 h-72 rounded-full opacity-10"
          style={{ background:'radial-gradient(circle,#38bdf8,transparent)', transform:'translate(-30%,-30%)' }} />
        <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full opacity-10"
          style={{ background:'radial-gradient(circle,#818cf8,transparent)', transform:'translate(30%,30%)' }} />
        <div className="absolute top-1/2 left-1/2 w-96 h-96 rounded-full opacity-5"
          style={{ background:'radial-gradient(circle,#34d399,transparent)', transform:'translate(-50%,-50%)' }} />

        {/* Logo */}
        <div className="flex items-center gap-3 relative">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-lg shadow-lg"
            style={{ background:'linear-gradient(135deg,#0ea5e9,#0284c7)', boxShadow:'0 4px 20px rgb(14 165 233/.5)' }}>H</div>
          <div>
            <p className="font-heading font-bold text-white text-lg leading-none">HealthChat</p>
            <p className="text-sky-400 text-xs mt-0.5">Healthcare Platform</p>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative">
          <h1 className="font-heading font-bold text-white text-5xl leading-tight">
            Your health,<br />
            <span className="text-transparent bg-clip-text" style={{ backgroundImage:'linear-gradient(135deg,#38bdf8,#818cf8)' }}>
              powered by AI
            </span>
          </h1>
          <p className="text-slate-400 mt-4 text-lg leading-relaxed max-w-md">
            Connect with top doctors, get AI-powered health insights, manage appointments and prescriptions — all in one place.
          </p>

          {/* Feature pills */}
          <div className="flex flex-col gap-3 mt-8">
            {[
              { emoji:'🤖', text:'AI symptom checker & health advisor' },
              { emoji:'💬', text:'Real-time chat with your doctor' },
              { emoji:'📋', text:'Digital prescriptions & medical records' },
              { emoji:'📅', text:'Easy appointment scheduling' },
            ].map(({ emoji, text }) => (
              <div key={text} className="flex items-center gap-3 px-4 py-2.5 rounded-2xl"
                style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)' }}>
                <span className="text-xl">{emoji}</span>
                <span className="text-slate-300 text-sm font-medium">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom credits */}
        <p className="text-slate-600 text-xs relative">© 2025 HealthChat. Built with ❤️</p>
      </div>

      {/* Right — login form */}
      <div className="flex-1 lg:bg-white lg:dark:bg-gray-900 flex items-center justify-center p-6 lg:p-12 lg:rounded-l-[40px]">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white"
              style={{ background:'linear-gradient(135deg,#0ea5e9,#0284c7)' }}>H</div>
            <span className="font-heading font-bold text-white text-xl">HealthChat</span>
          </div>

          <div className="mb-8">
            <h2 className="font-heading font-bold text-slate-900 dark:text-white text-3xl lg:text-3xl text-center lg:text-left">
              Welcome back 👋
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-center lg:text-left text-sm">
              Sign in to your account to continue
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Email address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="input" placeholder="you@example.com" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                  className="input pr-10" placeholder="••••••••" />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                  {showPwd ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={isLoading} className="btn-primary w-full justify-center py-3 text-base mt-2">
              {isLoading
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Signing in…</>
                : 'Sign In'
              }
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-600 dark:text-primary-400 font-semibold hover:underline">Create one →</Link>
          </p>
        </div>
      </div>
    </div>
  );
}