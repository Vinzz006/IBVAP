import React, { useState, useEffect } from 'react';
import { Route, MapPin, Clock, ArrowRight, ShieldAlert, Video, Eye, Search, Compass, User, Truck, Navigation, CheckCircle2 } from 'lucide-react';
import RiskBadge from './RiskBadge';
import { api } from '../services/api';

export default function CrossCameraTracker({ onSelectEvent }) {
  const [targetIdQuery, setTargetIdQuery] = useState('17');
  const [selectedTargetId, setSelectedTargetId] = useState(17);
  const [targetJourney, setTargetJourney] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    fetchJourney(selectedTargetId);
    searchTargetsList();
  }, [selectedTargetId]);

  const searchTargetsList = async () => {
    try {
      const res = await api.searchTargets();
      setSearchResults(res.targets || []);
    } catch (err) {
      console.error('Target search failed:', err);
    }
  };

  const fetchJourney = async (tid) => {
    setLoading(true);
    try {
      const data = await api.getTargetJourney(tid);
      setTargetJourney(data);
    } catch (err) {
      console.error('Failed to fetch target journey:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const cleanId = parseInt(targetIdQuery.replace('#', '').trim(), 10);
    if (!isNaN(cleanId)) {
      setSelectedTargetId(cleanId);
    }
  };

  const lastSeen = targetJourney?.last_seen;

  return (
    <div className="flex-1 bg-soc-900 p-6 overflow-y-auto font-mono text-xs select-none space-y-6">
      {/* Top Header & Search Bar */}
      <div className="pb-4 border-b border-soc-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Route className="w-5 h-5 text-cyan-400" />
            <span>Multi-Camera Intelligence & Target Journey Reconstruction</span>
          </h2>
          <p className="text-slate-400 font-sans text-xs mt-0.5">
            Spatiotemporal tracking continuity & camera handoff timelines across frontier surveillance posts
          </p>
        </div>

        {/* Target Search Form */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={targetIdQuery}
              onChange={(e) => setTargetIdQuery(e.target.value)}
              placeholder="Search Target ID (e.g. #17)"
              className="bg-soc-850 border border-soc-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 w-44 font-mono"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs transition shadow-[0_0_8px_rgba(0,240,255,0.2)]"
          >
            SEARCH
          </button>
        </form>
      </div>

      {/* Target Candidates Selector Bar */}
      {searchResults.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-[11px]">
          <span className="text-slate-500 shrink-0 text-[10px] uppercase">TRACKED TARGETS:</span>
          {searchResults.map((t) => (
            <button
              key={t.target_id}
              onClick={() => {
                setSelectedTargetId(t.target_id);
                setTargetIdQuery(String(t.target_id));
              }}
              className={`px-3 py-1 rounded-md border flex items-center gap-1.5 shrink-0 transition ${
                selectedTargetId === t.target_id
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold'
                  : 'bg-soc-850 text-slate-400 border-soc-750 hover:text-white'
              }`}
            >
              <User className="w-3 h-3" />
              <span>{t.target_label}</span>
              <span className={`text-[9px] px-1 rounded ${
                t.max_risk_level === 'CRITICAL' ? 'bg-red-500/20 text-red-400' : 'bg-soc-700 text-slate-300'
              }`}>
                {t.max_risk_level}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Last Seen & Movement Vectors Row */}
      {targetJourney && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Last Seen Card */}
          <div className="p-4 rounded-xl bg-soc-850 border border-soc-700 space-y-2 shadow-lg">
            <div className="flex items-center justify-between pb-1 border-b border-soc-750">
              <span className="text-[10px] text-cyan-400 font-bold uppercase flex items-center gap-1">
                <Navigation className="w-3 h-3" />
                LAST SEEN TELEMETRY
              </span>
              <span className="text-[10px] bg-red-500/20 text-red-300 px-2 py-0.5 rounded border border-red-500/40 animate-pulse">
                {lastSeen?.current_status || 'ACTIVE'}
              </span>
            </div>
            <div className="space-y-1 text-slate-300">
              <p className="text-base font-bold text-white">{targetJourney.target_label}</p>
              <p className="text-xs text-slate-300 font-semibold">{lastSeen?.camera_id} • {lastSeen?.location}</p>
              <p className="text-[11px] text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-cyan-400" />
                {lastSeen?.timestamp}
              </p>
            </div>
          </div>

          {/* Transit Velocity Card */}
          <div className="p-4 rounded-xl bg-soc-850 border border-soc-700 space-y-2 shadow-lg">
            <span className="text-[10px] text-slate-500 uppercase block pb-1 border-b border-soc-750">
              ESTIMATED TRANSIT VELOCITY
            </span>
            <p className="text-base font-bold text-amber-300">{targetJourney.estimated_velocity}</p>
            <p className="text-[11px] text-slate-400 font-sans">Calculated from inter-sensor spacing & timeline deltas</p>
          </div>

          {/* Projected Heading Vector */}
          <div className="p-4 rounded-xl bg-soc-850 border border-soc-700 space-y-2 shadow-lg">
            <span className="text-[10px] text-slate-500 uppercase block pb-1 border-b border-soc-750">
              PROJECTED HEADING VECTOR
            </span>
            <p className="text-xs font-bold text-emerald-400 line-clamp-2">{targetJourney.vector_heading}</p>
            <p className="text-[11px] text-slate-400 font-sans">Directional handoff correlation</p>
          </div>
        </div>
      )}

      {/* Sequential Camera Handoff Timeline */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span>Sequential Camera Handoff Timeline ({targetJourney?.target_label})</span>
          </h3>
          <span className="text-[10px] text-slate-500 italic">
            Spatiotemporal Tracking Continuity (No Biometric Claims)
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-500">
            Reconstructing multi-camera handoff vectors...
          </div>
        ) : targetJourney?.handoff_steps?.length > 0 ? (
          <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-soc-700">
            {targetJourney.handoff_steps.map((step, idx) => (
              <div key={step.event_id || idx} className="relative group">
                {/* Timeline Node Badge */}
                <div className={`absolute -left-6 top-3 w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${
                  step.risk_level === 'CRITICAL'
                    ? 'bg-red-500 text-white border-red-300 animate-pulse'
                    : 'bg-soc-800 text-cyan-300 border-cyan-500'
                }`}>
                  {step.step_number}
                </div>

                {/* Step Card */}
                <div className="p-4 rounded-xl bg-soc-850 border border-soc-750 hover:border-cyan-500/50 transition shadow-lg space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-soc-750">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{step.camera_id}</span>
                      <span className="text-slate-400 font-sans text-xs">• {step.camera_name}</span>
                      <span className="text-[11px] text-cyan-400">({step.sector})</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400 bg-soc-900 px-2 py-0.5 rounded border border-soc-750">
                        {step.timestamp} ({step.transit_delta})
                      </span>
                      <RiskBadge level={step.risk_level} score={step.risk_score} size="sm" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <div className="space-y-1 text-slate-300 text-xs">
                      <div>
                        <span className="text-slate-500 text-[10px]">OBSERVED EVENT:</span>
                        <p className="font-semibold text-white">{step.event_type}</p>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px]">ASSOCIATION BASIS:</span>
                        <p className="text-cyan-300 text-[11px] leading-tight">{step.association_basis}</p>
                      </div>
                    </div>

                    {/* Snapshot Preview */}
                    <div className="w-full h-24 bg-soc-950 rounded-lg border border-soc-700 overflow-hidden relative flex items-center justify-center">
                      <img
                        src={step.evidence_path ? (step.evidence_path.startsWith('/') ? step.evidence_path : `/${step.evidence_path}`) : `/api/privacy/mask-preview/${step.event_id || 'EVT-0001'}`}
                        alt={step.event_id || 'Keyframe Snapshot'}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = `/api/privacy/mask-preview/${step.event_id || 'EVT-0001'}`;
                        }}
                      />
                      <span className="absolute bottom-1 right-1.5 px-1.5 py-0.5 bg-black/70 text-[9px] font-mono text-cyan-300 rounded border border-cyan-500/30">
                        {step.event_id}
                      </span>
                    </div>

                    {/* Action */}
                    <div className="flex justify-end">
                      <button
                        onClick={() => onSelectEvent(step.event_id)}
                        className="px-3.5 py-2 rounded-lg bg-soc-750 hover:bg-cyan-500 hover:text-black text-cyan-300 border border-soc-600 hover:border-cyan-400 transition text-xs font-semibold flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect Forensic Proof</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-slate-500">
            No movement steps found for Target #{selectedTargetId}.
          </div>
        )}
      </div>
    </div>
  );
}
