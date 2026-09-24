import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileDown, UploadCloud, Database, DownloadCloud, Activity, MapPin } from 'lucide-react';
import { apiClient } from '../api/client';
import ClassBadge from '../components/ClassBadge';

export default function Reports() {
  const [stats, setStats] = useState({ total_detections: 0, high_risk_count: 0 });
  const [loading, setLoading] = useState(true);
  const [geoFile, setGeoFile] = useState(null);
  const [uploadingGeo, setUploadingGeo] = useState(false);
  const [geoMessage, setGeoMessage] = useState(null);
  const [recentDetections, setRecentDetections] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, detsData] = await Promise.all([
        apiClient.getStats(),
        apiClient.getDetections(0, 20)
      ]);
      setStats(statsData);
      setRecentDetections(detsData.detections || []);
    } catch (err) {
      console.error('Failed to load report data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGeoUpload = async () => {
    if (!geoFile) return;
    setUploadingGeo(true);
    setGeoMessage(null);
    try {
      const res = await apiClient.uploadGeoMetadata(geoFile);
      setGeoMessage({ type: 'success', text: res.message });
      setGeoFile(null);
    } catch (err) {
      setGeoMessage({ type: 'error', text: err.message || 'Failed to upload geo-metadata' });
    } finally {
      setUploadingGeo(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-4xl font-outfit font-bold text-white mb-2">Reports & Data Export</h1>
        <p className="text-[var(--text-secondary)]">Export detection logs and manage geographic metadata</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export Panel */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <DownloadCloud className="text-[var(--accent-primary)]" size={28} />
            <h2 className="text-2xl font-semibold text-white">Export Detections</h2>
          </div>
          <p className="text-[var(--text-muted)] mb-8">
            Download the complete history of detected anomalies, including confidence scores, severity, and geotags.
          </p>

          <div className="space-y-4">
            <a 
              href={apiClient.getJsonReportUrl()}
              target="_blank"
              rel="noreferrer"
              className="w-full py-4 px-6 bg-[var(--bg-secondary)] border border-[var(--border-light)] hover:border-[var(--accent-primary)] rounded-xl flex items-center justify-between transition-colors group"
            >
              <div className="flex items-center gap-4">
                <Database className="text-[var(--accent-primary)]" />
                <div>
                  <h3 className="font-semibold text-white group-hover:text-[var(--accent-primary)] transition-colors">JSON Report</h3>
                  <p className="text-sm text-[var(--text-muted)]">Structured data for API integration</p>
                </div>
              </div>
              <FileDown className="text-[var(--text-muted)] group-hover:text-white transition-colors" />
            </a>

            <a 
              href={apiClient.getCsvReportUrl()}
              target="_blank"
              rel="noreferrer"
              className="w-full py-4 px-6 bg-[var(--bg-secondary)] border border-[var(--border-light)] hover:border-[var(--accent-primary)] rounded-xl flex items-center justify-between transition-colors group"
            >
              <div className="flex items-center gap-4">
                <Activity className="text-[var(--accent-primary)]" />
                <div>
                  <h3 className="font-semibold text-white group-hover:text-[var(--accent-primary)] transition-colors">CSV Report</h3>
                  <p className="text-sm text-[var(--text-muted)]">Spreadsheet ready for analysis</p>
                </div>
              </div>
              <FileDown className="text-[var(--text-muted)] group-hover:text-white transition-colors" />
            </a>
          </div>
        </motion.div>

        {/* Geo Metadata Panel */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-panel p-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <MapPin className="text-[var(--status-high)]" size={28} />
            <h2 className="text-2xl font-semibold text-white">Geo-Metadata Upload</h2>
          </div>
          <p className="text-[var(--text-muted)] mb-6">
            Upload CSV or JSON files containing GPS coordinates, ping headers, and sonar metadata to automatically geotag images.
          </p>

          <div 
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
              geoFile ? 'border-[var(--status-high)] bg-[var(--status-high)]/10' : 'border-[var(--border-strong)] hover:border-[var(--status-high)]'
            }`}
          >
            <input 
              type="file" 
              id="geo-upload"
              accept=".json,.csv"
              className="hidden" 
              onChange={(e) => setGeoFile(e.target.files[0])}
            />
            <label htmlFor="geo-upload" className="cursor-pointer flex flex-col items-center">
              <UploadCloud size={36} className={`mb-3 ${geoFile ? 'text-[var(--status-high)]' : 'text-[var(--text-muted)]'}`} />
              <span className="text-white font-medium">
                {geoFile ? geoFile.name : 'Click to select JSON or CSV'}
              </span>
            </label>
          </div>

          <button
            onClick={handleGeoUpload}
            disabled={!geoFile || uploadingGeo}
            className={`w-full mt-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
              !geoFile || uploadingGeo
                ? 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] cursor-not-allowed'
                : 'bg-[var(--status-high)] text-white hover:bg-orange-500 shadow-[0_0_20px_rgba(255,94,0,0.3)]'
            }`}
          >
            {uploadingGeo ? 'Uploading...' : 'Upload Metadata'}
          </button>

          {geoMessage && (
            <div className={`mt-4 p-3 rounded-lg text-sm flex items-center gap-2 ${
              geoMessage.type === 'success' 
                ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}>
              {geoMessage.text}
            </div>
          )}
        </motion.div>
      </div>

      {/* Recent Detections Preview */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-panel p-6"
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-white">Recent Data Preview</h3>
          <span className="text-sm text-[var(--text-muted)]">
            Total Records: {loading ? '...' : stats.total_detections}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border-light)] text-[var(--text-muted)]">
                <th className="pb-3 px-4 font-medium">Image</th>
                <th className="pb-3 px-4 font-medium">Class</th>
                <th className="pb-3 px-4 font-medium">Confidence</th>
                <th className="pb-3 px-4 font-medium">Location</th>
                <th className="pb-3 px-4 font-medium">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-light)]">
              {recentDetections.map((det) => (
                <tr key={det.id} className="hover:bg-[var(--bg-tertiary)] transition-colors">
                  <td className="py-3 px-4 text-white font-mono text-xs">{det.image_name}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center">
                       <ClassBadge className={det.class} />
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-[var(--accent-primary)] font-mono">{(det.confidence * 100).toFixed(1)}%</span>
                  </td>
                  <td className="py-3 px-4 text-[var(--text-secondary)] font-mono text-xs">
                    {det.latitude ? `${det.latitude.toFixed(4)}, ${det.longitude.toFixed(4)}` : 'No Geo'}
                  </td>
                  <td className="py-3 px-4 text-[var(--text-muted)] text-xs">
                    {new Date(det.timestamp).toLocaleString()}
                  </td>
                </tr>
              ))}
              {recentDetections.length === 0 && !loading && (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-[var(--text-muted)]">
                    No detections recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
