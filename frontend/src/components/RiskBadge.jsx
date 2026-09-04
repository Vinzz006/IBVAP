import React from 'react';
import { AlertTriangle, ShieldAlert, ShieldCheck, Info } from 'lucide-react';

export default function RiskBadge({ level = 'LOW', score = null, size = 'md' }) {
  const normalizedLevel = (level || 'LOW').toUpperCase();

  const configs = {
    CRITICAL: {
      bg: 'bg-red-500/15',
      border: 'border-red-500/40',
      text: 'text-red-400',
      icon: ShieldAlert,
      glow: 'shadow-[0_0_12px_rgba(239,68,68,0.35)]'
    },
    HIGH: {
      bg: 'bg-amber-500/15',
      border: 'border-amber-500/40',
      text: 'text-amber-400',
      icon: AlertTriangle,
      glow: 'shadow-[0_0_10px_rgba(245,158,11,0.25)]'
    },
    MEDIUM: {
      bg: 'bg-yellow-500/15',
      border: 'border-yellow-500/40',
      text: 'text-yellow-400',
      icon: AlertTriangle,
      glow: ''
    },
    LOW: {
      bg: 'bg-emerald-500/15',
      border: 'border-emerald-500/40',
      text: 'text-emerald-400',
      icon: ShieldCheck,
      glow: ''
    }
  };

  const config = configs[normalizedLevel] || configs.LOW;
  const Icon = config.icon;

  const sizeClasses = size === 'sm' 
    ? 'px-2 py-0.5 text-xs' 
    : size === 'lg' 
    ? 'px-3 py-1.5 text-sm font-semibold' 
    : 'px-2.5 py-1 text-xs font-medium';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded border ${config.bg} ${config.border} ${config.text} ${config.glow} ${sizeClasses}`}>
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span>{normalizedLevel}</span>
      {score !== null && (
        <span className="font-mono opacity-85 text-[11px]">({score})</span>
      )}
    </span>
  );
}
