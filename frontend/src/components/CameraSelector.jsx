import React from 'react';
import { ChevronRight, Layers } from 'lucide-react';
import EdgeStatusCard from './EdgeStatusCard';

export default function CameraSelector({
  cameras,
  selectedCameraId,
  onSelectCamera
}) {
  return (
    <aside className="w-80 bg-soc-850 border-r border-soc-700/80 flex flex-col h-full overflow-hidden select-none">
      {/* Edge & Offline Status Box */}
      <div className="p-2.5 border-b border-soc-700/80">
        <EdgeStatusCard />
      </div>

      {/* Header */}
      <div className="p-3 border-b border-soc-700/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Monitored Sectors</h2>
        </div>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-soc-750 text-slate-300 border border-soc-600">
          {cameras.length} CAMERAS
        </span>
      </div>

      {/* Camera Feed List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {cameras.map((cam) => {
          const isSelected = cam.id === selectedCameraId;
          const isOnline = cam.status === 'ONLINE';

          return (
            <div
              key={cam.id}
              onClick={() => onSelectCamera(cam.id)}
              className={`p-3 rounded-lg border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-soc-800 border-cyan-500/60 shadow-[0_0_12px_rgba(0,240,255,0.15)] ring-1 ring-cyan-500/40'
                  : 'bg-soc-900/80 border-soc-700/60 hover:bg-soc-800/60 hover:border-soc-600'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-white">{cam.id}</span>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      isOnline ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/15 text-red-400'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-tactical-pulse' : 'bg-red-400'}`}></span>
                      {cam.status}
                    </span>
                  </div>
                  <h3 className="text-xs font-medium text-slate-200 mt-1 line-clamp-1">{cam.name}</h3>
                  <p className="text-[11px] text-slate-400 line-clamp-1">{cam.location}</p>
                </div>
                <ChevronRight className={`w-4 h-4 mt-1 transition-transform ${isSelected ? 'text-cyan-400 translate-x-0.5' : 'text-slate-600'}`} />
              </div>

              {/* Camera telemetry pill */}
              <div className="mt-2.5 pt-2 border-t border-soc-700/50 flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span>FPS: <strong className="text-slate-200">{cam.telemetry?.fps || 25.0}</strong></span>
                <span>TRACKS: <strong className="text-cyan-400">{cam.telemetry?.active_tracks || 0}</strong></span>
                <span>ZONE: <strong className={cam.restricted_zone?.length ? 'text-amber-400' : 'text-slate-500'}>
                  {cam.restricted_zone?.length ? 'ARMED' : 'NONE'}
                </strong></span>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
