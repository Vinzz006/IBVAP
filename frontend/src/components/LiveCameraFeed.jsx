import React, { useState, useEffect } from 'react';
import { Maximize2, Edit3, Camera, Radio, Shield, RefreshCw, AlertCircle, Video, Grid, Navigation, Activity, Plane } from 'lucide-react';
import PTZControls from './PTZControls';
import AudioAcousticHUD from './AudioAcousticHUD';

export default function LiveCameraFeed({
  camera,
  viewMode = 'focus',
  onToggleViewMode,
  onOpenZoneEditor,
  onOpenSourceModal,
  onOpenDroneRecon,
  onQuickSnapshot
}) {
  const [streamError, setStreamError] = useState(false);
  const [streamKey, setStreamKey] = useState(Date.now());
  const [showPTZ, setShowPTZ] = useState(false);
  const [showAcoustic, setShowAcoustic] = useState(false);

  useEffect(() => {
    setStreamError(false);
    setStreamKey(Date.now());
  }, [camera?.id, camera?.stream_url]);
  
  // PTZ State
  const [pan, setPan] = useState(0);
  const [tilt, setTilt] = useState(0);
  const [zoom, setZoom] = useState(1.0);

  if (!camera) {
    return (
      <div className="flex-1 bg-soc-900 flex items-center justify-center text-slate-500 font-mono text-sm">
        Select a monitored camera sector to view live feed
      </div>
    );
  }

  const streamUrl = `/api/cameras/${camera.id}/stream?t=${streamKey}`;

  const handleRefreshStream = () => {
    setStreamError(false);
    setStreamKey(Date.now());
  };

  const handleResetPTZ = () => {
    setPan(0);
    setTilt(0);
    setZoom(1.0);
  };

  const handleApplyPreset = (preset) => {
    if (preset === 'fence') {
      setPan(-15);
      setTilt(10);
      setZoom(1.8);
    } else if (preset === 'wide') {
      setPan(0);
      setTilt(0);
      setZoom(1.0);
    }
  };

  return (
    <div className="flex-1 bg-soc-900 flex flex-col overflow-hidden relative">
      {/* Top Tactical Feed Control Bar */}
      <div className="h-11 bg-soc-850/95 border-b border-soc-700/80 px-4 flex items-center justify-between text-xs select-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-mono font-bold text-white">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-tactical-pulse"></span>
            <span>LIVE CCTV // {camera.id}</span>
          </div>
          <span className="text-slate-400 hidden sm:inline">•</span>
          <span className="text-slate-300 hidden sm:inline">{camera.name}</span>
          <span className="text-[11px] text-cyan-400 font-mono hidden md:inline">({camera.location})</span>
        </div>

        {/* Live Controls */}
        <div className="flex items-center gap-2">
          {/* Airborne Drone Recon Button */}
          {onOpenDroneRecon && (
            <button
              onClick={onOpenDroneRecon}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-soc-750 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-soc-600 hover:border-cyan-500/40 text-xs font-mono transition"
              title="Launch Tactical Airborne Drone Recon HUD (FLIR Thermal)"
            >
              <Plane className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">UAV Recon</span>
            </button>
          )}

          {/* Acoustic HUD Toggle */}
          <button
            onClick={() => setShowAcoustic(!showAcoustic)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-mono transition ${
              showAcoustic
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-bold'
                : 'bg-soc-750 text-slate-300 border-soc-600 hover:bg-soc-700'
            }`}
            title="Toggle Perimeter Acoustic & Vibration Sensor HUD"
          >
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Acoustic HUD</span>
          </button>

          {/* PTZ Toggle */}
          <button
            onClick={() => setShowPTZ(!showPTZ)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-mono transition ${
              showPTZ
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-[0_0_8px_rgba(0,240,255,0.2)] font-bold'
                : 'bg-soc-750 text-slate-300 border-soc-600 hover:bg-soc-700'
            }`}
            title="Toggle Tactical Pan-Tilt-Zoom Controls"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">PTZ</span>
          </button>

          {/* View Mode Toggle: Focus vs Quad-View */}
          <button
            onClick={onToggleViewMode}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-mono transition ${
              viewMode === 'quad'
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-[0_0_8px_rgba(0,240,255,0.2)]'
                : 'bg-soc-750 text-slate-300 border-soc-600 hover:bg-soc-700'
            }`}
            title="Toggle Quad 2x2 Tactical Grid View"
          >
            <Grid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{viewMode === 'quad' ? 'Single' : 'Quad (2x2)'}</span>
          </button>

          {/* Switch Stream Source Modal button */}
          <button
            onClick={onOpenSourceModal}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-soc-750 hover:bg-soc-700 text-slate-300 hover:text-white border border-soc-600 transition text-xs font-medium"
            title="Switch Video Stream Source (Webcam / Upload / Scenario)"
          >
            <Video className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Source</span>
          </button>

          {/* Configure Virtual Fence */}
          <button
            onClick={onOpenZoneEditor}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-soc-750 hover:bg-soc-700 text-cyan-300 border border-soc-600 hover:border-cyan-500/50 transition text-xs font-medium"
            title="Edit Restricted Zone Boundary Polygon"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Virtual Fence</span>
          </button>

          <button
            onClick={handleRefreshStream}
            className="p-1.5 rounded bg-soc-750 hover:bg-soc-700 text-slate-300 hover:text-white border border-soc-600 transition"
            title="Reconnect Stream"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main CCTV Viewport with PTZ Transforms */}
      <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
        {streamError ? (
          <div className="text-center p-6 max-w-md">
            <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-3 opacity-80" />
            <h4 className="text-sm font-mono font-bold text-slate-200 uppercase tracking-wider mb-1">
              CAMERA FEED INITIALIZING / RECONNECTING
            </h4>
            <p className="text-xs text-slate-400 mb-4">
              Connecting to RTSP video ingestion pipeline on {camera.id}...
            </p>
            <button
              onClick={handleRefreshStream}
              className="px-3.5 py-1.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono transition"
            >
              Retry Connection
            </button>
          </div>
        ) : (
          <div
            style={{
              transform: `scale(${zoom}) translate(${pan}px, ${tilt}px)`,
              transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
            className="w-full h-full flex items-center justify-center"
          >
            <img
              key={streamKey}
              src={streamUrl}
              alt={`Live CCTV Stream ${camera.id}`}
              onError={() => setStreamError(true)}
              className="w-full h-full object-contain select-none pointer-events-none"
            />
          </div>
        )}

        {/* Floating Acoustic Sensor HUD */}
        {showAcoustic && (
          <AudioAcousticHUD onClose={() => setShowAcoustic(false)} />
        )}

        {/* Floating PTZ Controls Widget */}
        {showPTZ && (
          <PTZControls
            pan={pan}
            tilt={tilt}
            zoom={zoom}
            onPanChange={setPan}
            onTiltChange={setTilt}
            onZoomChange={setZoom}
            onResetPTZ={handleResetPTZ}
            onApplyPreset={handleApplyPreset}
          />
        )}

        {/* Tactical Crosshair / Sensor Grid Watermark */}
        <div className="absolute top-3 left-3 pointer-events-none text-[10px] font-mono text-cyan-400/80 bg-soc-900/80 px-2 py-1 rounded border border-cyan-500/30 backdrop-blur-sm">
          SEC-ID: {camera.id} | MODE: AI-ANALYTICS-ARMED {zoom > 1.0 && `| ZOOM: ${zoom.toFixed(1)}x`}
        </div>

        <div className="absolute bottom-3 right-3 pointer-events-none text-[10px] font-mono text-slate-400 bg-soc-900/80 px-2 py-1 rounded border border-soc-700 backdrop-blur-sm flex items-center gap-2">
          <span>YOLOv8 + ByteTrack</span>
          <span>•</span>
          <span className="text-emerald-400">DECISION LAYER ACTIVE</span>
        </div>
      </div>
    </div>
  );
}
