import React, { useState } from 'react';
import { Zap, ShieldAlert, Cpu, Activity, Play, CheckCircle2, X, AlertTriangle, Layers, Flame } from 'lucide-react';
import { api } from '../services/api';

export default function RedTeamModal({ isOpen, onClose, onTestCompleted }) {
  const [scenario, setScenario] = useState('COORDINATED_MULTI_SECTOR');
  const [intensity, setIntensity] = useState('HIGH');
  const [running, setRunning] = useState(false);
  const [benchmarkResult, setBenchmarkResult] = useState(null);

  if (!isOpen) return null;

  const scenarios = [
    {
      id: 'COORDINATED_MULTI_SECTOR',
      title: 'Coordinated Multi-Sector Infiltration',
      desc: 'Simultaneous breach across CAM-01 (Highway) and CAM-02 (Riverine Basin).',
      badge: 'STRESS: MULTI-THREAD'
    },
    {
      id: 'LOW_VISIBILITY_STEALTH',
      title: 'Night-Time Low-Visibility Infiltration',
      desc: 'Low-contrast stealth movement on CAM-04 Mountain Pass ridge.',
      badge: 'STRESS: AMBIENT FLIR'
    },
    {
      id: 'ANPR_FAST_TRANSIT',
      title: 'Vehicle Checkpoint High-Speed Transit',
      desc: 'Rapid vehicle barrier breach on CAM-03 Checkpoint Charlie.',
      badge: 'STRESS: ANPR ENGINE'
    },
    {
      id: 'WIRE_TENSION_PROBE',
      title: 'Fence Wire-Tension Acoustic Probe',
      desc: 'Simulated cutting harmonic vibration trigger across perimeter fence.',
      badge: 'STRESS: ACOUSTIC SENSOR'
    }
  ];

  const handleRunStressTest = async () => {
    setRunning(true);
    setBenchmarkResult(null);
    try {
      const data = await api.executeRedTeamTest({ scenario, intensity });
      setBenchmarkResult(data);
      if (onTestCompleted) onTestCompleted();
    } catch (err) {
      alert(`Stress test failed: ${err.message}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-soc-850 border border-red-500/50 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col font-mono text-xs select-none">
        {/* Header */}
        <div className="p-4 border-b border-soc-700 flex items-center justify-between bg-soc-900">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                AI Red-Team Intrusion & Stress Testing Suite
              </h3>
              <p className="text-[11px] text-slate-400 font-sans">
                Adversarial breach injection & platform resilience benchmark
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="space-y-2">
            <label className="text-slate-300 font-bold block">1. Select Adversarial Attack Vector:</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {scenarios.map((s) => (
                <div
                  key={s.id}
                  onClick={() => setScenario(s.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition space-y-1 ${
                    scenario === s.id
                      ? 'bg-red-500/15 border-red-500 text-red-300 font-semibold shadow-md'
                      : 'bg-soc-900 border-soc-750 hover:bg-soc-800 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-white text-xs">{s.title}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-soc-800 text-slate-400">
                      {s.badge}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-sans leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Test Intensity Switcher */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-soc-900 border border-soc-750">
            <span className="text-slate-300">ADVERSARIAL INJECTION INTENSITY:</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIntensity('NORMAL')}
                className={`px-3 py-1 rounded text-xs transition ${intensity === 'NORMAL' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold' : 'text-slate-400'}`}
              >
                Standard Load
              </button>
              <button
                onClick={() => setIntensity('HIGH')}
                className={`px-3 py-1 rounded text-xs transition ${intensity === 'HIGH' ? 'bg-red-500/20 text-red-400 border border-red-500/40 font-bold' : 'text-slate-400'}`}
              >
                High Stress (Critical)
              </button>
            </div>
          </div>

          {/* Live Benchmark Execution Output */}
          {benchmarkResult && (
            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  BENCHMARK COMPLETE // {benchmarkResult.test_id}
                </span>
                <span className="text-[10px] text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                  {benchmarkResult.benchmark.status}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-2.5 rounded-lg bg-soc-900 border border-soc-750">
                  <span className="text-[10px] text-slate-400 block">AI INFERENCE TIME</span>
                  <span className="text-sm font-bold text-cyan-300">{benchmarkResult.benchmark.decision_latency_ms} ms</span>
                </div>
                <div className="p-2.5 rounded-lg bg-soc-900 border border-soc-750">
                  <span className="text-[10px] text-slate-400 block">ALERT BROADCAST</span>
                  <span className="text-sm font-bold text-amber-300">{benchmarkResult.benchmark.websocket_broadcast_latency_ms} ms</span>
                </div>
                <div className="p-2.5 rounded-lg bg-soc-900 border border-soc-750">
                  <span className="text-[10px] text-slate-400 block">SHA-256 SEALING</span>
                  <span className="text-sm font-bold text-emerald-400">{benchmarkResult.benchmark.sha256_sealing_throughput_fps} FPS</span>
                </div>
              </div>

              <p className="text-[10px] text-slate-400 font-mono text-center">
                Injected events successfully verified & chained: {benchmarkResult.event_ids.join(', ')}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-soc-700 bg-soc-900 flex items-center justify-between">
          <span className="text-[10px] text-slate-500">Security Red-Team Resilience Harness</span>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg bg-soc-800 text-slate-300 text-xs">
              Close
            </button>
            <button
              onClick={handleRunStressTest}
              disabled={running}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition shadow-[0_0_12px_rgba(239,68,68,0.3)] disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{running ? 'Executing Stress Injection...' : 'Launch Adversarial Stress Test'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
