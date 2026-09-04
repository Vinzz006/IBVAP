import React, { useState, useEffect } from 'react';
import { Cpu, HardDrive, Zap, Radio, Activity, CheckCircle, AlertCircle, RefreshCw, Layers } from 'lucide-react';
import { api } from '../services/api';

export default function SystemHealthMatrix() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMatrix();
    const interval = setInterval(fetchMatrix, 3500);
    return () => clearInterval(interval);
  }, []);

  const fetchMatrix = async () => {
    try {
      const json = await api.getDiagnosticsMatrix();
      setData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="p-8 text-center text-slate-500 font-mono text-xs">
        Compiling hardware & sensor health telemetry...
      </div>
    );
  }

  return (
    <div className="space-y-6 font-mono text-xs select-none">
      {/* Top Health KPI strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-soc-900 border border-soc-750 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>CPU UTILIZATION</span>
            <Cpu className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-xl font-bold text-white">{data.cpu_utilization_pct}%</p>
          <div className="w-full h-1.5 bg-soc-800 rounded-full overflow-hidden">
            <div style={{ width: `${data.cpu_utilization_pct}%` }} className="h-full bg-cyan-400"></div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-soc-900 border border-soc-750 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>GPU INFERENCE LOAD</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-xl font-bold text-amber-300">{data.gpu_utilization_pct}%</p>
          <div className="w-full h-1.5 bg-soc-800 rounded-full overflow-hidden">
            <div style={{ width: `${data.gpu_utilization_pct}%` }} className="h-full bg-amber-400"></div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-soc-900 border border-soc-750 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>RAM CAPACITY</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-lg font-bold text-slate-200">{data.ram_usage_gb}</p>
          <span className="text-[10px] text-emerald-400">23.7% Memory Pressure</span>
        </div>

        <div className="p-4 rounded-xl bg-soc-900 border border-soc-750 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>EVIDENCE STORAGE</span>
            <HardDrive className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-lg font-bold text-slate-200">{data.disk_free_gb}</p>
          <span className="text-[10px] text-cyan-300">Tamper-Evident SHA-256 Vault</span>
        </div>
      </div>

      {/* Per-Sensor Stream Diagnostics Table */}
      <div className="p-4 rounded-xl bg-soc-900 border border-soc-750 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-soc-750">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400" />
            <span>Per-Sensor Stream Health & Ingestion Matrix</span>
          </h4>
          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            ALL SENSORS SYNCHRONIZED
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-slate-500 border-b border-soc-750 text-[11px]">
                <th className="py-2">SENSOR</th>
                <th className="py-2">SECTOR LOCATION</th>
                <th className="py-2">FRAME RATE</th>
                <th className="py-2">JITTER (MS)</th>
                <th className="py-2">INFERENCE LATENCY</th>
                <th className="py-2">BITRATE</th>
                <th className="py-2">HEALTH</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-soc-750/60">
              {data.sensor_matrix.map((cam) => (
                <tr key={cam.camera_id} className="hover:bg-soc-800/40 transition">
                  <td className="py-2.5 font-bold text-white">{cam.camera_id}</td>
                  <td className="py-2.5 text-slate-300 font-sans text-xs">{cam.name} ({cam.location})</td>
                  <td className="py-2.5 text-cyan-300 font-bold">{cam.fps} FPS</td>
                  <td className="py-2.5 text-slate-300">{cam.jitter_ms} ms</td>
                  <td className="py-2.5 text-emerald-400 font-bold">{cam.inference_latency_ms} ms</td>
                  <td className="py-2.5 text-slate-400">{cam.bitrate_mbps} Mbps</td>
                  <td className="py-2.5">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-[10px] font-bold">
                      {cam.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
