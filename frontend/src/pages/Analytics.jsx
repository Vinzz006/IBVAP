import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, ShieldAlert, ShieldCheck, Activity, Users, Truck, Clock, AlertTriangle, Layers } from 'lucide-react';
import { api } from '../services/api';
import RiskBadge from '../components/RiskBadge';
import PredictiveRiskCard from '../components/PredictiveRiskCard';

export default function Analytics() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const data = await api.getThreatAnalytics();
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !analytics) {
    return (
      <div className="flex-1 bg-soc-900 flex items-center justify-center font-mono text-xs text-slate-400">
        Compiling border threat intelligence & density models...
      </div>
    );
  }

  const maxHourlyCount = Math.max(...(analytics.hourly_histogram || []).map(h => h.count), 1);

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-soc-900 select-none space-y-6">
      {/* Top Header */}
      <div className="pb-4 border-b border-soc-700 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-mono font-bold text-white flex items-center gap-2.5">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            <span>Border Threat Intelligence & Incident Analytics</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Quantitative analysis of security perimeter breaches, hourly density trends, and sector vulnerability rankings
          </p>
        </div>

        <button
          onClick={fetchAnalytics}
          className="px-3 py-1.5 rounded-lg bg-soc-800 hover:bg-soc-750 border border-soc-700 text-xs font-mono text-cyan-300 transition"
        >
          Refresh Telemetry
        </button>
      </div>

      {/* 12-Hour Predictive Threat Forecast & Patrol Advisor */}
      <PredictiveRiskCard />

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
        <div className="bg-soc-850 border border-soc-700/80 rounded-xl p-4 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>TOTAL BREACH EVENTS</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-bold text-white">{analytics.total_events}</p>
          <p className="text-[10px] text-emerald-400 font-sans">100% Captured with SHA-256 Hashes</p>
        </div>

        <div className="bg-soc-850 border border-soc-700/80 rounded-xl p-4 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>CRITICAL INCIDENTS</span>
            <ShieldAlert className="w-4 h-4 text-red-400" />
          </div>
          <p className="text-2xl font-bold text-red-400">{analytics.risk_breakdown?.CRITICAL || 0}</p>
          <p className="text-[10px] text-slate-400 font-sans">Restricted-zone intrusions</p>
        </div>

        <div className="bg-soc-850 border border-soc-700/80 rounded-xl p-4 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>PEAK THREAT WINDOW</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-xl font-bold text-amber-300">02:00 - 04:00h</p>
          <p className="text-[10px] text-slate-400 font-sans">Night-time low-light movements</p>
        </div>

        <div className="bg-soc-850 border border-soc-700/80 rounded-xl p-4 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>EVIDENCE INTEGRITY RATE</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400">{analytics.verified_rate}</p>
          <p className="text-[10px] text-slate-400 font-sans">Tamper-evident hash ledger verified</p>
        </div>
      </div>

      {/* Middle Grid: Hourly Breach Density & Target Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-mono text-xs">
        {/* Hourly Threat Density Histogram (2 Cols) */}
        <div className="lg:col-span-2 bg-soc-850 border border-soc-700 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-soc-750">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-white">Hourly Incident Density & Shift Distribution</h3>
            </div>
            <span className="text-[10px] text-slate-400">24-HOUR RADAR</span>
          </div>

          <div className="space-y-3 pt-2">
            {(analytics.hourly_histogram || []).map((item, idx) => {
              const widthPct = Math.max(12, Math.round((item.count / maxHourlyCount) * 100));
              const isNight = item.hour.includes('00:00') || item.hour.includes('20:00');
              const barColor = isNight ? 'bg-red-500' : item.risk === 'HIGH' ? 'bg-amber-500' : 'bg-cyan-500';

              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-300 font-medium">{item.label}</span>
                    <span className="text-slate-400 font-bold">{item.count} Incidents</span>
                  </div>
                  <div className="w-full h-3.5 bg-soc-900 rounded-full overflow-hidden border border-soc-700/60 flex">
                    <div
                      style={{ width: `${widthPct}%` }}
                      className={`h-full ${barColor} rounded-full transition-all duration-700 shadow-md`}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Target Classification Distribution (1 Col) */}
        <div className="bg-soc-850 border border-soc-700 rounded-xl p-5 shadow-lg space-y-4">
          <div className="pb-3 border-b border-soc-750">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              <span>Target Class Distribution</span>
            </h3>
          </div>

          <div className="space-y-3 pt-1">
            <div className="p-3 rounded-lg bg-soc-900 border border-soc-750 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-cyan-400" />
                <span className="text-slate-200">Person Infiltrations</span>
              </div>
              <span className="text-sm font-bold text-cyan-300">{analytics.target_breakdown?.person || 0}</span>
            </div>

            <div className="p-3 rounded-lg bg-soc-900 border border-soc-750 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Truck className="w-4 h-4 text-amber-400" />
                <span className="text-slate-200">Vehicles (Car / Truck / Bus)</span>
              </div>
              <span className="text-sm font-bold text-amber-300">{analytics.target_breakdown?.vehicle || 0}</span>
            </div>

            <div className="p-3 rounded-lg bg-soc-900 border border-soc-750 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-200">Motorcycles / ATVs</span>
              </div>
              <span className="text-sm font-bold text-emerald-300">{analytics.target_breakdown?.motorcycle || 0}</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-soc-900/60 border border-soc-700 text-[11px] text-slate-400 leading-relaxed font-sans">
            AI decision layer isolates high-priority pedestrian intrusions across fenced perimeters while correlating authorized patrol vehicles via ANPR.
          </div>
        </div>
      </div>

      {/* Sector Risk & Vulnerability Rankings */}
      <div className="bg-soc-850 border border-soc-700 rounded-xl p-5 shadow-lg space-y-4 font-mono text-xs">
        <div className="pb-3 border-b border-soc-750 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>Border Sector Vulnerability & Incident Density Ranking</span>
          </h3>
          <span className="text-[10px] text-slate-400">DECISION SUPPORT INDEX</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(analytics.sector_analytics || []).map((sec) => (
            <div
              key={sec.camera_id}
              className="p-4 rounded-lg bg-soc-900 border border-soc-750 space-y-2 hover:border-cyan-500/40 transition"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm">{sec.camera_id}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  sec.threat_rating === 'HIGH' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500/15 text-emerald-400'
                }`}>
                  THREAT: {sec.threat_rating}
                </span>
              </div>
              <p className="text-xs text-slate-300 font-sans line-clamp-1">{sec.name}</p>
              <p className="text-[11px] text-slate-500">{sec.location}</p>

              <div className="pt-2 border-t border-soc-750 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Total Incidents: <strong className="text-white">{sec.total_incidents}</strong></span>
                <span className="text-red-400">Critical: <strong>{sec.critical_incidents}</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
