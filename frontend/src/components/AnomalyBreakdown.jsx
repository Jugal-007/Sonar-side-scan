import React from 'react';
import { motion } from 'framer-motion';

export default function AnomalyBreakdown({ components, totalScore }) {
  if (!components) return null;

  const getBarColor = (name) => {
    switch (name) {
      case 'ai_confidence': return 'bg-[#00d4ff]';
      case 'shadow_evidence': return 'bg-[#8b5cf6]';
      case 'shape_analysis': return 'bg-[#f97316]';
      case 'texture_analysis': return 'bg-[#eab308]';
      case 'image_quality': return 'bg-[#10b981]';
      default: return 'bg-gray-500';
    }
  };

  const formatName = (name) => name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-outfit font-semibold text-white">Anomaly Breakdown</h3>
      <div className="space-y-3">
        {Object.entries(components).map(([key, data]) => {
          const fillPercentage = data.value * 100;
          const weightedContribution = data.weighted * 100;
          return (
            <div key={key} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-[var(--text-secondary)]">{formatName(key)} (w: {(data.weight * 100).toFixed(0)}%)</span>
                <span className="text-white font-mono">+{weightedContribution.toFixed(1)}%</span>
              </div>
              <div className="h-1.5 w-full bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(fillPercentage, 100)}%` }}
                  transition={{ duration: 0.8, type: 'spring' }}
                  className={`h-full ${getBarColor(key)}`}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="pt-3 border-t border-[var(--border-light)] flex justify-between items-center">
        <span className="text-sm font-semibold text-[var(--text-secondary)]">Final Anomaly Score</span>
        <span className="text-xl font-mono text-[var(--accent-primary)] font-bold">{totalScore}%</span>
      </div>
    </div>
  );
}
