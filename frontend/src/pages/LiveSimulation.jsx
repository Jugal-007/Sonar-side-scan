import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, FastForward, SkipBack, AlertTriangle, ShieldAlert } from 'lucide-react';
import { apiClient } from '../api/client';
import ClassBadge from '../components/ClassBadge';
import DetectionDetailModal from '../components/DetectionDetailModal';

export default function LiveSimulation() {
  const [info, setInfo] = useState(null);
  const [playing, setPlaying] = useState(() => JSON.parse(sessionStorage.getItem('ls_playing') || 'false'));
  const [currentFrame, setCurrentFrame] = useState(() => parseInt(sessionStorage.getItem('ls_frame') || '0'));
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [speed, setSpeed] = useState(() => parseFloat(sessionStorage.getItem('ls_speed') || '1'));
  const [sessionStats, setSessionStats] = useState(() => {
    const saved = sessionStorage.getItem('ls_stats');
    if (saved) {
      const parsed = JSON.parse(saved);
      return { totalDetections: parsed.totalDetections, classes: new Set(parsed.classes) };
    }
    return { totalDetections: 0, classes: new Set() };
  });
  const [selectedDetection, setSelectedDetection] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const timerRef = useRef(null);

  useEffect(() => {
    apiClient.getSimulateInfo().then(setInfo).catch(console.error);
    
    // Resume fetching the current frame if we unmounted and remounted
    const savedFrame = parseInt(sessionStorage.getItem('ls_frame') || '0');
    if (savedFrame > 0) {
      fetchFrame(savedFrame);
    }
    
    return () => clearInterval(timerRef.current);
  }, []);

  // Persist state changes
  useEffect(() => { sessionStorage.setItem('ls_playing', JSON.stringify(playing)); }, [playing]);
  useEffect(() => { sessionStorage.setItem('ls_frame', currentFrame.toString()); }, [currentFrame]);
  useEffect(() => { sessionStorage.setItem('ls_speed', speed.toString()); }, [speed]);
  useEffect(() => { 
    sessionStorage.setItem('ls_stats', JSON.stringify({
      totalDetections: sessionStats.totalDetections,
      classes: Array.from(sessionStats.classes)
    })); 
  }, [sessionStats]);

  const fetchFrame = async (idx) => {
    try {
      const res = await apiClient.getSimulateFrame(idx);
      setResult(res);
      if (res.detections.length > 0) {
        setHistory(prev => [res, ...prev].slice(0, 10)); // Keep last 10 detections
        setSessionStats(prev => ({
          totalDetections: prev.totalDetections + res.detection_count,
          classes: new Set([...prev.classes, ...res.detections.map(d => d.class)])
        }));
      }
    } catch (err) {
      console.error(err);
      setPlaying(false);
    }
  };

  const stateRef = useRef({ currentFrame, speed });
  useEffect(() => {
    stateRef.current = { currentFrame, speed };
  }, [currentFrame, speed]);

  useEffect(() => {
    if (!playing || !info) return;
    
    let active = true;
    let timeoutId;
    
    const tick = async () => {
      if (!active) return;
      
      const next = (stateRef.current.currentFrame + 1) % info.frame_count;
      await fetchFrame(next);
      
      if (active) {
        setCurrentFrame(next);
        timeoutId = setTimeout(tick, 2000 / stateRef.current.speed);
      }
    };
    
    tick();
    
    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [playing, info]);

  if (!info || !info.available) {
    return (
      <div className="max-w-4xl mx-auto text-center mt-20">
        <h2 className="text-2xl font-bold text-white mb-4">Simulated Feed Unavailable</h2>
        <p className="text-[var(--text-secondary)]">No sample data found in the sample_data directory.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-outfit font-bold text-white mb-2 flex items-center gap-3">
            Live Simulation
            {playing && <span className="flex h-3 w-3 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span></span>}
          </h1>
          <p className="text-[var(--text-secondary)]">Simulated real-time sonar feed analysis</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex bg-[var(--bg-tertiary)] p-1 rounded-lg border border-[var(--border-light)] text-xs font-mono">
            {[0.5, 1, 1.5, 2].map(s => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-3 py-1 rounded-md transition-colors ${speed === s ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] font-bold' : 'text-[var(--text-muted)] hover:text-white'}`}
              >
                {s}x
              </button>
            ))}
          </div>

          <div className="glass-panel px-4 py-2 flex gap-4">
            <button onClick={() => { setPlaying(false); setCurrentFrame(0); fetchFrame(0); setSessionStats({totalDetections: 0, classes: new Set()}); }} className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg text-white"><SkipBack size={20}/></button>
            <button onClick={() => setPlaying(!playing)} className="p-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-secondary)] rounded-lg text-[var(--bg-primary)] transition-colors shadow-[0_0_15px_var(--accent-primary-glow)]">
              {playing ? <Pause size={20} className="fill-current"/> : <Play size={20} className="fill-current"/>}
            </button>
            <button onClick={() => { setPlaying(false); fetchFrame((currentFrame + 1) % info.frame_count); setCurrentFrame(prev => (prev+1)%info.frame_count); }} className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg text-white"><FastForward size={20}/></button>
          </div>
        </div>
      </div>
      
      {/* Session Stats Bar */}
      <div className="grid grid-cols-3 gap-6">
        <div className="glass-panel p-4 flex justify-between items-center">
          <span className="text-[var(--text-muted)] text-sm">Session Detections</span>
          <span className="text-2xl font-mono text-white font-bold">{sessionStats.totalDetections}</span>
        </div>
        <div className="glass-panel p-4 flex justify-between items-center">
          <span className="text-[var(--text-muted)] text-sm">Unique Classes</span>
          <span className="text-2xl font-mono text-[var(--accent-primary)] font-bold">{sessionStats.classes.size}</span>
        </div>
        <div className="glass-panel p-4 flex justify-between items-center">
          <span className="text-[var(--text-muted)] text-sm">Last Alert</span>
          <span className="text-xl font-mono text-white">
            {history.length > 0 ? `Frame ${history[0].frame_index}` : '-'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 glass-panel p-4 min-h-[500px] flex items-center justify-center relative overflow-hidden bg-black/50">
           {result ? (
            <img src={`data:image/png;base64,${result.annotated_image}`} alt="Feed" className="max-w-full max-h-full object-contain" />
           ) : (
             <div className="text-[var(--text-muted)] font-mono flex flex-col items-center">
                <ShieldAlert size={48} className="mb-4 opacity-50"/>
                PRESS PLAY TO START SIMULATION
             </div>
           )}
           
           {/* HUD Overlay */}
           <div className="absolute top-6 left-6 font-mono text-xs text-[#00ffcc] bg-black/40 px-3 py-1 rounded border border-[#00ffcc]/30 backdrop-blur-sm">
              FRAME {currentFrame.toString().padStart(4, '0')} / {info.frame_count.toString().padStart(4, '0')}
           </div>
           {result && (
              <div className="absolute bottom-6 right-6 font-mono text-xs text-[#00ffcc] bg-black/40 px-3 py-1 rounded border border-[#00ffcc]/30 backdrop-blur-sm">
                LATENCY: {result.processing_time_ms.toFixed(0)}ms
              </div>
           )}
           <div className="scan-effect absolute inset-0 pointer-events-none opacity-30" />
        </div>

        <div className="glass-panel p-4 flex flex-col max-h-[500px]">
          <h3 className="font-semibold text-white mb-4 border-b border-[var(--border-light)] pb-2 flex items-center gap-2">
            <AlertTriangle className="text-[var(--status-high)]" size={18}/>
            Recent Alerts
          </h3>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {history.length === 0 ? (
              <p className="text-[var(--text-muted)] text-sm italic">No anomalies detected yet...</p>
            ) : (
              history.map((histItem, idx) => (
                <div key={idx} className="bg-[var(--bg-tertiary)] p-3 rounded-lg border border-[var(--border-light)] border-l-4 border-l-[var(--status-suspicious)]">
                  <div className="flex justify-between items-start">
                    <span className="font-mono text-xs text-[var(--text-secondary)]">Frame {histItem.frame_index}</span>
                    <span className="text-xs bg-[var(--status-suspicious-bg)] text-[var(--status-suspicious)] px-2 rounded">
                      {histItem.detection_count} DET
                    </span>
                  </div>
                  <div className="mt-2 flex flex-col gap-1">
                     {histItem.detections.map((d, i) => (
                        <div 
                          key={i} 
                          onClick={() => { setSelectedDetection({...d, annotated_image: histItem.annotated_image}); setIsModalOpen(true); }}
                          className="text-sm font-semibold text-white flex justify-between items-center mt-1 p-2 hover:bg-[var(--bg-secondary)] rounded cursor-pointer transition-colors"
                        >
                          <ClassBadge className={d.class} />
                          <span className="text-[#00ffcc]">{(d.confidence*100).toFixed(0)}%</span>
                        </div>
                     ))}
                  </div>
                </div>
              ))
            )}
          </div>
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
