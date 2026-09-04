import React, { useState, useEffect } from 'react';
import { 
  Plane, Compass, Battery, Radio, Crosshair, Eye, X, ShieldAlert, 
  Navigation, Layers, Video, RotateCw, Sparkles, Target, Zap, Activity,
  PowerOff, Play, CheckCircle2, AlertOctagon, Anchor
} from 'lucide-react';
import { api } from '../services/api';

export default function DroneReconModal({ isOpen, onClose, initialDroneId = 'SSB-UAV-DRONE-04' }) {
  const [selectedDroneId, setSelectedDroneId] = useState(initialDroneId);
  const [fleet, setFleet] = useState([]);
  const [telemetry, setTelemetry] = useState(null);
  const [flirMode, setFlirMode] = useState('ironbow'); // ironbow, whitehot, blackhot
  const [selectedWaypoint, setSelectedWaypoint] = useState('WP-01');
  const [commandSuccess, setCommandSuccess] = useState(null);
  const [orbitAngle, setOrbitAngle] = useState(0);

  useEffect(() => {
    if (isOpen) {
      fetchFleetAndTelemetry();
      const interval = setInterval(fetchFleetAndTelemetry, 1500);
      return () => clearInterval(interval);
    }
  }, [isOpen, selectedDroneId]);

  // Smooth client-side orbit animation ticker
  useEffect(() => {
    let animId;
    if (isOpen && telemetry?.orbit_active) {
      const updateAngle = () => {
        setOrbitAngle((prev) => (prev + 0.8) % 360);
        animId = requestAnimationFrame(updateAngle);
      };
      animId = requestAnimationFrame(updateAngle);
    }
    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [isOpen, telemetry?.orbit_active]);

  const fetchFleetAndTelemetry = async () => {
    try {
      const [fleetData, telemData] = await Promise.all([
        api.getDroneFleet(),
        api.getDroneTelemetry(selectedDroneId)
      ]);
      setFleet(fleetData || []);
      setTelemetry(telemData);
    } catch (e) {
      console.error("Drone telemetry fetch error:", e);
    }
  };

  const handleSendCommand = async (cmd, wpId) => {
    try {
      const res = await api.sendDroneCommand({
        drone_id: selectedDroneId,
        command: cmd,
        target_sector: wpId || telemetry?.sector || 'SEC-A',
        altitude_m: cmd === 'STOP_SURVEILLANCE' ? 0 : 118
      });

      if (cmd === 'ORBIT_TARGET') {
        setSelectedWaypoint('WP-01');
        setCommandSuccess(`🎯 360° Tactical Orbit & Target Tracking Engaged for ${selectedDroneId}!`);
      } else if (cmd === 'STOP_SURVEILLANCE' || cmd === 'RETURN_TO_BASE') {
        setCommandSuccess(`🛑 Surveillance Stopped! ${selectedDroneId} returned to base & docked on standby pad.`);
      } else if (cmd === 'DEPLOY_DRONE') {
        setCommandSuccess(`🚀 ${selectedDroneId} launched and deployed on active perimeter patrol!`);
      } else {
        setSelectedWaypoint(wpId || 'WP-02');
        setCommandSuccess(`🚀 Autopilot resumed standard perimeter sweep flight plan for ${selectedDroneId}.`);
      }

      await fetchFleetAndTelemetry();
      setTimeout(() => setCommandSuccess(null), 3500);
    } catch (e) {
      setCommandSuccess(`❌ Error: ${e.message}`);
    }
  };

  if (!isOpen) return null;

  const isDeployed = telemetry?.is_deployed !== false && telemetry?.flight_mode !== 'STANDBY_LANDED';
  const isOrbiting = isDeployed && (telemetry?.orbit_active || telemetry?.flight_mode === 'ORBIT_TRACKING');
  const targetLock = telemetry?.target_lock || {};

  // Compute tactical orbit reticle offset
  const rad = (orbitAngle * Math.PI) / 180;
  const orbitOffsetX = isOrbiting ? Math.cos(rad) * 45 : 0;
  const orbitOffsetY = isOrbiting ? Math.sin(rad) * 25 : 0;

  // Stream Camera mapping
  const camStream = telemetry?.sector === 'SEC-B' ? 'CAM-02' : telemetry?.sector === 'SEC-C' ? 'CAM-03' : telemetry?.sector === 'SEC-D' ? 'CAM-04' : 'CAM-01';

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-soc-900 border border-soc-700 rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden shadow-2xl font-mono text-xs select-none">
        
        {/* Top Header & Fleet Selector Bar */}
        <div className="bg-soc-850 border-b border-soc-700/80 px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${
              !isDeployed
                ? 'bg-slate-700/40 border-slate-600 text-slate-400'
                : isOrbiting 
                ? 'bg-red-500/20 border-red-500/40 text-red-400 animate-pulse'
                : 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400'
            }`}>
              <Plane className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white tracking-wide text-sm">
                  UAV RECONNAISSANCE PLATFORM // {telemetry?.callsign || selectedDroneId}
                </span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold border ${
                  !isDeployed
                    ? 'bg-slate-800 text-slate-400 border-slate-700'
                    : isOrbiting 
                    ? 'bg-red-500/20 text-red-300 border-red-500/40 animate-pulse'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                }`}>
                  {!isDeployed ? 'STANDBY BASE DOCKED' : isOrbiting ? '360° ORBIT TRACKING' : 'AIRBORNE PATROL'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-sans">
                {telemetry?.name || 'Tactical UAV Platform'} • Model: {telemetry?.model || 'Tactical Multi-Rotor'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* FLIR Palette Switcher */}
            <div className="flex items-center gap-1 bg-soc-950 p-1 rounded border border-soc-750 text-[10px]">
              <button
                onClick={() => setFlirMode('ironbow')}
                className={`px-2 py-0.5 rounded transition ${flirMode === 'ironbow' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold' : 'text-slate-400'}`}
              >
                FLIR Ironbow
              </button>
              <button
                onClick={() => setFlirMode('whitehot')}
                className={`px-2 py-0.5 rounded transition ${flirMode === 'whitehot' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold' : 'text-slate-400'}`}
              >
                White-Hot
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-soc-800 transition"
              title="Close Flight HUD"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Drone Fleet Switcher Tabs */}
        <div className="h-10 bg-soc-900 border-b border-soc-700/80 px-4 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 font-semibold uppercase mr-1">FLEET:</span>
            {fleet.map((d) => {
              const isSelected = selectedDroneId === d.drone_id;
              const isDroneDeployed = d.is_deployed;
              const isDroneOrbiting = d.orbit_active;
              return (
                <button
                  key={d.drone_id}
                  onClick={() => setSelectedDroneId(d.drone_id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono transition ${
                    isSelected
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm font-bold'
                      : 'bg-soc-800 text-slate-400 hover:text-slate-200 hover:bg-soc-750'
                  }`}
                >
                  <Plane className={`w-3 h-3 ${isDroneOrbiting ? 'text-amber-400 animate-spin' : isDroneDeployed ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <span>{d.callsign.replace('SSB-UAV-', '')}</span>
                  <span className={`text-[8px] px-1 rounded ${
                    isDroneOrbiting ? 'bg-amber-500/30 text-amber-300' : isDroneDeployed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-400'
                  }`}>
                    {d.sector}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3 text-[10px] text-slate-400">
            <span>ACTIVE FLEET: {fleet.filter(f => f.is_deployed).length}/{fleet.length} AIRBORNE</span>
          </div>
        </div>

        {/* Main Viewport & Flight HUD */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Airborne Video Canvas (Left 70%) */}
          <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
            {/* Thermal Filter Stream Simulation */}
            {isDeployed ? (
              <div
                className={`w-full h-full relative overflow-hidden flex items-center justify-center ${
                  flirMode === 'ironbow'
                    ? 'filter hue-rotate-15 contrast-150 saturate-200'
                    : 'filter grayscale contrast-200 invert'
                }`}
              >
                <img
                  src={`/api/cameras/${camStream}/stream`}
                  alt="Airborne UAV Stream"
                  className="w-full h-full object-cover pointer-events-none"
                />
              </div>
            ) : (
              <div className="w-full h-full bg-soc-950 flex flex-col items-center justify-center p-8 text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-soc-850 border border-slate-700 flex items-center justify-center text-slate-500">
                  <PowerOff className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <span className="text-sm font-bold text-slate-300 tracking-wider">
                    SURVEILLANCE STOPPED // DRONE LANDED AT BASE
                  </span>
                  <p className="text-xs text-slate-500 font-sans max-w-md">
                    {selectedDroneId} is docked on the hangar standby pad in {telemetry?.sector || 'Sector'}. Click "Deploy & Launch UAV" to resume airborne ISR patrol.
                  </p>
                </div>
                <button
                  onClick={() => handleSendCommand('DEPLOY_DRONE', telemetry?.sector)}
                  className="mt-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold font-mono transition flex items-center gap-2 shadow-lg"
                >
                  <Play className="w-4 h-4" />
                  <span>Deploy & Launch UAV on Patrol</span>
                </button>
              </div>
            )}

            {/* Tactical Airborne HUD Overlay (When Deployed) */}
            {isDeployed && (
              <div className="absolute inset-0 pointer-events-none p-5 flex flex-col justify-between">
                {/* Top Heading Tape & Tactical Status */}
                <div className="flex items-center justify-between text-[11px] text-cyan-400 gap-2">
                  <div className="bg-black/70 px-3 py-1.5 rounded-lg border border-cyan-500/40 backdrop-blur-sm flex items-center gap-2">
                    <Compass className={`w-3.5 h-3.5 ${isOrbiting ? 'text-amber-400 animate-spin' : 'text-cyan-400'}`} />
                    <span>HDG: {telemetry?.heading_deg || 284}° {isOrbiting ? '(ORBIT ROTATION)' : 'WNW'}</span>
                  </div>

                  <div className="bg-black/70 px-3 py-1.5 rounded-lg border border-cyan-500/40 backdrop-blur-sm flex items-center gap-4">
                    <span className="flex items-center gap-1.5">
                      <Battery className="w-3.5 h-3.5 text-emerald-400" />
                      {telemetry?.battery_pct || 81}% PWR
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-cyan-400" />
                      {telemetry?.link_quality_pct || 98}% RF LINK
                    </span>
                    <span className="text-amber-300 font-bold">
                      SAT: {telemetry?.gps?.satellites || 18} LOCK
                    </span>
                  </div>
                </div>

                {/* Center Tactical Crosshairs Reticle */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div 
                    className="relative transition-transform duration-300 ease-out"
                    style={{ transform: `translate(${orbitOffsetX}px, ${orbitOffsetY}px)` }}
                  >
                    {/* Outer Target Box */}
                    <div className={`w-44 h-36 border rounded-lg transition-colors ${
                      isOrbiting 
                        ? 'border-red-500/90 shadow-[0_0_20px_rgba(239,68,68,0.5)] bg-red-500/10' 
                        : 'border-cyan-400/60 shadow-[0_0_15px_rgba(0,240,255,0.25)]'
                    } flex flex-col justify-between p-2`}>
                      <div className="flex items-center justify-between text-[9px] font-mono">
                        <span className={isOrbiting ? 'text-red-300 font-bold' : 'text-cyan-300'}>
                          {isOrbiting ? '🎯 LOCKED: ORBITING' : 'TARGET: TRACKING'}
                        </span>
                        <span className="text-slate-300">
                          {isOrbiting ? `${telemetry?.orbit_radius_m || 150}m RNG` : '340m RNG'}
                        </span>
                      </div>

                      {/* Center Crosshair Pip */}
                      <div className="self-center flex items-center justify-center">
                        <Crosshair className={`w-6 h-6 ${isOrbiting ? 'text-red-400 animate-pulse' : 'text-cyan-300'}`} />
                      </div>

                      <div className="flex items-center justify-between text-[9px] font-mono">
                        <span className="text-slate-300">BRG: {targetLock.bearing_deg || 284}°</span>
                        <span className="text-amber-300 font-bold">CONF: 98%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom HUD Telemetry Overlay */}
                <div className="flex items-end justify-between text-[11px] text-cyan-400">
                  <div className="bg-black/70 p-3 rounded-lg border border-cyan-500/40 backdrop-blur-sm space-y-1">
                    <div className="flex items-center gap-3">
                      <span>ALT: <strong className="text-white font-mono">{telemetry?.altitude_agl_m || 118}m AGL</strong></span>
                      <span>SPD: <strong className="text-white font-mono">{telemetry?.airspeed_kmh || 32.4} km/h</strong></span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      GPS: {telemetry?.gps?.lat?.toFixed(5) || 34.2185}, {telemetry?.gps?.lon?.toFixed(5) || 74.8021}
                    </div>
                  </div>

                  <div className="bg-black/70 p-3 rounded-lg border border-cyan-500/40 backdrop-blur-sm text-right space-y-1">
                    <div className="text-amber-300 font-bold uppercase">
                      {isOrbiting ? '360° Tactical Orbit Engaged' : 'Perimeter Patrol Sweep'}
                    </div>
                    <div className="text-[10px] text-slate-300 font-sans">
                      Target: {targetLock.target_id || 'PERSON #17'} ({telemetry?.sector || 'SEC-A'})
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Flight Navigation & Waypoint Drawer (30%) */}
          <div className="w-full md:w-88 bg-soc-850 border-t md:border-t-0 md:border-l border-soc-700 p-4 space-y-4 overflow-y-auto">
            <div className="pb-3 border-b border-soc-700">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Flight Mission Controls</h4>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                  !isDeployed
                    ? 'bg-slate-800 text-slate-400 border border-slate-700'
                    : isOrbiting 
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                    : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                }`}>
                  {!isDeployed ? 'AUTOPILOT: DOCKED' : isOrbiting ? 'AUTOPILOT: ORBIT' : 'AUTOPILOT: SWEEP'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans mt-0.5">Automated Border Patrol Perimeter Flight Plan</p>
            </div>

            {/* Tactical Flight Action Controls */}
            <div className="space-y-2">
              <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Tactical Flight Actions:</span>
              <div className="grid grid-cols-1 gap-2">
                {/* 1. Orbit Target */}
                <button
                  onClick={() => handleSendCommand('ORBIT_TARGET', telemetry?.sector)}
                  disabled={!isDeployed}
                  className={`w-full py-2.5 px-3 rounded-lg font-bold transition flex items-center justify-center gap-2 text-xs shadow-lg ${
                    !isDeployed
                      ? 'bg-soc-800 text-slate-500 cursor-not-allowed border border-soc-700'
                      : isOrbiting
                      ? 'bg-red-600 hover:bg-red-500 text-white ring-2 ring-red-400 shadow-[0_0_15px_rgba(239,68,68,0.4)]'
                      : 'bg-red-600/85 hover:bg-red-600 text-white'
                  }`}
                >
                  <Crosshair className={`w-4 h-4 ${isOrbiting ? 'animate-spin' : ''}`} />
                  <span>{isOrbiting ? '🎯 Orbit & Tracking Active' : 'Orbit & Track Intrusion Target'}</span>
                </button>

                {/* 2. Resume Sweep / Launch */}
                {!isDeployed ? (
                  <button
                    onClick={() => handleSendCommand('DEPLOY_DRONE', telemetry?.sector)}
                    className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition flex items-center justify-center gap-2 text-xs shadow-md"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Deploy & Launch UAV</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleSendCommand('PATROL_PERIMETER', telemetry?.sector)}
                    className={`w-full py-2 px-3 rounded-lg border transition flex items-center justify-center gap-2 text-xs ${
                      !isOrbiting
                        ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-bold'
                        : 'bg-soc-750 hover:bg-soc-700 text-slate-200 border-soc-600'
                    }`}
                  >
                    <Navigation className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Resume Standard Perimeter Sweep</span>
                  </button>
                )}

                {/* 3. STOP UAV SURVEILLANCE / RETURN TO BASE */}
                <button
                  onClick={() => handleSendCommand('STOP_SURVEILLANCE', telemetry?.sector)}
                  className="w-full py-2 px-3 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 font-bold transition flex items-center justify-center gap-2 text-xs"
                  title="Stop UAV surveillance mission and return to base pad"
                >
                  <PowerOff className="w-3.5 h-3.5 text-amber-400" />
                  <span>Stop UAV Surveillance (Land / RTB)</span>
                </button>
              </div>

              {commandSuccess && (
                <div className="p-2.5 rounded-lg bg-soc-900 border border-cyan-500/40 text-[10px] text-cyan-300 text-center animate-fade-in shadow-md">
                  {commandSuccess}
                </div>
              )}
            </div>

            {/* Waypoint list */}
            <div className="space-y-2 pt-2 border-t border-soc-750">
              <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Patrol Waypoints:</span>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {telemetry?.waypoints?.map((wp) => {
                  const isWpOrbit = wp.status === 'ORBITING_TARGET';
                  return (
                    <div
                      key={wp.id}
                      onClick={() => handleSendCommand('PATROL_SECTOR', wp.id)}
                      className={`p-2 rounded-lg border cursor-pointer transition flex items-center justify-between ${
                        isWpOrbit
                          ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-semibold shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                          : selectedWaypoint === wp.id
                          ? 'bg-cyan-500/15 border-cyan-500 text-cyan-300 font-semibold'
                          : 'bg-soc-900 border-soc-750 hover:bg-soc-800 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Navigation className={`w-3.5 h-3.5 ${isWpOrbit ? 'text-amber-400 animate-spin' : ''}`} />
                        <div>
                          <span className="text-slate-200">{wp.name}</span>
                          <p className="text-[9px] text-slate-500">{wp.lat}, {wp.lon}</p>
                        </div>
                      </div>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                        isWpOrbit 
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                          : 'bg-soc-800 text-slate-400'
                      }`}>
                        {wp.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Live Flight Telemetry Specs */}
            <div className="p-3 rounded-lg bg-soc-900/90 border border-soc-750 space-y-1.5 text-[10px]">
              <div className="flex items-center justify-between text-slate-400">
                <span>DEPLOYMENT:</span>
                <span className={`font-bold font-mono ${isDeployed ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {isDeployed ? 'ACTIVE ISR AIRBORNE' : 'STANDBY BASE DOCKED'}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>FLIGHT MODE:</span>
                <span className="font-bold text-white font-mono">{telemetry?.flight_mode || 'PERIMETER_SWEEP'}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>ORBIT RADIUS:</span>
                <span className="text-cyan-300 font-mono">{telemetry?.orbit_radius_m || 150}m</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>TARGET BEARING:</span>
                <span className="text-amber-300 font-mono">{targetLock?.bearing_deg || 284}°</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
