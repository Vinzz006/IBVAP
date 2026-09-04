import React, { useState } from 'react';
import { X, Server, Shield, Key, CheckCircle, AlertCircle, Cpu } from 'lucide-react';
import { api } from '../services/api';

export default function NodeRegistrationModal({ isOpen, onClose, onNodeRegistered }) {
  const [nodeId, setNodeId] = useState('');
  const [sectorId, setSectorId] = useState('SEC-A');
  const [hostname, setHostname] = useState('');
  const [version, setVersion] = useState('v1.3.0-edge');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const data = await api.registerEdgeNode({
        node_id: nodeId.trim() || undefined,
        sector_id: sectorId,
        hostname: hostname.trim() || undefined,
        version: version.trim() || 'v1.3.0-edge'
      });
      setResult(data);
      if (onNodeRegistered) onNodeRegistered(data);
    } catch (err) {
      setError(err.message || 'Failed to register edge node');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-soc-850 border border-soc-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden font-mono text-xs flex flex-col">
        {/* Header */}
        <div className="p-4 bg-soc-800 border-b border-soc-700 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">Register Frontier Edge Node</h3>
              <p className="text-[10px] text-slate-400 font-sans">Deploy an autonomous edge compute node to a frontier sector</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-soc-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto max-h-[75vh]">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/15 border border-red-500/40 text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {result ? (
            <div className="space-y-4 py-2">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/40 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <CheckCircle className="w-4 h-4" />
                  <span>Node Registered Successfully</span>
                </div>
                <p className="text-slate-300 text-[11px] font-sans">
                  Edge node <strong className="text-white">{result.node_id}</strong> is now registered for <strong className="text-cyan-300">{result.sector_id}</strong>.
                </p>
              </div>

              {/* Secure API Key display */}
              <div className="p-3.5 rounded-xl bg-soc-900 border border-cyan-500/40 space-y-2">
                <span className="text-[10px] text-cyan-400 uppercase font-bold flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5" />
                  NODE AUTHENTICATION API KEY (STORE SECURELY)
                </span>
                <div className="p-2.5 rounded bg-black/60 font-mono text-[11px] text-amber-300 break-all border border-soc-700 select-all">
                  {result.api_key_raw}
                </div>
                <p className="text-[10px] text-slate-400 font-sans">
                  Use this key in the <code className="text-cyan-300 font-mono">X-Edge-API-Key</code> header for edge telemetry and structured intelligence synchronization.
                </p>
              </div>

              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold transition shadow-[0_0_12px_rgba(0,240,255,0.3)]"
              >
                Close & Return to Federated Command
              </button>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Target Frontier Sector</label>
                <select
                  value={sectorId}
                  onChange={(e) => setSectorId(e.target.value)}
                  className="w-full bg-soc-900 border border-soc-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="SEC-A">Sector A — North Perimeter (Highway 104)</option>
                  <option value="SEC-B">Sector B — Riverine Basin (Kali River)</option>
                  <option value="SEC-C">Sector C — Transit Gate (Checkpoint Charlie)</option>
                  <option value="SEC-D">Sector D — Mountain Pass (Ridge 402)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Edge Node ID (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. EDGE-A02 (Auto-generated if empty)"
                  value={nodeId}
                  onChange={(e) => setNodeId(e.target.value)}
                  className="w-full bg-soc-900 border border-soc-700 rounded-lg p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Node Hostname / Domain</label>
                <input
                  type="text"
                  placeholder="e.g. edge-post-05.ssb.gov.in"
                  value={hostname}
                  onChange={(e) => setHostname(e.target.value)}
                  className="w-full bg-soc-900 border border-soc-700 rounded-lg p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Edge Firmware Version</label>
                <input
                  type="text"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  className="w-full bg-soc-900 border border-soc-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div className="p-3 rounded-lg bg-soc-900/80 border border-soc-750 text-slate-400 font-sans text-[11px] leading-relaxed">
                <strong className="text-slate-200">Federated Edge Isolation:</strong> Once registered, this node operates fully autonomously with local AI detection and offline buffers, transmitting only structured events to Central Command.
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-soc-800 hover:bg-soc-750 text-slate-300 border border-soc-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold transition flex items-center gap-1.5 shadow-[0_0_12px_rgba(0,240,255,0.2)] disabled:opacity-50"
                >
                  {loading ? 'Registering...' : 'Register Node'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
