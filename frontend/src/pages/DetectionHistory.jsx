import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, Filter, Search, ArrowUpDown } from 'lucide-react';
import { apiClient } from '../api/client';
import ClassBadge from '../components/ClassBadge';
import DetectionDetailModal from '../components/DetectionDetailModal';

export default function DetectionHistory() {
  const [detections, setDetections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [selectedDetection, setSelectedDetection] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    apiClient.getDetections(0, 100)
      .then(data => setDetections(data.detections || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const getSeverityBadge = (severity) => {
    const styles = {
      CRITICAL: 'bg-[var(--status-critical-bg)] text-[var(--status-critical)] border-[var(--status-critical)]',
      HIGH: 'bg-[var(--status-high-bg)] text-[var(--status-high)] border-[var(--status-high)]',
      SUSPICIOUS: 'bg-[var(--status-suspicious-bg)] text-[var(--status-suspicious)] border-[var(--status-suspicious)]',
      LOW: 'bg-[var(--status-low-bg)] text-[var(--status-low)] border-[var(--status-low)]',
    };
    const style = styles[severity] || styles.LOW;
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-md border ${style}`}>
        {severity}
      </span>
    );
  };

  const filteredDetections = detections.filter(det => {
    const matchesSearch = !searchTerm || 
      (det.class && det.class.toLowerCase().includes(searchTerm.toLowerCase())) || 
      (det.image && det.image.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesSeverity = severityFilter === 'ALL' || det.severity === severityFilter;
    return matchesSearch && matchesSeverity;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-outfit font-bold text-white mb-2">Detection History</h1>
          <p className="text-[var(--text-secondary)]">Searchable log of all AI-identified anomalies</p>
          {!loading && (
            <p className="text-sm text-[var(--accent-primary)] mt-2">
              Showing {filteredDetections.length} of {detections.length} total detections
            </p>
          )}
        </div>
        
        <div className="flex gap-3">
          <a href="http://localhost:8000/api/reports/csv" download className="flex items-center gap-2 px-4 py-2 glass-panel hover:bg-[var(--bg-tertiary)] text-white transition-colors">
            <Download size={18} />
            Export CSV
          </a>
          <a href="http://localhost:8000/api/reports/json" download className="flex items-center gap-2 px-4 py-2 glass-panel hover:bg-[var(--bg-tertiary)] text-white transition-colors">
            <Download size={18} />
            Export JSON
          </a>
        </div>
      </div>

      <div className="glass-panel overflow-hidden">
        <div className="p-4 border-b border-[var(--border-light)] flex gap-4 bg-[var(--bg-secondary)]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18}/>
            <input 
              type="text" 
              placeholder="Search by class or image name..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-light)] rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
            />
          </div>
          <div className="relative">
            <button 
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-light)] rounded-lg text-white hover:border-[var(--accent-primary)] transition-colors"
            >
              <Filter size={18} />
              {severityFilter !== 'ALL' ? severityFilter : 'Filter'}
            </button>
            {showFilterDropdown && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-[var(--bg-primary)] border border-[var(--border-light)] rounded-lg shadow-lg z-10 overflow-hidden">
                {['ALL', 'CRITICAL', 'HIGH', 'SUSPICIOUS', 'LOW'].map(sev => (
                  <button 
                    key={sev}
                    onClick={() => { setSeverityFilter(sev); setShowFilterDropdown(false); }}
                    className={`block w-full text-left px-4 py-2 hover:bg-[var(--bg-tertiary)] ${severityFilter === sev ? 'text-[var(--accent-primary)]' : 'text-white'}`}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--bg-tertiary)] text-[var(--text-secondary)] text-sm">
                <th className="p-4 font-medium flex items-center gap-1 cursor-pointer hover:text-white">Timestamp <ArrowUpDown size={14}/></th>
                <th className="p-4 font-medium">Image Source</th>
                <th className="p-4 font-medium">Detected Class</th>
                <th className="p-4 font-medium">AI Confidence</th>
                <th className="p-4 font-medium">Anomaly Score</th>
                <th className="p-4 font-medium">Severity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-light)] text-sm">
              {loading ? (
                <tr><td colSpan="6" className="p-8 text-center text-[var(--text-muted)]">Loading history...</td></tr>
              ) : filteredDetections.length === 0 ? (
                <tr><td colSpan="6" className="p-8 text-center text-[var(--text-muted)]">No detections found.</td></tr>
              ) : (
                filteredDetections.map((det, i) => (
                  <motion.tr 
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    key={det.id} 
                    onClick={() => { setSelectedDetection(det); setIsModalOpen(true); }}
                    className="hover:bg-[var(--bg-tertiary)] transition-colors group cursor-pointer"
                  >
                    <td className="p-4 text-[var(--text-muted)] font-mono">{new Date(det.timestamp).toLocaleString()}</td>
                    <td className="p-4 font-medium text-white truncate max-w-[200px]">{det.image}</td>
                    <td className="p-4"><ClassBadge className={det.class} /></td>
                    <td className="p-4 font-mono text-[var(--text-secondary)]">{(det.confidence * 100).toFixed(1)}%</td>
                    <td className="p-4 font-mono text-[var(--text-secondary)]">{det.anomaly_pct}%</td>
                    <td className="p-4">{getSeverityBadge(det.severity)}</td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <DetectionDetailModal 
        detection={selectedDetection} 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen} 
      />
    </div>
  );
}
