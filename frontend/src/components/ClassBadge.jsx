import React from 'react';
import { getClassConfig } from '../utils/classConfig';

export default function ClassBadge({ className }) {
  const config = getClassConfig(className);
  const Icon = config.icon;
  
  return (
    <div 
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-semibold border bg-opacity-10 shadow-sm"
      style={{
        color: config.color,
        borderColor: `${config.color}40`,
        backgroundColor: `${config.color}15`
      }}
    >
      <Icon size={14} />
      <span className="uppercase">{className}</span>
    </div>
  );
}
