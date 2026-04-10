import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { AcademicCapIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return toast.error('Please fill in all fields.');
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-brand-950 to-slate-900 flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-brand-400 blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-purple-500 blur-3xl" />
        </div>
        <div className="relative z-10 max-w-md text-center">
          <div className="w-16 h-16 bg-brand-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
            <AcademicCapIcon className="w-9 h-9 text-white" />
          </div>
          <h1 className="font-display text-4xl font-bold mb-4 leading-tight">
            ScoreLens <span className="text-brand-400">AI</span>
          </h1>
          <p className="text-slate-300 text-lg leading-relaxed mb-8">
            Intelligent answer evaluation powered by cutting-edge AI. Automate grading, detect plagiarism, and provide rich feedback at scale.
          </p>
          <div className="grid grid-cols-3 gap-4 text-center">
            {[['OCR', 'Extract text from any document'], ['AI Grading', 'GPT-powered evaluation'], ['Plagiarism', 'Embedding-based detection']].map(([t, d]) => (
              <div key={t} className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                <div className="font-semibold text-sm text-brand-300">{t}</div>
                <div className="text-xs text-slate-400 mt-1">{d}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="text-center mb-8">
              <div className="lg:hidden w-12 h-12 bg-brand-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <AcademicCapIcon className="w-7 h-7 text-white" />
              </div>
              <h2 className="font-display text-2xl font-bold text-slate-900">Sign in to ScoreLens</h2>
              <p className="text-slate-500 text-sm mt-2">Enter your credentials to continue</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Email address</label>
                <input
                  type="email"
                  className="input-field"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    className="input-field pr-10"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPw ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full justify-center py-2.5 mt-2"
              >
                {loading ? <><span className="w-4 h-4 spinner inline-block" /> Signing in…</> : 'Sign In'}
              </button>
            </form>

            <p className="text-center text-sm text-slate-500 mt-6">
              Don't have an account?{' '}
              <Link to="/register" className="text-brand-600 font-medium hover:text-brand-700">
                Create one
              </Link>
            </p>

            {/* Demo credentials */}
            <div className="mt-6 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-xs font-semibold text-slate-500 mb-2">Demo Accounts</p>
              <div className="space-y-1 text-xs text-slate-500">
                <p>Teacher: <code className="bg-slate-200 px-1 rounded">teacher@demo.com</code> / <code className="bg-slate-200 px-1 rounded">demo123</code></p>
                <p>Student: <code className="bg-slate-200 px-1 rounded">student@demo.com</code> / <code className="bg-slate-200 px-1 rounded">demo123</code></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
