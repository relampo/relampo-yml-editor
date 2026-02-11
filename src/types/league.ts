export type PowerTier = 'Bolt' | 'Thunder' | 'Storm' | 'Hurricane';

export type PointCategory = 
  | 'explorers' // Exploradores de Performance
  | 'contributors' // Contribuidores Relampo
  | 'detectors'; // Detectores de Issues

export type TimeRange = 'monthly' | 'all-time';

export interface CategoryPoints {
  explorers: number; // Proyectos distintos probados
  contributors: number; // PRs aceptados
  detectors: number; // Issues reportados
}

export interface LeagueEntry {
  rank: number;
  userId: string;
  userName: string;
  avatarUrl?: string;
  totalPoints: number;
  pointsBreakdown: CategoryPoints;
  currentTier: PowerTier | null;
  monthlyWins: string[]; // e.g., ["Feb 2025", "Jan 2025"]
  delta?: number; // change in rank vs last period
}

export interface PowerTierConfig {
  name: PowerTier;
  icon: string;
  minPoints: number;
  requirements: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

export const POWER_TIERS: PowerTierConfig[] = [
  { 
    name: 'Bolt', 
    icon: '⚡', // Will be rendered as gray SVG
    minPoints: 20, 
    requirements: 'Solo ejecución de pruebas',
    color: 'text-zinc-400', 
    bgColor: 'bg-zinc-500/10', 
    borderColor: 'border-zinc-400/30'
  },
  { 
    name: 'Thunder', 
    icon: '🌩️', 
    minPoints: 60, 
    requirements: 'Ejecución consistente',
    color: 'text-orange-400', 
    bgColor: 'bg-orange-500/10', 
    borderColor: 'border-orange-400/30'
  },
  { 
    name: 'Storm', 
    icon: '🌪️', 
    minPoints: 150, 
    requirements: 'Calidad + Producto',
    color: 'text-purple-400', 
    bgColor: 'bg-purple-500/10', 
    borderColor: 'border-purple-400/30'
  },
  { 
    name: 'Hurricane', 
    icon: '🌀', 
    minPoints: 400, 
    requirements: 'Impacto Elite',
    color: 'text-cyan-400', 
    bgColor: 'bg-cyan-500/10', 
    borderColor: 'border-cyan-400/30'
  },
];

export function calculatePowerTier(points: CategoryPoints, monthlyWins: string[]): PowerTier | null {
  const { explorers, contributors, detectors } = points;
  const total = explorers + contributors + detectors;
  
  // Hurricane - Elite Impact
  if (total >= 400 && explorers > 0 && contributors > 0 && detectors > 0 && monthlyWins.length > 0) {
    return 'Hurricane';
  }
  
  // Storm - Quality & Product Impact (dos caminos)
  if (total >= 150) {
    // Camino A: Pruebas + Issues
    if (explorers > 0 && detectors > 0) {
      return 'Storm';
    }
    // Camino B: Pruebas + Contribuciones
    if (explorers > 0 && contributors > 0) {
      return 'Storm';
    }
  }
  
  // Thunder - Advanced Execution
  if (explorers >= 60) {
    return 'Thunder';
  }
  
  // Bolt - Execution Level
  if (explorers >= 20) {
    return 'Bolt';
  }
  
  return null;
}

export function getTierConfig(tier: PowerTier | null): PowerTierConfig | null {
  if (!tier) return null;
  return POWER_TIERS.find(t => t.name === tier) || null;
}