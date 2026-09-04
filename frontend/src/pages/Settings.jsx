import React, { useState } from 'react';
import { Settings as SettingsIcon, Camera, Sliders, Shield, Upload, CheckCircle2, Server, HardDrive, Cpu, Activity } from 'lucide-react';
import { api } from '../services/api';
import SystemHealthMatrix from '../components/SystemHealthMatrix';
import PrivacyCenter from '../components/PrivacyCenter';

export default function Settings() {
  const [cameraId, setCameraId] = useState('CAM-04');
  const [cameraName, setCameraName] = useState('Sector D — Mountain Pass Ridge');
  const [location, setLocation] = useState('Sector D — Outpost Bravo');
  const [streamUrl, setStreamUrl] = useState('scenario_border_intrusion.mp4');
  const [uploadFile, setUploadFile] = useState(null);
  const [creating, setCreating] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const handleCreateCamera = async (e) => {
    e.preventDefault();
    setCreating(true);
    setStatusMessage('');
    try {
      let finalStreamUrl = streamUrl;

      if (uploadFile) {
        const formData = new FormData();
        formData.append('file', uploadFile);
        const res = await fetch('/api/cameras/upload', {
          method: 'POST',
          body: formData
        });
        const uploadData = await res.json();
        finalStreamUrl = uploadData.filename;
      }

      await api.createCamera({
        id: cameraId,
        name: cameraName,
        location,
        stream_url: finalStreamUrl,
        restricted_zone: [
          [0.25, 0.40],
          [0.75, 0.40],
          [0.80, 0.85],
          [0.20, 0.85]
        ]
      });

      setStatusMessage(`Camera ${cameraId} registered successfully and live streaming!`);
    } catch (err) {
      alert(`Failed to add camera: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-soc-900 select-none">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Page Title */}
        <div className="pb-4 border-b border-soc-700">
          <h2 className="text-lg font-mono font-bold text-white flex items-center gap-2.5">
            <SettingsIcon className="w-5 h-5 text-cyan-400" />
            <span>Platform Configuration & Hardware Diagnostics</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage CCTV sensor ingestion pipelines, AI decision engine thresholds, and live stream telemetry
          </p>
        </div>

        {/* Section 0: System & Sensor Hardware Diagnostics Matrix */}
        <div className="bg-soc-850 border border-soc-700 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-soc-750">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white">Live System Hardware & Ingestion Health Matrix</h3>
          </div>

          <SystemHealthMatrix />
        </div>

        {/* Section 1: Register New Camera / Ingestion Source */}
        <div className="bg-soc-850 border border-soc-700 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-soc-750">
            <Camera className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white">Register New Camera Sensor / Video Source</h3>
          </div>

          {statusMessage && (
            <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/50 flex items-center gap-2 text-xs text-emerald-300 font-mono">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{statusMessage}</span>
            </div>
          )}

          <form onSubmit={handleCreateCamera} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div className="space-y-1">
              <label className="text-slate-300">Camera ID / Identifier:</label>
              <input
                type="text"
                required
                value={cameraId}
                onChange={(e) => setCameraId(e.target.value)}
                placeholder="e.g. CAM-04"
                className="w-full bg-soc-900 border border-soc-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-300">Camera Display Name:</label>
              <input
                type="text"
                required
                value={cameraName}
                onChange={(e) => setCameraName(e.target.value)}
                placeholder="e.g. Sector D — Ridge Outpost"
                className="w-full bg-soc-900 border border-soc-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-300">Monitored Sector / Location:</label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Sector D — Checkpoint 22"
                className="w-full bg-soc-900 border border-soc-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-300">Stream Source / RTSP URL / Video:</label>
              <input
                type="text"
                value={streamUrl}
                onChange={(e) => setStreamUrl(e.target.value)}
                placeholder="rtsp://192.168.1.100:554/stream or video file"
                className="w-full bg-soc-900 border border-soc-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* File Upload Option */}
            <div className="col-span-1 md:col-span-2 space-y-1 pt-1">
              <label className="text-slate-300 flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-cyan-400" />
                <span>Or Upload Recorded Surveillance Video File (MP4/WebM/AVI):</span>
              </label>
              <input
                type="file"
                accept="video/*"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="w-full bg-soc-900 border border-soc-700 rounded-lg p-2 text-slate-300 text-xs file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-soc-750 file:text-cyan-300 hover:file:bg-soc-700"
              />
            </div>

            <div className="col-span-1 md:col-span-2 pt-2">
              <button
                type="submit"
                disabled={creating}
                className="px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs font-mono transition shadow-[0_0_12px_rgba(0,240,255,0.25)] disabled:opacity-50"
              >
                {creating ? 'Registering & Starting AI Ingestion...' : 'Register Camera & Arm AI Pipeline'}
              </button>
            </div>
          </form>
        </div>

        {/* Section 2: AI Decision Layer Rules & Weights */}
        <div className="bg-soc-850 border border-soc-700 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-soc-750">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white">AI Decision Engine & Risk Rule Parameters</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
            <div className="p-3.5 rounded-lg bg-soc-900 border border-soc-750 space-y-1">
              <span className="text-slate-400 text-[11px]">Object Detection Model:</span>
              <p className="text-cyan-300 font-bold">YOLOv8n (COCO-Pretrained)</p>
              <p className="text-[10px] text-slate-500">Person, Car, Bike, Truck, Bus</p>
            </div>

            <div className="p-3.5 rounded-lg bg-soc-900 border border-soc-750 space-y-1">
              <span className="text-slate-400 text-[11px]">Tracking Engine:</span>
              <p className="text-emerald-400 font-bold">ByteTrack (Kalman Filter)</p>
              <p className="text-[10px] text-slate-500">Persistent ID & Trajectory</p>
            </div>

            <div className="p-3.5 rounded-lg bg-soc-900 border border-soc-750 space-y-1">
              <span className="text-slate-400 text-[11px]">Intrusion Debounce Cooldown:</span>
              <p className="text-amber-400 font-bold">5.0 Seconds / Track</p>
              <p className="text-[10px] text-slate-500">Prevents event duplicate spam</p>
            </div>
          </div>
        </div>

        {/* Section 3: Privacy, Governance & Evidence Retention */}
        <PrivacyCenter />

        {/* Section 4: Security & Cryptographic Compliance */}
        <div className="bg-soc-850 border border-soc-700 rounded-xl p-5 shadow-lg space-y-3">
          <div className="flex items-center gap-2 pb-3 border-b border-soc-750">
            <Shield className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white">Cryptographic Evidence Standard</h3>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            IBVAP implements a SHA-256 cryptographic tamper-evident ledger. Whenever a security incident is identified by the AI decision layer, the keyframe snapshot is saved to local storage, salted, and a 256-bit hash digest is generated and chained to the previous event hash. Any subsequent unauthorized pixel or metadata modification will fail the automated verification check.
          </p>
        </div>
      </div>
    </div>
  );
}
