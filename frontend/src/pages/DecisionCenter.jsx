import React, { useState, useEffect } from 'react';
import { 
  Compass, AlertTriangle, ShieldAlert, CheckCircle2, ChevronRight, Eye, 
  ShieldCheck, Route, Radio, ArrowUpRight, Flame, FileText, MapPin, 
  Clock, Activity, CheckSquare, Layers, Lock, Shield, Cpu, RefreshCw, X
} from 'lucide-react';
import RiskBadge from '../components/RiskBadge';
import { api } from '../services/api';

export default function DecisionCenter({ onSelectEvent, onInspectJourney, onNavigateTab }) {
  const [overview, setOverview] = useState(null);
  const [priorities, setPriorities] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSector, setSelectedSector] = useState(null);
  const [inspectingDecisionEvent, setInspectingDecisionEvent] = useState(null);
  const [decisionDetail, setDecisionDetail] = useState(null);
  const [timelineData, setTimelineData] = useState([]);
  const [predictiveData, setPredictiveData] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [activeDossierTab, setActiveDossierTab] = useState('factors');
  const [actionSuccessMsg, setActionSuccessMsg] = useState(null);

  useEffect(() => {
    fetchDecisionData();
    const interval = setInterval(fetchDecisionData, 4000);
    return () => clearInterval(interval);
  }, []);

  const fetchDecisionData = async () => {
    try {
      const [ovData, prioData, secData] = await Promise.all([
        api.getDecisionOverview(),
        api.getDecisionPriorities(15),
        api.getDecisionSectors()
      ]);
      setOverview(ovData);
      setPriorities(prioData.priority_queue || []);
      setSectors(secData.sectors || []);
    } catch (err) {
      console.error('Failed to fetch decision intelligence:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDossier = async (eventId) => {
    setInspectingDecisionEvent(eventId);
    try {
      const [detail, tl, pred, hist] = await Promise.all([
        api.getDecisionDetail(eventId),
        api.getDecisionTimeline(eventId),
        api.getDecisionPredictive(eventId),
        api.getDecisionHistory(eventId)
      ]);
      setDecisionDetail(detail);
      setTimelineData(tl.timeline || []);
      setPredictiveData(pred);
      setHistoryData(hist);
    } catch (err) {
      console.error('Failed to load event decision dossier:', err);
    }
  };

  const handleAcknowledge = async (eventId) => {
    try {
      await api.acknowledgeDecisionIncident(eventId, 'Duty Officer P. Singh');
      setActionSuccessMsg(`Incident ${eventId} acknowledged & logged to immutable audit ledger.`);
      setTimeout(() => setActionSuccessMsg(null), 4000);
      fetchDecisionData();
    } catch (err) {
      console.error('Failed to acknowledge incident:', err);
    }
  };


  const summary = overview?.summary;

  return (
    <div className="flex-1 bg-soc-900 p-6 overflow-y-auto font-mono text-xs select-none space-y-6">
      {/* Header & Responsible AI Banner */}
      <div className="pb-4 border-b border-soc-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Compass className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white tracking-wide">
              Command Decision Intelligence Center
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold">
              PHASE 13 OPERATIONAL LAYER
            </span>
          </div>
          <p className="text-slate-400 font-sans text-xs mt-0.5">
            What matters most right now, why it matters, and what the operator should review next
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] text-slate-500 block">HIGHEST RISK SECTOR</span>
            <span className="text-xs font-bold text-red-400 font-mono flex items-center justify-end gap-1">
              <Flame className="w-3.5 h-3.5 text-red-400" />
              {summary?.highest_risk_sector || 'Sector B (Riverine) — CRITICAL'}
            </span>
          </div>
        </div>
      </div>

      {/* Success Notification Alert */}
      {actionSuccessMsg && (
        <div className="p-3 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-between text-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button onClick={() => setActionSuccessMsg(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Responsible AI Advisory Disclaimer Banner */}
      <div className="p-3 rounded-xl bg-soc-850/80 border border-cyan-500/20 flex items-center justify-between gap-4 text-[11px] text-slate-300">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>
            <strong className="text-cyan-300">Human-in-the-Loop Governance:</strong> IBVAP Decision Intelligence provides advisory operational recommendations based on available telemetry. Recommendations never execute autonomous kinetic actions and require explicit human review.
          </span>
        </div>
        <span className="text-[10px] text-slate-500 shrink-0 font-sans">MHA / SSB Protocol</span>
      </div>

      {/* Section 4: Commander's Overview Bar */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="p-3.5 rounded-xl bg-soc-850 border border-soc-700 space-y-1 shadow-lg">
            <span className="text-[10px] text-slate-500 uppercase">ACTIVE INCIDENTS</span>
            <div className="flex items-baseline gap-2">
              <p className="text-xl font-bold text-white">{summary.active_incidents}</p>
              <span className="text-[10px] text-red-400 font-bold">({summary.critical_breaches} Crit)</span>
            </div>
            <div className="flex gap-1 text-[9px] text-slate-400">
              <span className="text-amber-400">{summary.high_priority_events} High</span> • 
              <span className="text-cyan-400">{summary.medium_priority_events} Med</span> • 
              <span className="text-slate-500">{summary.low_priority_events} Low</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-soc-850 border border-red-500/40 space-y-1 shadow-lg">
            <span className="text-[10px] text-red-400 uppercase font-bold">CRITICAL BREACHES</span>
            <p className="text-xl font-bold text-red-400">{summary.critical_breaches}</p>
            <span className="text-[9px] text-red-300 font-sans">Immediate review required</span>
          </div>

          <div className="p-3.5 rounded-xl bg-soc-850 border border-amber-500/40 space-y-1 shadow-lg">
            <span className="text-[10px] text-amber-400 uppercase font-bold">HIGH PRIORITY</span>
            <p className="text-xl font-bold text-amber-300">{summary.high_priority_events}</p>
            <span className="text-[9px] text-amber-200 font-sans">Tactical standby</span>
          </div>

          <div className="p-3.5 rounded-xl bg-soc-850 border border-soc-700 space-y-1 shadow-lg">
            <span className="text-[10px] text-slate-500 uppercase">CAMERAS ONLINE</span>
            <p className="text-xl font-bold text-cyan-300">{summary.cameras_online}</p>
            <span className="text-[9px] text-emerald-400 font-sans">100% Ingestion Uptime</span>
          </div>

          <div className="p-3.5 rounded-xl bg-soc-850 border border-soc-700 space-y-1 shadow-lg">
            <span className="text-[10px] text-slate-500 uppercase">EDGE NODES</span>
            <p className="text-xl font-bold text-emerald-400">{summary.edge_nodes_active}</p>
            <span className="text-[9px] text-slate-400 font-sans">4 Active Tracks</span>
          </div>

          <div className="p-3.5 rounded-xl bg-soc-850 border border-soc-700 space-y-1 shadow-lg">
            <span className="text-[10px] text-slate-500 uppercase">EVIDENCE INTEGRITY</span>
            <p className="text-xl font-bold text-emerald-400">0 Unverified</p>
            <span className="text-[9px] text-emerald-300 font-sans">SHA-256 Verified Ledger</span>
          </div>
        </div>
      )}

      {/* Section 5: Sector Risk Overview (Clickable Cards) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <MapPin className="w-4 h-4 text-cyan-400" />
            <span>Sector Risk Overview (Click Sector for Telemetry Drilldown)</span>
          </h3>
          <span className="text-[10px] text-slate-500">Live frontier sector threat index</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {sectors.map((sec) => {
            const isCrit = sec.risk_rating === 'CRITICAL';
            const isHigh = sec.risk_rating === 'HIGH';
            return (
              <div 
                key={sec.sector_id}
                onClick={() => setSelectedSector(sec)}
                className={`p-4 rounded-xl bg-soc-850 border transition cursor-pointer hover:scale-[1.01] space-y-2.5 shadow-lg ${
                  isCrit 
                    ? 'border-red-500/60 shadow-[0_0_15px_rgba(239,68,68,0.15)] bg-gradient-to-b from-red-950/20 to-soc-850'
                    : isHigh
                    ? 'border-amber-500/50'
                    : 'border-soc-750 hover:border-cyan-500/40'
                }`}
              >
                <div className="flex items-center justify-between pb-2 border-b border-soc-750">
                  <div>
                    <span className="font-bold text-white text-sm">{sec.sector_id}</span>
                    <span className="text-slate-400 text-xs ml-1.5">• {sec.camera_id}</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                    isCrit 
                      ? 'bg-red-500/20 text-red-400 border border-red-500/50 animate-pulse'
                      : isHigh
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {sec.risk_rating}
                  </span>
                </div>

                <div>
                  <p className="text-slate-200 font-semibold text-xs leading-snug">{sec.name}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{sec.terrain}</p>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-soc-750/50 text-[10px]">
                  <span className="text-slate-400">
                    <strong className="text-white">{sec.active_incidents_count}</strong> Active Signals
                  </span>
                  <span className="text-cyan-400 flex items-center gap-0.5 hover:underline">
                    <span>Inspect</span>
                    <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Priority Queue (Left) & Unresolved List / Context (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Priority Incident Queue */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-cyan-400" />
              <span>Priority Incident Queue (Ranked by Operational Urgency)</span>
            </h3>
            <span className="text-[10px] text-slate-500">
              Ordered by Risk Score, Recency & Unresolved State
            </span>
          </div>

          {loading ? (
            <div className="py-16 text-center text-slate-500 font-mono">
              Compiling priority incident queue...
            </div>
          ) : priorities.length > 0 ? (
            <div className="space-y-3.5">
              {priorities.map((item) => (
                <div
                  key={item.event_id}
                  className="p-4 rounded-xl bg-soc-850 border border-soc-750 hover:border-cyan-500/50 transition shadow-lg space-y-3.5"
                >
                  {/* Top Row: Rank, Event ID, Target, Risk Badge, Unresolved Duration */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-soc-750">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-soc-750 text-cyan-300 font-bold flex items-center justify-center text-xs shadow-inner">
                        #{item.rank}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{item.event_id}</span>
                          <span className="text-slate-400 text-xs">• {item.camera_name}</span>
                          <span className="text-[11px] text-cyan-400">({item.location})</span>
                        </div>
                        <p className="text-slate-300 text-xs font-semibold">
                          {item.event_type} • <span className="text-cyan-300">{item.target}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30 font-semibold flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-400" />
                        {item.unresolved_str}
                      </span>
                      <RiskBadge level={item.risk_level} score={item.risk_score} size="sm" />
                    </div>
                  </div>

                  {/* Middle Row: Why Prioritized (Breakdown) vs Recommendation Engine */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Left: Why Prioritized? */}
                    <div className="space-y-1.5 p-3 rounded-lg bg-soc-900/60 border border-soc-750">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                          <CheckSquare className="w-3 h-3 text-cyan-400" />
                          WHY PRIORITIZED? (EXPLAINABLE REASONS)
                        </span>
                        <span className="text-[9px] text-cyan-400">
                          {item.related_cameras_count} Cams • {item.related_sensors_count} Sensors
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {item.factors_breakdown?.map((fb, idx) => (
                          <span key={idx} className="text-[10px] px-2 py-0.5 rounded bg-soc-750 text-slate-200 border border-soc-700 flex items-center gap-1">
                            <span className="text-cyan-300 font-bold">{fb.points}</span>
                            <span>{fb.factor}</span>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Right: Recommended Operator Action & Confidence */}
                    <div className="p-3 rounded-lg bg-soc-900 border border-cyan-500/30 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-cyan-400 uppercase font-bold flex items-center gap-1">
                          <Compass className="w-3 h-3 text-cyan-400" />
                          RECOMMENDED NEXT ACTION
                        </span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold">
                          Confidence: {item.recommendation_confidence}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-100 leading-snug">
                        {item.recommended_action}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        <strong className="text-slate-300">Workflow:</strong> {item.suggested_workflow}
                      </p>
                    </div>
                  </div>

                  {/* Bottom Action Bar: Operator Interactive Triggers */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-soc-750/70">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAcknowledge(item.event_id)}
                        className="px-3 py-1 rounded bg-soc-750 hover:bg-soc-700 text-slate-200 text-[11px] font-semibold border border-soc-700 transition"
                      >
                        [ Acknowledge ]
                      </button>
                      <button
                        onClick={() => onInspectJourney && onInspectJourney(item.tracking_id)}
                        className="px-3 py-1 rounded bg-soc-750 hover:bg-soc-700 text-slate-200 text-[11px] font-semibold border border-soc-700 transition flex items-center gap-1"
                      >
                        <Route className="w-3 h-3 text-cyan-400" />
                        <span>[ View Journey ]</span>
                      </button>
                      <button
                        onClick={() => onNavigateTab && onNavigateTab('map')}
                        className="px-3 py-1 rounded bg-soc-750 hover:bg-soc-700 text-slate-200 text-[11px] font-semibold border border-soc-700 transition flex items-center gap-1"
                      >
                        <MapPin className="w-3 h-3 text-emerald-400" />
                        <span>[ View on Map ]</span>
                      </button>
                    </div>

                    <button
                      onClick={() => handleOpenDossier(item.event_id)}
                      className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs transition flex items-center gap-1.5 shadow-[0_0_10px_rgba(0,240,255,0.2)]"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Review Decision Dossier</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-500">
              No security incidents currently queued.
            </div>
          )}
        </div>

        {/* Right Col: Unresolved Incidents & Related Sensor Grid */}
        <div className="space-y-6">
          {/* Section 14: Unresolved Incidents Card */}
          <div className="p-4 rounded-xl bg-soc-850 border border-soc-750 space-y-3 shadow-lg">
            <div className="flex items-center justify-between pb-2 border-b border-soc-750">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Unresolved Incident Queue</span>
              </h3>
              <span className="text-[10px] text-slate-500">Elapsed SLA</span>
            </div>

            <div className="space-y-2">
              {overview?.unresolved_incidents?.map((unres) => (
                <div 
                  key={unres.event_id}
                  onClick={() => handleOpenDossier(unres.event_id)}
                  className="p-2.5 rounded-lg bg-soc-900 hover:bg-soc-750 border border-soc-750 transition cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-xs">{unres.event_id}</span>
                      <span className="text-[10px] text-slate-400">• {unres.camera_id}</span>
                    </div>
                    <p className="text-[10px] text-slate-400">{unres.event_type}</p>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-bold text-amber-300 block">{unres.unresolved_str}</span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                      unres.risk_level === 'CRITICAL' ? 'text-red-400 bg-red-500/10' : 'text-amber-300 bg-amber-500/10'
                    }`}>
                      {unres.risk_level} ({unres.risk_score})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 18: Multi-Modal Sensor Status Matrix */}
          <div className="p-4 rounded-xl bg-soc-850 border border-soc-750 space-y-3 shadow-lg">
            <div className="flex items-center justify-between pb-2 border-b border-soc-750">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Radio className="w-4 h-4 text-cyan-400" />
                <span>Integrated Sensor Health</span>
              </h3>
              <span className="text-[10px] text-emerald-400">Live Telemetry</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-lg bg-soc-900 border border-soc-750 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-200">CAM-02 (Sector B Optical)</span>
                  <span className="text-[10px] text-slate-400 block">YOLOv8 + ByteTrack Active</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                  ONLINE
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-soc-900 border border-amber-500/40 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-200">ACOUSTIC-02 (River Basin)</span>
                  <span className="text-[10px] text-amber-300 block">74 dB Resonance Spike</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold animate-pulse">
                  ANOMALY
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-soc-900 border border-soc-750 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-200">UAV-01 (Autonomous Recon)</span>
                  <span className="text-[10px] text-slate-400 block">Battery 94% • Standby SEC-B</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold">
                  AVAILABLE
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal 1: Sector Telemetry Drilldown Drawer */}
      {selectedSector && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-soc-850 border border-soc-700 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-soc-700">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">{selectedSector.name}</h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                    selectedSector.risk_rating === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}>
                    {selectedSector.risk_rating} RISK
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{selectedSector.terrain} • Monitored by {selectedSector.camera_id}</p>
              </div>
              <button onClick={() => setSelectedSector(null)} className="p-1.5 rounded-lg bg-soc-750 hover:bg-soc-700 text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 24-Hour Historical Summary */}
            <div className="space-y-2">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                24-HOUR SECTOR INCIDENT HISTORY
              </span>
              <div className="grid grid-cols-4 gap-2.5 text-center">
                <div className="p-2.5 rounded-lg bg-soc-900 border border-soc-750">
                  <span className="text-[10px] text-slate-500 block">Intrusions</span>
                  <span className="text-sm font-bold text-white">{selectedSector.historical_24h?.intrusions || 4}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-soc-900 border border-soc-750">
                  <span className="text-[10px] text-slate-500 block">Vehicle Events</span>
                  <span className="text-sm font-bold text-white">{selectedSector.historical_24h?.vehicle_events || 7}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-soc-900 border border-soc-750">
                  <span className="text-[10px] text-slate-500 block">Night Events</span>
                  <span className="text-sm font-bold text-white">{selectedSector.historical_24h?.night_events || 5}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-soc-900 border border-soc-750">
                  <span className="text-[10px] text-slate-500 block">High Risk</span>
                  <span className="text-sm font-bold text-red-400">{selectedSector.historical_24h?.high_risk_events || 3}</span>
                </div>
              </div>
            </div>

            {/* Active Sensors in Sector */}
            <div className="space-y-2">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                SECTOR SENSORS & PROTOTYPE FORECAST
              </span>
              <div className="p-3 rounded-lg bg-soc-900 border border-soc-750 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">Predictive Threat Forecast:</span>
                  <span className="text-cyan-300 font-bold">{selectedSector.predictive_forecast}</span>
                </div>
                <div className="flex gap-2">
                  {selectedSector.sensor_status?.map((s, idx) => (
                    <span key={idx} className="text-[10px] px-2 py-1 rounded bg-soc-750 border border-soc-700 text-slate-200">
                      {s.sensor_id} ({s.status})
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-soc-700">
              <button
                onClick={() => setSelectedSector(null)}
                className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs"
              >
                Close Sector View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Explainable Decision Dossier Modal */}
      {inspectingDecisionEvent && decisionDetail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-soc-850 border border-soc-700 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-soc-700">
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-base font-bold text-white">{decisionDetail.event_id}</h3>
                  <RiskBadge level={decisionDetail.risk_level} score={decisionDetail.risk_score} size="sm" />
                  <span className="text-[10px] px-2 py-0.5 rounded bg-soc-750 text-cyan-300 border border-soc-700 font-bold">
                    {decisionDetail.status}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {decisionDetail.event_type} • {decisionDetail.target} on {decisionDetail.camera_id} ({decisionDetail.sector_name})
                </p>
              </div>
              <button 
                onClick={() => { setInspectingDecisionEvent(null); setDecisionDetail(null); }}
                className="p-1.5 rounded-lg bg-soc-750 hover:bg-soc-700 text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Dossier Tabs */}
            <div className="flex border-b border-soc-700 gap-2 text-xs">
              <button
                onClick={() => setActiveDossierTab('factors')}
                className={`pb-2 px-3 font-bold transition border-b-2 ${
                  activeDossierTab === 'factors' ? 'border-cyan-400 text-cyan-300' : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                Explainable Risk Factors
              </button>
              <button
                onClick={() => setActiveDossierTab('timeline')}
                className={`pb-2 px-3 font-bold transition border-b-2 ${
                  activeDossierTab === 'timeline' ? 'border-cyan-400 text-cyan-300' : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                Command Timeline
              </button>
              <button
                onClick={() => setActiveDossierTab('predictive')}
                className={`pb-2 px-3 font-bold transition border-b-2 ${
                  activeDossierTab === 'predictive' ? 'border-cyan-400 text-cyan-300' : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                Predictive & History
              </button>
            </div>

            {/* Tab 1: Factors & Recommendation */}
            {activeDossierTab === 'factors' && (
              <div className="space-y-4 text-xs">
                {/* Recommendation Box */}
                <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-cyan-400 uppercase font-bold flex items-center gap-1">
                      <Compass className="w-3.5 h-3.5 text-cyan-400" />
                      ADVISORY NEXT-ACTION RECOMMENDATION
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40">
                      Confidence: {decisionDetail.recommendation?.confidence}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-white">
                    {decisionDetail.recommendation?.title}
                  </p>
                  <p className="text-xs text-slate-300">
                    <strong className="text-cyan-300">Confidence Basis:</strong> {decisionDetail.recommendation?.confidence_basis}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    <strong className="text-slate-200">Suggested Workflow:</strong> {decisionDetail.recommendation?.suggested_workflow}
                  </p>
                </div>

                {/* Contributing Factor Points Decomposition */}
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    RISK SCORE FACTOR BREAKDOWN (0–100 EXPLAINABILITY)
                  </span>
                  <div className="space-y-2">
                    {decisionDetail.factors_breakdown?.map((f, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-soc-900 border border-soc-750 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-white">{f.factor}</span>
                          <p className="text-[10px] text-slate-400 mt-0.5">{f.detail}</p>
                        </div>
                        <span className="text-sm font-bold text-cyan-300 bg-soc-800 px-2.5 py-1 rounded border border-soc-700">
                          {f.points}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Related Sensors & Cameras */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 rounded-lg bg-soc-900 border border-soc-750 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">RELATED CAMERAS</span>
                    <div className="flex gap-1.5 flex-wrap">
                      {decisionDetail.related_cameras?.map((c, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-soc-750 text-slate-200">{c}</span>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-soc-900 border border-soc-750 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">RELATED SENSORS</span>
                    <div className="flex gap-1.5 flex-wrap">
                      {decisionDetail.related_sensors?.map((s, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-soc-750 text-slate-200">
                          {s.name} ({s.status})
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Command Operational Timeline */}
            {activeDossierTab === 'timeline' && (
              <div className="space-y-3">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">
                  INCIDENT OPERATIONAL TIMELINE
                </span>
                <div className="space-y-2.5">
                  {timelineData.map((step, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-soc-900 border border-soc-750 flex items-start gap-3">
                      <span className="text-[11px] font-bold text-cyan-400 bg-soc-800 px-2 py-1 rounded border border-soc-700 shrink-0">
                        {step.time}
                      </span>
                      <div className="flex-1 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-xs">{step.title}</span>
                          <span className="text-[9px] text-slate-500">{step.actor}</span>
                        </div>
                        <p className="text-[11px] text-slate-300">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 3: Predictive & History */}
            {activeDossierTab === 'predictive' && (
              <div className="space-y-4 text-xs">
                {predictiveData && (
                  <div className="p-4 rounded-xl bg-soc-900 border border-soc-750 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm">Predictive Risk Forecast</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                        {predictiveData.label}
                      </span>
                    </div>
                    <p className="text-slate-300">
                      Sector Threat: <strong className="text-amber-400">{predictiveData.forecast}</strong>
                    </p>
                    <ul className="space-y-1 text-[11px] text-slate-400 list-disc list-inside">
                      {predictiveData.contributing_indicators?.map((ind, i) => (
                        <li key={i}>{ind}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {historyData && (
                  <div className="p-4 rounded-xl bg-soc-900 border border-soc-750 space-y-2">
                    <span className="font-bold text-white text-sm block">Sector 24-Hour Context</span>
                    <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
                      <div className="p-2 rounded bg-soc-800">
                        <span className="text-slate-500 block">Intrusions</span>
                        <span className="font-bold text-white">{historyData.metrics?.intrusions}</span>
                      </div>
                      <div className="p-2 rounded bg-soc-800">
                        <span className="text-slate-500 block">Vehicles</span>
                        <span className="font-bold text-white">{historyData.metrics?.vehicle_events}</span>
                      </div>
                      <div className="p-2 rounded bg-soc-800">
                        <span className="text-slate-500 block">Night Events</span>
                        <span className="font-bold text-white">{historyData.metrics?.night_events}</span>
                      </div>
                      <div className="p-2 rounded bg-soc-800">
                        <span className="text-slate-500 block">High Risk</span>
                        <span className="font-bold text-red-400">{historyData.metrics?.high_risk_events}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-soc-700">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    handleAcknowledge(decisionDetail.event_id);
                    setInspectingDecisionEvent(null);
                  }}
                  className="px-4 py-2 rounded-lg bg-soc-750 hover:bg-soc-700 text-white font-bold text-xs border border-soc-700 transition"
                >
                  Acknowledge Incident
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => onSelectEvent && onSelectEvent(decisionDetail.event_id)}
                  className="px-4 py-2 rounded-lg bg-soc-750 hover:bg-soc-700 text-cyan-300 font-bold text-xs border border-cyan-500/30 transition flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Inspect Evidence</span>
                </button>
                <button
                  onClick={() => { setInspectingDecisionEvent(null); setDecisionDetail(null); }}
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs transition"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
