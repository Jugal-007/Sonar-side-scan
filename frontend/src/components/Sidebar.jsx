import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Target, 
  Activity, 
  History, 
  Map as MapIcon, 
  Cpu, 
  Menu,
  ChevronLeft,
  FileDown
} from 'lucide-react';

const navItems = [
  { id: 'dashboard', path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'analysis', path: '/analysis', icon: Target, label: 'Sonar Analysis' },
  { id: 'live', path: '/live', icon: Activity, label: 'Live Simulation' },
  { id: 'history', path: '/history', icon: History, label: 'Detection History' },
  { id: 'map', path: '/map', icon: MapIcon, label: 'Geospatial Map' },
  { id: 'reports', path: '/reports', icon: FileDown, label: 'Data Reports' },
  { id: 'model', path: '/model', icon: Cpu, label: 'Model Status' },
];

export default function Sidebar({ isOpen, toggle }) {
  return (
    <motion.aside 
      initial={false}
      animate={{ width: isOpen ? 280 : 80 }}
      className="fixed left-0 top-0 h-full bg-[var(--bg-secondary)] border-r border-[var(--border-light)] z-50 flex flex-col glass-panel !rounded-none"
    >
      <div className="flex items-center justify-between p-6 border-b border-[var(--border-light)]">
        <motion.div 
          animate={{ opacity: isOpen ? 1 : 0, display: isOpen ? 'block' : 'none' }}
          className="font-outfit font-bold text-xl tracking-tight text-[var(--accent-primary)]"
        >
          MarineGuard<span className="text-white">AI</span>
        </motion.div>
        
        <button 
          onClick={toggle}
          className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-muted)] hover:text-white"
        >
          {isOpen ? <ChevronLeft size={20} /> : <Menu size={24} />}
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-2 mt-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.id}
              to={item.path}
              className={({ isActive }) => `
                flex items-center px-3 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden
                ${isActive 
                  ? 'bg-[var(--bg-tertiary)] text-[var(--accent-primary)] border border-[var(--border-accent)] shadow-[inset_0_0_20px_rgba(0,212,255,0.05)]' 
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-white border border-transparent'}
              `}
            >
              <Icon size={22} className={`min-w-[22px] transition-transform duration-300 group-hover:scale-110`} />
              
              <motion.span 
                animate={{ 
                  opacity: isOpen ? 1 : 0, 
                  width: isOpen ? 'auto' : 0,
                  marginLeft: isOpen ? 16 : 0
                }}
                className="font-medium whitespace-nowrap overflow-hidden"
              >
                {item.label}
              </motion.span>
              
              {/* Active Glow Effect */}
              <div className="absolute inset-0 rounded-xl opacity-0 transition-opacity group-[.active]:opacity-100 pointer-events-none">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[var(--accent-primary)] rounded-r-md shadow-[0_0_10px_var(--accent-primary)]" />
              </div>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-6 border-t border-[var(--border-light)]">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_#22c55e] animate-pulse" />
          <motion.span 
            animate={{ opacity: isOpen ? 1 : 0, display: isOpen ? 'block' : 'none' }}
            className="text-xs font-mono text-[var(--text-muted)]"
          >
            SYSTEM ONLINE
          </motion.span>
        </div>
      </div>
    </motion.aside>
  );
}
