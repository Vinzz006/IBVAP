import React, { useState, useEffect } from 'react';
import { Box, User, Truck, ShieldAlert, WifiOff, AlertTriangle, RefreshCw, Plus, Play, RotateCcw, Video, Activity, Eye } from 'lucide-react';
import { api } from '../services/api';

export default function DigitalTwin() {
  const [twinState, setTwinState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState('');
  const [selectedCamera, setSelectedCamera] = useState('CAM-01');

  useEffect(() => {
    fetchTwinState();
    const interval = setInterval(fetchTwinState, 4000);
    return () => clearInterval(interval);
  }, []);

  const fetchTwinState = async () => {
    try {
      const data = await api.getSimulationState();
      setTwinState(data);
    } catch (err) {
      console.error('Failed to fetch Digital Twin state:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSpawn = async (type) => {
    setActionMessage('');
    try {
      const x = Math.floor(Math.random() * 60) + 20;
      const y = Math.floor(Math.random() * 40) + 20;
      const res = await api.spawnSimulationEntity({
        entity_type: type,
        sector: selectedCamera,
        x,
        y
      });
      setActionMessage(`Spawned ${type.toUpperCase()} (${res.entity_id}) in ${selectedCamera}`);
      fetchTwinState();
    } catch (err) {
      alert(`Spawn failed: ${err.message}`);
    }
  };

  const handleTriggerEvent = async (eventType) => {
    setActionMessage('');
    try {
      const res = await api.triggerSimulationEvent({
        event_type: eventType,
        camera_id: selectedCamera,
        intensity: 'HIGH'
      });
      setActionMessage(`Scenario [${eventType.toUpperCase()}] injected on ${selectedCamera}`);
      fetchTwinState();
    } catch (err) {
      alert(`Trigger failed: ${err.message}`);
    }
  };

  const handleReset = async () => {
    if (!confirm('Reset Digital Twin simulation environment to baseline?')) return;
    try {
      await api.resetSimulation();
      setActionMessage('Digital Twin simulation reset to baseline state.');
      fetchTwinState();
    } catch (err) {
      alert(`Reset failed: ${err.message}`);
    }
  };

  return (
    <div className="flex-1 bg-soc-900 p-6 overflow-y-auto font-mono text-xs select-none space-y-6">
      {/* Page Header */}
      <div className="pb-4 border-b border-soc-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Box className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white tracking-wide">
              Border Digital Twin Simulation Environment
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold animate-pulse">
              SIMULATION MODE
            </span>
          </div>
          <p className="text-slate-400 font-sans text-xs mt-0.5">
            Synthetic multi-sector testing canvas for stress testing detection, handoff, and decision layers safely
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-soc-800 hover:bg-soc-750 text-slate-300 border border-soc-700 hover:border-red-500/40 text-xs transition"
          >
            <RotateCcw className="w-3.5 h-3.5 text-red-400" />
            <span>Reset Simulation</span>
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3 rounded-lg bg-cyan-950/40 border border-cyan-500/50 flex items-center gap-2 text-cyan-300">
          <Activity className="w-4 h-4 text-cyan-400 animate-spin" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Main Grid: 2D Digital Twin Canvas + Simulation Control Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: 2D Interactive Digital Twin Canvas */}
        <div className="lg:col-span-2 bg-soc-850 border border-soc-700 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-soc-750">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Conceptual Border Sector Canvas (2D Twin)</h3>
            </div>
            <span className="text-[10px] text-slate-400">Scale: 1:1000 Synthetic Outpost</span>
          </div>

          {/* 2D Canvas Viewport */}
          <div className="relative w-full aspect-video bg-soc-950 rounded-xl border border-soc-750 overflow-hidden p-4 shadow-inner flex flex-col justify-between">
            {/* Background Grid Pattern */}
            <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#00f0ff_1px,transparent_1px),linear-gradient(to_bottom,#00f0ff_1px,transparent_1px)] bg-[size:32px_32px]"></div>

            {/* Top Border Line */}
            <div className="relative z-10 flex items-center justify-between px-2 pt-1 border-b border-dashed border-red-500/40 pb-2">
              <span className="text-[10px] font-bold text-red-400 tracking-widest uppercase flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                INTERNATIONAL FRONTIER LINE • RESTRICTED PERIMETER
              </span>
              <span className="text-[9px] text-slate-500 font-mono">SECTORS A - D</span>
            </div>

            {/* Middle: Monitored Sectors & Cameras */}
            <div className="relative z-10 grid grid-cols-4 gap-2 my-auto">
              {twinState?.sectors?.map((sec, idx) => {
                const cam = twinState.cameras?.[idx];
                const isOffline = cam?.status === 'OFFLINE';
                return (
                  <div
                    key={sec.id}
                    onClick={() => setSelectedCamera(cam?.id || 'CAM-01')}
                    className={`p-3 rounded-lg border transition cursor-pointer flex flex-col justify-between h-36 ${
                      selectedCamera === cam?.id
                        ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                        : 'bg-soc-900/80 border-soc-750 hover:border-soc-600'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between pb-1">
                        <span className="font-bold text-white text-[11px]">{cam?.id}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                          isOffline
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-emerald-500/20 text-emerald-300'
                        }`}>
                          {cam?.status || 'ONLINE'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 truncate">{sec.name}</p>
                      <p className="text-[9px] text-slate-500 italic">{sec.terrain}</p>
                    </div>

                    {/* Restricted Zone Polygon representation */}
                    <div className="p-1.5 rounded bg-red-950/30 border border-dashed border-red-500/50 text-[9px] text-red-300 text-center">
                      Restricted Polygon
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Spawned Entities Overlay */}
            {twinState?.entities?.map((e) => (
              <div
                key={e.id}
                style={{ left: `${e.x}%`, top: `${e.y}%` }}
                className="absolute z-20 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none"
              >
                <div className={`p-1.5 rounded-full border shadow-lg ${
                  e.type === 'person'
                    ? 'bg-cyan-500 text-black border-white animate-bounce'
                    : 'bg-amber-500 text-black border-white animate-bounce'
                }`}>
                  {e.type === 'person' ? <User className="w-3.5 h-3.5" /> : <Truck className="w-3.5 h-3.5" />}
                </div>
                <span className="text-[8px] bg-black/80 px-1 rounded text-cyan-300 mt-0.5 font-bold whitespace-nowrap">
                  {e.id}
                </span>
              </div>
            ))}

            {/* Bottom: Highway / Base Road */}
            <div className="relative z-10 flex items-center justify-between px-2 pt-2 border-t border-soc-700">
              <span className="text-[10px] text-slate-400">PATROL ACCESS ROAD • OUTPOST BASE</span>
              <span className="text-[9px] text-cyan-400">Active Camera: {selectedCamera}</span>
            </div>
          </div>
        </div>

        {/* Right: Simulation Scenario Control Deck */}
        <div className="bg-soc-850 border border-soc-700 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-soc-750">
            <Play className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">Scenario Injection Controls</h3>
          </div>

          {/* Camera Focus Selector */}
          <div className="space-y-1">
            <label className="text-slate-400 text-[11px]">Monitored Target Post:</label>
            <select
              value={selectedCamera}
              onChange={(e) => setSelectedCamera(e.target.value)}
              className="w-full bg-soc-900 border border-soc-700 rounded-lg p-2 text-white text-xs focus:outline-none focus:border-cyan-500 font-mono"
            >
              <option value="CAM-01">CAM-01 (Sector A — Highway 104)</option>
              <option value="CAM-02">CAM-02 (Sector B — Riverine Basin)</option>
              <option value="CAM-03">CAM-03 (Sector C — Checkpoint Charlie)</option>
              <option value="CAM-04">CAM-04 (Sector D — Mountain Pass)</option>
            </select>
          </div>

          {/* Spawn Entity Controls */}
          <div className="space-y-2 pt-1">
            <span className="text-[11px] text-slate-400 font-bold block">1. ENTITY SPAWNING</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleSpawn('person')}
                className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-soc-800 hover:bg-soc-750 text-cyan-300 border border-soc-700 hover:border-cyan-400 text-xs transition"
              >
                <User className="w-3.5 h-3.5" />
                <span>+ Spawn Person</span>
              </button>
              <button
                onClick={() => handleSpawn('vehicle')}
                className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-soc-800 hover:bg-soc-750 text-amber-300 border border-soc-700 hover:border-amber-400 text-xs transition"
              >
                <Truck className="w-3.5 h-3.5" />
                <span>+ Spawn Vehicle</span>
              </button>
            </div>
          </div>

          {/* Security Incident Triggers */}
          <div className="space-y-2 pt-2 border-t border-soc-750">
            <span className="text-[11px] text-slate-400 font-bold block">2. SECURITY INCIDENT SCENARIOS</span>
            <div className="space-y-1.5">
              <button
                onClick={() => handleTriggerEvent('intrusion')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 text-xs transition font-semibold"
              >
                <span className="flex items-center gap-2">
                  <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                  <span>Trigger Restricted Zone Intrusion</span>
                </span>
                <span className="text-[10px] text-red-400">CRITICAL</span>
              </button>

              <button
                onClick={() => handleTriggerEvent('night_movement')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs transition font-semibold"
              >
                <span className="flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Trigger Night Stealth Movement</span>
                </span>
                <span className="text-[10px] text-amber-400">HIGH</span>
              </button>
            </div>
          </div>

          {/* System & Hardware Failure Injections */}
          <div className="space-y-2 pt-2 border-t border-soc-750">
            <span className="text-[11px] text-slate-400 font-bold block">3. RESILIENCE & FAILURE SIMULATION</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleTriggerEvent('camera_failure')}
                className="p-2 rounded bg-soc-900 hover:bg-soc-800 text-slate-300 border border-soc-750 text-[11px] transition text-center"
              >
                Sim Camera Fail
              </button>
              <button
                onClick={() => handleTriggerEvent('network_loss')}
                className="p-2 rounded bg-soc-900 hover:bg-soc-800 text-slate-300 border border-soc-750 text-[11px] transition text-center"
              >
                Sim Network Loss
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
