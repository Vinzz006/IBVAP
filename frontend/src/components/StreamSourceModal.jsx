import React, { useState, useEffect } from 'react';
import { Video, Camera, Upload, Play, X, CheckCircle, ShieldAlert, Moon, Truck, CheckCircle2, RefreshCw, Radio } from 'lucide-react';
import { api } from '../services/api';

export default function StreamSourceModal({ camera, isOpen, onClose, onSourceUpdated }) {
  const [selectedSourceType, setSelectedSourceType] = useState('scenario'); // scenario | webcam | upload
  const [selectedScenario, setSelectedScenario] = useState('border_intrusion');
  const [selectedWebcamIndex, setSelectedWebcamIndex] = useState(0);
  const [availableWebcams, setAvailableWebcams] = useState([
    { index: 0, label: 'Default USB / Integrated Webcam (Device 0)', status: 'READY' }
  ]);
  const [isDetectingWebcams, setIsDetectingWebcams] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      detectWebcams();
    }
  }, [isOpen]);

  const detectWebcams = async () => {
    setIsDetectingWebcams(true);
    try {
      const data = await api.getAvailableWebcams();
      if (data?.webcams && data.webcams.length > 0) {
        setAvailableWebcams(data.webcams);
      }
    } catch (err) {
      console.warn('Failed to detect webcams:', err);
    } finally {
      setIsDetectingWebcams(false);
    }
  };

  if (!isOpen || !camera) return null;

  const scenarios = [
    { id: 'border_intrusion', label: 'Border Restricted Zone Intrusion', icon: ShieldAlert, color: 'text-red-400', badge: 'CRITICAL', file: 'scenario_border_intrusion.mp4' },
    { id: 'night_movement', label: 'Night-Time Movement Patrol', icon: Moon, color: 'text-cyan-400', badge: 'HIGH', file: 'scenario_night_movement.mp4' },
    { id: 'vehicle_checkpoint', label: 'Vehicle Checkpoint & ANPR', icon: Truck, color: 'text-amber-400', badge: 'MEDIUM', file: 'scenario_vehicle_checkpoint.mp4' },
    { id: 'normal_patrol', label: 'Normal Perimeter Patrol', icon: CheckCircle2, color: 'text-emerald-400', badge: 'LOW', file: 'scenario_normal_patrol.mp4' }
  ];

  const handleApplySource = async () => {
    setLoading(true);
    setStatusMessage('Connecting video ingestion pipeline...');
    try {
      if (selectedSourceType === 'scenario') {
        await api.triggerScenario(camera.id, selectedScenario);
      } else if (selectedSourceType === 'webcam') {
        await api.updateCameraSource(camera.id, selectedWebcamIndex.toString());
      } else if (selectedSourceType === 'upload' && uploadFile) {
        const formData = new FormData();
        formData.append('file', uploadFile);
        const res = await fetch('/api/cameras/upload', {
          method: 'POST',
          body: formData
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({ detail: res.statusText }));
          throw new Error(errData.detail || 'Upload failed');
        }
        const uploadData = await res.json();
        if (!uploadData?.filename) {
          throw new Error('Upload did not return a valid filename');
        }
        await api.updateCameraSource(camera.id, uploadData.filename);
      }

      setStatusMessage('Stream source connected successfully!');
      setTimeout(() => {
        if (onSourceUpdated) onSourceUpdated();
        onClose();
      }, 400);
    } catch (err) {
      setStatusMessage(`Error: ${err.message}`);
      alert(`Failed to update stream source: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-soc-850 border border-soc-700 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-soc-700 flex items-center justify-between bg-soc-900">
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white">
              Switch Stream Source // {camera.id}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs font-mono">
          {/* Source Type Selector */}
          <div className="flex items-center gap-2 bg-soc-900 p-1 rounded-lg border border-soc-700">
            <button
              onClick={() => setSelectedSourceType('scenario')}
              className={`flex-1 py-1.5 rounded text-center transition ${
                selectedSourceType === 'scenario' ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              Demo Scenarios
            </button>
            <button
              onClick={() => setSelectedSourceType('webcam')}
              className={`flex-1 py-1.5 rounded text-center transition ${
                selectedSourceType === 'webcam' ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              Live USB Webcam
            </button>
            <button
              onClick={() => setSelectedSourceType('upload')}
              className={`flex-1 py-1.5 rounded text-center transition ${
                selectedSourceType === 'upload' ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              Upload Video
            </button>
          </div>

          {/* Scenario Picker */}
          {selectedSourceType === 'scenario' && (
            <div className="space-y-2">
              <label className="text-slate-400 block mb-1">Select Surveillance Scenario:</label>
              {scenarios.map((sc) => {
                const Icon = sc.icon;
                const isSelected = selectedScenario === sc.id;
                return (
                  <div
                    key={sc.id}
                    onClick={() => setSelectedScenario(sc.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-soc-800 border-cyan-500/60 shadow-[0_0_10px_rgba(0,240,255,0.2)]'
                        : 'bg-soc-900 border-soc-700/60 hover:bg-soc-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${sc.color}`} />
                      <div>
                        <p className="text-slate-200 font-semibold">{sc.label}</p>
                        <p className="text-[10px] text-slate-500">{sc.file}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-soc-900 border border-soc-700 text-slate-300">
                      {sc.badge}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Live USB Webcam Controls */}
          {selectedSourceType === 'webcam' && (
            <div className="p-4 rounded-lg bg-soc-900 border border-soc-750 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-cyan-400" />
                  <span className="text-slate-200 font-semibold">Local Workstation Webcams</span>
                </div>
                <button
                  onClick={detectWebcams}
                  disabled={isDetectingWebcams}
                  className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 p-1 rounded bg-soc-800 border border-soc-700 transition"
                  title="Rescan video devices"
                >
                  <RefreshCw className={`w-3 h-3 ${isDetectingWebcams ? 'animate-spin' : ''}`} />
                  <span>Rescan</span>
                </button>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                Connects directly to your local hardware webcam via DirectShow / OpenCV. YOLOv8 object detection, ByteTrack tracking, and virtual fence triggers will execute in real-time on live camera video!
              </p>

              {/* Detected Devices List */}
              <div className="space-y-2 pt-1">
                <label className="text-slate-400 block text-[11px]">Select Connected Video Device:</label>
                {availableWebcams.map((wc) => (
                  <div
                    key={wc.index}
                    onClick={() => setSelectedWebcamIndex(wc.index)}
                    className={`p-2.5 rounded-lg border cursor-pointer transition flex items-center justify-between ${
                      selectedWebcamIndex === wc.index
                        ? 'bg-cyan-500/15 border-cyan-500 text-cyan-200 shadow-[0_0_10px_rgba(0,240,255,0.15)]'
                        : 'bg-soc-850 border-soc-700 hover:bg-soc-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Radio className={`w-3.5 h-3.5 ${selectedWebcamIndex === wc.index ? 'text-cyan-400' : 'text-slate-500'}`} />
                      <div>
                        <div className="font-semibold text-[11px]">{wc.label}</div>
                        <div className="text-[9px] text-slate-400">Device ID: {wc.index} • DirectShow / V4L2 Ingestion</div>
                      </div>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                      wc.status === 'ONLINE' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-soc-900 text-cyan-300 border-cyan-500/30'
                    }`}>
                      {wc.status || 'AVAILABLE'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Video File */}
          {selectedSourceType === 'upload' && (
            <div className="p-4 rounded-lg bg-soc-900 border border-soc-750 space-y-3">
              <label className="text-slate-300 block">Select Video File (MP4, WebM, AVI):</label>
              <input
                type="file"
                accept="video/*"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:bg-soc-750 file:text-cyan-300 hover:file:bg-soc-700"
              />
              {uploadFile && (
                <p className="text-[11px] text-emerald-400">
                  Ready to ingest: {uploadFile.name} ({(uploadFile.size / (1024 * 1024)).toFixed(1)} MB)
                </p>
              )}
            </div>
          )}

          {statusMessage && (
            <div className="p-2 rounded bg-soc-800 border border-cyan-500/30 text-center text-cyan-300 text-[11px]">
              {statusMessage}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-soc-700 bg-soc-900 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-soc-800 text-slate-300 text-xs font-mono hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleApplySource}
            disabled={loading || (selectedSourceType === 'upload' && !uploadFile)}
            className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs font-mono transition shadow-[0_0_10px_rgba(0,240,255,0.2)] disabled:opacity-50 flex items-center gap-2"
          >
            {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            <span>{loading ? 'Switching Stream...' : 'Apply Stream Source'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
