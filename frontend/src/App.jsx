import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import SonarAnalysis from './pages/SonarAnalysis';
import LiveSimulation from './pages/LiveSimulation';
import DetectionHistory from './pages/DetectionHistory';
import MapView from './pages/MapView';
import ModelStatus from './pages/ModelStatus';
import Reports from './pages/Reports';

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: -12, filter: 'blur(4px)' }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="min-h-full w-full flex-1 flex flex-col"
      >
        <Routes location={location}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/analysis" element={<SonarAnalysis />} />
          <Route path="/live" element={<LiveSimulation />} />
          <Route path="/history" element={<DetectionHistory />} />
          <Route path="/map" element={<MapView />} />
          <Route path="/model" element={<ModelStatus />} />
          <Route path="/reports" element={<Reports />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <BrowserRouter>
      <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)] relative z-0">
        {/* Ambient Animated Background */}
        <div className="ambient-bg">
          <div className="orb orb-1" />
          <div className="orb orb-2" />
        </div>
        <Toaster theme="dark" position="bottom-right" toastOptions={{
          style: {
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-light)',
            color: 'var(--text-primary)',
            backdropFilter: 'blur(16px)'
          }
        }} />
        
        {/* Animated Sidebar */}
        <Sidebar isOpen={sidebarOpen} toggle={() => setSidebarOpen(!sidebarOpen)} />
        
        {/* Main Content Area */}
        <main 
          className="flex-1 overflow-y-auto overflow-x-hidden relative transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
          style={{ paddingLeft: sidebarOpen ? '280px' : '80px' }}
        >
          <div className="p-8 w-full max-w-7xl mx-auto min-h-full flex flex-col">
            <AnimatedRoutes />
          </div>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
