import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Activity, AlertTriangle, Radio } from 'lucide-react';
import { api } from '../services/api';

export default function AudioAcousticHUD({ onClose }) {
  const [telemetry, setTelemetry] = useState({
    sensor_id: 'ACOS-PERIMETER-104',
    ambient_decibels_db: 46.2,
    peak_decibels_db: 74.8,
    anomaly_detected: true,
    anomaly_type: 'FENCE_VIBRATION_SPIKE',
    dominant_freq_hz: 4250,
    frequency_bins: [14, 22, 30, 42, 58, 75, 88, 92, 84, 70, 48, 35, 24, 18, 12, 8]
  });

  useEffect(() => {
    // Initial fetch from backend
    api.getAcousticTelemetry()
      .then(data => {
        if (data) setTelemetry(data);
      })
      .catch(() => {});

    const interval = setInterval(() => {
      // Simulate real-time acoustic waveform jitter
      setTelemetry((prev) => ({
        ...prev,
        ambient_decibels_db: +(45 + Math.random() * 8).toFixed(1),
        peak_decibels_db: +(70 + Math.random() * 12).toFixed(1),
        frequency_bins: prev.frequency_bins.map((val) =>
          Math.min(98, Math.max(10, Math.round(val + (Math.random() * 16 - 8))))
        )
      }));
    }, 600);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute top-14 left-4 z-30 bg-soc-900/90 border border-emerald-500/40 rounded-xl p-3.5 backdrop-blur-md shadow-2xl font-mono text-xs select-none w-72 space-y-2.5">
      {/* Title */}
      <div className="flex items-center justify-between pb-2 border-b border-soc-700/80">
        <div className="flex items-center gap-1.5 text-emerald-400">
          <Activity className="w-4 h-4 animate-pulse" />
          <span className="font-bold text-[10px]">Acoustic Telemetry (Simulation)</span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white text-[10px] bg-soc-800 px-1.5 py-0.5 rounded border border-soc-700"
        >
          ✕
        </button>
      </div>

      {/* Decibel Level */}
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-slate-400">ACOUSTIC LEVEL:</span>
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-white">{telemetry.ambient_decibels_db} dB</span>
          <span className="text-[10px] text-amber-400">(Peak: {telemetry.peak_decibels_db} dB)</span>
        </div>
      </div>

      {/* Real-Time Frequency Spectrum Visualizer */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px] text-slate-500">
          <span>20 Hz (Sub-Bass)</span>
          <span>4.2 kHz (Tension)</span>
          <span>20 kHz</span>
        </div>
        <div className="h-14 bg-black/60 rounded-lg p-1.5 border border-soc-750 flex items-end justify-between gap-1">
          {telemetry.frequency_bins.map((val, idx) => {
            const isSpike = val > 75;
            const barColor = isSpike ? 'bg-red-500' : val > 50 ? 'bg-amber-400' : 'bg-emerald-400';
            return (
              <div
                key={idx}
                style={{ height: `${val}%` }}
                className={`w-full ${barColor} rounded-t transition-all duration-300 shadow-sm`}
              ></div>
            );
          })}
        </div>
      </div>

      {/* Anomaly Badge */}
      <div className="p-2 rounded-lg bg-red-950/30 border border-red-500/50 flex items-center gap-2 text-[10px] text-red-300">
        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 animate-bounce" />
        <div>
          <span className="font-bold">ALERT: {telemetry.anomaly_type}</span>
          <p className="text-slate-400 text-[9px]">Wire tension harmonic detected @ {telemetry.dominant_freq_hz} Hz</p>
        </div>
      </div>
    </div>
  );
}
