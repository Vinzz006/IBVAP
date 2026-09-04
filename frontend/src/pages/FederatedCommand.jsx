import React, { useState, useEffect } from 'react';
import {
  Network, Server, Shield, Radio, Activity, Cpu, HardDrive, Wifi, WifiOff,
  Layers, MapPin, Eye, CheckCircle2, AlertTriangle, Flame, ShieldAlert,
  Compass, RotateCcw, Plus, RefreshCw, Key, FileText, ArrowRight,
  ShieldCheck, Share2, Box, Info
} from 'lucide-react';
import { api } from '../services/api';
import NodeRegistrationModal from '../components/NodeRegistrationModal';
import RiskBadge from '../components/RiskBadge';

export default function FederatedCommand({ onSelectEvent }) {
  const [activeSubView, setActiveSubView] = useState('matrix'); // 'matrix' | 'map' | 'graph' | 'correlations' | 'decision'
  const [healthData, setHealthData] = useState(null);
  const [sectors, setSectors] = useState([]);
  const [edgeNodes, setEdgeNodes] = useState([]);
  const [correlations, setCorrelations] = useState([]);
  const [graphData, setGraphData] = useState(null);
  const [decisionData, setDecisionData] = useState(null);
  const [selectedSector, setSelectedSector] = useState(null);
  const [sectorDetail, setSectorDetail] = useState(null);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [evidenceModalEvent, setEvidenceModalEvent] = useState(null);
  const [evidenceResult, setEvidenceResult] = useState(null);
  const [actionMessage, setActionMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFederationData();
    const interval = setInterval(fetchFederationData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchFederationData = async () => {
    try {
      const [hData, sData, nData, cData, gData, dData] = await Promise.all([
        api.getFederationHealth(),
        api.getSectors(),
        api.getEdgeNodes(),
        api.getFederationCorrelations(15),
        api.getFederationGraph(),
        api.getFederationDecision()
      ]);
      setHealthData(hData);
      setSectors(sData.sectors || []);
      setEdgeNodes(nData.edge_nodes || []);
      setCorrelations(cData.correlations || []);
      setGraphData(gData);
      setDecisionData(dData);
    } catch (err) {
      console.error('Failed to fetch federation data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSector = async (sectorId) => {
    setSelectedSector(sectorId);
    try {
      const detail = await api.getSector(sectorId);
      setSectorDetail(detail);
    } catch (e) {}
  };

  const handleRequestEvidence = async (eventId) => {
    setEvidenceModalEvent(eventId);
    setEvidenceResult(null);
    try {
      const res = await api.requestFederatedEvidence(eventId, 'Duty Officer P. Singh');
      setEvidenceResult(res);
    } catch (err) {
      alert(`Evidence retrieval failed: ${err.message}`);
    }
  };

  const handleSimulateNetworkCut = async (sectorId) => {
    setActionMessage('');
    try {
      const res = await api.runFederationSimulation('SECTOR_NET_LOSS', sectorId);
      setActionMessage(`Simulated fiber cut on ${sectorId}. Sector switched to EDGE OFFLINE mode.`);
      await fetchFederationData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSimulateNetworkRestore = async (sectorId) => {
    setActionMessage('');
    try {
      const res = await api.runFederationSimulation('SECTOR_NET_RESTORE', sectorId);
      setActionMessage(`Network link restored for ${sectorId}. Auto-sync complete.`);
      await fetchFederationData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleResetNetwork = async () => {
    try {
      await api.runFederationSimulation('RESET_NETWORK');
      setActionMessage('Federated network topology reset to baseline.');
      await fetchFederationData();
    } catch (err) {
      alert(err.message);
    }
  };

  const summary = healthData?.summary;

  return (
    <div className="flex-1 bg-soc-900 p-6 overflow-y-auto font-mono text-xs select-none space-y-6">
      {/* Top Header */}
      <div className="pb-4 border-b border-soc-700 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Network className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Federated Border Intelligence Command
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold">
                  PHASE 13 FEDERATED
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
                  PRIVACY-PRESERVED EDGE
                </span>
              </div>
              <p className="text-slate-400 font-sans text-xs mt-0.5">
                Autonomous edge compute nodes, structured metadata sharing, idempotent synchronization, and multi-sector cross-correlation
              </p>
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsRegisterOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-soc-800 hover:bg-soc-750 text-cyan-300 border border-soc-700 hover:border-cyan-500/40 text-xs transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Register Edge Node</span>
          </button>

          <button
            onClick={handleResetNetwork}
            title="Reset simulation parameters"
            className="p-2 rounded-lg bg-soc-800 hover:bg-soc-750 text-slate-400 hover:text-white border border-soc-700 transition"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-300" />
          </button>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionMessage && (
        <div className="p-3 rounded-lg bg-cyan-950/40 border border-cyan-500/50 flex items-center justify-between gap-2 text-cyan-300">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400 animate-spin" />
            <span>{actionMessage}</span>
          </div>
          <button onClick={() => setActionMessage('')} className="text-slate-400 hover:text-white text-xs">Dismiss</button>
        </div>
      )}

      {/* Federated Network Overview KPI Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="p-3 rounded-xl bg-soc-850 border border-soc-700 space-y-1 shadow-lg">
            <span className="text-[10px] text-slate-400 uppercase">SECTORS ONLINE</span>
            <p className="text-lg font-bold text-emerald-400">{summary.sectors_online}</p>
            <span className="text-[9px] text-slate-500 font-sans">Frontier Outposts</span>
          </div>

          <div className="p-3 rounded-xl bg-soc-850 border border-soc-700 space-y-1 shadow-lg">
            <span className="text-[10px] text-slate-400 uppercase">EDGE NODES</span>
            <p className="text-lg font-bold text-cyan-300">{summary.edge_nodes_healthy}</p>
            <span className="text-[9px] text-emerald-400 font-sans">● Autonomous AI</span>
          </div>

          <div className="p-3 rounded-xl bg-soc-850 border border-soc-700 space-y-1 shadow-lg">
            <span className="text-[10px] text-slate-400 uppercase">CAMERAS ONLINE</span>
            <p className="text-lg font-bold text-white">{summary.cameras_online}</p>
            <span className="text-[9px] text-slate-500 font-sans">100% Ingest Rate</span>
          </div>

          <div className="p-3 rounded-xl bg-soc-850 border border-soc-700 space-y-1 shadow-lg">
            <span className="text-[10px] text-slate-400 uppercase">PENDING SYNC</span>
            <p className="text-lg font-bold text-amber-400">{summary.pending_sync}</p>
            <span className="text-[9px] text-slate-500 font-sans">Idempotent Buffer</span>
          </div>

          <div className="p-3 rounded-xl bg-soc-850 border border-soc-700 space-y-1 shadow-lg">
            <span className="text-[10px] text-slate-400 uppercase">ACTIVE INCIDENTS</span>
            <p className="text-lg font-bold text-white">{summary.active_incidents}</p>
            <span className="text-[9px] text-slate-500 font-sans">Under SOC Review</span>
          </div>

          <div className="p-3 rounded-xl bg-soc-850 border border-red-500/40 space-y-1 shadow-lg">
            <span className="text-[10px] text-red-400 uppercase font-bold">CRITICAL BREACH</span>
            <p className="text-lg font-bold text-red-400">{summary.critical_breaches}</p>
            <span className="text-[9px] text-red-300 font-sans">Immediate Action</span>
          </div>

          <div className="p-3 rounded-xl bg-soc-850 border border-soc-700 space-y-1 shadow-lg">
            <span className="text-[10px] text-slate-400 uppercase">AVG SYNC LATENCY</span>
            <p className="text-lg font-bold text-cyan-400">{summary.avg_sync_latency_ms}</p>
            <span className="text-[9px] text-slate-500 font-mono">TELEMETRY</span>
          </div>
        </div>
      )}

      {/* Sub-View Navigation Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-soc-750 pb-3">
        <div className="flex items-center gap-1 bg-soc-850 p-1 rounded-xl border border-soc-700">
          {[
            { id: 'matrix', label: 'Sector Health Matrix', icon: Layers },
            { id: 'map', label: 'Network Risk Map', icon: MapPin },
            { id: 'graph', label: 'Intelligence Graph', icon: Share2 },
            { id: 'correlations', label: 'Cross-Sector Correlations', icon: Activity },
            { id: 'decision', label: 'Federated Decision Center', icon: Compass }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubView === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubView(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_8px_rgba(0,240,255,0.2)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-soc-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Data separation reminder badge */}
        <div className="hidden xl:flex items-center gap-2 px-3 py-1 rounded-lg bg-soc-800 border border-soc-700 text-slate-400 text-[11px]">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Local Video Storage • Structured Metadata Bus • SHA-256 Verified Evidence</span>
        </div>
      </div>

      {/* --- SUB-VIEW 1: SECTOR HEALTH MATRIX --- */}
      {activeSubView === 'matrix' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Federated Sector & Edge Compute Node Matrix</span>
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">
              Click any sector to inspect edge telemetry & connected cameras
            </span>
          </div>

          <div className="bg-soc-850 border border-soc-700 rounded-xl overflow-hidden shadow-lg">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-soc-800/80 border-b border-soc-700 text-slate-400 text-[10px] uppercase font-bold">
                  <th className="py-3 px-4">SECTOR</th>
                  <th className="py-3 px-4">EDGE NODE</th>
                  <th className="py-3 px-4">NETWORK LINK</th>
                  <th className="py-3 px-4">CAMERAS</th>
                  <th className="py-3 px-4">EDGE STATUS</th>
                  <th className="py-3 px-4">RISK LEVEL</th>
                  <th className="py-3 px-4">LAST SYNC</th>
                  <th className="py-3 px-4 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-soc-750 text-[11px]">
                {healthData?.matrix?.map((row) => (
                  <tr
                    key={row.sector_id}
                    onClick={() => handleSelectSector(row.sector_id)}
                    className="hover:bg-soc-800/60 transition cursor-pointer"
                  >
                    <td className="py-3 px-4 font-bold text-white">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                        <span>{row.sector_name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">({row.sector_id})</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-cyan-300 font-mono font-semibold">{row.edge_node}</td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      <span className="px-2 py-0.5 rounded bg-soc-900 border border-soc-700 text-[10px]">
                        {row.network_link}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">{row.cameras} Online</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        row.edge_status === 'ONLINE'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : row.edge_status === 'DEGRADED'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse'
                      }`}>
                        ● {row.edge_status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        row.risk_rating === 'CRITICAL'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse'
                          : row.risk_rating === 'HIGH'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {row.risk_rating}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">{row.last_sync}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {row.edge_status === 'ONLINE' ? (
                          <button
                            onClick={() => handleSimulateNetworkCut(row.sector_id)}
                            className="px-2 py-1 rounded bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 text-[10px] transition"
                            title="Cut network link for resilience testing"
                          >
                            Sim Net Loss
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSimulateNetworkRestore(row.sector_id)}
                            className="px-2 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[10px] transition"
                            title="Restore network uplink and auto sync"
                          >
                            Restore Uplink
                          </button>
                        )}
                        <button
                          onClick={() => handleSelectSector(row.sector_id)}
                          className="px-2 py-1 rounded bg-soc-800 hover:bg-soc-750 text-cyan-300 border border-soc-700 text-[10px] transition"
                        >
                          Details
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Sector Drilldown Drawer if selected */}
          {sectorDetail && (
            <div className="p-4 rounded-xl bg-soc-850 border border-cyan-500/40 space-y-3 shadow-xl">
              <div className="flex items-center justify-between pb-2 border-b border-soc-750">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-xs font-bold text-white">
                    {sectorDetail.sector_name} — Detailed Edge Telemetry & Camera Roster
                  </h4>
                </div>
                <button
                  onClick={() => setSectorDetail(null)}
                  className="text-slate-400 hover:text-white text-xs px-2 py-0.5 rounded bg-soc-800"
                >
                  Close Drawer
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Edge Nodes */}
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">EDGE NODES</span>
                  {sectorDetail.edge_nodes?.map((n) => (
                    <div key={n.node_id} className="p-3 rounded-lg bg-soc-900 border border-soc-750 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-xs">{n.node_id}</span>
                        <span className="text-[10px] text-emerald-400 font-bold">● {n.status}</span>
                      </div>
                      <p className="text-[10px] text-slate-400">{n.hostname}</p>
                      <div className="grid grid-cols-2 gap-1 pt-1 text-[10px] text-slate-300">
                        <span>CPU: {n.cpu_usage}%</span>
                        <span>RAM: {n.memory_usage}%</span>
                        <span>AI: {n.ai_status}</span>
                        <span>Free: {n.storage_free_gb} GB</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Cameras */}
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">CONNECTED CAMERAS</span>
                  <div className="space-y-1.5">
                    {sectorDetail.cameras?.map((c) => (
                      <div key={c.id} className="p-2 rounded-lg bg-soc-900 border border-soc-750 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-white text-xs">{c.id}</span>
                          <p className="text-[10px] text-slate-400 truncate">{c.name}</p>
                        </div>
                        <span className="text-[10px] text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-500/15">
                          {c.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Sector Incidents */}
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">RECENT SECTOR INCIDENTS</span>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {sectorDetail.recent_events?.length > 0 ? (
                      sectorDetail.recent_events.map((ev) => (
                        <div key={ev.id} className="p-2 rounded-lg bg-soc-900 border border-soc-750 flex items-center justify-between">
                          <div>
                            <span className="font-bold text-white text-xs">{ev.id}</span>
                            <p className="text-[10px] text-slate-300">{ev.event_type}</p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <RiskBadge level={ev.risk_level} score={ev.risk_score} size="sm" />
                            <button
                              onClick={() => handleRequestEvidence(ev.id)}
                              className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 text-[10px]"
                            >
                              Evidence
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-500 text-[10px] italic p-2">No recent events recorded in this sector.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- SUB-VIEW 2: NETWORK RISK MAP --- */}
      {activeSubView === 'map' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-4 h-4 text-cyan-400" />
              <span>Multi-Sector Tactical Frontier Risk Map</span>
            </h3>
            <span className="text-[10px] text-slate-400">
              Interactive 2D Geospatial Frontier Topology
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* 2D Canvas Map */}
            <div className="lg:col-span-3 bg-soc-850 border border-soc-700 rounded-xl p-5 shadow-lg space-y-4">
              <div className="relative w-full aspect-video bg-soc-950 rounded-xl border border-soc-750 overflow-hidden p-4 shadow-inner flex flex-col justify-between">
                {/* Background Grid */}
                <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#00f0ff_1px,transparent_1px),linear-gradient(to_bottom,#00f0ff_1px,transparent_1px)] bg-[size:32px_32px]"></div>

                {/* Frontier Line */}
                <div className="relative z-10 flex items-center justify-between px-2 pt-1 border-b border-dashed border-red-500/40 pb-2">
                  <span className="text-[10px] font-bold text-red-400 tracking-widest uppercase flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                    INTERNATIONAL BORDER PERIMETER • MONITORED SECTORS A - D
                  </span>
                  <span className="text-[9px] text-emerald-400 font-mono">ALL EDGE NODES ONLINE</span>
                </div>

                {/* Interactive Sector Region Blocks */}
                <div className="relative z-10 grid grid-cols-4 gap-3 my-auto">
                  {sectors.map((sec) => {
                    const isCrit = sec.risk_level === 'CRITICAL';
                    const isHigh = sec.risk_level === 'HIGH';
                    const isOffline = sec.status === 'OFFLINE';

                    return (
                      <div
                        key={sec.sector_id}
                        onClick={() => handleSelectSector(sec.sector_id)}
                        className={`p-3.5 rounded-xl border transition cursor-pointer flex flex-col justify-between h-44 shadow-lg ${
                          selectedSector === sec.sector_id
                            ? 'bg-cyan-950/60 border-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.25)]'
                            : isOffline
                            ? 'bg-red-950/30 border-red-500/50'
                            : isCrit
                            ? 'bg-red-950/20 border-red-500/40 hover:border-red-400'
                            : isHigh
                            ? 'bg-amber-950/20 border-amber-500/40 hover:border-amber-400'
                            : 'bg-soc-900/90 border-soc-700 hover:border-soc-600'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between pb-1">
                            <span className="font-bold text-white text-xs">{sec.sector_id}</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                              isOffline
                                ? 'bg-red-500/20 text-red-400'
                                : isCrit
                                ? 'bg-red-500/20 text-red-400 animate-pulse'
                                : isHigh
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-emerald-500/20 text-emerald-300'
                            }`}>
                              {isOffline ? 'OFFLINE' : `${sec.risk_level} RISK`}
                            </span>
                          </div>
                          <p className="text-[11px] font-semibold text-slate-200 line-clamp-1">{sec.sector_name}</p>
                          <p className="text-[9px] text-slate-400">{sec.region}</p>
                        </div>

                        <div className="space-y-1 text-[10px] text-slate-300 pt-2 border-t border-soc-750">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Node:</span>
                            <span className="text-cyan-300 font-mono">{sec.edge_node_id}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Cameras:</span>
                            <span>{sec.camera_count} Units</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Active Signals:</span>
                            <span className={sec.active_events > 0 ? 'text-red-400 font-bold' : 'text-slate-400'}>
                              {sec.active_events}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Base Patrol Road */}
                <div className="relative z-10 flex items-center justify-between px-2 pt-2 border-t border-soc-700">
                  <span className="text-[10px] text-slate-400">TACTICAL PATROL CORRIDOR & SENSOR BUS</span>
                  <span className="text-[9px] text-cyan-400">Real Application State Topology</span>
                </div>
              </div>
            </div>

            {/* Right: Quick Sector Actions */}
            <div className="bg-soc-850 border border-soc-700 rounded-xl p-4 shadow-lg space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider pb-2 border-b border-soc-750">
                Frontier Sector Threat Summary
              </h4>

              <div className="space-y-2">
                {sectors.map((sec) => (
                  <div key={sec.sector_id} className="p-2.5 rounded-lg bg-soc-900 border border-soc-750 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs">{sec.sector_id}</span>
                      <span className={`text-[10px] font-bold ${
                        sec.risk_level === 'CRITICAL' ? 'text-red-400' : sec.risk_level === 'HIGH' ? 'text-amber-400' : 'text-emerald-400'
                      }`}>
                        {sec.risk_level}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-300 truncate">{sec.sector_name}</p>
                    <div className="flex items-center justify-between text-[9px] text-slate-400 pt-1">
                      <span>{sec.connectivity}</span>
                      <button
                        onClick={() => handleSelectSector(sec.sector_id)}
                        className="text-cyan-400 hover:underline"
                      >
                        Inspect →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- SUB-VIEW 3: INTELLIGENCE GRAPH --- */}
      {activeSubView === 'graph' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Share2 className="w-4 h-4 text-cyan-400" />
              <span>Federated Intelligence Graph (Entity Relationship Topology)</span>
            </h3>
            <span className="text-[10px] text-slate-400">
              Real application nodes: Sectors → Nodes → Cameras → Events → Targets → Evidence Hashes
            </span>
          </div>

          <div className="bg-soc-850 border border-soc-700 rounded-xl p-5 shadow-lg space-y-4">
            {/* Graph Node Types Legend */}
            <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-soc-900 border border-soc-750 text-[11px]">
              <span className="text-slate-400 font-bold uppercase text-[10px]">GRAPH NODE TYPES:</span>
              <span className="flex items-center gap-1.5 text-cyan-300">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span> SECTOR
              </span>
              <span className="flex items-center gap-1.5 text-emerald-300">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span> EDGE NODE
              </span>
              <span className="flex items-center gap-1.5 text-blue-300">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-400"></span> CAMERA
              </span>
              <span className="flex items-center gap-1.5 text-red-300">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span> SECURITY EVENT
              </span>
              <span className="flex items-center gap-1.5 text-amber-300">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span> TRACKED TARGET
              </span>
              <span className="flex items-center gap-1.5 text-purple-300">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-400"></span> SHA-256 HASH
              </span>
            </div>

            {/* Visual Node Grid Representation */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto">
              {graphData?.nodes?.map((n) => (
                <div
                  key={n.id}
                  className={`p-3 rounded-lg border space-y-1 shadow-md ${
                    n.type === 'SECTOR'
                      ? 'bg-cyan-950/20 border-cyan-500/40'
                      : n.type === 'NODE'
                      ? 'bg-emerald-950/20 border-emerald-500/40'
                      : n.type === 'EVENT'
                      ? 'bg-red-950/20 border-red-500/40'
                      : n.type === 'TARGET'
                      ? 'bg-amber-950/20 border-amber-500/40'
                      : n.type === 'EVIDENCE'
                      ? 'bg-purple-950/20 border-purple-500/40'
                      : 'bg-soc-900 border-soc-700'
                  }`}
                >
                  <div className="flex items-center justify-between pb-1 border-b border-soc-750">
                    <span className="font-bold text-white text-xs">{n.id}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-black/40 text-slate-300">
                      {n.type}
                    </span>
                  </div>
                  <p className="text-slate-200 font-semibold text-[11px] truncate">{n.label}</p>
                  <p className="text-[10px] text-slate-400">{n.details}</p>
                </div>
              ))}
            </div>

            {/* Connected Links Feed */}
            <div className="p-3 rounded-lg bg-soc-900 border border-soc-750 space-y-2">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                RELATIONSHIP CONNECTIONS ({graphData?.total_links || 0} ACTIVE EDGES)
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-32 overflow-y-auto text-[10px] text-slate-300 font-mono">
                {graphData?.links?.map((link, idx) => (
                  <div key={idx} className="p-1.5 rounded bg-soc-850 border border-soc-750 flex items-center justify-between">
                    <span className="text-cyan-300">{link.source}</span>
                    <span className="text-slate-500 text-[9px]">→ {link.relationship} →</span>
                    <span className="text-amber-300">{link.target}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- SUB-VIEW 4: CROSS-SECTOR CORRELATIONS --- */}
      {activeSubView === 'correlations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>Cross-Sector Event Correlation Engine</span>
            </h3>
            <span className="text-[10px] text-slate-500">
              Prototype correlation algorithm based on spatiotemporal proximity and kinematic vectors
            </span>
          </div>

          {correlations.length > 0 ? (
            <div className="space-y-3">
              {correlations.map((corr) => (
                <div
                  key={corr.id}
                  className="p-4 rounded-xl bg-soc-850 border border-soc-700 hover:border-cyan-500/50 transition shadow-lg space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-soc-750">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{corr.correlation_id}</span>
                      <span className="text-slate-400 text-xs">
                        {corr.source_sector} → {corr.target_sector}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40">
                        SCORE: {corr.correlation_score.toFixed(0)} / 100
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
                        {corr.confidence_level} CONFIDENCE
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-200 font-sans leading-relaxed">
                    {corr.reasoning}
                  </p>

                  {/* Factor Scoring Breakdown */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 font-mono text-[10px]">
                    <div className="p-2 rounded bg-soc-900 border border-soc-750">
                      <span className="text-slate-500 block">TEMPORAL</span>
                      <span className="text-cyan-300 font-bold">+{corr.factor_breakdown.temporal} pts</span>
                    </div>
                    <div className="p-2 rounded bg-soc-900 border border-soc-750">
                      <span className="text-slate-500 block">SPATIAL / ADJACENT</span>
                      <span className="text-cyan-300 font-bold">+{corr.factor_breakdown.spatial} pts</span>
                    </div>
                    <div className="p-2 rounded bg-soc-900 border border-soc-750">
                      <span className="text-slate-500 block">TARGET METADATA</span>
                      <span className="text-cyan-300 font-bold">+{corr.factor_breakdown.target_association} pts</span>
                    </div>
                    <div className="p-2 rounded bg-soc-900 border border-soc-750">
                      <span className="text-slate-500 block">KINEMATIC SPEED</span>
                      <span className="text-cyan-300 font-bold">+{corr.factor_breakdown.trajectory} pts</span>
                    </div>
                    <div className="p-2 rounded bg-soc-900 border border-soc-750">
                      <span className="text-slate-500 block">EVENT PROFILE</span>
                      <span className="text-cyan-300 font-bold">+{corr.factor_breakdown.event_type} pts</span>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-500 italic pt-1 border-t border-soc-800 flex items-center justify-between">
                    <span>{corr.disclaimer}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRequestEvidence(corr.source_event_id)}
                        className="text-cyan-400 hover:underline"
                      >
                        Source Evidence ({corr.source_event_id})
                      </button>
                      <span>•</span>
                      <button
                        onClick={() => handleRequestEvidence(corr.target_event_id)}
                        className="text-cyan-400 hover:underline"
                      >
                        Target Evidence ({corr.target_event_id})
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500 bg-soc-850 border border-soc-700 rounded-xl">
              No cross-sector correlations currently detected across active border sectors.
            </div>
          )}
        </div>
      )}

      {/* --- SUB-VIEW 5: FEDERATED DECISION INTELLIGENCE --- */}
      {activeSubView === 'decision' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Compass className="w-4 h-4 text-cyan-400" />
              <span>Federated Decision Intelligence (Multi-Sector Priority Ranking)</span>
            </h3>
            <span className="text-[10px] text-slate-400">
              Answering: Which sector needs operational attention first?
            </span>
          </div>

          <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-500/40 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-cyan-400 uppercase font-bold">HIGHEST OPERATIONAL PRIORITY SECTOR</span>
              <p className="text-base font-bold text-white mt-0.5">{decisionData?.highest_priority_sector || 'Sector C'}</p>
            </div>
            <span className="text-[11px] text-slate-400 font-sans max-w-md text-right">
              {decisionData?.advisory_statement}
            </span>
          </div>

          <div className="space-y-3">
            {decisionData?.ranked_sectors?.map((sec, idx) => (
              <div
                key={sec.sector_id}
                className="p-4 rounded-xl bg-soc-850 border border-soc-700 hover:border-cyan-500/40 transition shadow-lg space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-soc-750">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded bg-soc-750 text-cyan-300 font-bold flex items-center justify-center text-xs">
                      #{idx + 1}
                    </span>
                    <div>
                      <span className="font-bold text-white text-sm">{sec.sector_name}</span>
                      <span className="text-slate-400 text-xs"> • {sec.region}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-soc-900 border border-soc-750 text-slate-300">
                      Urgency Score: {sec.urgency_score} pts
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                      sec.threat_level === 'CRITICAL'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse'
                        : sec.threat_level === 'HIGH'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    }`}>
                      {sec.threat_level} THREAT
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-center">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">EXPLAINABLE PRIORITIZATION FACTORS:</span>
                    <ul className="space-y-1 text-[11px] text-slate-300">
                      {sec.reasons?.map((r, rIdx) => (
                        <li key={rIdx} className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3 rounded-lg bg-soc-900 border border-cyan-500/30 space-y-1">
                    <span className="text-[10px] text-cyan-400 uppercase font-bold flex items-center gap-1">
                      <Compass className="w-3 h-3 text-cyan-400" />
                      RECOMMENDED OPERATIONAL NEXT-ACTION
                    </span>
                    <p className="text-xs font-semibold text-slate-200 leading-snug">
                      {sec.recommended_action}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}



      {/* Node Registration Modal */}
      {isRegisterOpen && (
        <NodeRegistrationModal
          isOpen={isRegisterOpen}
          onClose={() => setIsRegisterOpen(false)}
          onNodeRegistered={fetchFederationData}
        />
      )}

      {/* On-Demand Evidence Inspector Modal */}
      {evidenceModalEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-soc-850 border border-soc-700 w-full max-w-lg rounded-2xl p-5 space-y-4 shadow-2xl font-mono text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-soc-750">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Local Edge Evidence Verification</h3>
              </div>
              <button
                onClick={() => { setEvidenceModalEvent(null); setEvidenceResult(null); }}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {evidenceResult ? (
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-soc-900 border border-soc-750 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Incident ID:</span>
                    <span className="font-bold text-white">{evidenceResult.event_id}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Storage Location:</span>
                    <span className="text-cyan-300 font-bold">{evidenceResult.storage_location}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Origin Node:</span>
                    <span className="text-slate-200">{evidenceResult.source_edge_node} ({evidenceResult.sector_id})</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">SHA-256 Ledger Hash:</span>
                    <span className="text-[10px] text-amber-300 truncate max-w-xs">{evidenceResult.evidence_hash}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Integrity Check:</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {evidenceResult.integrity_status}
                    </span>
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 font-sans">
                  Raw surveillance media remains securely stored on the sector edge node. Only the cryptographic hash is centralized by default.
                </p>

                <button
                  onClick={() => { setEvidenceModalEvent(null); setEvidenceResult(null); }}
                  className="w-full py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold transition"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400">
                Retrieving local evidence from edge node storage...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
