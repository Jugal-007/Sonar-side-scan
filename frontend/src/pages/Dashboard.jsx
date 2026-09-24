import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Layers, AlertTriangle, Crosshair, Clock, ShieldAlert } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import KPICard from '../components/KPICard';
import ClassBadge from '../components/ClassBadge';
import { getClassConfig } from '../utils/classConfig';
import { apiClient } from '../api/client';

export default function Dashboard() {
  const [stats, setStats] = useState({
    total_frames: 0,
    total_detections: 0,
    high_risk_count: 0,
    average_confidence: 0,
    average_processing_time_ms: 0
  });
  const [detections, setDetections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await apiClient.getStats();
        setStats(data);
        const dets = await apiClient.getDetections(0, 500);
        setDetections(dets.detections || []);
      } catch (err) {
        console.error('Failed to load stats', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadStats();
    // Poll every 5s for live updates
    const interval = setInterval(loadStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const classCounts = detections.reduce((acc, det) => {
    const cls = det.class || 'unknown';
    acc[cls] = (acc[cls] || 0) + 1;
    return acc;
  }, {});
  
  const classData = Object.entries(classCounts).map(([name, value]) => ({
    name,
    value,
    color: getClassConfig(name).color
  })).sort((a, b) => b.value - a.value);

  const severityCounts = detections.reduce((acc, det) => {
    const sev = det.severity || 'LOW';
    acc[sev] = (acc[sev] || 0) + 1;
    return acc;
  }, {});
  
  const severityData = [
    { name: 'CRITICAL', value: severityCounts['CRITICAL'] || 0, color: '#ff0055' },
    { name: 'HIGH', value: severityCounts['HIGH'] || 0, color: '#ff5e00' },
    { name: 'SUSPICIOUS', value: severityCounts['SUSPICIOUS'] || 0, color: '#ffb800' },
    { name: 'LOW', value: severityCounts['LOW'] || 0, color: '#00d4ff' },
  ].filter(d => d.value > 0);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-end justify-between"
      >
        <div>
          <h1 className="text-4xl font-outfit font-bold text-white mb-2">System Overview</h1>
          <p className="text-[var(--text-secondary)]">MarineGuard AI Sonar Analysis Platform</p>
        </div>
        
        <div className="flex items-center gap-2 px-4 py-2 rounded-full glass-panel border-[var(--border-accent)]">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_#22c55e]" />
          <span className="text-sm font-medium text-[var(--accent-primary)]">System Active</span>
        </div>
      </motion.div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
      >
        <KPICard 
          title="Frames Processed" 
          value={stats.total_frames} 
          loading={loading}
          subtitle="Total sonar images analyzed"
          icon={Layers} 
          color="blue"
          delay={0.1}
        />
        <KPICard 
          title="Objects Detected" 
          value={stats.total_detections} 
          loading={loading}
          subtitle="Total marine anomalies found"
          icon={Crosshair} 
          color="cyan"
          delay={0.2}
        />
        <KPICard 
          title="High-Risk Anomalies" 
          value={stats.high_risk_count} 
          loading={loading}
          subtitle="Severity: HIGH or CRITICAL"
          icon={AlertTriangle} 
          color={stats.high_risk_count > 0 ? 'red' : 'green'}
          delay={0.3}
        />
        <KPICard 
          title="Avg Confidence" 
          value={`${(stats.average_confidence * 100).toFixed(1)}%`} 
          loading={loading}
          subtitle="AI model detection confidence"
          icon={ShieldAlert} 
          color="cyan"
          delay={0.4}
        />
        <KPICard 
          title="Avg Processing Time" 
          value={`${stats.average_processing_time_ms.toFixed(0)}ms`} 
          loading={loading}
          subtitle="Per frame inference + analysis latency"
          icon={Clock} 
          color="blue"
          delay={0.5}
        />
      </motion.div>

      {/* Decorative tech grid overlay for empty state */}
      {stats.total_frames === 0 && !loading && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-12 p-12 glass-panel flex flex-col items-center justify-center text-center border-dashed border-2 border-[var(--border-strong)] relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHBhdGggZD0iTTAgMGg0MHY0MEgweiIgZmlsbD0ibm9uZSIvPjxwaGF0aCBkPSJNMCA0MGw0MC00ME0wIDBsNDAgNDAiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAyKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9zdmc+')] opacity-20" />
          <Crosshair size={48} className="text-[var(--text-muted)] mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No Data Processed Yet</h3>
          <p className="text-[var(--text-secondary)] max-w-md">
            Start a live simulation or upload sonar images in the Analysis tab to begin detection.
          </p>
        </motion.div>
      )}

      {stats.total_frames > 0 && classData.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8"
        >
          {/* Class Distribution Donut */}
          <div className="glass-panel p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Class Distribution</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={classData}
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {classData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-light)', borderRadius: '8px' }}
                    itemStyle={{ color: '#ffffff' }}
                    labelStyle={{ color: '#ffffff', fontWeight: 'bold' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Severity Bar Chart */}
          <div className="glass-panel p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Severity Breakdown</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={severityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-light)', borderRadius: '8px' }}
                    itemStyle={{ color: '#ffffff' }}
                    labelStyle={{ color: '#ffffff', fontWeight: 'bold' }}
                    cursor={{ fill: 'var(--bg-tertiary)' }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {severityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Top Classes List */}
          <div className="glass-panel p-6 lg:col-span-2">
            <h3 className="text-lg font-semibold text-white mb-4">Top Detected Classes</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {classData.slice(0, 8).map(cls => (
                <div key={cls.name} className="bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-lg p-4 flex items-center justify-between">
                  <ClassBadge className={cls.name} />
                  <span className="text-xl font-mono font-bold text-white">{cls.value}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {stats.total_frames > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-6 glass-panel p-6"
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-white">Recent Analysis Preview</h3>
            <span className="text-sm text-[var(--text-muted)]">Latest processed frame</span>
          </div>
          {detections.length > 0 && detections[0].annotated_image ? (
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-light)] flex items-center justify-center p-2 min-h-[300px]">
                <img 
                  src={`data:image/png;base64,${detections[0].annotated_image}`} 
                  alt="Recent Analysis" 
                  className="max-w-full max-h-[400px] object-contain rounded-lg"
                />
              </div>
              <div className="w-full md:w-1/3 flex flex-col gap-3">
                <div className="p-4 bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-xl">
                  <p className="text-xs text-[var(--text-muted)] uppercase mb-1">Image Name</p>
                  <p className="text-sm font-mono text-white truncate">{detections[0].image_name || detections[0].image || 'Unknown'}</p>
                </div>
                <div className="p-4 bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-xl">
                  <p className="text-xs text-[var(--text-muted)] uppercase mb-1">Primary Detection</p>
                  <div className="flex items-center justify-between mt-2">
                    <ClassBadge className={detections[0].class} />
                    <span className="font-mono text-[var(--accent-primary)] font-bold">{(detections[0].confidence * 100).toFixed(1)}%</span>
                  </div>
                </div>
                <div className="p-4 bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-xl">
                  <p className="text-xs text-[var(--text-muted)] uppercase mb-1">Severity / Score</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-bold text-white">{detections[0].severity}</span>
                    <span className="font-mono text-[var(--text-secondary)]">{detections[0].anomaly_pct}% Anomaly</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
             <div className="text-center py-10 text-[var(--text-muted)]">No recent annotated images available.</div>
          )}
        </motion.div>
      )}
    </div>
  );
}
