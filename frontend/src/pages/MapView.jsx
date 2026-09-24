import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { apiClient } from '../api/client';
import { motion } from 'framer-motion';
import DetectionDetailModal from '../components/DetectionDetailModal';

// Fix Leaflet default icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom severity markers (SVG)
const createSvgMarker = (color) => L.divIcon({
  className: 'custom-div-icon',
  html: `<svg width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="${color}" stroke="#ffffff" stroke-width="2" opacity="0.9" style="filter: drop-shadow(0px 0px 4px ${color});" /></svg>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12]
});

const icons = {
  CRITICAL: createSvgMarker('#ff0055'),
  HIGH: createSvgMarker('#ff5e00'),
  SUSPICIOUS: createSvgMarker('#ffb800'),
  LOW: createSvgMarker('#00d4ff'),
};

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const timeout = setTimeout(() => {
      map.invalidateSize();
    }, 400); // wait for framer-motion animation
    return () => clearTimeout(timeout);
  }, [map]);
  return null;
}

export default function MapView() {
  const [geoData, setGeoData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [selectedDetection, setSelectedDetection] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    apiClient.getGeoDetections()
      .then(res => setGeoData(res.detections || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const center = geoData.length > 0 
    ? [geoData[0].latitude, geoData[0].longitude] 
    : [18.9000, 72.7500]; // Default Arabian Sea off Mumbai

  return (
    <div className="w-full h-[calc(100vh-120px)] flex flex-col space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end flex-shrink-0 gap-4">
        <div>
          <h1 className="text-4xl font-outfit font-bold text-white mb-2">Geospatial Map</h1>
          <p className="text-[var(--text-secondary)]">Geotagged detections based on available sonar metadata</p>
        </div>
        
        <div>
          <div className="relative">
            <select 
              className="appearance-none bg-[var(--bg-tertiary)] border border-[var(--border-light)] text-white text-sm rounded-lg focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] block w-48 p-2.5 pr-8 outline-none cursor-pointer"
              value={filter} 
              onChange={e => setFilter(e.target.value)}
            >
              <option value="ALL" className="bg-[var(--bg-secondary)] text-white">All Severities</option>
              <option value="CRITICAL" className="bg-[var(--bg-secondary)] text-white">Critical Only</option>
              <option value="HIGH" className="bg-[var(--bg-secondary)] text-white">High + Critical</option>
              <option value="SUSPICIOUS" className="bg-[var(--bg-secondary)] text-white">Suspicious & Above</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[var(--text-muted)]">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-2 flex-1 relative z-0 min-h-[500px]"
      >
        {loading ? (
          <div className="h-full flex items-center justify-center text-[var(--text-muted)]">Loading Map Data...</div>
        ) : (
          <MapContainer 
            center={center} 
            zoom={14} 
            style={{ height: '100%', width: '100%', borderRadius: '12px' }}
            theme="dark"
          >
            <MapResizer />
            {/* High-res Satellite map tiles (Esri World Imagery) for realistic ocean view */}
            <TileLayer
              attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxZoom={19}
            />
            
            <MarkerClusterGroup chunkedLoading={true}>
              {geoData.filter(det => {
                if (filter === 'ALL') return true;
                if (filter === 'CRITICAL') return det.severity === 'CRITICAL';
                if (filter === 'HIGH') return ['CRITICAL', 'HIGH'].includes(det.severity);
                if (filter === 'SUSPICIOUS') return ['CRITICAL', 'HIGH', 'SUSPICIOUS'].includes(det.severity);
                return true;
              }).map((det) => (
                <Marker 
                  key={det.id} 
                  position={[det.latitude, det.longitude]}
                  icon={icons[det.severity] || icons.LOW}
                >
                  <Popup>
                    <div className="text-sm font-inter min-w-[200px]">
                      <strong className="block text-lg mb-1 uppercase text-white">{det.class}</strong>
                      <div className="space-y-1 text-gray-400">
                        <p>Severity: <strong style={{color: det.severity === 'CRITICAL' ? '#ff0055' : det.severity === 'HIGH' ? '#ff5e00' : det.severity === 'SUSPICIOUS' ? '#ffb800' : '#00d4ff'}}>{det.severity}</strong></p>
                        <p>Confidence: {(det.confidence * 100).toFixed(1)}%</p>
                        <p className="truncate text-xs text-gray-500">{det.image}</p>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedDetection(det); setIsModalOpen(true); }}
                        className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white rounded py-1.5 font-bold text-xs transition-colors"
                      >
                        View Details
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MarkerClusterGroup>
            
            <div className="absolute bottom-6 right-6 z-[400] glass-panel bg-black/80 backdrop-blur-md p-4 rounded-lg pointer-events-none border border-[var(--border-light)]">
              <h4 className="text-white font-semibold mb-2 text-sm">Severity</h4>
              {Object.entries({ CRITICAL: '#ff0055', HIGH: '#ff5e00', SUSPICIOUS: '#ffb800', LOW: '#00d4ff' }).map(([key, color]) => (
                <div key={key} className="flex items-center gap-2 mb-1.5">
                  <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: color }} />
                  <span className="text-xs text-[var(--text-secondary)] font-mono">{key}</span>
                </div>
              ))}
            </div>
          </MapContainer>
        )}
      </motion.div>

      <DetectionDetailModal 
        detection={selectedDetection} 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen} 
      />
    </div>
  );
}
