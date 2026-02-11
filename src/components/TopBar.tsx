import { ChevronDown, Bell, User, Languages } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import type { Language } from '../i18n/translations';

interface TopBarProps {
  selectedProject: string;
  onProjectChange: (project: string) => void;
  selectedEnvironment: string;
  onEnvironmentChange: (env: string) => void;
}

export function TopBar({
  selectedProject,
  onProjectChange,
  selectedEnvironment,
  onEnvironmentChange,
}: TopBarProps) {
  const { language, setLanguage, t } = useLanguage();
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const projectRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  const projects = ['E-Commerce Load Test', 'API Gateway Performance', 'Mobile Backend Stress Test'];
  const languages: { code: Language; label: string; flag: string }[] = [
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'es', label: 'Español', flag: '🇪🇸' },
    { code: 'pt', label: 'Portugus', flag: '🇧🇷' },
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (projectRef.current && !projectRef.current.contains(event.target as Node)) {
        setShowProjectMenu(false);
      }
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setShowLangMenu(false);
      }
      if (userRef.current && !userRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentLanguage = languages.find(l => l.code === language);

  return (
    <header className="h-14 flex items-center justify-between px-6 bg-[#0a0a0a] border-b border-white/5 shadow-2xl">
      <div className="flex items-center gap-6">
        {/* Project Selector */}
        <div className="relative" ref={projectRef}>
          <button
            onClick={() => setShowProjectMenu(!showProjectMenu)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <span className="text-sm font-medium text-zinc-100">{selectedProject}</span>
            <ChevronDown className="w-4 h-4 text-zinc-500" />
          </button>
          {showProjectMenu && (
            <div className="absolute top-full mt-1 left-0 w-64 bg-[#111111] border border-white/10 rounded-lg shadow-2xl py-1 z-50">
              {projects.map((project) => (
                <button
                  key={project}
                  onClick={() => {
                    onProjectChange(project);
                    setShowProjectMenu(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                    project === selectedProject 
                      ? 'bg-yellow-500/10 text-yellow-400'
                      : 'text-zinc-300 hover:bg-white/5'
                  }`}
                >
                  {project}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Language Selector */}
        <div className="relative" ref={langRef}>
          <button
            onClick={() => setShowLangMenu(!showLangMenu)}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
          >
            <Languages className="w-4 h-4 text-zinc-400" />
            <span className="text-sm text-zinc-100">{currentLanguage?.flag} {currentLanguage?.label}</span>
            <ChevronDown className="w-4 h-4 text-zinc-500" />
          </button>
          {showLangMenu && (
            <div className="absolute top-full mt-1 left-0 w-44 bg-[#111111] border border-white/10 rounded-lg shadow-2xl py-1 z-50">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setLanguage(lang.code);
                    setShowLangMenu(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                    lang.code === language 
                      ? 'bg-yellow-500/10 text-yellow-400'
                      : 'text-zinc-300 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{lang.flag}</span>
                    <span>{lang.label}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-white/5 transition-colors group">
          <Bell className="w-4 h-4 text-zinc-400 group-hover:text-zinc-200 transition-colors" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-yellow-400 rounded-full shadow-sm" />
        </button>

        {/* User Menu */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <div className="w-7 h-7 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-lg shadow-yellow-400/30">
              <User className="w-4 h-4 text-black" />
            </div>
          </button>
          {showUserMenu && (
            <div className="absolute top-full mt-1 right-0 w-48 bg-[#111111] border border-white/10 rounded-lg shadow-2xl py-1 z-50">
              <div className="px-3 py-2 border-b border-white/10">
                <p className="text-sm text-zinc-100">{t('topBar.user')}</p>
                <p className="text-xs text-zinc-500">{t('topBar.team')}</p>
              </div>
              <button className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-white/5 transition-colors">
                {t('topBar.logout')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}