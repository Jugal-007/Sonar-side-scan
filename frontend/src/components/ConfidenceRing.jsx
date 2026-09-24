import React from 'react';
import { motion } from 'framer-motion';

export default function ConfidenceRing({ percentage, label, size = 48, strokeWidth = 4 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const getColor = (pct) => {
    if (pct < 50) return '#10b981'; // green-500
    if (pct < 75) return '#f59e0b'; // amber-500
    return '#ef4444'; // red-500
  };

  const color = getColor(percentage);

  return (
    <div className="flex flex-col items-center justify-center gap-1.5">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="var(--bg-tertiary)"
            strokeWidth={strokeWidth}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, type: "spring", bounce: 0 }}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute text-[10px] font-mono font-semibold" style={{ color }}>
          {Math.round(percentage)}%
        </span>
      </div>
      {label && <span className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wider">{label}</span>}
    </div>
  );
}
