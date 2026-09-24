import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Cpu, Server, RefreshCw, Activity } from 'lucide-react';
import { apiClient } from '../api/client';

export default function ModelStatus() {
  const [modelInfo, setModelInfo] = useState(null);
  const [benchmark, setBenchmark] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const [info, bench] = await Promise.all([
        apiClient.getModelStatus(),
        apiClient.getBenchmark()
      ]);
      setModelInfo(info);
      setBenchmark(bench);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-outfit font-bold text-white mb-2">Model Status</h1>
          <p className="text-[var(--text-secondary)]">Current AI inference engine configuration</p>
        </div>
        <button 
          onClick={fetchStatus}
          className="p-2 glass-panel hover:bg-[var(--bg-tertiary)] text-white rounded-lg transition-colors flex items-center gap-2"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel overflow-hidden"
      >
        {loading ? (
          <div className="p-12 flex justify-center"><div className="w-8 h-8 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" /></div>
        ) : modelInfo ? (
          <div>
            <div className="p-6 border-b border-[var(--border-light)] bg-[var(--bg-secondary)] flex items-center gap-4">
              <div className="p-4 bg-[var(--bg-tertiary)] rounded-2xl border border-[var(--border-light)] shadow-[0_0_20px_rgba(0,212,255,0.1)]">
                <Cpu size={32} className="text-[var(--accent-primary)]" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">{modelInfo.model_name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`flex w-2 h-2 rounded-full ${modelInfo.status === 'ACTIVE' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                  <span className="text-sm text-[var(--text-secondary)] tracking-wide uppercase">{modelInfo.status}</span>
                </div>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider">Engine Details</h3>
                
                <div className="flex justify-between py-2 border-b border-[var(--border-light)]">
                  <span className="text-[var(--text-secondary)]">Architecture</span>
                  <span className="text-white font-medium">{modelInfo.architecture}</span>
                </div>
                
                <div className="flex justify-between py-2 border-b border-[var(--border-light)]">
                  <span className="text-[var(--text-secondary)]">Hardware Device</span>
                  <span className="text-white font-mono flex items-center gap-2">
                    <Server size={14}/> 
                    {modelInfo.device} {modelInfo.cuda_available && <span className="text-green-400">(CUDA)</span>}
                  </span>
                </div>
                
                {modelInfo.gpu_name && (
                  <div className="flex justify-between py-2 border-b border-[var(--border-light)]">
                    <span className="text-[var(--text-secondary)]">GPU</span>
                    <span className="text-[#00ffcc] font-mono text-xs">{modelInfo.gpu_name}</span>
                  </div>
                )}
                
                <div className="flex justify-between py-2 border-b border-[var(--border-light)]">
                  <span className="text-[var(--text-secondary)]">Confidence Threshold</span>
                  <span className="text-white font-mono">{modelInfo.confidence_threshold}</span>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider">Trained Classes ({modelInfo.num_classes})</h3>
                <div className="flex flex-wrap gap-2">
                  {modelInfo.classes.map((c, i) => (
                    <span key={i} className="px-3 py-1 bg-[var(--bg-tertiary)] border border-[var(--border-light)] rounded-md text-sm text-[var(--text-secondary)]">
                      {c}
                    </span>
                  ))}
                </div>
                
                {modelInfo.warning && (
                  <div className="mt-4 p-4 rounded-lg bg-[var(--status-suspicious-bg)] border border-[var(--status-suspicious)] text-[var(--status-suspicious)] text-sm">
                    {modelInfo.warning}
                  </div>
                )}
              </div>

              {benchmark && (
                <div className="col-span-1 md:col-span-2 mt-6 pt-6 border-t border-[var(--border-light)]">
                  <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Activity size={16} /> Performance Benchmark
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="glass-panel p-4 flex flex-col justify-center items-center">
                      <p className="text-[var(--text-muted)] text-sm mb-1">Current FPS</p>
                      <p className="text-3xl font-mono text-[var(--accent-primary)] font-bold">{benchmark.current_fps}</p>
                      <p className="text-xs text-[var(--text-secondary)] mt-2">Device: {benchmark.device}</p>
                    </div>
                    
                    <div className="glass-panel p-4 flex flex-col justify-center items-center">
                      <p className="text-[var(--text-muted)] text-sm mb-1">Memory Usage</p>
                      <p className="text-3xl font-mono text-white font-bold">{benchmark.memory_usage_mb} MB</p>
                    </div>
                    
                    <div className="glass-panel p-4 space-y-3">
                      {[
                        { label: 'mAP50', value: benchmark.metrics.mAP50, color: 'bg-green-500' },
                        { label: 'mAP50-95', value: benchmark.metrics.mAP50_95, color: 'bg-blue-500' },
                        { label: 'Precision', value: benchmark.metrics.precision, color: 'bg-indigo-500' },
                        { label: 'Recall', value: benchmark.metrics.recall, color: 'bg-purple-500' },
                      ].map(metric => (
                        <div key={metric.label}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-[var(--text-secondary)]">{metric.label}</span>
                            <span className="text-white font-mono">{(metric.value * 100).toFixed(1)}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                            <div className={`h-full ${metric.color}`} style={{ width: `${metric.value * 100}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-[var(--status-critical)]">Failed to load model status.</div>
        )}
      </motion.div>
    </div>
  );
}
