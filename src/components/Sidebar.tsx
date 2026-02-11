import { LayoutDashboard, FlaskConical, FolderKanban, Settings, FileText, Home, Terminal, Palette } from 'lucide-react';
import type { NavigationItem } from '../layouts/AppLayout';
import { useLanguage } from '../contexts/LanguageContext';

interface SidebarProps {
  activeNav: NavigationItem;
  onNavigate: (nav: NavigationItem) => void;
}

export function Sidebar({ activeNav, onNavigate }: SidebarProps) {
  const { t } = useLanguage();
  
  const navItems = [
    { id: 'dashboard' as NavigationItem, label: t('sidebar.dashboard'), icon: LayoutDashboard },
    { id: 'workbench' as NavigationItem, label: t('sidebar.workbench'), icon: FlaskConical },
    { id: 'cli' as NavigationItem, label: 'CLI', icon: Terminal },
    { id: 'projects' as NavigationItem, label: t('sidebar.projects'), icon: FolderKanban },
    { id: 'brand-campaign' as NavigationItem, label: 'Brand Campaign', icon: Palette },
    { id: 'settings' as NavigationItem, label: t('sidebar.settings'), icon: Settings },
    { id: 'design-doc' as NavigationItem, label: t('sidebar.designDoc'), icon: FileText },
  ];

  return (
    <aside className="w-56 bg-[#0a0a0a] border-r border-white/5 flex flex-col shadow-2xl">
      <div className="p-4 border-b border-white/5">
        <a href="/" className="flex items-center gap-2.5 group">
          <div className="relative w-9 h-9 bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500 rounded-lg flex items-center justify-center shadow-xl shadow-yellow-400/40 group-hover:shadow-yellow-400/60 transition-shadow">
            <svg width="18" height="22" viewBox="0 0 18 22" fill="none">
              <path d="M10.5 0L0 12.5H7.5L6 22L18 9H10.5V0Z" fill="white" className="drop-shadow-lg"/>
            </svg>
          </div>
          <span className="text-xl font-black text-zinc-100 group-hover:text-yellow-400 tracking-tight transition-colors">RELAMPO</span>
        </a>
      </div>
      <nav className="flex-1 p-3">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                    isActive
                      ? 'bg-yellow-500/10 text-yellow-400 shadow-sm'
                      : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="p-3 border-t border-white/5">
        <button
          onClick={() => onNavigate('dashboard')}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-400 hover:bg-white/5 hover:text-zinc-200 transition-all"
        >
          <Home className="w-4 h-4" />
          <span className="text-sm">Back to Home</span>
        </button>
      </div>
    </aside>
  );
}