const API_BASE = 'http://localhost:8000/api';

export const apiClient = {
  // System Health
  checkHealth: async () => {
    const res = await fetch('http://localhost:8000/health');
    return res.json();
  },

  // Statistics
  getStats: async () => {
    const res = await fetch(`${API_BASE}/statistics`);
    return res.json();
  },

  // Model Status
  getModelStatus: async () => {
    const res = await fetch(`${API_BASE}/model/status`);
    return res.json();
  },

  getBenchmark: async () => {
    const res = await fetch(`${API_BASE}/benchmark`);
    if (!res.ok) throw new Error('Failed to fetch benchmark');
    return res.json();
  },

  // Analysis
  analyzeImage: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/analyze/image`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  analyzeBatch: async (files) => {
    const formData = new FormData();
    Array.from(files).forEach(file => formData.append('files', file));
    const res = await fetch(`${API_BASE}/analyze/batch`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  analyzeZip: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/analyze/zip`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // Simulated Feed
  getSimulateInfo: async () => {
    const res = await fetch(`${API_BASE}/simulate/info`);
    return res.json();
  },

  getSimulateFrame: async (index) => {
    const res = await fetch(`${API_BASE}/simulate/frame/${index}`);
    if (!res.ok) throw new Error('Frame not found');
    return res.json();
  },

  // History
  getDetections: async (offset = 0, limit = 100) => {
    const res = await fetch(`${API_BASE}/detections?offset=${offset}&limit=${limit}`);
    return res.json();
  },

  // Geo
  getGeoDetections: async () => {
    const res = await fetch(`${API_BASE}/geo/detections`);
    return res.json();
  },

  uploadGeoMetadata: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/geo/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // Reports URL
  getJsonReportUrl: () => `${API_BASE}/reports/json`,
  getCsvReportUrl: () => `${API_BASE}/reports/csv`,
};
