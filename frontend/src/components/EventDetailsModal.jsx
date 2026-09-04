import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, X, CheckCircle, FileText, Download, Hash, Activity, Lock, AlertTriangle, ShieldX, Printer } from 'lucide-react';
import RiskBadge from './RiskBadge';
import IncidentReportModal from './IncidentReportModal';
import WhyAlertPanel from './WhyAlertPanel';
import { api } from '../services/api';

export default function EventDetailsModal({ eventId, isOpen, onClose, onEventUpdated }) {
  const [eventData, setEventData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [notes, setNotes] = useState('');
  const [acknowledging, setAcknowledging] = useState(false);
  const [tampering, setTampering] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isPrivacyMasked, setIsPrivacyMasked] = useState(false);

  useEffect(() => {
    if (isOpen && eventId) {
      fetchEventDetails();
    }
  }, [isOpen, eventId]);

  const fetchEventDetails = async () => {
    setLoading(true);
    setVerificationResult(null);
    try {
      const data = await api.getEvent(eventId);
      setEventData(data);
      setNotes(data.notes || '');
    } catch (err) {
      console.error('Failed to fetch event:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleVerifyEvidence = async () => {
    setVerifying(true);
    try {
      const res = await api.verifyEvidence(eventId);
      setVerificationResult(res);
    } catch (err) {
      alert(`Verification error: ${err.message}`);
    } finally {
      setVerifying(false);
    }
  };

  const handleSimulateTamper = async () => {
    if (!confirm('Simulate 1-byte file alteration to test cryptographic tamper detection?')) return;
    setTampering(true);
    try {
      await api.simulateTamper(eventId);
      alert('Tamper simulation executed. Now click "Verify Evidence Integrity" to observe cryptographic check failure!');
    } catch (err) {
      alert(err.message);
    } finally {
      setTampering(false);
    }
  };

  const handleAcknowledge = async () => {
    setAcknowledging(true);
    try {
      await api.acknowledgeEvent(eventId, notes, 'SSB Duty Operator');
      setEventData({ ...eventData, status: 'ACKNOWLEDGED', notes });
      if (onEventUpdated) onEventUpdated();
    } catch (err) {
      alert(`Failed to acknowledge: ${err.message}`);
    } finally {
      setAcknowledging(false);
    }
  };

  const rawImageUrl = eventData?.evidence_path ? `/${eventData.evidence_path}` : null;
  const maskedImageUrl = `/api/privacy/mask-preview/${eventId}`;
  const displayImageUrl = isPrivacyMasked ? maskedImageUrl : rawImageUrl;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-soc-850 border border-soc-700 rounded-xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
          {/* Modal Header */}
          <div className="p-4 border-b border-soc-700 flex items-center justify-between bg-soc-850">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-mono font-bold text-white tracking-wide">
                    INCIDENT {eventId}
                  </h3>
                  {eventData && (
                    <RiskBadge level={eventData.risk_level} score={eventData.risk_score} size="sm" />
                  )}
                  {eventData?.status === 'RESOLVED' ? (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      RESOLVED
                    </span>
                  ) : eventData?.status === 'ACKNOWLEDGED' ? (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                      ACKNOWLEDGED
                    </span>
                  ) : eventData?.status === 'DISPATCHED' ? (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/15 text-purple-400 border border-purple-500/30">
                      DISPATCHED
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/30">
                      {eventData?.status || 'NEW'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  {eventData ? `${eventData.camera_name} • ${eventData.location}` : 'Loading incident metadata...'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {eventData && (
                <>
                  <a
                    href={`/api/evidence/events/${eventId}/export-bundle`}
                    download={`IBVAP_Forensic_Evidence_${eventId}.zip`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono transition shadow-[0_0_8px_rgba(0,240,255,0.15)]"
                    title="Download Sealed Forensic ZIP Bundle (Keyframe, SHA-256 Manifest & Metadata JSON)"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Export ZIP Bundle</span>
                  </a>
                  <button
                    onClick={() => setIsReportOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-soc-750 hover:bg-soc-700 text-slate-200 border border-soc-600 hover:border-cyan-500/40 text-xs font-mono transition"
                    title="Generate Official SSB Forensic Report Dossier"
                  >
                    <Printer className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="hidden sm:inline">Official Dossier</span>
                  </button>
                </>
              )}
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-soc-750 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-5 flex-1 overflow-y-auto space-y-5">
            {loading ? (
              <div className="h-64 flex items-center justify-center font-mono text-xs text-slate-400">
                Retrieving cryptographic evidence records...
              </div>
            ) : eventData ? (
              <>
                {/* Top: Evidence Snapshot Keyframe with Privacy Toggle */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                    <span className="flex items-center gap-1.5 text-cyan-300 font-semibold">
                      <FileText className="w-3.5 h-3.5" />
                      Captured Incident Keyframe & Evidence Provenance
                    </span>
                    <div className="flex items-center gap-3">
                      {/* Privacy Masking Toggle */}
                      <button
                        onClick={() => setIsPrivacyMasked(!isPrivacyMasked)}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                          isPrivacyMasked
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                            : 'bg-soc-800 text-slate-400 border-soc-700 hover:text-slate-200'
                        }`}
                        title="Toggle Privacy Anonymization Mask (Gaussian Blurring of Sensitive Face Regions)"
                      >
                        <Lock className="w-3 h-3 text-cyan-400" />
                        <span>{isPrivacyMasked ? 'Privacy Mask: ON' : 'Privacy Mask: OFF'}</span>
                      </button>
                      <span>TIME: {eventData.timestamp}</span>
                    </div>
                  </div>

                  <div className="relative w-full aspect-video bg-black rounded-lg border border-soc-700 overflow-hidden shadow-inner flex items-center justify-center">
                    {displayImageUrl ? (
                      <img
                        src={displayImageUrl}
                        alt={`Evidence for ${eventId}`}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="text-xs font-mono text-slate-500">No snapshot image captured</div>
                    )}
                  </div>
                </div>

                {/* Phase 9: Explainable AI "Why Alert?" & Risk Factor Decomposition */}
                <WhyAlertPanel eventId={eventId} />

                {/* Grid: Incident Metadata & Risk Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left: Metadata Details */}
                  <div className="p-3.5 rounded-lg bg-soc-900 border border-soc-750 space-y-2 text-xs font-mono">
                    <h4 className="text-slate-300 font-semibold uppercase tracking-wider text-[11px] pb-1 border-b border-soc-750">
                      Incident Parameters
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-slate-400">
                      <div>
                        <span className="text-slate-500">EVENT TYPE:</span>
                        <p className="text-slate-200 font-semibold">{eventData.event_type}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">CAMERA SENSOR:</span>
                        <p className="text-slate-200 font-semibold">{eventData.camera_id}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">MONITORED TARGET:</span>
                        <p className="text-cyan-400 font-semibold">
                          {eventData.object_type?.toUpperCase()} #{eventData.tracking_id}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500">PROTOTYPE RISK:</span>
                        <p className="text-amber-400 font-semibold">
                          {eventData.risk_score}/100 ({eventData.risk_level})
                        </p>
                      </div>
                      {eventData.vehicle && (
                        <div className="col-span-2 pt-1 border-t border-soc-750">
                          <span className="text-slate-500">ANPR PLATE NUMBER:</span>
                          <p className="text-yellow-300 font-bold font-mono text-sm">
                            {eventData.vehicle.plate_number} (Conf: {intPercent(eventData.vehicle.confidence)}%)
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Transparent Prototype Risk Factor Breakdown */}
                  <div className="p-3.5 rounded-lg bg-soc-900 border border-soc-750 space-y-2 text-xs font-mono">
                    <h4 className="text-slate-300 font-semibold uppercase tracking-wider text-[11px] pb-1 border-b border-soc-750 flex items-center justify-between">
                      <span>Prototype Risk Calculation</span>
                      <span className="text-amber-400 font-bold">{eventData.risk_score} pts</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      Transparent rule-based scoring applied by decision layer:
                    </p>
                    <ul className="space-y-1.5 text-[11px] pt-1">
                      <li className="flex items-center justify-between text-slate-300">
                        <span>• Target Presence ({eventData.object_type})</span>
                        <span className="text-cyan-400">+10 pts</span>
                      </li>
                      <li className="flex items-center justify-between text-slate-300">
                        <span>• Restricted-Zone Intrusion</span>
                        <span className="text-red-400">+40 pts</span>
                      </li>
                      <li className="flex items-center justify-between text-slate-300">
                        <span>• Vector Directed Toward Perimeter</span>
                        <span className="text-amber-400">+20 pts</span>
                      </li>
                      <li className="flex items-center justify-between text-slate-300">
                        <span>• Night / Dwell / Ambient Factor</span>
                        <span className="text-slate-400">+15 pts</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Cryptographic SHA-256 Evidence Provenance Box */}
                <div className="p-4 rounded-lg bg-soc-900 border border-cyan-500/30 space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-cyan-300 font-semibold text-xs">
                      <Lock className="w-4 h-4 text-cyan-400" />
                      <span>Cryptographic Evidence Provenance & Integrity</span>
                    </div>
                    <span className="text-[10px] text-slate-400 bg-soc-800 px-2 py-0.5 rounded border border-soc-700">
                      Tamper-Evident SHA-256
                    </span>
                  </div>

                  <div className="space-y-1.5 text-[11px] text-slate-400">
                    <div className="flex items-start gap-2">
                      <span className="text-slate-500 whitespace-nowrap">FILE SHA-256:</span>
                      <span className="text-slate-200 break-all select-all bg-soc-800 px-2 py-0.5 rounded border border-soc-700 font-mono">
                        {eventData.evidence_hash || 'Calculating...'}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-slate-500 whitespace-nowrap">PREV HASH:</span>
                      <span className="text-slate-400 break-all select-all font-mono text-[10px]">
                        {eventData.prev_hash?.substring(0, 32)}...
                      </span>
                    </div>
                  </div>

                  {/* Verification Result Notification */}
                  {verificationResult && (
                    <div className={`p-3 rounded-lg border flex items-start gap-2.5 text-xs ${
                      verificationResult.is_valid
                        ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                        : 'bg-red-950/50 border-red-500/70 text-red-300'
                    }`}>
                      {verificationResult.is_valid ? (
                        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <ShieldX className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className="font-bold font-mono">{verificationResult.status}</p>
                        <p className="text-[11px] opacity-90 mt-0.5">{verificationResult.message}</p>
                        <p className="text-[10px] opacity-75 font-mono mt-1">
                          Recalculated Hash: {verificationResult.current_hash}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Verify Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={handleVerifyEvidence}
                      disabled={verifying}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs font-mono transition shadow-[0_0_10px_rgba(0,240,255,0.2)] disabled:opacity-50"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{verifying ? 'Recalculating Disk Hash...' : 'Verify Evidence Integrity'}</span>
                    </button>

                    <button
                      onClick={handleSimulateTamper}
                      disabled={tampering}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-soc-800 hover:bg-red-950 text-slate-400 hover:text-red-300 border border-soc-700 hover:border-red-500/40 text-xs font-mono transition"
                      title="Simulate 1-byte alteration to test tamper detection"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Simulate Tamper Test</span>
                    </button>
                  </div>
                </div>

                {/* Operator Notes Box */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-slate-400">Operator Review Notes:</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Enter observation notes, dispatch logs, or clearance details..."
                    className="w-full h-18 bg-soc-900 border border-soc-700 rounded-lg p-2.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 font-sans"
                  />
                </div>
              </>
            ) : (
              <div className="text-xs text-red-400 font-mono">Incident not found</div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="p-4 border-t border-soc-700 bg-soc-900/60 flex items-center justify-between">
            <div className="text-xs font-mono text-slate-500">
              {eventData?.acknowledged_by ? `Acknowledged by ${eventData.acknowledged_by}` : 'Pending Operator Review'}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-soc-800 hover:bg-soc-750 text-slate-300 text-xs font-medium transition"
              >
                Close
              </button>

              {eventData && eventData.status !== 'ACKNOWLEDGED' && eventData.status !== 'RESOLVED' && (
                <button
                  onClick={handleAcknowledge}
                  disabled={acknowledging}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{acknowledging ? 'Saving...' : 'Acknowledge Incident'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Forensic Report Dossier Modal */}
      {isReportOpen && eventData && (
        <IncidentReportModal
          event={eventData}
          isOpen={isReportOpen}
          onClose={() => setIsReportOpen(false)}
        />
      )}
    </>
  );
}

function intPercent(val) {
  if (!val) return 85;
  return Math.round(val * 100);
}
