import React, { useState, useEffect } from 'react';
import { Compass, AlertTriangle, ShieldAlert, Sparkles, TrendingUp, Clock, Info } from 'lucide-react';
import { api } from '../services/api';

export default function PredictiveRiskCard() {
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchForecast();
  }, []);

  const fetchForecast = async () => {
    try {
      const data = await api.getPredictiveRiskForecast();
      setForecast(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !forecast) {
    return (
      <div className="p-6 bg-soc-850 rounded-xl border border-soc-700 text-center text-slate-500 font-mono text-xs">
        Synthesizing predictive border breach probability models...
      </div>
    );
  }

  return (
    <div className="bg-soc-850 border border-soc-700 rounded-xl p-5 shadow-lg space-y-4 font-mono text-xs select-none">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-soc-750">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-white">Prototype Sector Risk Forecast (Decision Support)</h3>
          </div>
          <p className="text-[10px] text-slate-400 font-sans mt-0.5">
            Sector risk forecast based on prototype event indicators. Tactical recommendations subject to human review.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400">WINDOW: {forecast.forecast_window}</span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
            {forecast.overall_perimeter_threat_index}
          </span>
        </div>
      </div>

      {/* Sector Risk Probabilities Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {forecast.sector_probabilities.map((s, idx) => {
          const isCritical = s.probability_pct > 75;
          const isHigh = s.probability_pct > 50;

          return (
            <div
              key={idx}
              className={`p-3 rounded-lg border space-y-2 ${
                isCritical
                  ? 'bg-red-950/20 border-red-500/50 text-red-300'
                  : isHigh
                  ? 'bg-amber-950/20 border-amber-500/40 text-amber-300'
                  : 'bg-soc-900 border-soc-750 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-xs">{s.sector.split(' ')[0]}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  isCritical ? 'bg-red-500/20 text-red-400' : 'bg-soc-800 text-slate-400'
                }`}>
                  {s.threat_level}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-1">{s.sector}</p>
              
              <div className="space-y-1 pt-1 border-t border-soc-750/60">
                <div className="flex items-center justify-between text-[10px]">
                  <span>Breach Probability:</span>
                  <strong className="text-white">{s.probability_pct}%</strong>
                </div>
                <div className="w-full h-1.5 bg-soc-800 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${s.probability_pct}%` }}
                    className={`h-full ${isCritical ? 'bg-red-500' : isHigh ? 'bg-amber-400' : 'bg-cyan-400'}`}
                  ></div>
                </div>
                <p className="text-[9px] text-slate-400 flex items-center gap-1 pt-0.5">
                  <Clock className="w-2.5 h-2.5" />
                  <span>Peak: {s.peak_window}</span>
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* AI Tactical Patrol Recommendations */}
      <div className="p-3.5 rounded-lg bg-soc-900 border border-soc-750 space-y-2">
        <span className="text-[11px] font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
          <Compass className="w-3.5 h-3.5 text-cyan-400" />
          Tactical Patrol Reallocation Advisor
        </span>
        <ul className="space-y-1.5 text-[11px] text-slate-300 font-sans">
          {forecast.tactical_recommendations.map((rec, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="text-amber-400 mt-0.5 font-bold">•</span>
              <span>{rec}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
