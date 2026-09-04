import React from 'react';
import { Maximize2, Shield, Eye, Radio, Activity, RefreshCw } from 'lucide-react';
import RiskBadge from './RiskBadge';

export default function MultiCameraGrid({
  cameras,
  onSelectCamera,
  onOpenFocusView
}) {
  return (
    <div className="flex-1 bg-soc-900 p-3 overflow-y-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 h-full min-h-[600px]">
        {cameras.map((camera) => {
          const streamUrl = `/api/cameras/${camera.id}/stream`;
          const isOnline = camera.status === 'ONLINE';

          return (
            <div
              key={camera.id}
              className="bg-soc-850 border border-soc-700/80 rounded-xl overflow-hidden flex flex-col relative group hover:border-cyan-500/50 transition-all shadow-lg"
            >
              {/* Tile Header Bar */}
              <div className="h-9 bg-soc-900/90 border-b border-soc-700/60 px-3 flex items-center justify-between text-xs font-mono select-none">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-tactical-pulse"></span>
                  <span className="font-bold text-white">{camera.id}</span>
                  <span className="text-slate-400 truncate max-w-[140px] hidden sm:inline">{camera.name}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 hidden sm:inline">
                    {camera.telemetry?.fps || 25.0} FPS
                  </span>
                  <button
                    onClick={() => {
                      onSelectCamera(camera.id);
                      onOpenFocusView();
                    }}
                    className="flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-[10px] transition"
                    title="Switch to Single Camera Focus View"
                  >
                    <Maximize2 className="w-3 h-3" />
                    <span>Focus</span>
                  </button>
                </div>
              </div>

              {/* Video Stream */}
              <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden min-h-[220px]">
                <img
                  src={streamUrl}
                  alt={`Stream ${camera.id}`}
                  className="w-full h-full object-contain pointer-events-none select-none"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />

                {/* Overlaid Badges */}
                <div className="absolute top-2 left-2 text-[10px] font-mono text-cyan-400 bg-soc-900/80 px-2 py-0.5 rounded border border-cyan-500/30 backdrop-blur-sm">
                  {camera.location}
                </div>

                <div className="absolute bottom-2 right-2 text-[10px] font-mono text-slate-300 bg-soc-900/80 px-2 py-0.5 rounded border border-soc-700 backdrop-blur-sm">
                  TRACKS: <strong className="text-cyan-400">{camera.telemetry?.active_tracks || 0}</strong>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
