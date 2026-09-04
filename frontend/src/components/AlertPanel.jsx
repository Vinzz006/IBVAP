import React, { useState } from 'react';
import { Bell, ShieldAlert, CheckCircle, ExternalLink, Filter, Clock, Eye, Send, Radio } from 'lucide-react';
import RiskBadge from './RiskBadge';

export default function AlertPanel({
  alerts,
  onSelectEvent,
  onAcknowledgeAlert,
  onOpenDispatch
}) {
  const [filter, setFilter] = useState('ALL'); // ALL, CRITICAL, NEW

  const filteredAlerts = alerts.filter(a => {
    if (filter === 'CRITICAL') return a.risk_level === 'CRITICAL' || a.risk_level === 'HIGH';
    if (filter === 'NEW') return a.status === 'NEW';
    return true;
  });

  return (
    <aside className="w-88 bg-soc-850 border-l border-soc-700/80 flex flex-col h-full overflow-hidden select-none">
      {/* Header */}
      <div className="p-3.5 border-b border-soc-700/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bell className="w-4 h-4 text-red-400" />
            {alerts.some(a => a.status === 'NEW' && a.risk_level === 'CRITICAL') && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
            )}
          </div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Live Security Alerts</h2>
        </div>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/30">
          {alerts.filter(a => a.status === 'NEW').length} ACTIVE
        </span>
      </div>

      {/* Filter Tabs */}
      <div className="px-3 py-2 bg-soc-900 border-b border-soc-750 flex items-center gap-1.5 text-xs font-mono">
        <button
          onClick={() => setFilter('ALL')}
          className={`px-2.5 py-1 rounded transition text-[11px] ${
            filter === 'ALL' ? 'bg-soc-750 text-cyan-300 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          ALL ({alerts.length})
        </button>
        <button
          onClick={() => setFilter('CRITICAL')}
          className={`px-2.5 py-1 rounded transition text-[11px] ${
            filter === 'CRITICAL' ? 'bg-soc-750 text-red-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          CRITICAL ({alerts.filter(a => a.risk_level === 'CRITICAL' || a.risk_level === 'HIGH').length})
        </button>
        <button
          onClick={() => setFilter('NEW')}
          className={`px-2.5 py-1 rounded transition text-[11px] ${
            filter === 'NEW' ? 'bg-soc-750 text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          NEW ({alerts.filter(a => a.status === 'NEW').length})
        </button>
      </div>

      {/* Alerts List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {filteredAlerts.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-slate-500 text-xs font-mono">
            <CheckCircle className="w-8 h-8 text-emerald-500/40 mb-2" />
            <span>NO ACTIVE INCIDENTS</span>
            <span className="text-[10px] text-slate-600 mt-1">Perimeter security nominal</span>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const isCritical = alert.risk_level === 'CRITICAL';
            const isDispatched = alert.status === 'DISPATCHED';
            const isAcknowledged = alert.status === 'ACKNOWLEDGED' || isDispatched;

            return (
              <div
                key={alert.event_id || alert.id}
                className={`p-3 rounded-lg border transition-all relative ${
                  isCritical && !isAcknowledged
                    ? 'bg-red-950/20 border-red-500/60 shadow-[0_0_12px_rgba(239,68,68,0.2)] ring-1 ring-red-500/30'
                    : 'bg-soc-900/90 border-soc-700/70 hover:border-soc-600'
                }`}
              >
                {/* Top Row: Event ID & Risk Badge */}
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-xs font-bold text-white tracking-wide">
                    {alert.event_id || alert.id}
                  </span>
                  <RiskBadge level={alert.risk_level} score={alert.risk_score} size="sm" />
                </div>

                {/* Event Type & Target */}
                <h4 className="text-xs font-semibold text-slate-200 line-clamp-1 mb-1">
                  {alert.event_type}
                </h4>

                <div className="text-[11px] font-mono text-slate-400 space-y-0.5 mb-2.5">
                  <p>CAM: <strong className="text-slate-300">{alert.camera_id}</strong> ({alert.location || 'Sector'})</p>
                  <p>TARGET: <strong className="text-cyan-400">
                    {alert.object_type?.toUpperCase()} #{alert.tracking_id}
                  </strong></p>
                  <p className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{alert.timestamp || 'Just now'}</span>
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-soc-700/60">
                  <button
                    onClick={() => onSelectEvent(alert.event_id || alert.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-[11px] font-mono font-medium transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Evidence</span>
                  </button>

                  {/* Dispatch QRF button */}
                  {onOpenDispatch && (
                    <button
                      onClick={() => onOpenDispatch(alert)}
                      className={`py-1.5 px-2 rounded text-[11px] font-mono transition flex items-center gap-1 ${
                        isDispatched
                          ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                          : 'bg-red-600/80 hover:bg-red-600 text-white font-semibold shadow-sm'
                      }`}
                      title="Dispatch Tactical QRF Team & Drones"
                    >
                      <Send className="w-3 h-3" />
                      <span>{isDispatched ? 'QRF' : 'Dispatch'}</span>
                    </button>
                  )}

                  {!isAcknowledged && (
                    <button
                      onClick={() => onAcknowledgeAlert(alert.event_id || alert.id)}
                      className="py-1.5 px-2 rounded bg-soc-750 hover:bg-soc-700 text-slate-300 hover:text-white border border-soc-600 text-[11px] font-mono transition"
                      title="Acknowledge Incident"
                    >
                      ACK
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
