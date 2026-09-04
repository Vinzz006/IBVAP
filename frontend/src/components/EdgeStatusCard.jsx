import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, HardDrive, Cpu, RefreshCw, Server, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';

export default function EdgeStatusCard({ onStateChange }) {
  const [edgeData, setEdgeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchEdgeStatus();
    const interval = setInterval(fetchEdgeStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchEdgeStatus = async () => {
    try {
      const data = await api.getEdgeStatus();
      setEdgeData(data);
      if (onStateChange) onStateChange(data);
    } catch (err) {
      console.error('Failed to fetch edge status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleNetwork = async () => {
    if (!edgeData) return;
    setToggling(true);
    try {
      const nextState = !edgeData.is_network_online;
      await api.simulateNetwork(nextState, nextState ? 'Manual connection restoration' : 'Simulated remote fiber cut');
      await fetchEdgeStatus();
    } catch (err) {
      alert(`Network toggle failed: ${err.message}`);
    } finally {
      setToggling(false);
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      await api.syncEdgeQueue();
      await fetchEdgeStatus();
    } catch (err) {
      alert(`Sync failed: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleSimulateOfflineCapture = async () => {
    try {
      await api.queueOfflineEvent({
        camera_id: 'CAM-01',
        event_type: 'Restricted Zone Intrusion',
        tracking_id: 17,
        object_type: 'person',
        risk_score: 95,
        risk_level: 'CRITICAL',
        notes: 'Simulated perimeter breach buffered in Edge memory during network loss'
      });
      await fetchEdgeStatus();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading && !edgeData) {
    return (
      <div className="p-3 bg-soc-850 border border-soc-700 rounded-lg text-xs font-mono text-slate-400">
        Loading Edge & Offline status...
      </div>
    );
  }

  const isOnline = edgeData?.is_network_online;
  const pendingCount = edgeData?.sync_queue?.pending || 0;

  return (
    <div className="bg-soc-850 border border-soc-700 rounded-xl p-4 shadow-lg space-y-3 font-mono">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-soc-750">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-cyan-400" />
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
            Edge & Offline Intelligence
          </h4>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
          isOnline
            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
            : 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
        }`}>
          {edgeData?.mode_label || (isOnline ? '● CENTRAL ONLINE' : '● EDGE OFFLINE')}
        </span>
      </div>

      {/* Grid Telemetry */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
        <div className="p-2 rounded bg-soc-900 border border-soc-750 flex items-center gap-2">
          <Cpu className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <div>
            <span className="text-[9px] text-slate-500 block">AI ENGINE</span>
            <span className="text-emerald-400 font-semibold">● RUNNING</span>
          </div>
        </div>

        <div className="p-2 rounded bg-soc-900 border border-soc-750 flex items-center gap-2">
          <HardDrive className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <div>
            <span className="text-[9px] text-slate-500 block">STORAGE</span>
            <span className="text-slate-200 font-semibold">{edgeData?.storage_free_gb || 'HEALTHY'}</span>
          </div>
        </div>

        <div className="p-2 rounded bg-soc-900 border border-soc-750 flex items-center gap-2">
          {isOnline ? (
            <Wifi className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          )}
          <div>
            <span className="text-[9px] text-slate-500 block">UPLINK</span>
            <span className={isOnline ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
              {isOnline ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
        </div>

        <div className="p-2 rounded bg-soc-900 border border-soc-750 flex items-center gap-2">
          <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 shrink-0 ${syncing ? 'animate-spin' : ''}`} />
          <div>
            <span className="text-[9px] text-slate-500 block">SYNC QUEUE</span>
            <span className={pendingCount > 0 ? 'text-amber-400 font-bold' : 'text-slate-300'}>
              {pendingCount} PENDING
            </span>
          </div>
        </div>
      </div>

      {/* Action Controls */}
      <div className="pt-1 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleNetwork}
            disabled={toggling}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-semibold transition border ${
              isOnline
                ? 'bg-red-500/15 hover:bg-red-500/25 text-red-300 border-red-500/30'
                : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40'
            }`}
          >
            {isOnline ? <WifiOff className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
            <span>{isOnline ? 'Simulate Network Loss' : 'Restore Uplink'}</span>
          </button>

          {!isOnline && (
            <button
              onClick={handleSimulateOfflineCapture}
              className="px-2 py-1.5 rounded bg-soc-800 hover:bg-soc-750 text-slate-300 border border-soc-700 text-[11px] transition"
              title="Record an incident locally while network is disconnected"
            >
              + Capture Offline Event
            </button>
          )}
        </div>

        {isOnline && pendingCount > 0 && (
          <button
            onClick={handleSyncNow}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-[11px] transition shadow-[0_0_8px_rgba(0,240,255,0.2)] disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing...' : `Sync Queue (${pendingCount})`}</span>
          </button>
        )}
      </div>

      <div className="text-[10px] text-slate-500 pt-0.5 border-t border-soc-800 flex items-center justify-between">
        <span>Node: {edgeData?.node_id || 'EDGE-NODE-SECTOR-A'}</span>
        <span className="text-slate-400 italic">Connectivity Simulation Harness</span>
      </div>
    </div>
  );
}
