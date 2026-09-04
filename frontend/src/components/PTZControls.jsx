import React from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, RotateCcw, ZoomIn, ZoomOut, Compass, Navigation } from 'lucide-react';

export default function PTZControls({
  pan,
  tilt,
  zoom,
  onPanChange,
  onTiltChange,
  onZoomChange,
  onResetPTZ,
  onApplyPreset
}) {
  return (
    <div className="absolute bottom-4 left-4 z-30 bg-soc-900/90 border border-cyan-500/40 rounded-xl p-3.5 backdrop-blur-md shadow-2xl font-mono text-xs select-none w-64 space-y-3">
      {/* Title */}
      <div className="flex items-center justify-between pb-2 border-b border-soc-700/80">
        <span className="font-bold text-cyan-300 flex items-center gap-1.5 text-[11px]">
          <Navigation className="w-3.5 h-3.5 text-cyan-400" />
          Tactical PTZ Motor Controls
        </span>
        <button
          onClick={onResetPTZ}
          title="Reset PTZ Pan/Tilt/Zoom"
          className="text-slate-400 hover:text-white p-1 rounded hover:bg-soc-800 transition"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      </div>

      {/* D-Pad Directional Controls */}
      <div className="flex flex-col items-center justify-center gap-1">
        {/* Tilt Up */}
        <button
          onClick={() => onTiltChange(Math.min(30, tilt + 5))}
          className="w-8 h-8 rounded bg-soc-800 hover:bg-soc-750 border border-soc-600 hover:border-cyan-400 text-cyan-300 flex items-center justify-center transition active:scale-95"
          title="Tilt Up"
        >
          <ChevronUp className="w-4 h-4" />
        </button>

        {/* Pan Left / Center / Pan Right */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPanChange(Math.max(-45, pan - 5))}
            className="w-8 h-8 rounded bg-soc-800 hover:bg-soc-750 border border-soc-600 hover:border-cyan-400 text-cyan-300 flex items-center justify-center transition active:scale-95"
            title="Pan Left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="w-8 h-8 rounded-full bg-soc-900 border border-cyan-500/40 flex items-center justify-center text-[9px] text-slate-400 font-bold">
            {zoom}x
          </div>

          <button
            onClick={() => onPanChange(Math.min(45, pan + 5))}
            className="w-8 h-8 rounded bg-soc-800 hover:bg-soc-750 border border-soc-600 hover:border-cyan-400 text-cyan-300 flex items-center justify-center transition active:scale-95"
            title="Pan Right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Tilt Down */}
        <button
          onClick={() => onTiltChange(Math.max(-30, tilt - 5))}
          className="w-8 h-8 rounded bg-soc-800 hover:bg-soc-750 border border-soc-600 hover:border-cyan-400 text-cyan-300 flex items-center justify-center transition active:scale-95"
          title="Tilt Down"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {/* Optical Zoom Slider */}
      <div className="space-y-1 pt-1 border-t border-soc-700/60">
        <div className="flex items-center justify-between text-[10px] text-slate-400">
          <span className="flex items-center gap-1">
            <ZoomIn className="w-3 h-3 text-cyan-400" />
            Optical Zoom Magnification:
          </span>
          <span className="text-cyan-300 font-bold">{zoom.toFixed(1)}x</span>
        </div>
        <input
          type="range"
          min="1.0"
          max="4.0"
          step="0.2"
          value={zoom}
          onChange={(e) => onZoomChange(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-soc-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
        />
      </div>

      {/* Preset Patrol Sweeps */}
      <div className="grid grid-cols-2 gap-1.5 pt-1">
        <button
          onClick={() => onApplyPreset('fence')}
          className="py-1 px-2 rounded bg-soc-800 hover:bg-soc-750 border border-soc-700 text-[10px] text-slate-300 hover:text-cyan-300 transition text-center"
        >
          Fence Preset
        </button>
        <button
          onClick={() => onApplyPreset('wide')}
          className="py-1 px-2 rounded bg-soc-800 hover:bg-soc-750 border border-soc-700 text-[10px] text-slate-300 hover:text-cyan-300 transition text-center"
        >
          Wide Sweep
        </button>
      </div>
    </div>
  );
}
