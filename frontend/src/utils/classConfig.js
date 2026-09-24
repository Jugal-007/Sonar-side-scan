import { Bomb, Trash2, Package, Link, Wind, Circle, Anchor, Settings, Droplets, Plane, Ship, UserX } from 'lucide-react';

export const CLASS_CONFIG = {
  mine:            { color: '#ff0055', icon: Bomb,         risk: 'critical' },
  body:            { color: '#ff0055', icon: UserX,        risk: 'critical' },
  plane:           { color: '#ff5e00', icon: Plane,        risk: 'high' },
  airplane:        { color: '#ff5e00', icon: Plane,        risk: 'high' },
  boat:            { color: '#ff5e00', icon: Ship,         risk: 'high' },
  ship:            { color: '#ff5e00', icon: Ship,         risk: 'high' },
  can:             { color: '#00d4ff', icon: Trash2,       risk: 'low' },
  bottle:          { color: '#00d4ff', icon: Trash2,       risk: 'low' },
  'drink-carton':  { color: '#00d4ff', icon: Package,      risk: 'low' },
  chain:           { color: '#ffb800', icon: Link,         risk: 'medium' },
  propeller:       { color: '#ffb800', icon: Wind,         risk: 'medium' },
  tire:            { color: '#8b9bb4', icon: Circle,       risk: 'low' },
  hook:            { color: '#ff5e00', icon: Anchor,       risk: 'high' },
  valve:           { color: '#ff5e00', icon: Settings,     risk: 'high' },
  'shampoo-bottle':{ color: '#00d4ff', icon: Droplets,     risk: 'low' },
  'standing-bottle':{ color: '#00d4ff', icon: Trash2,     risk: 'low' },
  unknown:         { color: '#a1a1aa', icon: Circle,       risk: 'low' },
};

export const getClassConfig = (className) => {
  const normalized = className?.toLowerCase() || 'unknown';
  return CLASS_CONFIG[normalized] || CLASS_CONFIG.unknown;
};
