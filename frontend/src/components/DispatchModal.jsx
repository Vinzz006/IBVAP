import React, { useState } from 'react';
import { ShieldAlert, Radio, Send, X, CheckCircle2, Siren, Plane, Lock, Users } from 'lucide-react';
import { api } from '../services/api';

export default function DispatchModal({ event, isOpen, onClose, onDispatched }) {
  const [units, setUnits] = useState(['QRF Team Bravo (3 Operators)', 'SSB UAV Recon Drone-04']);
  const [siren, setSiren] = useState(true);
  const [barrier, setBarrier] = useState(false);
  const [eta, setEta] = useState(3);
  const [callsign, setCallsign] = useState('SSB Tactical Net Charlie');
  const [dispatching, setDispatching] = useState(false);
  const [dispatchedSuccess, setDispatchedSuccess] = useState(false);

  if (!isOpen || !event) return null;

  const availableUnits = [
    { id: 'QRF Team Bravo (3 Operators)', label: 'QRF Team Bravo (3 Operators)', icon: Users },
    { id: 'SSB UAV Recon Drone-04', label: 'SSB UAV Recon Drone-04', icon: Plane },
    { id: 'Perimeter Dog Squad Unit-2', label: 'Perimeter Dog Squad Unit-2', icon: ShieldAlert },
    { id: 'Armored Patrol Vehicle 09', label: 'Armored Patrol Vehicle 09', icon: Radio }
  ];

  const handleToggleUnit = (unitId) => {
    if (units.includes(unitId)) {
      setUnits(units.filter(u => u !== unitId));
    } else {
      setUnits([...units, unitId]);
    }
  };

  const handleExecuteDispatch = async () => {
    if (units.length === 0) {
      alert('Please select at least 1 responding unit.');
      return;
    }
    setDispatching(true);
    try {
      const data = await api.dispatchResponse(event.id || event.event_id, {
        dispatch_type: 'QRF_DEPLOYMENT',
        units,
        eta_minutes: eta,
        siren_activated: siren,
        barrier_locked: barrier,
        operator_callsign: callsign,
        notes: `Tactical interception authorized for ${event.event_type} on ${event.camera_id}.`
      });
      setDispatchedSuccess(true);
      setTimeout(() => {
        setDispatchedSuccess(false);
        if (onDispatched) onDispatched(data);
        onClose();
      }, 900);
    } catch (err) {
      alert(`Dispatch simulation failed: ${err.message}`);
    } finally {
      setDispatching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-soc-850 border border-soc-700 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col font-mono text-xs select-none">
        {/* Header */}
        <div className="p-4 border-b border-soc-700 flex items-center justify-between bg-soc-900">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-red-400" />
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Prototype Tactical Response Simulation
              </h3>
              <p className="text-[10px] text-slate-400">Incident Target: {event.id || event.event_id}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-300">
            <strong>SIMULATION NOTICE:</strong> This action simulates Quick Reaction Force (QRF) dispatch workflows for operational evaluation. It does not issue commands to real physical assets.
          </div>

          <div className="p-3 rounded-lg bg-red-950/25 border border-red-500/40 space-y-1">
            <div className="flex items-center justify-between text-slate-300">
              <span className="font-bold text-red-400">{event.event_type}</span>
              <span className="font-bold text-amber-400">{event.risk_level} ({event.risk_score} pts)</span>
            </div>
            <p className="text-[11px] text-slate-400">
              TARGET: {event.object_type?.toUpperCase()} #{event.tracking_id} on {event.camera_id} ({event.location})
            </p>
          </div>

          {/* Unit Selection */}
          <div className="space-y-2">
            <label className="text-slate-300 block font-bold">1. Select Responding Units to Dispatch:</label>
            <div className="grid grid-cols-1 gap-2">
              {availableUnits.map((u) => {
                const isSelected = units.includes(u.id);
                const Icon = u.icon;
                return (
                  <div
                    key={u.id}
                    onClick={() => handleToggleUnit(u.id)}
                    className={`p-2.5 rounded-lg border cursor-pointer transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-cyan-500/15 border-cyan-500 text-cyan-300 font-semibold'
                        : 'bg-soc-900 border-soc-700 hover:bg-soc-800 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      <span>{u.label}</span>
                    </div>
                    <span className="text-[10px]">{isSelected ? '✓ DISPATCH' : '+ ADD'}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Defense Measures */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div
              onClick={() => setSiren(!siren)}
              className={`p-2.5 rounded-lg border cursor-pointer transition flex items-center gap-2 ${
                siren ? 'bg-red-500/20 border-red-500 text-red-300' : 'bg-soc-900 border-soc-700 text-slate-400'
              }`}
            >
              <Siren className="w-4 h-4 text-red-400" />
              <span>Acoustic Siren {siren ? '[ARMED]' : '[MUTED]'}</span>
            </div>

            <div
              onClick={() => setBarrier(!barrier)}
              className={`p-2.5 rounded-lg border cursor-pointer transition flex items-center gap-2 ${
                barrier ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'bg-soc-900 border-soc-700 text-slate-400'
              }`}
            >
              <Lock className="w-4 h-4 text-amber-400" />
              <span>Gate Lockdown {barrier ? '[LOCKED]' : '[OPEN]'}</span>
            </div>
          </div>

          {/* Response ETA Slider */}
          <div className="space-y-1 pt-1">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span>Estimated Team ETA to Sector:</span>
              <span className="text-cyan-300 font-bold">{eta} Minutes</span>
            </div>
            <input
              type="range"
              min="1"
              max="15"
              value={eta}
              onChange={(e) => setEta(parseInt(e.target.value))}
              className="w-full h-1.5 bg-soc-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-soc-700 bg-soc-900 flex items-center justify-between">
          <span className="text-[10px] text-slate-500">Radio Call Sign: {callsign}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-soc-800 text-slate-300 text-xs"
            >
              Cancel
            </button>
            <button
              onClick={handleExecuteDispatch}
              disabled={dispatching || units.length === 0}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition shadow-[0_0_12px_rgba(239,68,68,0.3)] disabled:opacity-50"
            >
              {dispatchedSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>QRF Dispatched!</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>{dispatching ? 'Broadcasting Orders...' : 'Authorize Tactical Dispatch'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
