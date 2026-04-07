import { LucideIcon } from 'lucide-react';

interface PanelHeaderProps {
  title: string;
  icon: LucideIcon;
  badge?: string;
  className?: string;
}

export function PanelHeader({ title, icon: Icon, badge, className = '' }: PanelHeaderProps) {
  return (
    <div
      className={`flex items-center justify-between px-4 py-3 bg-[#1a1a1a] border-b border-white/5 shrink-0 ${className}`}
    >
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-yellow-400" />
        <h2 className="text-[13px] font-bold text-white uppercase tracking-wider">{title}</h2>
      </div>
      {badge && (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/5 text-zinc-400 border border-white/10 uppercase">
          {badge}
        </span>
      )}
    </div>
  );
}
