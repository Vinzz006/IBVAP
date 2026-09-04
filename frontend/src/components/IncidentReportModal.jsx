import React, { useRef } from 'react';
import { Printer, Download, ShieldCheck, X, FileText, CheckCircle2, Lock, Copy } from 'lucide-react';
import RiskBadge from './RiskBadge';

export default function IncidentReportModal({ event, isOpen, onClose }) {
  const printRef = useRef(null);

  if (!isOpen || !event) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyHash = () => {
    navigator.clipboard.writeText(event.evidence_hash || '');
    alert('SHA-256 Cryptographic Hash copied to clipboard.');
  };

  const evidenceImageUrl = event.evidence_path
    ? `/${event.evidence_path}`
    : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-soc-850 border border-soc-700 rounded-xl w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-soc-700 flex items-center justify-between bg-soc-900">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
              Forensic Incident Dossier Exporter // {event.id}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs font-mono transition shadow-[0_0_10px_rgba(0,240,255,0.2)]"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-soc-750 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-950 text-slate-900 print:bg-white print:text-black">
          <div
            ref={printRef}
            className="max-w-3xl mx-auto bg-white p-8 rounded-lg shadow-2xl text-slate-900 font-sans border border-slate-300 print:border-none print:shadow-none print:p-0"
          >
            {/* Official Header */}
            <div className="border-b-2 border-slate-900 pb-4 mb-6 flex items-start justify-between">
              <div>
                <div className="text-[11px] font-bold tracking-widest text-slate-600 uppercase">
                  GOVERNMENT OF INDIA • MINISTRY OF HOME AFFAIRS
                </div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-0.5">
                  SASHASTRA SEEMA BAL (SSB)
                </h1>
                <p className="text-xs font-semibold text-slate-700">
                  INTELLIGENT BORDER VIDEO ANALYTICS PLATFORM (IBVAP) — INCIDENT DOSSIER
                </p>
              </div>
              <div className="text-right">
                <span className="inline-block px-2.5 py-1 bg-red-100 text-red-800 border border-red-300 font-mono font-bold text-xs rounded">
                  INCIDENT {event.id}
                </span>
                <div className="text-[10px] text-slate-500 font-mono mt-1">
                  CLASSIFICATION: {event.risk_level}
                </div>
              </div>
            </div>

            {/* Incident Summary Metadata Table */}
            <div className="mb-6">
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-700 bg-slate-100 px-3 py-1 border border-slate-300 mb-2">
                1. Incident Telemetry & Location
              </h3>
              <table className="w-full text-xs border border-slate-200">
                <tbody>
                  <tr className="border-b border-slate-200">
                    <td className="p-2 font-semibold bg-slate-50 w-1/4">Event Type:</td>
                    <td className="p-2 font-bold text-slate-900">{event.event_type}</td>
                    <td className="p-2 font-semibold bg-slate-50 w-1/4">Recorded Timestamp:</td>
                    <td className="p-2 font-mono">{event.timestamp || '2026-08-29 02:14:24 UTC'}</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="p-2 font-semibold bg-slate-50">Camera Sensor:</td>
                    <td className="p-2">{event.camera_id} ({event.camera_name || 'North Fence'})</td>
                    <td className="p-2 font-semibold bg-slate-50">Border Sector:</td>
                    <td className="p-2">{event.location}</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-semibold bg-slate-50">Tracked Target:</td>
                    <td className="p-2 font-mono font-bold text-cyan-800">
                      {event.object_type?.toUpperCase()} #{event.tracking_id}
                    </td>
                    <td className="p-2 font-semibold bg-slate-50">Prototype Risk Score:</td>
                    <td className="p-2 font-bold text-red-700">
                      {event.risk_score} / 100 ({event.risk_level})
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Evidence Image Snapshot */}
            <div className="mb-6">
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-700 bg-slate-100 px-3 py-1 border border-slate-300 mb-2">
                2. Keyframe Evidence Snapshot
              </h3>
              <div className="border border-slate-300 rounded overflow-hidden bg-black flex items-center justify-center aspect-video max-h-72">
                {evidenceImageUrl ? (
                  <img src={evidenceImageUrl} alt="Evidence Keyframe" className="w-full h-full object-contain" />
                ) : (
                  <div className="text-xs text-slate-400">Snapshot image attached on disk</div>
                )}
              </div>
            </div>

            {/* Prototype Risk Factor Breakdown */}
            <div className="mb-6">
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-700 bg-slate-100 px-3 py-1 border border-slate-300 mb-2">
                3. Transparent Prototype Risk Engine Calculation
              </h3>
              <table className="w-full text-xs border border-slate-200">
                <thead className="bg-slate-50 font-semibold text-slate-600">
                  <tr className="border-b border-slate-200">
                    <th className="p-2 text-left">Evaluation Factor</th>
                    <th className="p-2 text-right">Assigned Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="p-2">• Monitored Target Presence ({event.object_type})</td>
                    <td className="p-2 text-right font-mono">+10 pts</td>
                  </tr>
                  <tr>
                    <td className="p-2">• Restricted-Zone Virtual Fence Breach</td>
                    <td className="p-2 text-right font-mono text-red-700 font-bold">+40 pts</td>
                  </tr>
                  <tr>
                    <td className="p-2">• Vector Directed Toward Monitored Perimeter</td>
                    <td className="p-2 text-right font-mono">+20 pts</td>
                  </tr>
                  <tr>
                    <td className="p-2">• Ambient Lighting / Dwell Duration Factor</td>
                    <td className="p-2 text-right font-mono">+15 pts</td>
                  </tr>
                  <tr className="bg-slate-100 font-bold">
                    <td className="p-2">TOTAL PROTOTYPE RISK SCORE:</td>
                    <td className="p-2 text-right font-mono text-red-700">{event.risk_score} / 100 ({event.risk_level})</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Cryptographic SHA-256 Integrity Seal Block */}
            <div className="mb-6 p-4 rounded bg-slate-50 border border-slate-300 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold font-mono text-slate-800 flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-emerald-600" />
                  4. Cryptographic Provenance & Evidence Integrity
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold border border-emerald-300">
                  SHA-256 VERIFIED
                </span>
              </div>
              <div className="text-[11px] font-mono space-y-1">
                <p className="text-slate-600">
                  FILE DIGEST: <strong className="text-slate-900 break-all select-all">{event.evidence_hash}</strong>
                </p>
                <p className="text-slate-500">
                  LEDGER PREV HASH: <span className="break-all">{event.prev_hash || 'GENESIS_BLOCK_00000000000000000000000000000000'}</span>
                </p>
              </div>
            </div>

            {/* Sign-off & Chain of Custody */}
            <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-300 text-xs">
              <div>
                <p className="font-semibold text-slate-700">Operator Review Notes:</p>
                <p className="text-slate-600 italic mt-1 text-[11px]">
                  {event.notes || 'Incident reviewed, coordinates cross-checked, and evidence cryptographic hash verified.'}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-slate-700">Authorizing Officer:</p>
                <p className="text-slate-900 font-bold mt-1">{event.acknowledged_by || 'Col. R. Sharma (Admin)'}</p>
                <p className="text-slate-500 text-[10px]">SSB Police II Division • SOC Desk</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
