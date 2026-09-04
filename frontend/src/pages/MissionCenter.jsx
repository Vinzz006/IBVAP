import React, { useState, useEffect } from 'react';
import {
  Crosshair, ShieldAlert, CheckCircle2, AlertTriangle, Clock, User, ArrowRight,
  ShieldCheck, Route, Eye, Radio, Play, RefreshCw, Send, Check, X,
  ChevronRight, Layers, FileText, Activity, AlertOctagon, CornerDownRight,
  Sparkles, Flame, Shield, MapPin, Video, Cpu, Server, Lock, ExternalLink,
  ChevronDown, Filter, Plus, Zap, Award, HelpCircle, LogOut
} from 'lucide-react';
import RiskBadge from '../components/RiskBadge';
import { api, getCurrentUser, clearAuth } from '../services/api';

export default function MissionCenter({ onSelectEvent, onInspectJourney, onLogout }) {
  const currentUser = getCurrentUser() || { username: 'operator', full_name: 'Duty Officer P. Singh', role: 'OPERATOR' };
  
  // Mission Data States
  const [missions, setMissions] = useState([]);
  const [selectedMissionId, setSelectedMissionId] = useState('MISSION-0017');
  const [missionDetail, setMissionDetail] = useState(null);
  const [overviewStats, setOverviewStats] = useState(null);
  const [analyticsStats, setAnalyticsStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  // Filter & Active Tab States
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [activeDossierTab, setActiveDossierTab] = useState('overview');

  // Modals
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [isEscalateModalOpen, setIsEscalateModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [postIncidentSummary, setPostIncidentSummary] = useState(null);

  // Form States
  const [resolveType, setResolveType] = useState('RESOLVED');
  const [resolveNotes, setResolveNotes] = useState('Incident investigated, intercepted by QRF Team Bravo and sector perimeter secured.');
  const [escalateLevel, setEscalateLevel] = useState('SUPERVISOR');
  const [escalateReason, setEscalateReason] = useState('Multi-camera critical breach with restricted zone crossing requires senior operational oversight.');
  const [newMissionForm, setNewMissionForm] = useState({
    title: 'Sector B — Restricted Zone Intrusion Response',
    sector_id: 'SEC-B',
    priority: 'CRITICAL',
    priority_score: 85,
    primary_target_id: 17,
    object_type: 'person',
    assigned_operator: currentUser.full_name
  });

  // Action status message
  const [actionNotice, setActionNotice] = useState(null);
  const [isDemoRunning, setIsDemoRunning] = useState(false);

  useEffect(() => {
    fetchMissionsList();
    fetchOverviewStats();
    const interval = setInterval(() => {
      fetchMissionsList(false);
      fetchOverviewStats();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedMissionId) {
      fetchMissionDetail(selectedMissionId);
    }
  }, [selectedMissionId]);

  const fetchMissionsList = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const data = await api.getMissions({ limit: 50 });
      setMissions(data.missions || []);
      if (!selectedMissionId && data.missions?.length > 0) {
        setSelectedMissionId(data.missions[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch missions:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const fetchOverviewStats = async () => {
    try {
      const [ov, an] = await Promise.all([
        api.getMissionOverview(),
        api.getMissionAnalytics()
      ]);
      setOverviewStats(ov);
      setAnalyticsStats(an);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const fetchMissionDetail = async (id) => {
    setDetailLoading(true);
    try {
      const detail = await api.getMission(id);
      setMissionDetail(detail);
      if (detail?.post_incident_summary) {
        setPostIncidentSummary(detail.post_incident_summary);
      }
    } catch (err) {
      console.error(`Failed to fetch detail for ${id}:`, err);
    } finally {
      setDetailLoading(false);
    }
  };

  const triggerNotice = (msg, type = 'success') => {
    setActionNotice({ text: msg, type });
    setTimeout(() => setActionNotice(null), 5000);
  };

  // Actions
  const handleApproveResponse = async () => {
    if (!missionDetail) return;
    try {
      const updated = await api.approveMissionResponse(missionDetail.id, {
        operator_username: currentUser.full_name,
        notes: 'Operator verified evidence and approved prototype tactical response workflow.',
        action_type: missionDetail.response_type || 'QRF_DEPLOYMENT'
      });
      setMissionDetail(updated);
      fetchMissionsList(false);
      triggerNotice(`✅ Mission ${missionDetail.id} Response APPROVED! Status: RESPONSE ACTIVE.`);
    } catch (err) {
      triggerNotice(`❌ Error approving response: ${err.message}`, 'error');
    }
  };

  const handleRejectResponse = async () => {
    if (!missionDetail) return;
    try {
      const updated = await api.rejectMissionResponse(missionDetail.id, {
        operator_username: currentUser.full_name,
        notes: 'Advisory response rejected by operator following video reinspection.'
      });
      setMissionDetail(updated);
      fetchMissionsList(false);
      triggerNotice(`⚠️ Mission ${missionDetail.id} response rejected. Reverted to INVESTIGATING.`);
    } catch (err) {
      triggerNotice(`❌ Error rejecting response: ${err.message}`, 'error');
    }
  };

  const handleEscalateMission = async () => {
    if (!missionDetail) return;
    try {
      const updated = await api.escalateMission(missionDetail.id, {
        operator_username: currentUser.full_name,
        target_level: escalateLevel,
        reason: escalateReason
      });
      setMissionDetail(updated);
      setIsEscalateModalOpen(false);
      fetchMissionsList(false);
      triggerNotice(`🚀 Mission ${missionDetail.id} ESCALATED to ${escalateLevel}!`);
    } catch (err) {
      triggerNotice(`❌ Escalation error: ${err.message}`, 'error');
    }
  };

  const handleResolveMission = async () => {
    if (!missionDetail) return;
    try {
      const updated = await api.resolveMission(missionDetail.id, {
        resolution_type: resolveType,
        notes: resolveNotes,
        operator_username: currentUser.full_name
      });
      setMissionDetail(updated);
      setIsResolveModalOpen(false);
      if (updated.post_incident_summary) {
        setPostIncidentSummary(updated.post_incident_summary);
      }
      fetchMissionsList(false);
      fetchOverviewStats();
      triggerNotice(`🏁 Mission ${missionDetail.id} marked as RESOLVED (${resolveType}).`);
    } catch (err) {
      triggerNotice(`❌ Resolution error: ${err.message}`, 'error');
    }
  };

  const handleCreateMission = async (e) => {
    e.preventDefault();
    try {
      const created = await api.createMission(newMissionForm);
      setIsCreateModalOpen(false);
      await fetchMissionsList();
      setSelectedMissionId(created.id);
      triggerNotice(`✨ Mission ${created.id} created successfully!`);
    } catch (err) {
      triggerNotice(`❌ Failed to create mission: ${err.message}`, 'error');
    }
  };

  const handleRunDemo = async () => {
    setIsDemoRunning(true);
    triggerNotice('⚡ Running Phase 14 15-Step End-to-End Mission Scenario...');
    try {
      const result = await api.runMissionDemoScenario(currentUser.full_name);
      await fetchMissionsList();
      setSelectedMissionId('MISSION-0017');
      await fetchMissionDetail('MISSION-0017');
      fetchOverviewStats();
      triggerNotice('🎉 Phase 14 15-Step Demo Scenario Successfully Executed & Active!');
    } catch (err) {
      triggerNotice(`❌ Demo execution error: ${err.message}`, 'error');
    } finally {
      setIsDemoRunning(false);
    }
  };

  const handleVerifyEvidence = async (eventId) => {
    try {
      const res = await api.verifyEvidence(eventId || missionDetail?.primary_event_id);
      triggerNotice(`🛡️ SHA-256 Evidence Verified: ${res.verification_status} (Hash: ${res.evidence_hash?.substring(0, 16)}...)`);
      fetchMissionDetail(selectedMissionId);
    } catch (err) {
      triggerNotice(`❌ Verification error: ${err.message}`, 'error');
    }
  };

  const handleSignOut = () => {
    if (onLogout) {
      onLogout();
    } else {
      clearAuth();
      window.location.reload();
    }
  };

  // Filtered Missions
  const filteredMissions = missions.filter(m => {
    const matchesSearch = !searchQuery || 
      m.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.sector_id.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesPriority = priorityFilter === 'ALL' || m.priority === priorityFilter;
    
    let matchesStatus = true;
    if (statusFilter === 'AWAITING_APPROVAL') {
      matchesStatus = m.status === 'AWAITING_APPROVAL' || m.response_status === 'AWAITING_APPROVAL';
    } else if (statusFilter === 'ACTIVE') {
      matchesStatus = m.status === 'APPROVED' || m.status === 'RESPONSE_ACTIVE' || m.status === 'INVESTIGATING';
    } else if (statusFilter === 'RESOLVED') {
      matchesStatus = m.status === 'RESOLVED';
    }

    return matchesSearch && matchesPriority && matchesStatus;
  });

  const context = missionDetail?.context || {};
  const timeline = missionDetail?.timeline || [];
  const recommendations = missionDetail?.recommendations || [];
  const health = missionDetail?.health || {};
  const sla = missionDetail?.sla || {};

  return (
    <div className="flex-1 bg-soc-900 p-5 overflow-y-auto font-mono text-xs select-none space-y-5">
      {/* Toast Notification */}
      {actionNotice && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-2xl border flex items-center gap-3 animate-fade-in ${
          actionNotice.type === 'error'
            ? 'bg-red-950/90 border-red-500 text-red-200'
            : 'bg-soc-800/95 border-cyan-500/80 text-cyan-200 shadow-[0_0_20px_rgba(0,240,255,0.3)]'
        }`}>
          <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span className="font-sans font-medium text-xs">{actionNotice.text}</span>
        </div>
      )}

      {/* 1. Header Bar with Commander's Overview & Top Actions */}
      <div className="pb-4 border-b border-soc-700/80 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shadow-[0_0_10px_rgba(0,240,255,0.25)]">
              <Crosshair className="w-4 h-4" />
            </div>
            <h1 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
              Autonomous Operations & Mission Orchestration
            </h1>
          </div>
          <p className="text-slate-400 font-sans text-xs mt-1">
            Single coordinated mission lifecycle • Contextual multi-sensor correlation • Human approval gate • Auditable response dispatch
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-semibold transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Mission</span>
          </button>

          <button
            onClick={() => { fetchMissionsList(); fetchOverviewStats(); }}
            className="p-1.5 rounded-lg bg-soc-800 hover:bg-soc-750 text-slate-300 border border-soc-700 transition"
            title="Refresh Missions"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Commander's High-Level Mission Overview Bar */}
      {overviewStats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div 
            onClick={() => { setStatusFilter('ALL'); setPriorityFilter('ALL'); }}
            className="p-3 rounded-xl bg-soc-850 border border-soc-700/80 hover:border-cyan-500/40 cursor-pointer transition shadow-md"
          >
            <span className="text-[10px] text-slate-400 uppercase">ACTIVE MISSIONS</span>
            <p className="text-xl font-bold text-white">{overviewStats.active_missions}</p>
            <span className="text-[9px] text-cyan-400 font-sans">Coordinated queue</span>
          </div>

          <div 
            onClick={() => setPriorityFilter('CRITICAL')}
            className="p-3 rounded-xl bg-soc-850 border border-red-500/40 hover:border-red-400 cursor-pointer transition shadow-md"
          >
            <span className="text-[10px] text-red-400 uppercase font-bold">CRITICAL</span>
            <p className="text-xl font-bold text-red-400">{overviewStats.critical}</p>
            <span className="text-[9px] text-red-300 font-sans">Immediate action</span>
          </div>

          <div 
            onClick={() => setPriorityFilter('HIGH')}
            className="p-3 rounded-xl bg-soc-850 border border-amber-500/40 hover:border-amber-400 cursor-pointer transition shadow-md"
          >
            <span className="text-[10px] text-amber-400 uppercase font-bold">HIGH PRIORITY</span>
            <p className="text-xl font-bold text-amber-300">{overviewStats.high}</p>
            <span className="text-[9px] text-amber-200 font-sans">Investigating</span>
          </div>

          <div 
            onClick={() => setStatusFilter('AWAITING_APPROVAL')}
            className="p-3 rounded-xl bg-soc-850 border border-purple-500/40 hover:border-purple-400 cursor-pointer transition shadow-md animate-pulse"
          >
            <span className="text-[10px] text-purple-400 uppercase font-bold">AWAITING APPROVAL</span>
            <p className="text-xl font-bold text-purple-300">{overviewStats.awaiting_approval}</p>
            <span className="text-[9px] text-purple-200 font-sans">Human gate pending</span>
          </div>

          <div 
            onClick={() => setStatusFilter('ACTIVE')}
            className="p-3 rounded-xl bg-soc-850 border border-emerald-500/40 hover:border-emerald-400 cursor-pointer transition shadow-md"
          >
            <span className="text-[10px] text-emerald-400 uppercase font-bold">ACTIVE RESPONSE</span>
            <p className="text-xl font-bold text-emerald-400">{overviewStats.active_response}</p>
            <span className="text-[9px] text-emerald-300 font-sans">QRF / UAV deployed</span>
          </div>

          <div 
            onClick={() => setStatusFilter('RESOLVED')}
            className="p-3 rounded-xl bg-soc-850 border border-soc-700/80 hover:border-cyan-500/40 cursor-pointer transition shadow-md"
          >
            <span className="text-[10px] text-slate-400 uppercase">AVG RESOLUTION</span>
            <p className="text-xl font-bold text-cyan-300">{analyticsStats?.average_resolution_time_formatted || '04m 32s'}</p>
            <span className="text-[9px] text-slate-400 font-sans">SLA compliant (&lt;10m)</span>
          </div>
        </div>
      )}

      {/* 3. Main Workspace: Split View with Queue (Left) and Mission Dossier (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Left Column: Mission Queue Selector (3.5 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="p-3.5 rounded-xl bg-soc-850 border border-soc-700/80 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>MISSION QUEUE ({filteredMissions.length})</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">SORTED BY PRIORITY</span>
            </div>

            {/* Search and Filters */}
            <div className="space-y-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by Mission ID, Sector, Title..."
                className="w-full px-2.5 py-1.5 rounded-lg bg-soc-900 border border-soc-700 text-slate-200 text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
              />

              <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[10px]">
                {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'].map(p => (
                  <button
                    key={p}
                    onClick={() => setPriorityFilter(p)}
                    className={`px-2 py-0.5 rounded transition ${
                      priorityFilter === p
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                        : 'bg-soc-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Mission Cards List */}
            <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
              {filteredMissions.length === 0 ? (
                <div className="p-6 text-center text-slate-500 font-sans">
                  No missions matching filter criteria.
                </div>
              ) : (
                filteredMissions.map((m) => {
                  const isSelected = selectedMissionId === m.id;
                  const isCritical = m.priority === 'CRITICAL';
                  const isAwaiting = m.status === 'AWAITING_APPROVAL' || m.response_status === 'AWAITING_APPROVAL';

                  return (
                    <div
                      key={m.id}
                      onClick={() => setSelectedMissionId(m.id)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-soc-800 border-cyan-500 shadow-[0_0_12px_rgba(0,240,255,0.25)] ring-1 ring-cyan-500'
                          : isCritical
                          ? 'bg-soc-850 border-red-500/40 hover:border-red-400'
                          : 'bg-soc-850 border-soc-750 hover:border-soc-600'
                      }`}
                    >
                      <div className="flex items-center justify-between pb-1.5 border-b border-soc-750">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white font-mono">{m.id}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-soc-750 text-slate-300 font-mono">
                            {m.sector_id}
                          </span>
                        </div>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                          m.priority === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse' :
                          m.priority === 'HIGH' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                          'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        }`}>
                          {m.priority} ({m.priority_score})
                        </span>
                      </div>

                      <p className="text-xs font-sans text-slate-300 font-medium line-clamp-1 mt-1.5">
                        {m.title}
                      </p>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-sans mt-2">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-cyan-400" />
                          {m.assigned_operator}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded font-mono font-bold ${
                          isAwaiting
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 animate-pulse'
                            : m.status === 'RESOLVED'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-soc-750 text-slate-300'
                        }`}>
                          {m.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Operator Profile & Sign Out Card */}
          <div className="p-3.5 rounded-xl bg-soc-850 border border-soc-700/80 shadow-lg flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold shrink-0 shadow-[0_0_8px_rgba(0,240,255,0.2)]">
                <User className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-white font-sans truncate">
                    {currentUser?.full_name || currentUser?.username || 'Duty Officer'}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-mono border border-cyan-500/30">
                    {currentUser?.role || 'OPERATOR'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-sans mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Active Session • Encrypted</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/40 hover:border-red-400 text-xs font-mono font-semibold transition shadow-md group shrink-0"
              title="Sign out of IBVAP Command Session"
            >
              <LogOut className="w-3.5 h-3.5 text-red-400 group-hover:scale-110 transition-transform" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Right Column: Mission Detail Workspace (8.5 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {detailLoading && !missionDetail ? (
            <div className="p-12 rounded-xl bg-soc-850 border border-soc-700 text-center text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-cyan-400 mb-2" />
              Loading mission intelligence dossier...
            </div>
          ) : !missionDetail ? (
            <div className="p-12 rounded-xl bg-soc-850 border border-soc-700 text-center text-slate-400">
              Select a mission from the queue to inspect operational context.
            </div>
          ) : (
            <>
              {/* Mission Header Card */}
              <div className="p-4 rounded-xl bg-soc-850 border border-soc-700 shadow-xl space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-3 border-b border-soc-700">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-lg font-bold text-white font-mono tracking-wider">{missionDetail.id}</span>
                    <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-bold">
                      {missionDetail.sector_id}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                      missionDetail.priority === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/40' :
                      missionDetail.priority === 'HIGH' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                      'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    }`}>
                      {missionDetail.priority} — {missionDetail.priority_score} PTS
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                      missionDetail.status === 'AWAITING_APPROVAL' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 animate-pulse' :
                      missionDetail.status === 'APPROVED' || missionDetail.status === 'RESPONSE_ACTIVE' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' :
                      missionDetail.status === 'RESOLVED' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' :
                      'bg-soc-750 text-slate-300'
                    }`}>
                      {missionDetail.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsEscalateModalOpen(true)}
                      className="px-2.5 py-1 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-semibold transition"
                    >
                      Escalate ({missionDetail.escalation_level})
                    </button>
                    {missionDetail.status !== 'RESOLVED' && (
                      <button
                        onClick={() => setIsResolveModalOpen(true)}
                        className="px-3 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition shadow-md"
                      >
                        Resolve Mission
                      </button>
                    )}
                  </div>
                </div>

                <h2 className="text-sm font-bold text-white font-sans">
                  {missionDetail.title}
                </h2>

                {/* Operational SLA Timers Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
                  <div className="p-2 rounded bg-soc-900 border border-soc-750">
                    <span className="text-[9px] text-slate-500 block">TIME TO DETECT</span>
                    <span className="text-cyan-300 font-bold">{sla.time_to_detect || '00:00:03'}</span>
                  </div>
                  <div className="p-2 rounded bg-soc-900 border border-soc-750">
                    <span className="text-[9px] text-slate-500 block">TIME TO ACKNOWLEDGE</span>
                    <span className="text-amber-300 font-bold">{sla.time_to_acknowledge || '00:00:14'}</span>
                  </div>
                  <div className="p-2 rounded bg-soc-900 border border-soc-750">
                    <span className="text-[9px] text-slate-500 block">TIME TO APPROVE</span>
                    <span className="text-purple-300 font-bold">{sla.time_to_approve || '00:01:28'}</span>
                  </div>
                  <div className="p-2 rounded bg-soc-900 border border-soc-750">
                    <span className="text-[9px] text-slate-500 block">TOTAL DURATION</span>
                    <span className="text-emerald-400 font-bold">{sla.total_mission_duration || '00:04:32'}</span>
                  </div>
                </div>
              </div>

              {/* HUMAN APPROVAL GATE BANNER */}
              {missionDetail.status === 'AWAITING_APPROVAL' || missionDetail.response_status === 'AWAITING_APPROVAL' ? (
                <div className="p-4 rounded-xl bg-gradient-to-r from-purple-950/80 via-soc-850 to-red-950/80 border border-purple-500/70 shadow-[0_0_20px_rgba(168,85,247,0.25)] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertOctagon className="w-5 h-5 text-purple-400 animate-pulse" />
                      <div>
                        <span className="font-bold text-white text-xs tracking-wide">
                          AWAITING OPERATOR APPROVAL (HUMAN-IN-THE-LOOP GATE)
                        </span>
                        <p className="text-[11px] text-purple-200 font-sans">
                          AI recommended prototype tactical response workflow. Human authorization mandatory before dispatch.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-soc-900/90 border border-purple-500/40 text-xs font-sans space-y-1">
                    <p className="text-slate-200">
                      <strong className="text-purple-300 font-mono">Proposed Workflow:</strong> Deploy QRF Team Bravo (3 Operators, ETA: 3m) & SSB UAV Unit-4 to {missionDetail.sector_id}.
                    </p>
                    <p className="text-slate-400 text-[11px]">
                      <strong className="text-slate-300">Justification:</strong> Critical restricted zone intrusion with multi-camera spatiotemporal tracking continuity.
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={handleRejectResponse}
                      className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 font-semibold transition"
                    >
                      Reject Workflow
                    </button>
                    <button
                      onClick={handleApproveResponse}
                      className="px-4 py-1.5 rounded-lg bg-emerald-500/25 hover:bg-emerald-500/35 text-emerald-300 border border-emerald-500/50 font-bold transition shadow-[0_0_12px_rgba(16,185,129,0.3)] flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>APPROVE RESPONSE DISPATCH</span>
                    </button>
                  </div>
                </div>
              ) : missionDetail.status === 'APPROVED' || missionDetail.status === 'RESPONSE_ACTIVE' ? (
                <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/50 flex items-center justify-between gap-3 shadow-lg">
                  <div className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping"></div>
                    <div>
                      <span className="font-bold text-emerald-300 text-xs">
                        PROTOTYPE RESPONSE SIMULATION ACTIVE
                      </span>
                      <p className="text-[11px] text-emerald-200 font-sans">
                        Approved by {missionDetail.approved_by || 'Duty Operator'}. Interception workflow in progress in {missionDetail.sector_id}.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsResolveModalOpen(true)}
                    className="px-3 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition"
                  >
                    Mark Resolved
                  </button>
                </div>
              ) : missionDetail.status === 'RESOLVED' ? (
                <div className="p-3.5 rounded-xl bg-soc-850 border border-blue-500/40 flex items-center justify-between gap-3 shadow-lg">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-blue-400" />
                    <div>
                      <span className="font-bold text-blue-300 text-xs">
                        MISSION RESOLVED ({missionDetail.resolution_type || 'RESOLVED'})
                      </span>
                      <p className="text-[11px] text-slate-300 font-sans">
                        Closed by {missionDetail.resolved_by || 'Duty Operator'}. {missionDetail.resolution_notes}
                      </p>
                    </div>
                  </div>
                  {postIncidentSummary && (
                    <button
                      onClick={() => setActiveDossierTab('overview')}
                      className="px-2.5 py-1 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-mono"
                    >
                      View Post-Incident Summary
                    </button>
                  )}
                </div>
              ) : null}

              {/* Two-Column Split: Context & Health (Left) vs AI Summary & Recommendations (Right) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Operational Context Card */}
                <div className="p-3.5 rounded-xl bg-soc-850 border border-soc-700 space-y-2.5 shadow-md">
                  <div className="flex items-center justify-between pb-1.5 border-b border-soc-750">
                    <span className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                      MISSION OPERATIONAL CONTEXT
                    </span>
                    <span className="text-[10px] text-cyan-400 font-mono">SINGLE SOURCE</span>
                  </div>

                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex justify-between py-1 border-b border-soc-800">
                      <span className="text-slate-400">Target Track</span>
                      <span className="font-bold text-white font-mono">
                        {missionDetail.object_type.toUpperCase()} #{missionDetail.primary_target_id}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-soc-800">
                      <span className="text-slate-400">Geographic Sector</span>
                      <span className="font-bold text-cyan-300">{context.sector?.name || missionDetail.sector_id}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-soc-800">
                      <span className="text-slate-400">Edge Node</span>
                      <span className="font-mono text-slate-200">{context.sector?.edge_node || 'EDGE-B02'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-soc-800">
                      <span className="text-slate-400">Correlated Cameras</span>
                      <span className="font-mono text-cyan-300">
                        {context.cameras?.map(c => c.id).join(', ') || 'CAM-01, CAM-02, CAM-03'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-soc-800">
                      <span className="text-slate-400">Correlated Sensors</span>
                      <span className="font-mono text-amber-300">Acoustic-02, UAV-01</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">Evidence Items</span>
                      <span className="font-mono text-emerald-400 font-bold">
                        {context.evidence_items?.length || 3} Verified (SHA-256)
                      </span>
                    </div>
                  </div>

                  {/* Why Prioritized Factor Breakdown */}
                  {context.why_prioritized && (
                    <div className="pt-2 border-t border-soc-750">
                      <span className="text-[10px] text-slate-400 font-bold block mb-1">WHY PRIORITIZED?</span>
                      <ul className="space-y-1">
                        {context.why_prioritized.map((factor, idx) => (
                          <li key={idx} className="text-[10px] text-slate-300 flex items-center gap-1.5 font-sans">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                            <span>{factor}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* AI Summary & Recommendations Card */}
                <div className="p-3.5 rounded-xl bg-soc-850 border border-soc-700 space-y-2.5 shadow-md">
                  <div className="flex items-center justify-between pb-1.5 border-b border-soc-750">
                    <span className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      AI-ASSISTED FACTUAL SUMMARY
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">STRICT GROUNDING</span>
                  </div>

                  <p className="text-xs font-sans text-slate-300 leading-relaxed bg-soc-900/80 p-2.5 rounded-lg border border-soc-750">
                    {missionDetail.description}
                  </p>

                  {/* Advisory Recommendations */}
                  <div className="pt-1 space-y-2">
                    <span className="text-[10px] text-slate-400 font-bold block">RECOMMENDED NEXT ACTION (ADVISORY)</span>
                    {recommendations.slice(0, 2).map((rec) => (
                      <div key={rec.id} className="p-2 rounded bg-soc-900 border border-soc-750 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-cyan-300 font-sans">{rec.title}</span>
                          <span className="text-[9px] px-1 rounded bg-soc-750 text-slate-300 font-mono">{rec.type}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-sans">{rec.description}</p>
                        
                        <div className="flex items-center justify-end gap-1.5 pt-1">
                          {rec.action_code === 'APPROVE_TACTICAL_DISPATCH' && missionDetail.status === 'AWAITING_APPROVAL' && (
                            <button
                              onClick={handleApproveResponse}
                              className="px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold"
                            >
                              APPROVE
                            </button>
                          )}
                          {rec.action_code === 'VERIFY_EVIDENCE_LEDGER' && (
                            <button
                              onClick={() => handleVerifyEvidence(missionDetail.primary_event_id)}
                              className="px-2 py-0.5 rounded bg-soc-750 hover:bg-soc-700 text-cyan-300 text-[10px] font-mono"
                            >
                              VERIFY EVIDENCE
                            </button>
                          )}
                          {rec.action_code === 'INSPECT_JOURNEY' && (
                            <button
                              onClick={() => setActiveDossierTab('journey')}
                              className="px-2 py-0.5 rounded bg-soc-750 hover:bg-soc-700 text-slate-200 text-[10px] font-mono"
                            >
                              VIEW JOURNEY
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 4. Tabbed Intelligence Dossier (9 Tabs) */}
              <div className="p-4 rounded-xl bg-soc-850 border border-soc-700 shadow-xl space-y-3">
                {/* Dossier Tabs Navigation */}
                <div className="flex items-center gap-1 overflow-x-auto pb-2 border-b border-soc-750">
                  {[
                    { id: 'overview', label: 'OVERVIEW', icon: Crosshair },
                    { id: 'timeline', label: 'TIMELINE', icon: Clock },
                    { id: 'cameras', label: 'CAMERAS', icon: Video },
                    { id: 'journey', label: 'JOURNEY', icon: Route },
                    { id: 'sensors', label: 'SENSORS', icon: Radio },
                    { id: 'evidence', label: 'EVIDENCE', icon: ShieldCheck },
                    { id: 'risk', label: 'RISK', icon: ShieldAlert },
                    { id: 'response', label: 'RESPONSE', icon: Activity },
                    { id: 'audit', label: 'AUDIT', icon: FileText },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeDossierTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveDossierTab(tab.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                          isActive
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold shadow-[0_0_8px_rgba(0,240,255,0.2)]'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-soc-800'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Tab Content 1: OVERVIEW */}
                {activeDossierTab === 'overview' && (
                  <div className="space-y-3 pt-2">
                    {postIncidentSummary && (
                      <div className="p-4 rounded-xl bg-soc-900 border border-cyan-500/40 space-y-2 shadow-lg">
                        <div className="flex items-center justify-between pb-2 border-b border-soc-750">
                          <span className="font-bold text-cyan-300 text-xs flex items-center gap-1.5">
                            <Award className="w-4 h-4 text-cyan-400" />
                            POST-INCIDENT MISSION SUMMARY (RESOLVED)
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono font-bold">
                            {postIncidentSummary.resolution}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          <div className="p-2 rounded bg-soc-850">
                            <span className="text-[10px] text-slate-500 block">TOTAL DURATION</span>
                            <span className="font-bold text-white font-mono">{postIncidentSummary.duration}</span>
                          </div>
                          <div className="p-2 rounded bg-soc-850">
                            <span className="text-[10px] text-slate-500 block">CORRELATED EVENTS</span>
                            <span className="font-bold text-cyan-300 font-mono">{postIncidentSummary.events_correlated}</span>
                          </div>
                          <div className="p-2 rounded bg-soc-850">
                            <span className="text-[10px] text-slate-500 block">EVIDENCE ITEMS</span>
                            <span className="font-bold text-emerald-400 font-mono">{postIncidentSummary.evidence_items_verified} Verified</span>
                          </div>
                          <div className="p-2 rounded bg-soc-850">
                            <span className="text-[10px] text-slate-500 block">RISK MITIGATION</span>
                            <span className="font-bold text-amber-300 font-mono">{postIncidentSummary.risk_mitigation}</span>
                          </div>
                        </div>
                        <p className="text-slate-300 text-xs font-sans pt-1">
                          <strong>Resolution Notes:</strong> {postIncidentSummary.resolution_notes}
                        </p>
                      </div>
                    )}

                    {/* Subsystem Health Matrix */}
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                        INTEGRATED MISSION HEALTH MATRIX
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {Object.entries(health).map(([k, v]) => (
                          <div key={k} className="p-2.5 rounded-lg bg-soc-900 border border-soc-750 flex items-center justify-between">
                            <div>
                              <span className="text-[10px] text-slate-500 uppercase block">{k.replace('_', ' ')}</span>
                              <span className="text-xs font-bold text-slate-200">{v.label}</span>
                            </div>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold font-mono ${
                              v.status === 'AVAILABLE' || v.status === 'ONLINE' || v.status === 'RUNNING' || v.status === 'HEALTHY' || v.status === 'VERIFIED'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}>
                              {v.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab Content 2: TIMELINE */}
                {activeDossierTab === 'timeline' && (
                  <div className="space-y-2.5 pt-2">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                      CHRONOLOGICAL MISSION EVENT LIFECYCLE ({timeline.length} ENTRIES)
                    </span>
                    <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-soc-700">
                      {timeline.map((item, idx) => (
                        <div key={item.id || idx} className="relative group">
                          <div className="absolute -left-[23px] top-1.5 w-3 h-3 rounded-full bg-cyan-400 border-2 border-soc-900 shadow-[0_0_6px_rgba(0,240,255,0.4)]"></div>
                          <div className="p-3 rounded-lg bg-soc-900 border border-soc-750 hover:border-cyan-500/40 transition space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-white text-xs">{item.title}</span>
                              <span className="text-[10px] text-cyan-400 font-mono">{item.formatted_time}</span>
                            </div>
                            <p className="text-slate-300 text-xs font-sans leading-relaxed">{item.description}</p>
                            <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 font-mono">
                              <span>Action: {item.action_type}</span>
                              <span>Actor: {item.operator}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tab Content 3: CAMERAS */}
                {activeDossierTab === 'cameras' && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                        CORRELATED CCTV CAMERA FEEDS & KEYFRAMES
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        LIVE AI STREAMS
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {context.cameras?.map((cam) => {
                        const streamUrl = `/api/cameras/${cam.id}/stream`;
                        const camEvidence = context.evidence_items?.find(e => e.camera_id === cam.id);

                        return (
                          <div key={cam.id} className="p-3 rounded-xl bg-soc-900 border border-soc-750 hover:border-cyan-500/40 transition space-y-2">
                            <div className="flex items-center justify-between pb-1 border-b border-soc-800">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                                <span className="font-bold text-white text-xs">{cam.id}</span>
                              </div>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono">
                                {cam.status}
                              </span>
                            </div>
                            <p className="text-slate-400 text-xs font-sans line-clamp-1">{cam.location}</p>
                            
                            {/* Live Video Stream Feed */}
                            <div className="w-full h-44 rounded-lg bg-black border border-soc-800 relative overflow-hidden flex items-center justify-center group shadow-inner">
                              <img
                                src={streamUrl}
                                alt={`Live Stream ${cam.id}`}
                                className="w-full h-full object-cover select-none pointer-events-none"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  const fallback = e.target.parentElement.querySelector('.stream-fallback');
                                  if (fallback) fallback.classList.remove('hidden');
                                }}
                              />

                              {/* Error Fallback */}
                              <div className="stream-fallback hidden flex flex-col items-center justify-center gap-1 text-slate-500 p-4 text-center">
                                <Video className="w-8 h-8 text-soc-700" />
                                <span className="text-[11px] font-mono text-slate-400">Stream Reconnecting...</span>
                              </div>

                              {/* Live HUD Badge Overlay */}
                              <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-0.5 rounded bg-soc-950/80 border border-red-500/40 text-[9px] font-mono text-red-400 backdrop-blur-sm shadow">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
                                <span>LIVE</span>
                              </div>

                              {/* Stream Info Bar Overlay */}
                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-soc-950/90 via-soc-950/50 to-transparent p-2 flex items-center justify-between text-[10px] font-mono">
                                <span className="text-cyan-300 font-bold">RTSP // 1080p</span>
                                <span className="text-emerald-400 font-semibold">{cam.fps || 25} FPS</span>
                              </div>
                            </div>

                            {/* Correlated Evidence Keyframe Stamp if available */}
                            {camEvidence?.evidence_path && (
                              <div className="pt-1 flex items-center justify-between text-[10px] font-mono text-slate-400 border-t border-soc-800/80">
                                <span className="text-slate-400">Keyframe Stamped:</span>
                                <span className="text-cyan-400 truncate max-w-[120px]">{camEvidence.evidence_hash?.substring(0, 10)}...</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Tab Content 4: JOURNEY */}
                {activeDossierTab === 'journey' && (
                  <div className="space-y-3 pt-2">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                      MULTI-CAMERA TARGET #{missionDetail.primary_target_id} TRANSIT TRAJECTORY
                    </span>
                    <div className="p-4 rounded-xl bg-soc-900 border border-soc-750 space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-soc-800">
                        <span className="text-slate-300 text-xs">Pedestrian Transit Path</span>
                        <span className="text-cyan-400 font-mono text-xs">Est. Velocity: 4.2 km/h</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                        <div className="p-3 rounded-lg bg-soc-850 border border-soc-750">
                          <span className="text-[10px] text-slate-500 block">ORIGIN POINT</span>
                          <span className="font-bold text-white text-xs">CAM-01 (Sector A)</span>
                          <span className="text-[10px] text-slate-400 block mt-1">Buffer Zone Acquisition</span>
                        </div>
                        <div className="p-3 rounded-lg bg-soc-850 border border-amber-500/40">
                          <span className="text-[10px] text-amber-400 block font-bold">+72s TRANSIT (0.4 km)</span>
                          <span className="font-bold text-amber-300 text-xs">CAM-02 (Sector B)</span>
                          <span className="text-[10px] text-red-400 block mt-1 font-bold">Restricted Zone Breached</span>
                        </div>
                        <div className="p-3 rounded-lg bg-soc-850 border border-soc-750">
                          <span className="text-[10px] text-slate-500 block">+114s TRANSIT (0.8 km)</span>
                          <span className="font-bold text-cyan-300 text-xs">CAM-03 (Sector C)</span>
                          <span className="text-[10px] text-slate-400 block mt-1">Predicted Vector (Riverine)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab Content 5: SENSORS */}
                {activeDossierTab === 'sensors' && (
                  <div className="space-y-3 pt-2">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                      CORRELATED PERIMETER SENSORS & DRONE TELEMETRY
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {context.sensors?.map((s) => (
                        <div key={s.sensor_id} className="p-3.5 rounded-xl bg-soc-900 border border-soc-750 space-y-2">
                          <div className="flex items-center justify-between pb-1 border-b border-soc-800">
                            <span className="font-bold text-white text-xs">{s.sensor_id}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono font-bold">
                              {s.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 font-sans">{s.sensor_type}</p>
                          <p className="text-[11px] text-cyan-300 font-mono bg-soc-950 p-2 rounded border border-soc-800">
                            Reading: {s.reading || `Battery: ${s.battery} • Ready`}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tab Content 6: EVIDENCE */}
                {activeDossierTab === 'evidence' && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                        CRYPTOGRAPHIC SHA-256 TAMPER-EVIDENT EVIDENCE ITEMS
                      </span>
                      <button
                        onClick={() => handleVerifyEvidence(missionDetail.primary_event_id)}
                        className="px-3 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition"
                      >
                        Verify Ledger Chain
                      </button>
                    </div>
                    <div className="space-y-2.5">
                      {context.evidence_items?.map((ev, idx) => (
                        <div key={idx} className="p-3 rounded-lg bg-soc-900 border border-soc-750 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white text-xs">{ev.event_id} ({ev.camera_id})</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono font-bold">
                              ✓ {ev.integrity}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono space-y-0.5 bg-soc-950 p-2 rounded border border-soc-800">
                            <p className="truncate"><strong className="text-slate-300">SHA-256 Hash:</strong> {ev.evidence_hash}</p>
                            <p className="truncate"><strong className="text-slate-300">Prev Block Hash:</strong> {ev.prev_hash}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tab Content 7: RISK */}
                {activeDossierTab === 'risk' && (
                  <div className="space-y-3 pt-2">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                      EXPLAINABLE AI RISK SCORE BREAKDOWN ({missionDetail.priority_score}/100 PTS)
                    </span>
                    <div className="p-4 rounded-xl bg-soc-900 border border-soc-750 space-y-3">
                      <div className="space-y-2">
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-300">Virtual Fence Boundary Breach</span>
                            <span className="text-red-400 font-bold">+35 pts</span>
                          </div>
                          <div className="w-full bg-soc-800 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-red-500 h-full w-[35%]"></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-300">Low-Light Night Condition Factor</span>
                            <span className="text-amber-400 font-bold">+20 pts</span>
                          </div>
                          <div className="w-full bg-soc-800 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-amber-400 h-full w-[20%]"></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-300">Multi-Camera Trajectory Vector towards Fence</span>
                            <span className="text-cyan-400 font-bold">+20 pts</span>
                          </div>
                          <div className="w-full bg-soc-800 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-cyan-400 h-full w-[20%]"></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-300">Loitering & Dwell Time (&gt;10s)</span>
                            <span className="text-emerald-400 font-bold">+10 pts</span>
                          </div>
                          <div className="w-full bg-soc-800 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-emerald-400 h-full w-[10%]"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab Content 8: RESPONSE */}
                {activeDossierTab === 'response' && (
                  <div className="space-y-3 pt-2">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                      PROTOTYPE TACTICAL RESPONSE SIMULATION WORKFLOW
                    </span>
                    <div className="p-4 rounded-xl bg-soc-900 border border-soc-750 space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-soc-800">
                        <span className="text-xs font-bold text-white">Status: {missionDetail.response_status}</span>
                        <span className="text-[10px] text-cyan-400 font-mono">Response Type: {missionDetail.response_type}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 rounded-lg bg-soc-850 border border-soc-750 space-y-1">
                          <span className="text-slate-400 block font-sans">Deployed Tactical Units</span>
                          <p className="font-bold text-white">QRF Team Bravo (3 Operators)</p>
                          <span className="text-[10px] text-emerald-400 font-mono">ETA: 3 Minutes</span>
                        </div>
                        <div className="p-3 rounded-lg bg-soc-850 border border-soc-750 space-y-1">
                          <span className="text-slate-400 block font-sans">Air Support</span>
                          <p className="font-bold text-white">SSB UAV Recon Unit-4</p>
                          <span className="text-[10px] text-cyan-400 font-mono">Status: Air Patrol Active</span>
                        </div>
                      </div>
                      <div className="p-2.5 rounded bg-amber-950/30 border border-amber-500/30 text-[11px] text-amber-300 font-sans">
                        ⚠️ <strong>Simulated Response Layer:</strong> All actions are strictly prototype tactical simulations with human authorization tracking. No real weapons or irreversible physical commands are dispatched.
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab Content 9: AUDIT */}
                {activeDossierTab === 'audit' && (
                  <div className="space-y-2.5 pt-2">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                      IMMUTABLE MISSION AUDIT TRAIL
                    </span>
                    <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                      {timeline.map((it, idx) => (
                        <div key={idx} className="p-2.5 rounded-lg bg-soc-900 border border-soc-750 text-[11px] space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-cyan-300 font-mono">{it.action_type}</span>
                            <span className="text-[10px] text-slate-500 font-mono">{it.formatted_time}</span>
                          </div>
                          <p className="text-slate-300 font-sans">{it.title} — {it.description}</p>
                          <span className="text-[10px] text-slate-500 block font-mono">Recorded by: {it.operator}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* RESOLVE MISSION MODAL */}
      {isResolveModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-soc-850 border border-cyan-500/50 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-fade-in font-mono">
            <div className="flex items-center justify-between pb-3 border-b border-soc-700">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-white text-base">Resolve Mission {missionDetail?.id}</h3>
              </div>
              <button onClick={() => setIsResolveModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Resolution Category</label>
                <select
                  value={resolveType}
                  onChange={(e) => setResolveType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-soc-900 border border-soc-700 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
                >
                  <option value="RESOLVED">Resolved (Interception / Securing Complete)</option>
                  <option value="FALSE_POSITIVE">False Positive (Wildlife / Friendly Patrol)</option>
                  <option value="ESCALATED">Escalated to Higher Headquarters</option>
                  <option value="NO_FURTHER_ACTION">No Further Action Required</option>
                  <option value="OTHER">Other Operational Closure</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Duty Officer Resolution Notes</label>
                <textarea
                  rows="3"
                  value={resolveNotes}
                  onChange={(e) => setResolveNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-soc-900 border border-soc-700 text-slate-200 text-xs font-sans focus:outline-none focus:border-cyan-500"
                  placeholder="Detail action taken, ground verification results, and ledger closure..."
                ></textarea>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-soc-700">
              <button
                onClick={() => setIsResolveModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-soc-800 text-slate-300 hover:bg-soc-750 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleResolveMission}
                className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-soc-900 font-bold text-xs shadow-lg transition"
              >
                Confirm Resolution
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ESCALATE MISSION MODAL */}
      {isEscalateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-soc-850 border border-amber-500/50 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-fade-in font-mono">
            <div className="flex items-center justify-between pb-3 border-b border-soc-700">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-base">Escalate Mission {missionDetail?.id}</h3>
              </div>
              <button onClick={() => setIsEscalateModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Target Escalation Level</label>
                <select
                  value={escalateLevel}
                  onChange={(e) => setEscalateLevel(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-soc-900 border border-soc-700 text-slate-200 text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value="SUPERVISOR">SUPERVISOR (Field Sector In-Charge)</option>
                  <option value="COMMAND">COMMAND (SSB Frontier Headquarters)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Escalation Justification</label>
                <textarea
                  rows="3"
                  value={escalateReason}
                  onChange={(e) => setEscalateReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-soc-900 border border-soc-700 text-slate-200 text-xs font-sans focus:outline-none focus:border-amber-500"
                ></textarea>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-soc-700">
              <button
                onClick={() => setIsEscalateModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-soc-800 text-slate-300 hover:bg-soc-750 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleEscalateMission}
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-soc-900 font-bold text-xs shadow-lg transition"
              >
                Authorize Escalation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE MISSION MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreateMission} className="bg-soc-850 border border-cyan-500/50 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-fade-in font-mono">
            <div className="flex items-center justify-between pb-3 border-b border-soc-700">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-white text-base">Orchestrate New Mission</h3>
              </div>
              <button type="button" onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Mission Title</label>
                <input
                  type="text"
                  required
                  value={newMissionForm.title}
                  onChange={(e) => setNewMissionForm({...newMissionForm, title: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg bg-soc-900 border border-soc-700 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Frontier Sector</label>
                  <select
                    value={newMissionForm.sector_id}
                    onChange={(e) => setNewMissionForm({...newMissionForm, sector_id: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg bg-soc-900 border border-soc-700 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
                  >
                    <option value="SEC-A">Sector A (Highway 104)</option>
                    <option value="SEC-B">Sector B (Riverine Basin)</option>
                    <option value="SEC-C">Sector C (Transit Gate)</option>
                    <option value="SEC-D">Sector D (Mountain Pass)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Priority Level</label>
                  <select
                    value={newMissionForm.priority}
                    onChange={(e) => {
                      const pri = e.target.value;
                      const score = pri === 'CRITICAL' ? 85 : pri === 'HIGH' ? 70 : 45;
                      setNewMissionForm({...newMissionForm, priority: pri, priority_score: score});
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-soc-900 border border-soc-700 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
                  >
                    <option value="CRITICAL">CRITICAL (85 Pts)</option>
                    <option value="HIGH">HIGH (70 Pts)</option>
                    <option value="MEDIUM">MEDIUM (45 Pts)</option>
                    <option value="LOW">LOW (20 Pts)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Primary Target ID</label>
                  <input
                    type="number"
                    value={newMissionForm.primary_target_id}
                    onChange={(e) => setNewMissionForm({...newMissionForm, primary_target_id: parseInt(e.target.value) || 17})}
                    className="w-full px-3 py-2 rounded-lg bg-soc-900 border border-soc-700 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Assigned Operator</label>
                  <input
                    type="text"
                    value={newMissionForm.assigned_operator}
                    onChange={(e) => setNewMissionForm({...newMissionForm, assigned_operator: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg bg-soc-900 border border-soc-700 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-soc-700">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-soc-800 text-slate-300 hover:bg-soc-750 text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-soc-900 font-bold text-xs shadow-lg transition"
              >
                Create Mission
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
