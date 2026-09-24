import React from 'react';
import { Drawer } from 'vaul';
import { Download, Copy, MapPin } from 'lucide-react';
import AnomalyBreakdown from './AnomalyBreakdown';
import ClassBadge from './ClassBadge';
import ConfidenceRing from './ConfidenceRing';

export default function DetectionDetailModal({ detection, open, onOpenChange }) {
  if (!detection) return null;

  const handleCopyId = () => {
    navigator.clipboard.writeText(detection.id);
  };

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 max-h-[90vh] bg-[var(--bg-primary)] flex flex-col rounded-t-[20px] z-50 outline-none border-t border-[var(--border-light)]">
          <div className="p-4 bg-[var(--bg-primary)] rounded-t-[20px] flex-1 overflow-y-auto">
            <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-[var(--border-strong)] mb-6" />
            
            <div className="max-w-4xl mx-auto space-y-8 pb-8">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-outfit font-bold text-white mb-2 flex items-center gap-3">
                    <ClassBadge className={detection.class} />
                    Detection Details
                  </h2>
                  <p className="text-[var(--text-secondary)] font-mono text-sm flex items-center gap-2">
                    ID: {detection.id}
                    <button onClick={handleCopyId} className="hover:text-white"><Copy size={14}/></button>
                  </p>
                </div>
                <div className="flex gap-4">
                  <ConfidenceRing percentage={detection.confidence * 100} label="AI Conf" size={56} strokeWidth={5} />
                  <ConfidenceRing percentage={detection.anomaly_pct} label="Anomaly" size={56} strokeWidth={5} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Annotated Image</h3>
                  <div className="rounded-xl overflow-hidden border border-[var(--border-light)] bg-[var(--bg-secondary)] relative">
                    <img 
                      src={`data:image/png;base64,${detection.annotated_image}`} 
                      alt="Detection"
                      className="w-full h-auto"
                    />
                    <a 
                      href={`data:image/png;base64,${detection.annotated_image}`}
                      download={`detection-${detection.id}.png`}
                      className="absolute bottom-4 right-4 bg-black/50 hover:bg-black/80 text-white p-2 rounded-lg backdrop-blur-sm transition-colors"
                    >
                      <Download size={20} />
                    </a>
                  </div>

                  {detection.latitude && detection.longitude && (
                    <div className="p-4 rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)] flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <MapPin className="text-[var(--accent-primary)]" />
                        <div>
                          <p className="text-white font-semibold">Location</p>
                          <p className="text-[var(--text-secondary)] font-mono text-sm">
                            {detection.latitude.toFixed(6)}, {detection.longitude.toFixed(6)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="p-6 rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)]">
                    <AnomalyBreakdown 
                      components={detection.anomaly_details?.components} 
                      totalScore={detection.anomaly_pct} 
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
