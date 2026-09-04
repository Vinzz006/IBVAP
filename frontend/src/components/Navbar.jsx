import React, { useState, useEffect } from 'react';
import { Shield, Radio, Activity, Clock, User, LogOut, FileText, Settings, Video, Map, BarChart3, Route, Flame, FileCheck, Compass, Box, Network, Crosshair, ShieldCheck } from 'lucide-react';
import { getCurrentUser, clearAuth } from '../services/api';

export default function Navbar({ activeTab, onTabChange, onOpenRedTeam, onOpenShiftHandover }) {
  const [time, setTime] = useState(new Date());
  const currentUser = getCurrentUser() || { username: 'operator', role: 'OPERATOR', full_name: 'Duty Officer' };

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    clearAuth();
    window.location.reload();
  };

  const navItems = [
    { id: 'dashboard', label: 'Command Center', icon: Video },
    { id: 'missions', label: 'Mission Center', icon: Crosshair },
    { id: 'federation', label: 'Federated Command', icon: Network },
    { id: 'security', label: 'Security Center', icon: ShieldCheck },
    { id: 'map', label: 'Geospatial Map', icon: Map },
    { id: 'journey', label: 'Target Journey', icon: Route },
    { id: 'decision', label: 'Decision Center', icon: Compass },
    { id: 'twin', label: 'Digital Twin', icon: Box },
    { id: 'analytics', label: 'Threat Analytics', icon: BarChart3 },
    { id: 'events', label: 'Incident Ledger', icon: FileText },
    { id: 'settings', label: 'Privacy & Setup', icon: Settings },
  ];


  return (
    <header className="h-16 bg-soc-850 border-b border-soc-700/80 px-4 flex items-center justify-between select-none sticky top-0 z-40">
      {/* Brand & Logo */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-soc-accent shadow-[0_0_12px_rgba(0,240,255,0.2)]">
          <Shield className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-lg tracking-wider text-white">IBVAP</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono border border-cyan-500/30">
              v1.0-MVP
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-sans tracking-tight">
            Intelligent Border Video Analytics Platform • MHA/SSB
          </p>
        </div>
      </div>

      {/* Nav Tabs */}
      <nav className="flex items-center gap-1 bg-soc-900/90 p-1 rounded-lg border border-soc-700/60">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                isActive
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_8px_rgba(0,240,255,0.2)] font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-soc-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Status & Actions & User */}
      <div className="flex items-center gap-3">
        {/* Quick Command Actions */}
        {onOpenRedTeam && (
          <button
            onClick={onOpenRedTeam}
            className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 text-xs font-mono transition"
            title="Launch AI Red-Team Intrusion & Stress Testing Harness"
          >
            <Flame className="w-3.5 h-3.5 text-red-400" />
            <span>Red-Team</span>
          </button>
        )}

        {onOpenShiftHandover && (
          <button
            onClick={onOpenShiftHandover}
            className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded bg-soc-750 hover:bg-soc-700 text-slate-200 border border-soc-600 text-xs font-mono transition"
            title="Generate Official SSB Daily Duty Shift Handover Report"
          >
            <FileCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Shift Handover</span>
          </button>
        )}

        {/* System Health */}
        <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-tactical-pulse"></span>
          <span>OPERATIONAL</span>
        </div>

        {/* Live Clock */}
        <div className="hidden sm:flex items-center gap-1.5 text-slate-300 font-mono text-xs bg-soc-800 px-2.5 py-1 rounded border border-soc-700">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span>{time.toTimeString().split(' ')[0]}</span>
        </div>

        {/* User Pill */}
        <div className="flex items-center gap-2 pl-2 border-l border-soc-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-soc-750 border border-soc-600 flex items-center justify-center text-slate-300 text-xs font-bold">
              {currentUser.username.substring(0, 2).toUpperCase()}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-medium text-slate-200 leading-tight">{currentUser.full_name}</p>
              <span className="text-[10px] text-cyan-400 font-mono">{currentUser.role}</span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Logout from operations"
            className="p-1.5 rounded text-slate-400 hover:text-red-400 hover:bg-soc-800 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
