import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, Image as ImageIcon, Activity, AlertCircle, CheckCircle2 } from 'lucide-react';
import { apiClient } from '../api/client';
import AnomalyBreakdown from '../components/AnomalyBreakdown';
import ClassBadge from '../components/ClassBadge';
import ConfidenceRing from '../components/ConfidenceRing';

export default function SonarAnalysis() {
  const [files, setFiles] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('annotated'); // original, processed, annotated, summary
  const [uploadMode, setUploadMode] = useState('single'); // single, batch, zip
  const [selectedDetection, setSelectedDetection] = useState(null);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [geoFile, setGeoFile] = useState(null);

  const handleDrop = (e) => {
    e.preventDefault();
    if (uploadMode === 'batch') {
      setFiles(Array.from(e.dataTransfer.files));
    } else {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) setFiles([droppedFile]);
    }
  };

  const handleAnalyze = async () => {
    if (files.length === 0) return;
    setAnalyzing(true);
    setAnalysisStep(0);
    setError(null);
    setSelectedDetection(null);

    const stepInterval = setInterval(() => {
      setAnalysisStep(prev => Math.min(prev + 1, 3));
    }, 600);

    try {
      if (geoFile) {
        await apiClient.uploadGeoMetadata(geoFile);
      }

      let resPromise;
      if (uploadMode === 'batch') {
        resPromise = apiClient.analyzeBatch(files);
      } else if (uploadMode === 'zip') {
        resPromise = apiClient.analyzeZip(files[0]);
      } else {
        resPromise = apiClient.analyzeImage(files[0]);
      }
      
      const [res] = await Promise.all([
        resPromise,
        new Promise(resolve => setTimeout(resolve, 2400))
      ]);
      
      clearInterval(stepInterval);
      setAnalysisStep(4);
      
      if (uploadMode === 'single') setActiveTab('annotated');
      else setActiveTab('summary');
      
      setResult(res);
    } catch (err) {
      clearInterval(stepInterval);
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch(severity) {
      case 'CRITICAL': return 'var(--status-critical)';
      case 'HIGH': return 'var(--status-high)';
      case 'SUSPICIOUS': return 'var(--status-suspicious)';
      default: return 'var(--status-low)';
    }
  };

  const allDetections = result?.detections 
    ? result.detections 
    : result?.results?.flatMap(r => r.detections) || [];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-4xl font-outfit font-bold text-white mb-2">Sonar Analysis</h1>
        <p className="text-[var(--text-secondary)]">Upload sonar imagery for AI-powered anomaly detection</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Upload & Controls */}
        <div className="space-y-6">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-panel p-6"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <UploadCloud className="text-[var(--accent-primary)]" />
                Upload Source
              </h3>
              <div className="flex bg-[var(--bg-secondary)] p-1 rounded-lg border border-[var(--border-light)] text-xs">
                {['single', 'batch', 'zip'].map(mode => (
                  <button
                    key={mode}
                    onClick={() => { setUploadMode(mode); setFiles([]); setResult(null); }}
                    className={`px-3 py-1 rounded-md capitalize ${uploadMode === mode ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] font-bold' : 'text-[var(--text-muted)] hover:text-white'}`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
            
            <div 
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                files.length > 0 ? 'border-[var(--accent-primary)] bg-[var(--accent-primary-glow)]' : 'border-[var(--border-strong)] hover:border-[var(--accent-primary)]'
              }`}
              onClick={() => document.getElementById('file-upload').click()}
            >
              <input 
                id="file-upload" 
                type="file" 
                accept={uploadMode === 'zip' ? '.zip' : 'image/*'} 
                multiple={uploadMode === 'batch'}
                className="hidden" 
                onChange={(e) => setFiles(Array.from(e.target.files))}
              />
              <ImageIcon size={48} className={`mx-auto mb-4 ${files.length > 0 ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]'}`} />
              <p className="text-white font-medium mb-1">
                {files.length > 0 
                  ? uploadMode === 'batch' ? `${files.length} files selected` : files[0].name 
                  : `Click or drag ${uploadMode === 'batch' ? 'images' : uploadMode === 'zip' ? 'ZIP archive' : 'image'} here`}
              </p>
              <p className="text-sm text-[var(--text-muted)]">
                {uploadMode === 'zip' ? 'Supports .zip' : 'Supports PNG, JPG, TIFF'}
              </p>
            </div>

            {/* Geo Metadata Input */}
            <div className="mt-4 flex items-center justify-between p-3 border border-[var(--border-light)] rounded-lg bg-[var(--bg-secondary)]">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-white">Geo-Metadata (Optional)</span>
                <span className="text-xs text-[var(--text-muted)]">Attach GPS coordinates for images</span>
              </div>
              <label className="cursor-pointer bg-[var(--bg-tertiary)] hover:bg-[var(--border-strong)] px-3 py-1.5 rounded-md text-xs font-medium text-white transition-colors">
                {geoFile ? geoFile.name : 'Select JSON/CSV'}
                <input 
                  type="file" 
                  accept=".json,.csv"
                  className="hidden" 
                  onChange={(e) => setGeoFile(e.target.files[0])}
                />
              </label>
            </div>

            <button
              onClick={handleAnalyze}
              disabled={files.length === 0 || analyzing}
              className={`w-full mt-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                files.length === 0 || analyzing
                  ? 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] cursor-not-allowed'
                  : 'bg-[var(--accent-primary)] text-[var(--bg-primary)] hover:bg-[var(--accent-secondary)] shadow-[0_0_20px_var(--accent-primary-glow)]'
              }`}
            >
              {analyzing ? (
                <>
                  <div className="w-5 h-5 border-2 border-[var(--bg-primary)] border-t-transparent rounded-full animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Activity size={20} />
                  Run AI Analysis
                </>
              )}
            </button>
            
            {error && (
              <div className="mt-4 p-3 rounded-lg bg-[var(--status-critical-bg)] text-[var(--status-critical)] flex items-center gap-2 text-sm">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            {/* Pipeline Information */}
            <div className="glass-panel p-5 mt-6 border border-blue-500/20 bg-blue-500/5">
              <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-3">Preprocessing Pipeline Active</h3>
              <div className="space-y-2 text-xs text-[var(--text-muted)]">
                <p className="flex gap-2">
                  <span className="text-blue-400">●</span> 
                  <span><strong className="text-gray-300">CLAHE:</strong> Preserves local contrast in acoustic shadows.</span>
                </p>
                <p className="flex gap-2">
                  <span className="text-blue-400">●</span> 
                  <span><strong className="text-gray-300">NL-Means Denoising:</strong> Removes speckle noise typical in side-scan sonar.</span>
                </p>
                <p className="flex gap-2">
                  <span className="text-blue-400">●</span> 
                  <span><strong className="text-gray-300">Normalization:</strong> Letterbox resizing while preserving aspect ratio.</span>
                </p>
              </div>
            </div>
          </motion.div>

          {/* Detections List */}
          <AnimatePresence>
            {allDetections.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel p-6 max-h-[500px] overflow-y-auto"
              >
                <h3 className="text-lg font-semibold text-white mb-4">Detected Anomalies ({allDetections.length})</h3>
                <div className="space-y-3">
                  {allDetections.map((det, idx) => (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      key={det.id} 
                      onClick={() => setSelectedDetection(det)}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedDetection?.id === det.id 
                          ? 'border-[var(--accent-primary)] bg-[var(--bg-tertiary)]' 
                          : 'border-[var(--border-light)] hover:border-[var(--border-strong)] bg-[var(--bg-secondary)]'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <ClassBadge className={det.class} />
                        </div>
                      </div>
                      
                      <div className="flex justify-around items-center mt-3 pt-3 border-t border-[var(--border-light)]">
                        <ConfidenceRing percentage={det.confidence * 100} label="AI Conf" />
                        <ConfidenceRing percentage={det.anomaly_pct} label="Anomaly" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Anomaly Breakdown Panel */}
          <AnimatePresence>
            {selectedDetection && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="glass-panel p-6 mt-6">
                  <AnomalyBreakdown 
                    components={selectedDetection.anomaly_details?.components} 
                    totalScore={selectedDetection.anomaly_pct} 
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Column: Image Viewport */}
        <div className="lg:col-span-2">
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-panel p-6 h-full min-h-[600px] flex flex-col"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-white">Analysis Viewport</h3>
              
              {result && (
                <div className="flex bg-[var(--bg-tertiary)] p-1 rounded-lg border border-[var(--border-light)]">
                  {['original', 'processed', 'annotated', ...(uploadMode !== 'single' ? ['summary'] : [])].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                        activeTab === tab 
                          ? 'bg-[var(--bg-secondary)] text-[var(--accent-primary)] shadow-sm' 
                          : 'text-[var(--text-muted)] hover:text-white'
                      }`}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex-1 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-light)] flex items-center justify-center overflow-hidden relative">
              {analyzing && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[var(--bg-glass)] backdrop-blur-sm p-8">
                  <div className="w-16 h-16 border-4 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin mb-8 shadow-[0_0_30px_var(--accent-primary-glow)]" />
                  
                  <div className="w-full max-w-sm space-y-4">
                    {["Image Enhancement & Denoising", "Acoustic Shadow Isolation", "YOLOv8 Inference", "Anomaly Scoring & Classification"].map((step, idx) => (
                      <div key={step} className="flex items-center gap-4">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors duration-300 ${
                          analysisStep > idx ? 'bg-green-500 text-white shadow-[0_0_10px_#22c55e]' : 
                          analysisStep === idx ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] animate-pulse' : 
                          'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
                        }`}>
                          {analysisStep > idx ? <CheckCircle2 size={14} /> : idx + 1}
                        </div>
                        <span className={`font-mono text-sm transition-colors duration-300 ${
                          analysisStep > idx ? 'text-green-400' :
                          analysisStep === idx ? 'text-white' :
                          'text-[var(--text-muted)]'
                        }`}>
                          {step}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {result ? (
                activeTab === 'summary' && uploadMode !== 'single' ? (
                  <div className="w-full h-full p-8 overflow-y-auto">
                    <h4 className="text-2xl text-white font-semibold mb-6">Batch Analysis Summary</h4>
                    <div className="grid grid-cols-2 gap-4 mb-8">
                      <div className="glass-panel p-4">
                        <p className="text-[var(--text-muted)]">Total Frames Analyzed</p>
                        <p className="text-3xl text-white font-mono">{result.total_frames}</p>
                      </div>
                      <div className="glass-panel p-4">
                        <p className="text-[var(--text-muted)]">Total Detections</p>
                        <p className="text-3xl text-[var(--accent-primary)] font-mono">{result.total_detections}</p>
                      </div>
                    </div>
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-[var(--border-light)] text-[var(--text-muted)]">
                          <th className="pb-2">Image File</th>
                          <th className="pb-2">Detections</th>
                          <th className="pb-2">Processing Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-light)]">
                        {result.results?.map(r => (
                          <tr key={r.image_name} className="hover:bg-[var(--bg-tertiary)]">
                            <td className="py-3 text-white truncate max-w-[200px]">{r.image_name}</td>
                            <td className="py-3 font-mono text-[var(--accent-primary)]">{r.detection_count}</td>
                            <td className="py-3 text-[var(--text-secondary)]">{r.processing_time_ms}ms</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <img 
                    src={`data:image/png;base64,${
                      selectedDetection?.annotated_image 
                        ? selectedDetection.annotated_image 
                        : (uploadMode !== 'single' && result.results && result.results.length > 0) 
                          ? result.results[0][`${activeTab}_image`] 
                          : result[`${activeTab}_image`]
                    }`} 
                    alt={`${activeTab} view`}
                    className="max-w-full max-h-full object-contain"
                  />
                )
              ) : (
                <div className="text-center">
                  <TargetIcon />
                  <p className="text-[var(--text-muted)] font-mono text-sm mt-4">AWAITING INPUT SIGNAL</p>
                </div>
              )}
            </div>

            {result && uploadMode === 'single' && (
                <div className="mt-4 flex items-center gap-6 text-sm text-[var(--text-secondary)]">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 size={16} className="text-green-500" />
                    Processed in {result.processing_time_ms?.toFixed(0)}ms
                  </span>
                  <span>Model: {result.model_name}</span>
                  <span>Resolution: {result.image_width}x{result.image_height}</span>
                </div>
              )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function TargetIcon() {
  return (
    <div className="relative w-32 h-32 opacity-20">
      <div className="absolute inset-0 border border-dashed border-white rounded-full animate-[spin_10s_linear_infinite]" />
      <div className="absolute inset-4 border border-white rounded-full" />
      <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white" />
      <div className="absolute top-0 left-1/2 w-[1px] h-full bg-white" />
    </div>
  );
}
