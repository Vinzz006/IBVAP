import React, { useState, useEffect } from 'react';
import { HelpCircle, CheckCircle2, Shield, Activity, Info, ChevronRight, Zap } from 'lucide-react';
import { api } from '../services/api';

export default function WhyAlertPanel({ eventId, inline = false }) {
  const [explanation, setExplanation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (eventId) {
      fetchExplanation();
    }
  }, [eventId]);

  const fetchExplanation = async () => {
    setLoading(true);
    try {
      const data = await api.getEventExplanation(eventId);
      setExplanation(data);
    } catch (err) {
      console.error('Failed to fetch explanation:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-3 rounded-lg bg-soc-900 border border-soc-750 text-xs font-mono text-slate-400">
        Synthesizing explainability factors...
      </div>
    );
  }

  if (!explanation) return null;

  return (
    <div className="p-4 rounded-xl bg-soc-900 border border-soc-750 space-y-4 font-mono text-xs shadow-inner">
      {/* Title */}
      <div className="flex items-center justify-between pb-2 border-b border-soc-750">
        <div className="flex items-center gap-2 text-cyan-300 font-bold">
          <HelpCircle className="w-4 h-4 text-cyan-400" />
          <span>WHY AM I SEEING THIS ALERT?</span>
        </div>
        <span className="text-[10px] text-slate-400 bg-soc-800 px-2 py-0.5 rounded border border-soc-700">
          Explainable AI (XAI)
        </span>
      </div>

      {/* Plain English Synthesis Statement */}
      <div className="p-3 rounded-lg bg-cyan-950/30 border border-cyan-500/30 text-slate-200 text-xs font-sans leading-relaxed">
        <span className="font-bold text-cyan-300 font-mono block text-[11px] mb-1">AUTOMATED OPERATIONAL JUSTIFICATION:</span>
        {explanation.why_alert_summary}
      </div>

      {/* Additive Factor Breakdown Table */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold">
          <span>CONTRIBUTING RISK FACTORS</span>
          <span className="text-amber-400">{explanation.risk_score} Total Points</span>
        </div>

        <div className="space-y-1.5">
          {explanation.factors.map((f, idx) => (
            <div key={idx} className="p-2 rounded bg-soc-850 border border-soc-750 flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <div>
                  <p className="text-slate-200 font-semibold">{f.name}</p>
                  <p className="text-[10px] text-slate-500 font-sans">{f.rule_description}</p>
                </div>
              </div>
              <span className="text-cyan-300 font-bold text-xs shrink-0 ml-2">+{f.contribution} pts</span>
            </div>
          ))}
        </div>
      </div>

      {/* Confidence vs Risk Distinction Gauge */}
      {explanation.confidence_vs_risk && (
        <div className="p-3 rounded-lg bg-soc-850 border border-soc-750 space-y-2">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
            <span>DETECTION CONFIDENCE VS. RISK SCORE</span>
            <span className="text-slate-500">Methodology Clarification</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-2 rounded bg-soc-900 border border-soc-750">
              <span className="text-[9px] text-slate-500 block">AI DETECTOR CONFIDENCE</span>
              <p className="text-base font-bold text-emerald-400">{explanation.confidence_vs_risk.detection_confidence_pct}%</p>
              <span className="text-[9px] text-slate-400">YOLO Certainty</span>
            </div>

            <div className="p-2 rounded bg-soc-900 border border-soc-750">
              <span className="text-[9px] text-slate-500 block">OPERATIONAL RISK</span>
              <p className="text-base font-bold text-amber-400">{explanation.confidence_vs_risk.risk_score} / 100</p>
              <span className="text-[9px] text-slate-400">{explanation.confidence_vs_risk.risk_level} Priority</span>
            </div>
          </div>

          <p className="text-[10px] text-slate-400 font-sans italic leading-snug pt-1">
            {explanation.confidence_vs_risk.clarification}
          </p>
        </div>
      )}
    </div>
  );
}
