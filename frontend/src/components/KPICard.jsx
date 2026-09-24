import React from 'react';
import { motion } from 'framer-motion';

export default function KPICard({ title, value, subtitle, icon: Icon, color, delay = 0, loading = false }) {
  const colorMap = {
    cyan: 'var(--accent-primary)',
    blue: 'var(--accent-secondary)',
    orange: 'var(--status-high)',
    red: 'var(--status-critical)',
    green: '#00e676',
    yellow: 'var(--status-suspicious)'
  };

  const glowColor = colorMap[color] || colorMap.cyan;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.4, 0, 0.2, 1] }}
      className="glass-panel p-6 relative overflow-hidden group flex flex-col justify-between"
    >
      {/* Background Glow */}
      <div 
        className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-20 blur-2xl transition-opacity group-hover:opacity-40"
        style={{ background: glowColor }}
      />
      
      <div className="flex justify-between items-start mb-4 relative z-10 w-full">
        <div>
          <p className="text-[var(--text-secondary)] font-medium text-sm tracking-wide uppercase mb-1">
            {title}
          </p>
          <div className="h-10 flex items-center">
            {loading ? (
              <div className="h-8 w-24 bg-[var(--bg-tertiary)] border border-[var(--border-light)] rounded-md animate-pulse shadow-sm" />
            ) : (
              <h3 className="text-4xl font-outfit font-bold tracking-tight text-white">
                {value}
              </h3>
            )}
          </div>
        </div>
        <div 
          className="p-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-light)]"
          style={{ boxShadow: `0 0 15px ${glowColor}20` }}
        >
          <Icon size={24} style={{ color: glowColor }} />
        </div>
      </div>
      
      {subtitle && (
        <p className="text-xs text-[var(--text-muted)] mt-4 relative z-10">
          {subtitle}
        </p>
      )}
      
      {/* Bottom border highlight */}
      <div 
        className="absolute bottom-0 left-0 h-[2px] w-0 group-hover:w-full transition-all duration-500 ease-out"
        style={{ background: `linear-gradient(90deg, transparent, ${glowColor}, transparent)` }}
      />
    </motion.div>
  );
}
