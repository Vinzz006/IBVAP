import React, { useState } from 'react';
import { Shield, Lock, User, ArrowRight, ShieldCheck, KeyRound, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('operator');
  const [password, setPassword] = useState('operator123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e?.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.login(username, password);
      onLoginSuccess();
    } catch (err) {
      setError(err.message || 'Authentication failed. Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (u, p) => {
    setUsername(u);
    setPassword(p);
    setError('');
  };

  return (
    <div className="min-h-screen bg-soc-900 flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Background Tactical Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#161c28_1px,transparent_1px),linear-gradient(to_bottom,#161c28_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30"></div>

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-soc-850 border border-soc-700/90 rounded-2xl p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative z-10">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto mb-4 shadow-[0_0_20px_rgba(0,240,255,0.2)]">
            <Shield className="w-7 h-7" />
          </div>
          <div className="flex items-center justify-center gap-2 mb-1">
            <h1 className="font-mono font-bold text-2xl tracking-wider text-white">IBVAP</h1>
            <span className="text-xs px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono border border-cyan-500/30">
              SOC-PORTAL
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Intelligent Border Video Analytics Platform
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Ministry of Home Affairs / SSB • Problem 26187
          </p>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mb-5 p-3 rounded-lg bg-red-950/40 border border-red-500/50 flex items-center gap-2.5 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-mono text-slate-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-cyan-400" />
              <span>Operator Username</span>
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. operator"
              className="w-full bg-soc-900 border border-soc-700 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 font-mono transition"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-mono text-slate-300 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Security Password</span>
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full bg-soc-900 border border-soc-700 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 font-mono transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-sm transition shadow-[0_0_15px_rgba(0,240,255,0.3)] flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
          >
            <span>{loading ? 'Authenticating Terminal...' : 'Access Command Operations'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Demo Credentials for Hackathon Judges */}
        <div className="mt-7 pt-5 border-t border-soc-750">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
              <KeyRound className="w-3 h-3 text-cyan-400" />
              1-Click Demo Evaluation Roles:
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin', 'admin123')}
              className={`p-2 rounded border text-left transition ${
                username === 'admin'
                  ? 'bg-cyan-500/15 border-cyan-500 text-cyan-300'
                  : 'bg-soc-900 border-soc-700 hover:bg-soc-800 text-slate-300'
              }`}
            >
              <div className="text-[11px] font-bold font-mono">ADMIN</div>
              <div className="text-[9px] text-slate-400">Chief Officer</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('operator', 'operator123')}
              className={`p-2 rounded border text-left transition ${
                username === 'operator'
                  ? 'bg-cyan-500/15 border-cyan-500 text-cyan-300'
                  : 'bg-soc-900 border-soc-700 hover:bg-soc-800 text-slate-300'
              }`}
            >
              <div className="text-[11px] font-bold font-mono">OPERATOR</div>
              <div className="text-[9px] text-slate-400">Duty Desk</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('viewer', 'viewer123')}
              className={`p-2 rounded border text-left transition ${
                username === 'viewer'
                  ? 'bg-cyan-500/15 border-cyan-500 text-cyan-300'
                  : 'bg-soc-900 border-soc-700 hover:bg-soc-800 text-slate-300'
              }`}
            >
              <div className="text-[11px] font-bold font-mono">VIEWER</div>
              <div className="text-[9px] text-slate-400">Observer</div>
            </button>
          </div>
        </div>

        {/* Security Compliance Stamp */}
        <div className="mt-6 flex items-center justify-center gap-1.5 text-[10px] font-mono text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>SHA-256 Tamper-Proof Audit Logging Enabled</span>
        </div>
      </div>
    </div>
  );
}
