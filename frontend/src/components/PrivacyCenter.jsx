import React, { useState, useEffect } from 'react';
import { Shield, Lock, Eye, EyeOff, Save, CheckCircle2, Sliders, Users, FileText, Filter, RefreshCw } from 'lucide-react';
import { api, getCurrentUser } from '../services/api';

export default function PrivacyCenter() {
  const [settings, setSettings] = useState(null);
  const [evidenceDays, setEvidenceDays] = useState(30);
  const [metadataDays, setMetadataDays] = useState(90);
  const [auditDays, setAuditDays] = useState(365);
  const [maskingEnabled, setMaskingEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [filterAction, setFilterAction] = useState('');
  const [filterUser, setFilterUser] = useState('');

  const currentUser = getCurrentUser() || { role: 'ADMIN' };
  const isAdmin = currentUser.role === 'ADMIN';

  useEffect(() => {
    fetchSettings();
    fetchAudit();
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await api.getPrivacySettings();
      setSettings(data);
      if (data.policy) {
        setEvidenceDays(data.policy.evidence_retention_days || 30);
        setMetadataDays(data.policy.metadata_retention_days || 90);
        setAuditDays(data.policy.audit_retention_days || 365);
        setMaskingEnabled(data.policy.masking_enabled || false);
      }
    } catch (err) {
      console.error('Failed to load privacy settings:', err);
    }
  };

  const fetchAudit = async () => {
    setAuditLoading(true);
    try {
      const logs = await api.getFilteredAuditLogs({
        action: filterAction || undefined,
        username: filterUser || undefined,
        limit: 25
      });
      setAuditLogs(logs);
    } catch (err) {
      console.error('Failed to fetch audit:', err);
    } finally {
      setAuditLoading(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('Only ADMIN role can modify privacy and evidence retention settings.');
      return;
    }

    setSaving(true);
    setSaveSuccess(false);
    try {
      await api.updatePrivacySettings({
        evidence_retention_days: parseInt(evidenceDays, 10),
        metadata_retention_days: parseInt(metadataDays, 10),
        audit_retention_days: parseInt(auditDays, 10),
        masking_enabled: maskingEnabled
      });
      setSaveSuccess(true);
      fetchAudit();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 font-mono text-xs select-none">
      {/* Retention Policies Form */}
      <div className="bg-soc-850 border border-soc-700 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-soc-750">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">Evidence Retention & Governance Policy</h3>
          </div>
          <span className="text-[10px] text-slate-400 bg-soc-900 px-2 py-0.5 rounded border border-soc-700">
            {isAdmin ? 'ADMIN CONFIGURATION' : 'READ-ONLY (OPERATOR)'}
          </span>
        </div>

        {saveSuccess && (
          <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/50 flex items-center gap-2 text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Governance and evidence retention policies updated and recorded in audit ledger.</span>
          </div>
        )}

        <form onSubmit={handleSaveSettings} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5 p-3 rounded-lg bg-soc-900 border border-soc-750">
            <label className="text-slate-300 block">Forensic Evidence Retention:</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="7"
                max="365"
                disabled={!isAdmin}
                value={evidenceDays}
                onChange={(e) => setEvidenceDays(e.target.value)}
                className="w-24 bg-soc-850 border border-soc-700 rounded p-1.5 text-white font-bold text-center focus:outline-none focus:border-cyan-500 disabled:opacity-50"
              />
              <span className="text-slate-400">Days</span>
            </div>
            <p className="text-[10px] text-slate-500 font-sans">Raw stamped keyframe images stored on disk</p>
          </div>

          <div className="space-y-1.5 p-3 rounded-lg bg-soc-900 border border-soc-750">
            <label className="text-slate-300 block">Incident Metadata Retention:</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="30"
                max="730"
                disabled={!isAdmin}
                value={metadataDays}
                onChange={(e) => setMetadataDays(e.target.value)}
                className="w-24 bg-soc-850 border border-soc-700 rounded p-1.5 text-white font-bold text-center focus:outline-none focus:border-cyan-500 disabled:opacity-50"
              />
              <span className="text-slate-400">Days</span>
            </div>
            <p className="text-[10px] text-slate-500 font-sans">Database incident logs, risk breakdown, and notes</p>
          </div>

          <div className="space-y-1.5 p-3 rounded-lg bg-soc-900 border border-soc-750">
            <label className="text-slate-300 block">Audit Ledger Retention:</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="90"
                max="1825"
                disabled={!isAdmin}
                value={auditDays}
                onChange={(e) => setAuditDays(e.target.value)}
                className="w-24 bg-soc-850 border border-soc-700 rounded p-1.5 text-white font-bold text-center focus:outline-none focus:border-cyan-500 disabled:opacity-50"
              />
              <span className="text-slate-400">Days</span>
            </div>
            <p className="text-[10px] text-slate-500 font-sans">Immutable operator action and verification history</p>
          </div>

          {isAdmin && (
            <div className="col-span-1 md:col-span-3 pt-2 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold transition shadow-[0_0_10px_rgba(0,240,255,0.2)] disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Updating Policies...' : 'Save Retention Policy'}</span>
              </button>
            </div>
          )}
        </form>
      </div>

      {/* RBAC Access Control Matrix */}
      <div className="bg-soc-850 border border-soc-700 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-soc-750">
          <Users className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold text-white">Role-Based Access Control (RBAC) Permissions Matrix</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {settings?.rbac_matrix?.map((r) => (
            <div key={r.role} className="p-4 rounded-xl bg-soc-900 border border-soc-750 space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-soc-750">
                <span className="text-cyan-300 font-bold">{r.role}</span>
                <span className="text-[10px] text-slate-400">{r.title}</span>
              </div>
              <ul className="space-y-1 text-[11px] text-slate-300">
                {r.permissions.map((p, idx) => (
                  <li key={idx} className="flex items-center gap-1.5">
                    <span className="text-emerald-400">•</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Filtered Security Audit Viewer */}
      <div className="bg-soc-850 border border-soc-700 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-soc-750">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">Security & Provenance Audit Ledger</h3>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Filter by action..."
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="bg-soc-900 border border-soc-700 rounded px-2.5 py-1 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 w-36"
            />
            <button
              onClick={fetchAudit}
              className="p-1.5 rounded bg-soc-750 hover:bg-soc-700 text-slate-300 transition"
              title="Refresh Audit Logs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${auditLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto max-h-72 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-soc-900 text-slate-400 uppercase text-[10px] sticky top-0">
              <tr>
                <th className="p-2.5">TIMESTAMP (UTC)</th>
                <th className="p-2.5">OPERATOR / USER</th>
                <th className="p-2.5">SECURITY ACTION</th>
                <th className="p-2.5">AUDIT DETAILS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-soc-750">
              {auditLogs.length > 0 ? (
                auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-soc-800/50 transition">
                    <td className="p-2.5 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                      {log.timestamp ? log.timestamp.replace('T', ' ').substring(0, 19) : '—'}
                    </td>
                    <td className="p-2.5 font-bold text-cyan-300">{log.username}</td>
                    <td className="p-2.5">
                      <span className="px-2 py-0.5 rounded bg-soc-750 border border-soc-600 text-[10px] text-slate-200">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-2.5 text-slate-300 font-sans text-[11px] max-w-md truncate">
                      {log.details || '—'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-slate-500">
                    {auditLoading ? 'Retrieving audit ledger...' : 'No audit entries matched.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
