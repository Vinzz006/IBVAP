import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, Eye, ShieldCheck, FileText, CheckCircle, Clock, ShieldAlert, History } from 'lucide-react';
import RiskBadge from '../components/RiskBadge';
import EventDetailsModal from '../components/EventDetailsModal';
import { api } from '../services/api';

export default function EventHistory() {
  const [events, setEvents] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [activeSubTab, setActiveSubTab] = useState('incidents'); // 'incidents' | 'audit'
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [cameraFilter, setCameraFilter] = useState('');
  const [inspectEventId, setInspectEventId] = useState(null);

  useEffect(() => {
    fetchData();
  }, [riskFilter, cameraFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [evts, logs] = await Promise.all([
        api.getEvents({
          risk_level: riskFilter || undefined,
          camera_id: cameraFilter || undefined,
          limit: 100
        }),
        api.getAuditLogs(100)
      ]);
      setEvents(evts.events || []);
      setAuditLogs(logs || []);
    } catch (err) {
      console.error('Failed to fetch event history:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events.filter((ev) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      ev.id?.toLowerCase().includes(q) ||
      ev.event_type?.toLowerCase().includes(q) ||
      ev.camera_id?.toLowerCase().includes(q) ||
      ev.object_type?.toLowerCase().includes(q) ||
      ev.location?.toLowerCase().includes(q)
    );
  });

  const handleExportCSV = () => {
    if (events.length === 0) return;
    const headers = ['Event ID', 'Timestamp', 'Camera', 'Location', 'Event Type', 'Target', 'Risk Score', 'Risk Level', 'SHA-256 Hash', 'Status'];
    const rows = events.map(e => [
      e.id,
      e.timestamp,
      e.camera_id,
      `"${e.location}"`,
      `"${e.event_type}"`,
      `${e.object_type} #${e.tracking_id}`,
      e.risk_score,
      e.risk_level,
      e.evidence_hash || 'N/A',
      e.status
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `IBVAP_Incident_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-soc-900 select-none">
      {/* Top Header Bar */}
      <div className="p-4 bg-soc-850 border-b border-soc-700/80 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-mono font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            <span>Border Incident Ledger & Cryptographic Evidence Vault</span>
          </h2>
          <p className="text-xs text-slate-400">
            Immutable log of all AI-detected security events with SHA-256 tamper verification
          </p>
        </div>

        {/* Tab Toggle & Export */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-soc-900 p-1 rounded-lg border border-soc-700 font-mono text-xs">
            <button
              onClick={() => setActiveSubTab('incidents')}
              className={`px-3 py-1.5 rounded transition ${
                activeSubTab === 'incidents' ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              Incidents ({events.length})
            </button>
            <button
              onClick={() => setActiveSubTab('audit')}
              className={`px-3 py-1.5 rounded transition ${
                activeSubTab === 'audit' ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              Audit Trail ({auditLogs.length})
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-soc-750 hover:bg-soc-700 text-slate-200 border border-soc-600 text-xs font-mono transition"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {activeSubTab === 'incidents' ? (
        <>
          {/* Filter Bar */}
          <div className="p-3 bg-soc-850/60 border-b border-soc-700/60 flex flex-wrap items-center gap-3 text-xs font-mono">
            {/* Search Input */}
            <div className="flex-1 min-w-[240px] relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search incident ID, sector, vehicle plate..."
                className="w-full bg-soc-900 border border-soc-700 rounded-lg pl-9 pr-3 py-2 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            {/* Risk Level Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                className="bg-soc-900 border border-soc-700 rounded-lg px-2.5 py-2 text-slate-300 focus:outline-none focus:border-cyan-500"
              >
                <option value="">All Risk Levels</option>
                <option value="CRITICAL">Critical Only</option>
                <option value="HIGH">High Only</option>
                <option value="MEDIUM">Medium Only</option>
                <option value="LOW">Low Only</option>
              </select>
            </div>

            {/* Camera Filter */}
            <select
              value={cameraFilter}
              onChange={(e) => setCameraFilter(e.target.value)}
              className="bg-soc-900 border border-soc-700 rounded-lg px-2.5 py-2 text-slate-300 focus:outline-none focus:border-cyan-500"
            >
              <option value="">All Cameras</option>
              <option value="CAM-01">CAM-01 (Sector A)</option>
              <option value="CAM-02">CAM-02 (Sector B)</option>
              <option value="CAM-03">CAM-03 (Sector C)</option>
              <option value="CAM-04">CAM-04 (Sector D)</option>
            </select>
          </div>

          {/* Incidents Table */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="rounded-xl border border-soc-700/80 bg-soc-850 overflow-hidden shadow-lg">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead>
                  <tr className="bg-soc-900/90 text-slate-400 border-b border-soc-700/80 text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4">Event ID</th>
                    <th className="py-3 px-4">Time (UTC)</th>
                    <th className="py-3 px-4">Camera / Sector</th>
                    <th className="py-3 px-4">Event Classification</th>
                    <th className="py-3 px-4">Target Track</th>
                    <th className="py-3 px-4">Risk Score</th>
                    <th className="py-3 px-4">SHA-256 Provenance</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-soc-750 text-slate-300">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-500">
                        Loading incident records...
                      </td>
                    </tr>
                  ) : filteredEvents.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-500">
                        No security incidents found matching filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredEvents.map((ev) => (
                      <tr key={ev.id} className="hover:bg-soc-800/60 transition">
                        <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                          {ev.id}
                        </td>
                        <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                          {ev.timestamp ? ev.timestamp.replace('T', ' ').slice(0, 19) : '—'}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="text-slate-200 font-semibold">{ev.camera_id}</span>
                          <span className="text-slate-500 block text-[10px]">{ev.location}</span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-200">
                          {ev.event_type}
                        </td>
                        <td className="py-3 px-4 text-cyan-400 whitespace-nowrap">
                          {ev.object_type?.toUpperCase()} #{ev.tracking_id}
                          {ev.vehicle && (
                            <span className="block text-yellow-400 text-[10px]">
                              [{ev.vehicle.plate_number}]
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <RiskBadge level={ev.risk_level} score={ev.risk_score} size="sm" />
                        </td>
                        <td className="py-3 px-4 font-mono text-[10px] text-slate-400 whitespace-nowrap max-w-[130px] truncate" title={ev.evidence_hash}>
                          {ev.evidence_hash ? `${ev.evidence_hash.substring(0, 14)}...` : 'N/A'}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] ${
                            ev.status === 'RESOLVED'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : ev.status === 'ACKNOWLEDGED'
                              ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                              : ev.status === 'DISPATCHED'
                              ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                              : 'bg-red-500/15 text-red-400 border border-red-500/30'
                          }`}>
                            {ev.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => setInspectEventId(ev.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 transition text-[11px]"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Inspect</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Audit Trail View */
        <div className="flex-1 overflow-y-auto p-4">
          <div className="rounded-xl border border-soc-700/80 bg-soc-850 overflow-hidden shadow-lg">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="bg-soc-900/90 text-slate-400 border-b border-soc-700/80 text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Operator / Principal</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Target Event</th>
                  <th className="py-3 px-4">Audit Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-soc-750 text-slate-300">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-soc-800/60 transition">
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                      {log.timestamp ? log.timestamp.replace('T', ' ').slice(0, 19) : '—'}
                    </td>
                    <td className="py-3 px-4 text-cyan-300 font-semibold whitespace-nowrap">
                      {log.username}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-soc-750 border border-soc-600 text-[11px] text-slate-200">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-400 whitespace-nowrap">
                      {log.event_id || '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-300 text-xs font-sans">
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Incident Details Modal */}
      {inspectEventId && (
        <EventDetailsModal
          eventId={inspectEventId}
          isOpen={!!inspectEventId}
          onClose={() => setInspectEventId(null)}
          onEventUpdated={fetchData}
        />
      )}
    </div>
  );
}
