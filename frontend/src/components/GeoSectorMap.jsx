import React, { useState, useEffect } from 'react';
import { 
  MapPin, ShieldAlert, Radio, Eye, Video, Activity, Compass, Layers, 
  AlertTriangle, Camera, Plane, Crosshair, RotateCw, Target, Battery, Navigation, Maximize2, PowerOff, Play
} from 'lucide-react';
import { api } from '../services/api';
import RiskBadge from './RiskBadge';
import DroneReconModal from './DroneReconModal';

export default function GeoSectorMap({ onSelectCameraAndFocus }) {
  const [nodes, setNodes] = useState([]);
  const [selectedEntity, setSelectedEntity] = useState(null); // { type: 'SENSOR' | 'UAV', data: ... }
  const [droneTelemetry, setDroneTelemetry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orbitAngle, setOrbitAngle] = useState(0);
  const [isDroneModalOpen, setIsDroneModalOpen] = useState(false);
  const [commandFeedback, setCommandFeedback] = useState(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, []);

  // Smooth animation ticker for UAV orbit and sweep
  useEffect(() => {
    let animId;
    const updateAngle = () => {
      setOrbitAngle((prev) => (prev + 0.6) % 360);
      animId = requestAnimationFrame(updateAngle);
    };
    animId = requestAnimationFrame(updateAngle);
    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, []);

  const fetchData = async () => {
    try {
      const [geoData, droneData] = await Promise.all([
        api.getGeoNodes(),
        api.getDroneTelemetry()
      ]);
      setNodes(geoData);
      setDroneTelemetry(droneData);

      if (!selectedEntity && geoData.length > 0) {
        setSelectedEntity({ type: 'SENSOR', data: geoData[0] });
      } else if (selectedEntity?.type === 'SENSOR') {
        const updated = geoData.find(n => n.id === selectedEntity.data.id);
        if (updated) setSelectedEntity({ type: 'SENSOR', data: updated });
      }
    } catch (err) {
      console.error('Failed to fetch map data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDroneCommand = async (cmd, sector = 'SEC-A') => {
    try {
      // Optimistic update for instant visual feedback
      if (cmd === 'STOP_SURVEILLANCE' || cmd === 'RETURN_TO_BASE' || cmd === 'LAND_DRONE') {
        setDroneTelemetry(prev => prev ? ({
          ...prev,
          is_deployed: false,
          flight_mode: 'STANDBY_LANDED',
          status: 'SURVEILLANCE_STOPPED',
          altitude_agl_m: 0,
          airspeed_kmh: 0,
          orbit_active: false
        }) : prev);
        setCommandFeedback('🛑 UAV Surveillance Stopped (Landed at Base)');
      } else if (cmd === 'ORBIT_TARGET') {
        setDroneTelemetry(prev => prev ? ({
          ...prev,
          is_deployed: true,
          flight_mode: 'ORBIT_TRACKING',
          status: 'ORBIT_TRACKING_ENGAGED',
          altitude_agl_m: 118,
          airspeed_kmh: 38.5,
          orbit_active: true
        }) : prev);
        setCommandFeedback('🎯 Orbit & Auto-Track Engaged!');
      } else if (cmd === 'DEPLOY_DRONE') {
        setDroneTelemetry(prev => prev ? ({
          ...prev,
          is_deployed: true,
          flight_mode: 'PERIMETER_SWEEP',
          status: 'AIRBORNE_ISR_MISSION',
          altitude_agl_m: 118,
          airspeed_kmh: 32.4,
          orbit_active: false
        }) : prev);
        setCommandFeedback('🚀 UAV Launched & Active Patrol Deployed!');
      } else {
        setDroneTelemetry(prev => prev ? ({
          ...prev,
          is_deployed: true,
          flight_mode: 'PERIMETER_SWEEP',
          status: 'AIRBORNE_ISR_MISSION',
          altitude_agl_m: 118,
          airspeed_kmh: 32.4,
          orbit_active: false
        }) : prev);
        setCommandFeedback('🚀 Resumed Standard Patrol Sweep');
      }

      await api.sendDroneCommand({
        drone_id: droneTelemetry?.drone_id || 'SSB-UAV-DRONE-04',
        command: cmd,
        target_sector: sector,
        altitude_m: cmd === 'STOP_SURVEILLANCE' ? 0 : 118
      });
      await fetchData();
      setTimeout(() => setCommandFeedback(null), 3500);
    } catch (err) {
      setCommandFeedback(`❌ Error: ${err.message}`);
    }
  };

  const isDeployed = droneTelemetry?.is_deployed !== false && 
                     droneTelemetry?.flight_mode !== 'STANDBY_LANDED' && 
                     droneTelemetry?.status !== 'SURVEILLANCE_STOPPED';
  const isOrbiting = isDeployed && (droneTelemetry?.orbit_active || droneTelemetry?.flight_mode === 'ORBIT_TRACKING');
  const rad = (orbitAngle * Math.PI) / 180;

  // Calculate live UAV position coordinates on map
  let uavX = 14;
  let uavY = 28;
  let uavHeading = 0;

  if (!isDeployed) {
    // Landed & docked at Base Landing Pad / Hangar Station (Sector A Base)
    uavX = 14;
    uavY = 28;
    uavHeading = 0;
  } else if (isOrbiting) {
    // Orbiting around Sector A (CAM-01: x=22, y=38)
    const targetX = 22;
    const targetY = 38;
    const radiusX = 6.5;
    const radiusY = 8.5;
    uavX = targetX + Math.cos(rad) * radiusX;
    uavY = targetY + Math.sin(rad) * radiusY;
    uavHeading = (orbitAngle + 90) % 360;
  } else {
    // Cruising between Sector A (22, 38) and Riverine Basin (48, 62)
    const progress = (Math.sin(rad * 0.5) + 1) / 2; // 0 to 1 back and forth
    uavX = 22 + progress * (48 - 22);
    uavY = 38 + progress * (62 - 38);
    uavHeading = Math.cos(rad * 0.5) >= 0 ? 140 : 320;
  }

  const selectedNode = selectedEntity?.type === 'SENSOR' ? selectedEntity.data : null;
  const isUavSelected = selectedEntity?.type === 'UAV';

  return (
    <div className="flex-1 bg-soc-900 flex flex-col md:flex-row overflow-hidden select-none">
      {/* Main Tactical Map Canvas (Left 70%) */}
      <div className="flex-1 relative bg-soc-900 overflow-hidden flex flex-col border-r border-soc-700/80">
        {/* Map Top Status Bar */}
        <div className="h-10 bg-soc-850/90 border-b border-soc-700/80 px-4 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2 text-slate-300">
            <Compass className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-white uppercase tracking-wider">Geospatial Tactical Sector Grid</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">Sector Perimeter Patrol Line 104-N</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            {/* Live UAV Status Indicator */}
            <button
              onClick={() => setSelectedEntity({ type: 'UAV', data: droneTelemetry })}
              className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded border transition font-bold ${
                !isDeployed
                  ? 'bg-slate-800/90 text-slate-300 border-slate-700'
                  : isOrbiting 
                  ? 'bg-red-500/20 text-red-300 border-red-500/50 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.3)]'
                  : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
              }`}
            >
              <Plane className="w-3.5 h-3.5" />
              <span>SSB-UAV-DRONE-04: {!isDeployed ? 'LANDED / STANDBY' : isOrbiting ? '360° ORBITING' : 'AIRBORNE'}</span>
            </button>

            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              {nodes.length} SENSORS
            </span>
            <span className="flex items-center gap-1 text-red-400">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-ping"></span>
              {nodes.filter(n => n.active_threat).length} BREACHES
            </span>
          </div>
        </div>

        {/* 2D Tactical Terrain Map Area */}
        <div className="flex-1 relative bg-[#090d14] overflow-hidden">
          {/* Tactical Grid Background Pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#141a24_1px,transparent_1px),linear-gradient(to_bottom,#141a24_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-40"></div>

          {/* Compass Rose Watermark */}
          <div className="absolute top-4 right-4 text-[10px] font-mono text-slate-600 bg-soc-900/60 p-2 rounded border border-soc-800 pointer-events-none z-10">
            <div>GRID REF: 34°12'N 74°48'E</div>
            <div>ELEVATION: 1,420m - 2,850m</div>
            <div>DATUM: WGS-84 / UTM-43N</div>
            <div className="text-cyan-400/80 font-bold mt-1">UAV ALT: {droneTelemetry?.altitude_agl_m || 118}m AGL</div>
          </div>

          {/* SVG Map Graphics Layer (Border Line, River, Road, Nodes, UAV Flight Track) */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {/* River Basin Polygon */}
            <path
              d="M 0,220 Q 300,280 500,420 T 1200,550"
              fill="none"
              stroke="#1e3a8a"
              strokeWidth="28"
              opacity="0.35"
              strokeLinecap="round"
            />
            <path
              d="M 0,220 Q 300,280 500,420 T 1200,550"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2"
              opacity="0.5"
              strokeDasharray="6 3"
            />

            {/* Tactical Perimeter Patrol Road */}
            <path
              d="M 100,500 L 250,320 L 550,440 L 850,260 L 1100,180"
              fill="none"
              stroke="#475569"
              strokeWidth="6"
              opacity="0.6"
            />

            {/* International Border Fencing Line */}
            <path
              d="M 50,480 L 230,290 L 520,410 L 830,220 L 1150,140"
              fill="none"
              stroke="#ef4444"
              strokeWidth="2.5"
              strokeDasharray="8 4"
              opacity="0.7"
            />

            {/* Connection Rays Between Sensors */}
            {nodes.length > 1 && (
              <polyline
                points={nodes.map(n => `${(n.x / 100) * 100}%,${(n.y / 100) * 100}%`).join(' ')}
                fill="none"
                stroke="#00f0ff"
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.2"
              />
            )}

            {/* UAV Flight Track and Orbit Path Rendering (only when airborne) */}
            {isDeployed && (
              isOrbiting ? (
                /* Circular Tactical Orbit Trajectory over Sector A (22%, 38%) */
                <g>
                  <ellipse
                    cx="22%"
                    cy="38%"
                    rx="6.5%"
                    ry="8.5%"
                    fill="rgba(239, 68, 68, 0.08)"
                    stroke="#ef4444"
                    strokeWidth="2"
                    strokeDasharray="6 4"
                    opacity="0.85"
                  />
                  {/* Ray from UAV to Target */}
                  <line
                    x1={`${uavX}%`}
                    y1={`${uavY}%`}
                    x2="22%"
                    y2="38%"
                    stroke="#ef4444"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                    opacity="0.9"
                  />
                </g>
              ) : (
                /* Standard Linear Waypoint Flight Corridor */
                <g>
                  <polyline
                    points="22%,38% 48%,62% 74%,42% 88%,25%"
                    fill="none"
                    stroke="#00f0ff"
                    strokeWidth="2"
                    strokeDasharray="5 5"
                    opacity="0.6"
                  />
                </g>
              )
            )}
          </svg>

          {/* Base Hangar & UAV Docking Station Pad */}
          <div
            style={{ left: '14%', top: '28%' }}
            className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 flex flex-col items-center"
          >
            <div className="w-10 h-10 rounded-xl border border-dashed border-cyan-500/40 bg-soc-950/60 flex items-center justify-center shadow-inner">
              <span className="font-mono font-bold text-xs text-cyan-400/70">H</span>
            </div>
            <span className="mt-1 text-[8px] font-mono text-slate-500 whitespace-nowrap">
              BASE PAD 01
            </span>
          </div>

          {/* Render Target Marker when UAV is Orbiting Target */}
          {isOrbiting && (
            <div 
              style={{ left: '22%', top: '38%' }}
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-15 flex flex-col items-center"
            >
              <div className="w-10 h-10 rounded-full border-2 border-red-500/80 bg-red-950/40 flex items-center justify-center animate-ping"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
                <Target className="w-5 h-5 text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.9)]" />
              </div>
              <span className="mt-6 px-1.5 py-0.2 bg-red-950/90 border border-red-500 text-red-300 text-[9px] font-mono font-bold rounded shadow-lg">
                TARGET #17 [LOCKED]
              </span>
            </div>
          )}

          {/* Render Interactive UAV Drone on Map */}
          <div
            style={{ left: `${uavX}%`, top: `${uavY}%` }}
            onClick={() => setSelectedEntity({ type: 'UAV', data: droneTelemetry })}
            className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group z-30 transition-all duration-300"
          >
            {/* Dynamic Sensor / Radar FOV Beam (only when airborne) */}
            {isDeployed && (
              <div 
                className="absolute -inset-10 rounded-full pointer-events-none"
                style={{
                  background: isOrbiting 
                    ? 'radial-gradient(circle, rgba(239,68,68,0.3) 0%, rgba(239,68,68,0) 70%)'
                    : 'radial-gradient(circle, rgba(0,240,255,0.25) 0%, rgba(0,240,255,0) 70%)'
                }}
              ></div>
            )}

            {/* Airborne Radar Pulsing Ring (only when airborne) */}
            {isDeployed && (
              <span className={`absolute -inset-3 rounded-full animate-ping ${isOrbiting ? 'bg-red-500/40' : 'bg-cyan-500/30'}`}></span>
            )}
            
            {/* UAV Aircraft Pin with Rotating Heading */}
            <div
              className={`w-11 h-11 rounded-full flex items-center justify-center font-mono font-bold shadow-2xl transition-all ${
                !isDeployed
                  ? 'bg-slate-800 text-slate-300 border-2 border-slate-600'
                  : isUavSelected
                  ? 'bg-amber-400 text-black ring-4 ring-amber-300/50 scale-125 shadow-[0_0_25px_rgba(245,158,11,0.8)]'
                  : isOrbiting
                  ? 'bg-red-600 text-white ring-4 ring-red-400/50 shadow-[0_0_20px_rgba(239,68,68,0.7)] animate-pulse'
                  : 'bg-cyan-500 text-black ring-4 ring-cyan-400/40 hover:scale-115 shadow-[0_0_20px_rgba(0,240,255,0.6)]'
              }`}
            >
              <div style={{ transform: `rotate(${uavHeading - 45}deg)` }} className="transition-transform duration-100">
                <Plane className="w-6 h-6" />
              </div>
            </div>

            {/* Tactical Airborne UAV Label Tag */}
            <div className="absolute top-12 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-mono px-2 py-0.5 rounded bg-soc-950/95 border border-cyan-500/60 text-slate-200 pointer-events-none group-hover:border-amber-400 transition shadow-2xl flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${isDeployed ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}></span>
              <span className="font-bold text-white">SSB-UAV-DRONE-04</span>
              <span className="text-cyan-300 font-mono">
                [{isDeployed ? `${droneTelemetry?.altitude_agl_m || 118}m` : 'LANDED'}]
              </span>
            </div>
          </div>

          {/* Render Interactive Fixed CCTV / Sensor Node Blips */}
          {nodes.map((node) => {
            const isSelected = selectedEntity?.type === 'SENSOR' && selectedNode?.id === node.id;
            const hasThreat = node.active_threat;

            return (
              <div
                key={node.id}
                style={{ left: `${node.x}%`, top: `${node.y}%` }}
                onClick={() => setSelectedEntity({ type: 'SENSOR', data: node })}
                className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group z-20"
              >
                {/* Pulsating Radar Ping on Active Breach */}
                {hasThreat && (
                  <>
                    <span className="absolute -inset-4 rounded-full bg-red-500/30 animate-ping"></span>
                    <span className="absolute -inset-8 rounded-full border border-red-500/40 animate-pulse"></span>
                  </>
                )}

                {/* Sensor Pin Node */}
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-mono font-bold text-xs shadow-2xl transition-all ${
                    isSelected
                      ? 'bg-cyan-500 text-black ring-4 ring-cyan-400/40 scale-110 shadow-[0_0_20px_rgba(0,240,255,0.5)]'
                      : hasThreat
                      ? 'bg-red-500 text-white ring-4 ring-red-500/50 animate-bounce'
                      : 'bg-soc-800 text-cyan-300 border-2 border-soc-600 group-hover:border-cyan-400'
                  }`}
                >
                  <Camera className="w-4 h-4" />
                </div>

                {/* Tactical Label Tag */}
                <div className="absolute top-10 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-mono px-2 py-0.5 rounded bg-soc-900/90 border border-soc-700 text-slate-200 pointer-events-none group-hover:border-cyan-500 transition shadow-lg">
                  <span className="font-bold text-white">{node.id}</span>
                  <span className="text-slate-400 ml-1">({node.sector_code})</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Detail Inspector Drawer (30% width) */}
      <div className="w-full md:w-96 bg-soc-850 border-t md:border-t-0 md:border-l border-soc-700/80 p-4 flex flex-col justify-between overflow-y-auto font-mono text-xs select-none">
        {/* UAV Detail View */}
        {isUavSelected ? (
          <div className="space-y-4">
            {/* Header */}
            <div className="pb-3 border-b border-soc-700 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Plane className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white">{droneTelemetry?.callsign || 'SSB-UAV-DRONE-04'}</h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                    !isDeployed
                      ? 'bg-slate-800 text-slate-400 border-slate-700'
                      : isOrbiting 
                      ? 'bg-red-500/20 text-red-300 border-red-500/40' 
                      : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  }`}>
                    {!isDeployed ? 'LANDED / STANDBY' : isOrbiting ? '360° ORBITING' : 'AIRBORNE'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-sans mt-0.5">{droneTelemetry?.model || 'Autonomous Tactical ISR Platform'}</p>
                <p className="text-[11px] text-slate-500">AUTOPILOT FLIGHT CONTROLLER // MESH LINK #4</p>
              </div>
            </div>

            {/* Live UAV FLIR Thermal Camera Stream Thumbnail */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-cyan-400" />
                  Airborne FLIR Thermal Feed
                </span>
                <span className="text-[10px] text-amber-400 font-mono">IRONBOW PALETTE</span>
              </div>
              <div className="w-full aspect-video bg-black rounded-lg border border-soc-700 overflow-hidden relative shadow-inner">
                <img
                  src="/api/cameras/CAM-01/stream"
                  alt="UAV Stream"
                  className="w-full h-full object-cover pointer-events-none filter hue-rotate-15 contrast-150 saturate-200"
                />
                <div className="absolute inset-0 pointer-events-none p-2 flex flex-col justify-between text-[10px] text-cyan-300">
                  <div className="flex items-center justify-between bg-black/60 px-2 py-0.5 rounded">
                    <span>ALT: {isDeployed ? `${droneTelemetry?.altitude_agl_m || 118}m` : '0m (Landed)'}</span>
                    <span>SPD: {isDeployed ? `${droneTelemetry?.airspeed_kmh || 32.4} km/h` : '0.0 km/h'}</span>
                  </div>
                  <div className="self-center">
                    <Crosshair className="w-6 h-6 text-red-500 opacity-90 animate-pulse" />
                  </div>
                  <div className="text-center bg-black/60 px-2 py-0.5 rounded text-[9px] text-red-300">
                    TARGET LOCK: {isDeployed ? (droneTelemetry?.target_lock?.target_id || 'PERSON #17') : 'STANDBY BASE PAD'}
                  </div>
                </div>
              </div>
            </div>

            {/* Flight Telemetry Parameters */}
            <div className="p-3 rounded-lg bg-soc-900 border border-soc-750 space-y-2">
              <h4 className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Airborne Telemetry</h4>
              <div className="grid grid-cols-2 gap-2 text-slate-300 text-[11px]">
                <div>
                  <span className="text-slate-500 block text-[10px]">FLIGHT MODE:</span>
                  <span className="text-amber-300 font-bold">{!isDeployed ? 'STANDBY_LANDED' : droneTelemetry?.flight_mode || 'PERIMETER_SWEEP'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">BATTERY / LINK:</span>
                  <span className="text-emerald-400 font-bold">{droneTelemetry?.battery_pct || 79}% / {droneTelemetry?.link_quality_pct || 98}%</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">ALTITUDE AGL:</span>
                  <span className="text-cyan-300 font-bold">{isDeployed ? `${droneTelemetry?.altitude_agl_m || 118}m AGL` : '0m AGL (Landed)'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">AIRSPEED:</span>
                  <span className="text-cyan-300 font-bold">{isDeployed ? `${droneTelemetry?.airspeed_kmh || 32.4} km/h` : '0.0 km/h'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">ORBIT RADIUS:</span>
                  <span className="text-slate-200 font-bold">{isDeployed ? `${droneTelemetry?.orbit_radius_m || 150}m` : 'N/A (Landed)'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">GPS FIX:</span>
                  <span className="text-slate-200 font-bold">{droneTelemetry?.gps?.lat?.toFixed(4)}, {droneTelemetry?.gps?.lon?.toFixed(4)}</span>
                </div>
              </div>
            </div>

            {/* Tactical Actions on Map */}
            <div className="space-y-2">
              <h4 className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Flight Controls</h4>
              <div className="grid grid-cols-1 gap-2">
                {!isDeployed ? (
                  <button
                    onClick={() => handleDroneCommand('DEPLOY_DRONE', 'SEC-A')}
                    className="w-full py-2.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition flex items-center justify-center gap-2 text-xs shadow-lg"
                  >
                    <Play className="w-4 h-4" />
                    <span>Launch & Deploy UAV Patrol</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => handleDroneCommand('ORBIT_TARGET', 'SEC-A')}
                      className={`w-full py-2 px-3 rounded-lg font-bold transition flex items-center justify-center gap-2 text-xs ${
                        isOrbiting
                          ? 'bg-red-600 hover:bg-red-500 text-white ring-2 ring-red-400 shadow-md'
                          : 'bg-red-600/85 hover:bg-red-600 text-white'
                      }`}
                    >
                      <Crosshair className={`w-3.5 h-3.5 ${isOrbiting ? 'animate-spin' : ''}`} />
                      <span>{isOrbiting ? '🎯 360° Orbit & Track Active' : 'Orbit & Track Target on Map'}</span>
                    </button>

                    <button
                      onClick={() => handleDroneCommand('PATROL_PERIMETER', 'SEC-B')}
                      className="w-full py-2 px-3 rounded-lg bg-soc-750 hover:bg-soc-700 text-slate-200 border border-soc-600 transition flex items-center justify-center gap-2 text-xs"
                    >
                      <Navigation className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Resume Standard Patrol Sweep</span>
                    </button>

                    <button
                      onClick={() => handleDroneCommand('STOP_SURVEILLANCE', 'SEC-A')}
                      className="w-full py-2 px-3 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 font-bold transition flex items-center justify-center gap-2 text-xs"
                      title="Stop UAV surveillance mission and return to base pad"
                    >
                      <PowerOff className="w-3.5 h-3.5 text-amber-400" />
                      <span>Stop UAV Surveillance (Land / RTB)</span>
                    </button>
                  </>
                )}

                <button
                  onClick={() => setIsDroneModalOpen(true)}
                  className="w-full py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold transition shadow-[0_0_12px_rgba(0,240,255,0.25)] flex items-center justify-center gap-2 text-xs"
                >
                  <Maximize2 className="w-4 h-4" />
                  <span>Open Full FLIR Airborne HUD</span>
                </button>
              </div>

              {commandFeedback && (
                <div className="p-2 rounded bg-soc-900 border border-cyan-500/40 text-[10px] text-cyan-300 text-center animate-fade-in">
                  {commandFeedback}
                </div>
              )}
            </div>
          </div>
        ) : selectedNode ? (
          /* Fixed Sensor / CCTV Detail View */
          <div className="space-y-4">
            {/* Header */}
            <div className="pb-3 border-b border-soc-700 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">{selectedNode.id}</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-soc-750 text-cyan-300 border border-soc-600">
                    {selectedNode.sector_code}
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-sans mt-0.5">{selectedNode.name}</p>
                <p className="text-[11px] text-slate-500">{selectedNode.location}</p>
              </div>

              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                selectedNode.active_threat ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-emerald-500/15 text-emerald-400'
              }`}>
                {selectedNode.active_threat ? 'BREACH ACTIVE' : 'NOMINAL'}
              </span>
            </div>

            {/* Live Camera Snapshot Preview */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-cyan-400" />
                Live Sensor Feed Thumbnail
              </span>
              <div className="w-full aspect-video bg-black rounded-lg border border-soc-700 overflow-hidden relative shadow-inner">
                <img
                  src={`/api/cameras/${selectedNode.id}/stream`}
                  alt={selectedNode.id}
                  className="w-full h-full object-contain pointer-events-none"
                />
              </div>
            </div>

            {/* Sector Telemetry & Terrain Metrics */}
            <div className="p-3 rounded-lg bg-soc-900 border border-soc-750 space-y-2">
              <h4 className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Sector Parameters</h4>
              <div className="grid grid-cols-2 gap-2 text-slate-300 text-[11px]">
                <div>
                  <span className="text-slate-500 block text-[10px]">TERRAIN:</span>
                  <span>{selectedNode.terrain}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">AI DECISION:</span>
                  <span className="text-emerald-400 font-bold">ARMED</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">FPS / LATENCY:</span>
                  <span>{selectedNode.telemetry?.fps || 25.0} FPS ({selectedNode.telemetry?.latency_ms || 18}ms)</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">ACTIVE TRACKS:</span>
                  <span className="text-cyan-400 font-bold">{selectedNode.telemetry?.active_tracks || 0} Targets</span>
                </div>
              </div>
            </div>

            {/* Latest Incident on this Node */}
            {selectedNode.latest_event && (
              <div className="p-3 rounded-lg bg-red-950/25 border border-red-500/40 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-red-400 font-bold flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Latest Sector Breach
                  </span>
                  <RiskBadge level={selectedNode.latest_event.risk_level} score={selectedNode.latest_event.risk_score} size="sm" />
                </div>
                <p className="text-slate-200 text-xs">{selectedNode.latest_event.type}</p>
                <p className="text-[10px] text-slate-400 font-mono">INCIDENT ID: {selectedNode.latest_event.id}</p>
              </div>
            )}

            {/* Action to switch to live feed */}
            <button
              onClick={() => onSelectCameraAndFocus(selectedNode.id)}
              className="w-full py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs font-mono transition shadow-[0_0_12px_rgba(0,240,255,0.25)] flex items-center justify-center gap-2"
            >
              <Eye className="w-4 h-4" />
              <span>Switch to Live Tactical CCTV Stream</span>
            </button>
          </div>
        ) : (
          <div className="text-center text-slate-500 py-12">
            Select a camera node or the UAV on the map to inspect telemetry.
          </div>
        )}
      </div>

      {/* Embedded Full FLIR Airborne Drone Recon Modal */}
      {isDroneModalOpen && (
        <DroneReconModal
          isOpen={isDroneModalOpen}
          onClose={() => setIsDroneModalOpen(false)}
        />
      )}
    </div>
  );
}
