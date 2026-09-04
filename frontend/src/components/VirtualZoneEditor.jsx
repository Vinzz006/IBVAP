import React, { useState, useRef, useEffect } from 'react';
import { Shield, X, Save, RotateCcw, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

export default function VirtualZoneEditor({ camera, isOpen, onClose, onZoneSaved }) {
  const [points, setPoints] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (camera?.restricted_zone && Array.isArray(camera.restricted_zone)) {
      setPoints(camera.restricted_zone);
    } else {
      setPoints([
        [0.25, 0.40],
        [0.75, 0.40],
        [0.80, 0.85],
        [0.20, 0.85]
      ]);
    }
  }, [camera, isOpen]);

  if (!isOpen || !camera) return null;

  const handleCanvasClick = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    if (points.length < 8) {
      setPoints([...points, [parseFloat(x.toFixed(3)), parseFloat(y.toFixed(3))]]);
    }
  };

  const handleRemovePoint = (index) => {
    setPoints(points.filter((_, i) => i !== index));
  };

  const handleResetDefault = () => {
    setPoints([
      [0.25, 0.42],
      [0.72, 0.42],
      [0.78, 0.88],
      [0.18, 0.88]
    ]);
  };

  const handleSave = async () => {
    if (points.length < 3) {
      alert('A restricted zone polygon requires at least 3 vertices.');
      return;
    }
    setSaving(true);
    try {
      await api.updateCameraZone(camera.id, points);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onZoneSaved(points);
        onClose();
      }, 700);
    } catch (err) {
      alert(`Failed to save zone: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-soc-850 border border-soc-700 rounded-xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-soc-700 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Virtual Fence Boundary Configurator</h3>
              <p className="text-xs text-slate-400">Camera: {camera.id} — {camera.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-soc-750 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>Click on the video canvas below to place polygon boundary points (3 to 8 vertices):</span>
            <span className="text-cyan-400">{points.length} Points Placed</span>
          </div>

          {/* Interactive Canvas Overlay Area */}
          <div
            ref={containerRef}
            onClick={handleCanvasClick}
            className="relative w-full aspect-video bg-soc-900 rounded-lg border border-soc-600 overflow-hidden cursor-crosshair group shadow-inner"
          >
            {/* Camera live preview background */}
            <img
              src={`/api/cameras/${camera.id}/stream`}
              alt="Camera Feed"
              className="w-full h-full object-contain pointer-events-none opacity-85"
            />

            {/* SVG Polygon overlay */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {points.length >= 3 && (
                <polygon
                  points={points.map(p => `${p[0] * 100}%,${p[1] * 100}%`).join(' ')}
                  className="fill-amber-500/25 stroke-amber-400 stroke-2"
                  strokeDasharray="4 2"
                />
              )}
              {points.length >= 2 && (
                <polyline
                  points={points.map(p => `${p[0] * 100}%,${p[1] * 100}%`).join(' ')}
                  className="fill-none stroke-cyan-400 stroke-2"
                />
              )}
            </svg>

            {/* Render Draggable / Clickable Point Nodes */}
            {points.map((pt, idx) => (
              <div
                key={idx}
                style={{ left: `${pt[0] * 100}%`, top: `${pt[1] * 100}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-auto"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemovePoint(idx);
                  }}
                  title="Click to remove point"
                  className="w-6 h-6 rounded-full bg-cyan-500 text-black font-mono font-bold text-xs flex items-center justify-center border-2 border-white shadow-lg hover:bg-red-500 hover:text-white transition"
                >
                  {idx + 1}
                </button>
              </div>
            ))}
          </div>

          {/* Point Coordinate Chips */}
          <div className="flex flex-wrap gap-2 pt-1">
            {points.map((pt, idx) => (
              <div
                key={idx}
                className="flex items-center gap-1.5 px-2 py-1 rounded bg-soc-800 border border-soc-700 text-[11px] font-mono text-slate-300"
              >
                <span className="text-cyan-400 font-bold">P{idx + 1}:</span>
                <span>[{pt[0]}, {pt[1]}]</span>
                <button
                  onClick={() => handleRemovePoint(idx)}
                  className="text-slate-500 hover:text-red-400 ml-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-soc-700 bg-soc-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetDefault}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-soc-800 hover:bg-soc-750 text-slate-300 border border-soc-700 text-xs font-mono transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Default Zone</span>
            </button>
            <button
              onClick={() => setPoints([])}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-soc-800 hover:bg-soc-750 text-red-400 hover:text-red-300 border border-soc-700 text-xs font-mono transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-soc-800 hover:bg-soc-750 text-slate-300 text-xs font-medium transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || points.length < 3}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs transition shadow-[0_0_12px_rgba(0,240,255,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saveSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-black" />
                  <span>Zone Armed!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving & Arming Zone...' : 'Arm Virtual Fence'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
