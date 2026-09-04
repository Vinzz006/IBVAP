import React from 'react';
import { Activity, Cpu, ShieldCheck, Volume2, VolumeX, Eye, AlertOctagon } from 'lucide-react';

export default function DiagnosticsBar({ stats, soundEnabled, onToggleSound }) {
  return (
    <footer className="h-10 bg-soc-850 border-t border-soc-700/80 px-4 flex items-center justify-between text-xs font-mono select-none text-slate-400">
      {/* Left: Engine & FPS Metrics */}
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-1.5 text-slate-300">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-slate-400">STATUS:</span>
          <span className="text-emerald-400 font-semibold">{stats?.status || 'OPERATIONAL'}</span>
        </div>

        <div className="hidden sm:flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          <span>INFERENCE:</span>
          <span className="text-slate-200">{stats?.avg_fps || 25.0} FPS</span>
          <span className="text-slate-500">({stats?.avg_latency_ms || 18}ms)</span>
        </div>

        <div className="hidden md:flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5 text-cyan-400" />
          <span>ACTIVE TRACKS:</span>
          <span className="text-slate-200 font-bold">{stats?.active_tracks ?? 0}</span>
        </div>

        <div className="hidden lg:flex items-center gap-1.5">
          <AlertOctagon className="w-3.5 h-3.5 text-amber-400" />
          <span>INCIDENTS TODAY:</span>
          <span className="text-slate-200">{stats?.events_today ?? 0}</span>
          {(stats?.critical_events > 0) && (
            <span className="text-red-400 font-bold">({stats.critical_events} Critical)</span>
          )}
        </div>
      </div>

      {/* Right: Tamper Proof Badge & Audio Toggle */}
      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-1.5 text-emerald-400/90 text-[11px] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
          <ShieldCheck className="w-3 h-3" />
          <span>SHA-256 LEDGER ARMED</span>
        </div>

        <button
          onClick={onToggleSound}
          className={`flex items-center gap-1.5 px-2 py-1 rounded transition ${
            soundEnabled
              ? 'text-cyan-400 hover:bg-soc-800'
              : 'text-slate-500 hover:text-slate-300 hover:bg-soc-800'
          }`}
          title={soundEnabled ? "Disable Tactical Audio Chime" : "Enable Tactical Audio Chime"}
        >
          {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          <span className="text-[11px] hidden sm:inline">{soundEnabled ? 'AUDIO ON' : 'MUTED'}</span>
        </button>
      </div>
    </footer>
  );
}
