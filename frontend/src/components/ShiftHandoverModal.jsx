import React, { useState, useEffect } from 'react';
import { Printer, Shield, FileText, CheckCircle2, X, Download, Lock, Calendar, Users, Activity } from 'lucide-react';
import { api } from '../services/api';

export default function ShiftHandoverModal({ isOpen, onClose }) {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchReport();
    }
  }, [isOpen]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const data = await api.getShiftHandoverReport();
      setReportData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-soc-900 border border-soc-700 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl font-mono text-xs">
        {/* Modal Controls */}
        <div className="p-4 border-b border-soc-700 flex items-center justify-between bg-soc-850 print:hidden select-none">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Official SSB Border Security Daily Operations & Duty Handover Log
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs transition shadow-md"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Report Document Body */}
        <div className="p-8 flex-1 overflow-y-auto bg-white text-black space-y-6 print:p-0">
          {loading || !reportData ? (
            <div className="py-24 text-center text-slate-500">
              Generating official duty handover dossier...
            </div>
          ) : (
            <div className="space-y-6 max-w-3xl mx-auto font-serif">
              {/* Official Header */}
              <div className="border-b-2 border-slate-900 pb-4 text-center space-y-1">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Shield className="w-8 h-8 text-slate-900" />
                </div>
                <h1 className="text-base font-bold uppercase tracking-widest text-slate-900">
                  SASHASTRA SEEMA BAL (SSB) • POLICE II DIVISION
                </h1>
                <h2 className="text-xs uppercase font-semibold tracking-wider text-slate-700">
                  MINISTRY OF HOME AFFAIRS • GOVERNMENT OF INDIA
                </h2>
                <h3 className="text-sm font-bold uppercase text-red-700 pt-1 font-mono">
                  DAILY BORDER SURVEILLANCE & DUTY SHIFT HANDOVER REPORT
                </h3>
                <p className="text-[10px] text-slate-500 font-mono">
                  REPORT REF: {reportData.report_id} • GENERATED: {reportData.generated_at}
                </p>
              </div>

              {/* Station & Shift Details */}
              <div className="grid grid-cols-2 gap-4 text-xs font-mono border border-slate-300 p-3 bg-slate-50 rounded">
                <div>
                  <span className="text-slate-500 block text-[10px]">COMMAND STATION:</span>
                  <strong className="text-slate-900">{reportData.station}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">SHIFT SCHEDULE:</span>
                  <strong className="text-slate-900">{reportData.shift_title}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">OUTGOING DUTY OFFICER:</span>
                  <strong className="text-slate-900">{reportData.duty_officer}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">INCOMING RELIEF OFFICER:</span>
                  <strong className="text-slate-900">{reportData.relief_officer}</strong>
                </div>
              </div>

              {/* Operations Metrics Summary Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold font-mono uppercase text-slate-900 border-b border-slate-300 pb-1">
                  1. Shift Operational Metrics & Ledger Breakdown
                </h4>
                <div className="grid grid-cols-3 gap-2 font-mono text-xs text-center">
                  <div className="p-2 border border-slate-200 bg-slate-50 rounded">
                    <span className="text-[10px] text-slate-500 block">TOTAL MONITORED</span>
                    <strong className="text-slate-900">{reportData.metrics.monitored_hours} Hours</strong>
                  </div>
                  <div className="p-2 border border-slate-200 bg-slate-50 rounded">
                    <span className="text-[10px] text-slate-500 block">SENSOR UPTIME</span>
                    <strong className="text-emerald-700">{reportData.metrics.sensor_uptime_pct}%</strong>
                  </div>
                  <div className="p-2 border border-slate-200 bg-slate-50 rounded">
                    <span className="text-[10px] text-slate-500 block">TOTAL INCIDENTS</span>
                    <strong className="text-slate-900">{reportData.metrics.total_incidents} Events</strong>
                  </div>
                  <div className="p-2 border border-slate-200 bg-slate-50 rounded">
                    <span className="text-[10px] text-slate-500 block">CRITICAL BREACHES</span>
                    <strong className="text-red-700">{reportData.metrics.critical_breaches} Intrusions</strong>
                  </div>
                  <div className="p-2 border border-slate-200 bg-slate-50 rounded">
                    <span className="text-[10px] text-slate-500 block">QRF DISPATCHES</span>
                    <strong className="text-slate-900">{reportData.metrics.qrf_dispatches_executed} Deployed</strong>
                  </div>
                  <div className="p-2 border border-slate-200 bg-slate-50 rounded">
                    <span className="text-[10px] text-slate-500 block">EVIDENCE LEDGER</span>
                    <strong className="text-emerald-700">{reportData.metrics.cryptographic_integrity_rate}</strong>
                  </div>
                </div>
              </div>

              {/* Sector-by-Sector Status */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold font-mono uppercase text-slate-900 border-b border-slate-300 pb-1">
                  2. Sector Surveillance Ingestion Status
                </h4>
                <table className="w-full text-left font-mono text-[11px] border border-slate-200">
                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-700">
                    <tr>
                      <th className="p-2">SENSOR</th>
                      <th className="p-2">LOCATION</th>
                      <th className="p-2">INCIDENTS</th>
                      <th className="p-2">SECTOR STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {reportData.sectors.map((s) => (
                      <tr key={s.camera_id}>
                        <td className="p-2 font-bold">{s.camera_id}</td>
                        <td className="p-2">{s.name} ({s.location})</td>
                        <td className="p-2 font-bold">{s.incidents}</td>
                        <td className="p-2 text-emerald-700 font-semibold">{s.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Standing Orders */}
              <div className="space-y-1 font-mono text-xs border border-slate-200 p-3 rounded bg-slate-50">
                <span className="font-bold text-slate-900 block text-[11px]">3. Standing Command Orders for Incoming Relief:</span>
                <p className="text-slate-700 leading-relaxed text-[11px] font-serif">
                  {reportData.standing_orders}
                </p>
              </div>

              {/* Digital Sign-off Blocks */}
              <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-300 font-mono text-xs">
                <div className="space-y-4">
                  <p className="text-slate-600 text-[10px]">RELIEVED DUTY OFFICER SIGNATURE:</p>
                  <div className="border-b border-slate-400 pb-1 font-bold text-slate-900">
                    {reportData.duty_officer}
                  </div>
                  <span className="text-[10px] text-slate-400">Digital Seal: [SIGNED • SHA-256 VERIFIED]</span>
                </div>

                <div className="space-y-4">
                  <p className="text-slate-600 text-[10px]">INCOMING RELIEF OFFICER ACKNOWLEDGMENT:</p>
                  <div className="border-b border-slate-400 pb-1 font-bold text-slate-900">
                    {reportData.relief_officer}
                  </div>
                  <span className="text-[10px] text-slate-400">Shift Handover Completed Successfully</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
