import type { PowerTier } from '../types/league';

interface PowerTierIconProps {
  tier: PowerTier;
  className?: string;
}

export function PowerTierIcon({ tier, className = "w-3.5 h-3.5" }: PowerTierIconProps) {
  if (tier === 'Bolt') {
    return (
      <svg className={className} viewBox="0 0 18 22" fill="none">
        <path 
          d="M10.5 0L0 12.5H7.5L6 22L18 9H10.5V0Z" 
          fill="#fbbf24" 
        />
      </svg>
    );
  }
  
  // For Hurricane, Thunder and Storm, use emojis
  const emoji = tier === 'Hurricane' ? '🌀' : tier === 'Thunder' ? '🌩️' : '🌪️';
  return <span className="text-base">{emoji}</span>;
}