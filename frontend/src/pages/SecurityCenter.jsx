import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, ShieldAlert, Lock, Key, Server, Cpu, RefreshCw, AlertTriangle,
  CheckCircle2, XCircle, Clock, User, Eye, EyeOff, Radio, Play, RotateCw,
  FileText, Activity, Layers, CornerDownRight, Sparkles, Flame, Download,
  ExternalLink, ChevronRight, Check, X, Filter, Search, Terminal, AlertOctagon
} from 'lucide-react';
import { api, getCurrentUser } from '../services/api';

export default function SecurityCenter() {
  const currentUser = getCurrentUser() || { username: 'admin', role: 'ADMIN', full_name: 'Security Admin' };

  // Data States
  const [overview, setOverview] = useState(null);
  const [events, setEvents] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [rbacMatrix, setRbacMatrix] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // UI Sub-tabs
  const [activeTab, setActiveTab] = useState('overview'); // overview, alerts, nodes, rbac, audit, simulation
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  // Simulation / Feedback
  const [simRunning, setSimRunning] = useState(false);
  const [simLog, setSimLog] = useState(null);
  const [actionNotice, setActionNotice] = useState(null);
  const [isReportGenerating, setIsReportGenerating] = useState(false);

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchAllData = async () => {
    try {
      const [ovData, evData, nodeData, matrixData, auditData] = await Promise.all([
        api.getSecurityOverview(),
        api.getSecurityEvents(),
        api.getNodeTrustMatrix(),
        api.getRbacMatrix(),
        api.getSecurityAuditLogs({ limit: 40 })
      ]);
      setOverview(ovData);
      setEvents(evData || []);
      setNodes(nodeData || []);
      setRbacMatrix(matrixData || null);
      setAuditLogs(auditData || []);
      
      if (!selectedEventId && evData && evData.length > 0) {
        setSelectedEventId(evData[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch security center data:', err);
    } finally {
      setLoading(false);
    }
  };

  const triggerNotice = (msg, type = 'success') => {
    setActionNotice({ message: msg, type });
    setTimeout(() => setActionNotice(null), 4000);
  };

  const handleAcknowledge = async (eventId) => {
    try {
      await api.acknowledgeSecurityEvent(eventId, { operator_name: currentUser.full_name || currentUser.username });
      triggerNotice(`✓ Security Event ${eventId} acknowledged by ${currentUser.username}`);
      fetchAllData();
    } catch (err) {
      triggerNotice(`❌ Error: ${err.message}`, 'error');
    }
  };

  const handleResolve = async (eventId, resolutionType = 'RESOLVED') => {
    try {
      await api.resolveSecurityEvent(eventId, { 
        operator_name: currentUser.full_name || currentUser.username,
        resolution_type: resolutionType,
        notes: `Marked as ${resolutionType} by ${currentUser.username}`
      });
      triggerNotice(`✓ Security Event ${eventId} resolved as ${resolutionType}`);
      fetchAllData();
    } catch (err) {
      triggerNotice(`❌ Error: ${err.message}`, 'error');
    }
  };

  const handleRotateCredential = async (nodeId) => {
    try {
      const res = await api.rotateNodeCredential(nodeId, { operator_name: currentUser.full_name || currentUser.username });
      triggerNotice(`🔑 Rotated TLS Token for ${nodeId}! New fingerprint: ${res.new_fingerprint}`);
      fetchAllData();
    } catch (err) {
      triggerNotice(`❌ Error: ${err.message}`, 'error');
    }
  };

  const handleQuarantineNode = async (nodeId) => {
    try {
      await api.quarantineNode(nodeId, { operator_name: currentUser.full_name || currentUser.username, reason: 'Operator requested security isolation' });
      triggerNotice(`⚠️ Quarantined node ${nodeId} — Uplink isolated!`, 'error');
      fetchAllData();
    } catch (err) {
      triggerNotice(`❌ Error: ${err.message}`, 'error');
    }
  };

  const handleRestoreNode = async (nodeId) => {
    try {
      await api.restoreNodeTrust(nodeId, { operator_name: currentUser.full_name || currentUser.username });
      triggerNotice(`🛡️ Restored trust status for node ${nodeId}!`);
      fetchAllData();
    } catch (err) {
      triggerNotice(`❌ Error: ${err.message}`, 'error');
    }
  };

  const handleTriggerSim = async (scenarioKey, scenarioTitle) => {
    setSimRunning(true);
    setSimLog(`[ATTACK SIMULATION] Launching: ${scenarioTitle}...`);
    try {
      const res = await api.triggerSecuritySimulation(scenarioKey, currentUser.full_name || currentUser.username);
      setSimLog(`✓ DETECTED & CONTAINED: ${res.defensive_outcome}`);
      triggerNotice(`🛡️ Simulated Attack Contained: ${scenarioTitle}`);
      await fetchAllData();
    } catch (err) {
      setSimLog(`❌ Simulation Error: ${err.message}`);
    } finally {
      setSimRunning(false);
    }
  };

  const handleResetSim = async () => {
    try {
      await api.resetSecuritySimulation(currentUser.full_name || currentUser.username);
      setSimLog(`✓ Security testing harness reset to nominal baseline.`);
      triggerNotice(`✓ Reset security testing harness to healthy baseline.`);
      fetchAllData();
    } catch (err) {
      triggerNotice(`❌ Error: ${err.message}`, 'error');
    }
  };

  const handleExportReport = async () => {
    setIsReportGenerating(true);
    try {
      const report = await api.generateSecurityReport(currentUser.full_name || currentUser.username);
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `${report.report_id}_zero_trust_assessment.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      triggerNotice(`📄 Security Assessment Report exported: ${report.report_id}`);
    } catch (err) {
      triggerNotice(`❌ Export error: ${err.message}`, 'error');
    } finally {
      setIsReportGenerating(false);
    }
  };

  // Filtered Events
  const filteredEvents = events.filter(e => {
    const matchesSev = severityFilter === 'ALL' || e.severity === severityFilter;
    const matchesStat = statusFilter === 'ALL' || e.status === statusFilter;
    return matchesSev && matchesStat;
  });

  const selectedEvent = events.find(e => e.id === selectedEventId) || events[0];
  const postureScore = overview?.posture_score || 92;
  const postureStatus = overview?.status || 'HEALTHY';

  return (
    <div className="flex-1 bg-soc-900 text-slate-100 flex flex-col overflow-hidden font-sans select-none">
      {/* Top Banner & Posture Score Bar */}
      <div className="h-16 bg-soc-850 border-b border-soc-700/80 px-6 flex items-center justify-between shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.25)]">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-wide font-mono">
                SECURITY OPERATIONS CENTER // ZERO-TRUST SENTINEL
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                CONTINUOUS MONITORING
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans">
              Identity Verification • API Gateway Protection • Federated Node Trust • Tamper Detection
            </p>
          </div>
        </div>

        {/* Posture Score Meter & Quick Actions */}
        <div className="flex items-center gap-4">
          {/* Prototype Security Posture Meter */}
          <div className="flex items-center gap-3 bg-soc-900 px-4 py-1.5 rounded-xl border border-soc-700 shadow-inner font-mono">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block tracking-wider">PROTOTYPE POSTURE</span>
              <span className={`text-sm font-bold ${
                postureScore >= 80 ? 'text-emerald-400' : postureScore >= 60 ? 'text-amber-400' : 'text-red-400'
              }`}>
                {postureScore} / 100 • {postureStatus}
              </span>
            </div>
            <div className="relative w-9 h-9 flex items-center justify-center">
              <svg className="w-9 h-9 transform -rotate-90">
                <circle cx="18" cy="18" r="14" stroke="#1e293b" strokeWidth="3" fill="none" />
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  stroke={postureScore >= 80 ? '#10b981' : postureScore >= 60 ? '#f59e0b' : '#ef4444'}
                  strokeWidth="3"
                  strokeDasharray={`${(postureScore / 100) * 88} 88`}
                  fill="none"
                  strokeLinecap="round"
                />
              </svg>
              <Lock className="w-3.5 h-3.5 text-cyan-400 absolute" />
            </div>
          </div>

          <button
            onClick={handleExportReport}
            disabled={isReportGenerating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-soc-750 hover:bg-soc-700 text-slate-200 border border-soc-600 text-xs font-mono font-semibold transition"
            title="Export full zero-trust assessment JSON report"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isReportGenerating ? 'Exporting...' : 'Assessment Report'}</span>
          </button>

          <button
            onClick={() => setActiveTab('simulation')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/80 hover:bg-red-600 text-white text-xs font-mono font-bold transition shadow-[0_0_10px_rgba(239,68,68,0.4)]"
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Red-Team Simulation</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="h-11 bg-soc-900 border-b border-soc-700/80 px-6 flex items-center justify-between shrink-0 font-mono text-xs">
        <div className="flex items-center gap-1">
          {[
            { id: 'overview', label: 'Zero-Trust Overview', icon: Activity },
            { id: 'alerts', label: `Security Alerts (${events.filter(e => e.status === 'OPEN').length})`, icon: ShieldAlert },
            { id: 'nodes', label: `Edge Node Trust (${nodes.filter(n => n.trust_state === 'TRUSTED').length}/${nodes.length})`, icon: Server },
            { id: 'rbac', label: 'RBAC Matrix', icon: Lock },
            { id: 'audit', label: 'Security Audit', icon: FileText },
            { id: 'simulation', label: 'Attack Simulator', icon: Flame },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-medium transition ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-soc-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {actionNotice && (
          <div className={`px-3 py-0.5 rounded text-[11px] font-mono animate-fade-in ${
            actionNotice.type === 'error' ? 'bg-red-500/20 text-red-300 border border-red-500/40' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
          }`}>
            {actionNotice.message}
          </div>
        )}
      </div>

      {/* Main Workspace Stage */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* ------------------------------------------------------------------ */}
        {/* TAB 1: ZERO-TRUST OVERVIEW */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === 'overview' && (
          <div className="space-y-6 max-w-7xl mx-auto">
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-soc-850 border border-soc-700/80 shadow-lg">
                <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
                  <span>ACTIVE CYBER ALERTS</span>
                  <ShieldAlert className="w-4 h-4 text-red-400" />
                </div>
                <div className="text-2xl font-bold text-white font-mono mt-2 flex items-baseline gap-2">
                  <span>{overview?.metrics?.open_security_events || 0}</span>
                  <span className="text-xs text-red-400 font-sans">({overview?.metrics?.critical_security_alerts || 0} Critical)</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Real-time threat monitoring</p>
              </div>

              <div className="p-4 rounded-xl bg-soc-850 border border-soc-700/80 shadow-lg">
                <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
                  <span>EDGE NODE TRUST</span>
                  <Server className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="text-2xl font-bold text-emerald-400 font-mono mt-2 flex items-baseline gap-2">
                  <span>{overview?.metrics?.trusted_nodes || 6} / {overview?.metrics?.total_nodes || 6}</span>
                  <span className="text-xs text-emerald-400 font-sans">Trusted</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">100% mutual TLS verified</p>
              </div>

              <div className="p-4 rounded-xl bg-soc-850 border border-soc-700/80 shadow-lg">
                <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
                  <span>RATE-LIMIT SHIELD</span>
                  <Lock className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-bold text-white font-mono mt-2 flex items-baseline gap-2">
                  <span>ARMED</span>
                  <span className="text-xs text-amber-400 font-sans">(5-Fail Lockout)</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Brute-force containment active</p>
              </div>

              <div className="p-4 rounded-xl bg-soc-850 border border-soc-700/80 shadow-lg">
                <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
                  <span>EVIDENCE INTEGRITY</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-bold text-white font-mono mt-2 flex items-baseline gap-2">
                  <span>100.0%</span>
                  <span className="text-xs text-emerald-400 font-sans">SHA-256 Valid</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Cryptographic hash linked</p>
              </div>
            </div>

            {/* 6 Zero-Trust Dimension Assessment Breakdown */}
            <div className="p-6 rounded-2xl bg-soc-850 border border-soc-700/80 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-soc-700 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                    Continuous Zero-Trust Dimension Scorecard
                  </h3>
                  <p className="text-xs text-slate-400 font-sans mt-0.5">
                    Automated real-time posture evaluations across identity, perimeter, nodes, and cryptographic integrity.
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-cyan-300 bg-cyan-500/10 px-3 py-1 rounded-lg border border-cyan-500/30">
                  Total Score: {postureScore} / 100
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono">
                {overview?.dimensions && Object.entries(overview.dimensions).map(([key, val]) => (
                  <div key={key} className="p-4 rounded-xl bg-soc-900 border border-soc-750 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white uppercase">{key.replace(/_/g, ' ')}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        val.status === 'HEALTHY' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-red-500/20 text-red-300 border border-red-500/40'
                      }`}>
                        {val.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Score Weight</span>
                      <span className="font-bold text-white">{val.score} / {val.max} pts</span>
                    </div>

                    <div className="w-full h-2 bg-soc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          val.score / val.max >= 0.8 ? 'bg-emerald-400' : 'bg-amber-400'
                        }`}
                        style={{ width: `${(val.score / val.max) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 2: SECURITY ALERTS & TRIAGE QUEUE */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === 'alerts' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto">
            {/* Left Column: Security Events List (5 cols) */}
            <div className="lg:col-span-5 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white uppercase tracking-wider">Security Alerts Queue</span>
                <span className="text-slate-400">{filteredEvents.length} Events</span>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="bg-soc-850 border border-soc-700 text-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-mono"
                >
                  <option value="ALL">All Severities</option>
                  <option value="CRITICAL">CRITICAL</option>
                  <option value="HIGH">HIGH</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="LOW">LOW</option>
                  <option value="INFO">INFO</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-soc-850 border border-soc-700 text-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-mono"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="OPEN">OPEN</option>
                  <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
                  <option value="RESOLVED">RESOLVED</option>
                </select>
              </div>

              {/* Event Cards */}
              <div className="space-y-2 max-h-[calc(100vh-18rem)] overflow-y-auto pr-1">
                {filteredEvents.length === 0 ? (
                  <div className="p-8 rounded-xl bg-soc-850 border border-soc-700 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                    No active security alerts matching filter.
                  </div>
                ) : (
                  filteredEvents.map(e => {
                    const isSelected = selectedEventId === e.id;
                    const isCritical = e.severity === 'CRITICAL' || e.severity === 'HIGH';
                    return (
                      <div
                        key={e.id}
                        onClick={() => setSelectedEventId(e.id)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition shadow-md ${
                          isSelected
                            ? 'bg-soc-750 border-cyan-500 ring-1 ring-cyan-500/50'
                            : 'bg-soc-850 border-soc-700 hover:bg-soc-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white">{e.id}</span>
                          <span className={`px-2 py-0.2 rounded text-[10px] font-bold ${
                            e.severity === 'CRITICAL'
                              ? 'bg-red-500/25 text-red-300 border border-red-500/50 animate-pulse'
                              : e.severity === 'HIGH'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-cyan-500/20 text-cyan-300'
                          }`}>
                            {e.severity}
                          </span>
                        </div>
                        <p className="text-slate-200 text-xs font-sans font-semibold mt-1 truncate">{e.event_type.replace(/_/g, ' ')}</p>
                        <p className="text-[11px] text-slate-400 font-sans mt-0.5 truncate">{e.details}</p>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2">
                          <span>SRC: {e.source}</span>
                          <span className={e.status === 'OPEN' ? 'text-red-400 font-bold' : 'text-emerald-400'}>{e.status}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column: Selected Alert Dossier (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              {selectedEvent ? (
                <div className="p-6 rounded-2xl bg-soc-850 border border-soc-700/80 shadow-xl space-y-5 font-mono text-xs">
                  <div className="flex items-start justify-between border-b border-soc-700 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white">{selectedEvent.id}</h3>
                        <span className="px-2.5 py-0.5 rounded font-bold bg-soc-750 text-cyan-300 border border-soc-600">
                          {selectedEvent.event_type}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-sans mt-1">Source: {selectedEvent.source} • Detected at {new Date(selectedEvent.created_at).toLocaleString()}</p>
                    </div>

                    <span className={`px-3 py-1 rounded text-xs font-bold ${
                      selectedEvent.status === 'OPEN' ? 'bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    }`}>
                      STATUS: {selectedEvent.status}
                    </span>
                  </div>

                  {/* Threat Description & Forensics */}
                  <div className="space-y-2">
                    <span className="text-slate-400 font-semibold uppercase tracking-wider block text-[11px]">Forensic Incident Summary</span>
                    <div className="p-3.5 rounded-xl bg-soc-900 border border-soc-750 text-slate-200 font-sans text-xs leading-relaxed">
                      {selectedEvent.details}
                    </div>
                  </div>

                  {/* Actor & Resource Parameters */}
                  <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-soc-900 border border-soc-750 text-slate-300 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[10px]">ACTOR / USERNAME:</span>
                      <span className="font-bold text-white">{selectedEvent.actor_username || 'UNKNOWN'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">ORIGINATING IP:</span>
                      <span className="font-mono text-amber-300">{selectedEvent.actor_ip || '127.0.0.1'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">TARGET RESOURCE:</span>
                      <span className="font-mono text-cyan-300 truncate block">{selectedEvent.target_resource || 'System'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">AUTOMATED MITIGATION:</span>
                      <span className="text-emerald-400 font-bold">{selectedEvent.mitigation_action || 'LOGGED'}</span>
                    </div>
                  </div>

                  {/* Action Workflow Controls */}
                  <div className="pt-2 border-t border-soc-700 flex items-center gap-3">
                    {selectedEvent.status === 'OPEN' && (
                      <button
                        onClick={() => handleAcknowledge(selectedEvent.id)}
                        className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold font-mono transition shadow-md"
                      >
                        Acknowledge Alert
                      </button>
                    )}

                    {selectedEvent.status !== 'RESOLVED' && (
                      <>
                        <button
                          onClick={() => handleResolve(selectedEvent.id, 'RESOLVED')}
                          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold font-mono transition shadow-md"
                        >
                          Mark Resolved
                        </button>
                        <button
                          onClick={() => handleResolve(selectedEvent.id, 'FALSE_POSITIVE')}
                          className="px-4 py-2 rounded-lg bg-soc-750 hover:bg-soc-700 text-slate-300 border border-soc-600 font-mono transition"
                        >
                          False Positive
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-12 rounded-xl bg-soc-850 border border-soc-700 text-center text-slate-400">
                  Select a security alert to inspect forensic details.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 3: EDGE DEVICE & NODE TRUST SENTINEL */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === 'nodes' && (
          <div className="space-y-4 max-w-7xl mx-auto font-mono text-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Federated Edge Node Identity Ledger</h3>
                <p className="text-xs text-slate-400 font-sans mt-0.5">Continuous cryptographic token validation and mutual trust verification.</p>
              </div>
              <span className="text-slate-400">{nodes.length} Registered Nodes</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {nodes.map(node => {
                const isTrusted = node.trust_state === 'TRUSTED';
                return (
                  <div key={node.node_id} className="p-4 rounded-xl bg-soc-850 border border-soc-700/80 shadow-lg space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Server className="w-4 h-4 text-cyan-400" />
                          <span className="font-bold text-white text-sm">{node.node_id}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-soc-750 text-slate-300">
                            {node.sector_id}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 font-sans mt-1">{node.node_name}</p>
                      </div>

                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isTrusted ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse'
                      }`}>
                        {node.trust_state}
                      </span>
                    </div>

                    {/* Trust Score & Credential Age */}
                    <div className="space-y-1.5 text-[11px] text-slate-400">
                      <div className="flex items-center justify-between">
                        <span>Trust Rating:</span>
                        <span className="font-bold text-white">{node.trust_score} / 100</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Token Age:</span>
                        <span className="text-amber-300 font-bold">{node.credential_age_days} days</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Fingerprint:</span>
                        <span className="text-slate-300 font-mono">{node.token_fingerprint}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-2 border-t border-soc-700/80 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleRotateCredential(node.node_id)}
                        className="py-1.5 px-2 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-[11px] font-bold transition flex items-center justify-center gap-1"
                      >
                        <RotateCw className="w-3 h-3" />
                        <span>Rotate Token</span>
                      </button>

                      {isTrusted ? (
                        <button
                          onClick={() => handleQuarantineNode(node.node_id)}
                          className="py-1.5 px-2 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 text-[11px] font-bold transition flex items-center justify-center gap-1"
                        >
                          <AlertTriangle className="w-3 h-3" />
                          <span>Quarantine</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRestoreNode(node.node_id)}
                          className="py-1.5 px-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold transition flex items-center justify-center gap-1"
                        >
                          <ShieldCheck className="w-3 h-3" />
                          <span>Restore Trust</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 4: RBAC PERMISSION MATRIX */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === 'rbac' && (
          <div className="space-y-4 max-w-7xl mx-auto font-mono text-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Role-Based Access Control (RBAC) Policy</h3>
                <p className="text-xs text-slate-400 font-sans mt-0.5">Principle of least privilege enforced across API gateways and UI modules.</p>
              </div>
            </div>

            <div className="rounded-xl bg-soc-850 border border-soc-700/80 overflow-hidden shadow-xl">
              <table className="w-full text-left">
                <thead className="bg-soc-950 text-slate-400 uppercase text-[10px] border-b border-soc-700">
                  <tr>
                    <th className="py-3 px-4">Platform Resource</th>
                    <th className="py-3 px-4 text-center">ADMIN</th>
                    <th className="py-3 px-4 text-center">OPERATOR</th>
                    <th className="py-3 px-4 text-center">VIEWER</th>
                    <th className="py-3 px-4">Enforcement Scope</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-soc-750 text-xs">
                  {rbacMatrix?.matrix?.map((row, idx) => (
                    <tr key={idx} className="hover:bg-soc-800/50 transition">
                      <td className="py-3 px-4 font-semibold text-white font-sans">{row.resource}</td>
                      <td className="py-3 px-4 text-center">
                        {row.admin ? <span className="text-emerald-400 font-bold">✓ ALLOW</span> : <span className="text-red-400">✗ DENY</span>}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {row.operator ? <span className="text-emerald-400 font-bold">✓ ALLOW</span> : <span className="text-red-400">✗ DENY</span>}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {row.viewer ? <span className="text-emerald-400 font-bold">✓ ALLOW</span> : <span className="text-red-400">✗ DENY</span>}
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-sans text-[11px]">{row.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 5: SECURITY AUDIT STREAM */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === 'audit' && (
          <div className="space-y-4 max-w-7xl mx-auto font-mono text-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Security & Identity Audit Ledger</h3>
                <p className="text-xs text-slate-400 font-sans mt-0.5">Immutable historical record of logins, token rotations, and security breaches.</p>
              </div>
              <span className="text-slate-400">{auditLogs.length} Audit Records</span>
            </div>

            <div className="rounded-xl bg-soc-850 border border-soc-700/80 overflow-hidden shadow-xl">
              <div className="divide-y divide-soc-750 max-h-[calc(100vh-18rem)] overflow-y-auto">
                {auditLogs.map(log => (
                  <div key={log.id} className="p-3.5 hover:bg-soc-800/40 transition flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-cyan-400">{log.action}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-soc-750 text-slate-300">
                          {log.username || 'SYSTEM'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 font-sans">{log.details}</p>
                    </div>
                    <span className="text-[11px] text-slate-500 whitespace-nowrap shrink-0">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 6: RED-TEAM ATTACK SIMULATOR */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === 'simulation' && (
          <div className="space-y-6 max-w-7xl mx-auto font-mono text-xs">
            <div className="flex items-center justify-between p-4 rounded-xl bg-red-950/30 border border-red-500/40 shadow-xl">
              <div>
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-red-500 animate-pulse" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Red-Team Cyber Attack & Containment Simulator</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-red-500/20 text-red-300 border border-red-500/40">
                    SIMULATION MODE
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-sans mt-1">
                  Inject simulated attacks to test continuous detection, rate limiting, and zero-trust containment.
                </p>
              </div>

              <button
                onClick={handleResetSim}
                className="px-3.5 py-2 rounded-lg bg-soc-750 hover:bg-soc-700 text-slate-200 border border-soc-600 font-bold transition"
              >
                Reset Testing Harness
              </button>
            </div>

            {/* Attack Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  key: 'SIM_BRUTE_FORCE',
                  title: 'Repeated Brute-Force Logins',
                  desc: 'Injects 5 rapid failed authentication attempts from an external IP address.',
                  outcome: 'Rate limiter locks out IP for 5 minutes and dispatches HIGH security alert.'
                },
                {
                  key: 'SIM_INVALID_TOKEN',
                  title: 'Forged JWT API Request',
                  desc: 'Submits an invalid signature token to sensitive evidence export endpoint.',
                  outcome: 'API Gateway rejects request with HTTP 401 and logs unauthorized access alert.'
                },
                {
                  key: 'SIM_UNAUTHORIZED_EVIDENCE',
                  title: 'Privilege Escalation Attempt',
                  desc: 'Viewer account attempts administrative zone boundary deletion.',
                  outcome: 'RBAC filter enforces 403 Forbidden and logs security violation.'
                },
                {
                  key: 'SIM_UNTRUSTED_NODE',
                  title: 'Compromised Edge Node Token',
                  desc: 'Injects expired cryptographic credentials during NODE-03 heartbeat sync.',
                  outcome: 'Node Trust Sentinel isolates NODE-03 into RESTRICTED state.'
                },
                {
                  key: 'SIM_EVIDENCE_TAMPER',
                  title: 'Evidence SHA-256 Tamper Mismatch',
                  desc: 'Simulates 1-byte file alteration on disk for incident EVT-0017.',
                  outcome: 'Integrity checker detects hash mismatch and flags evidence for review.'
                },
                {
                  key: 'SIM_CONFIG_TAMPER',
                  title: 'Risk Policy Threshold Tamper',
                  desc: 'Attempts unauthorized modification of virtual fence sensitivity.',
                  outcome: 'Config Sentinel reverts parameters and logs alert.'
                }
              ].map(card => (
                <div key={card.key} className="p-4 rounded-xl bg-soc-850 border border-soc-700 space-y-3 flex flex-col justify-between">
                  <div>
                    <span className="font-bold text-white text-sm block font-sans">{card.title}</span>
                    <p className="text-xs text-slate-300 font-sans mt-1">{card.desc}</p>
                    <div className="mt-2 p-2 rounded bg-soc-900 border border-soc-750 text-[10px] text-emerald-400 font-sans">
                      <strong>Defensive Outcome:</strong> {card.outcome}
                    </div>
                  </div>

                  <button
                    onClick={() => handleTriggerSim(card.key, card.title)}
                    disabled={simRunning}
                    className="w-full py-2 rounded-lg bg-red-600/85 hover:bg-red-600 text-white font-bold transition flex items-center justify-center gap-1.5 shadow-md"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Inject Attack Simulation</span>
                  </button>
                </div>
              ))}
            </div>

            {/* Simulation Log Output Console */}
            {simLog && (
              <div className="p-4 rounded-xl bg-black/80 border border-soc-700 space-y-1 font-mono text-xs">
                <div className="flex items-center gap-2 text-cyan-400 font-bold border-b border-soc-700/80 pb-1">
                  <Terminal className="w-4 h-4" />
                  <span>Defense Simulation Terminal Output</span>
                </div>
                <p className="text-emerald-300 pt-1">{simLog}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
