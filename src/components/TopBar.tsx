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
      {/* Left: Brand */}
      <div className="flex items-center gap-3">
        {/* Relampo Logo */}
        <div className="relative w-8 h-8 bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500 rounded-lg flex items-center justify-center shadow-lg shadow-yellow-400/30">
          <svg width="14" height="18" viewBox="0 0 18 22" fill="none">
            <path d="M10.5 0L0 12.5H7.5L6 22L18 9H10.5V0Z" fill="white" className="drop-shadow-lg"/>
          </svg>
        </div>
        <div>
          <h1 className="text-base font-black text-zinc-100 tracking-tight">
            RELAMPO
          </h1>
          <p className="text-[10px] text-zinc-500 -mt-0.5">{language === 'es' ? 'Editor de YAML' : 'YAML Editor'}</p>
        </div>
      </div>

      {/* Right: Language Toggle */}
      <div className="flex items-center gap-2">
        <span className={`text-sm font-medium transition-colors ${
          language === 'en' ? 'text-yellow-400' : 'text-zinc-500'
        }`}>EN</span>
        <button
          onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}
          className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-[#0a0a0a] bg-zinc-700 hover:bg-zinc-600"
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-yellow-400 transition-transform ${
              language === 'es' ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <span className={`text-sm font-medium transition-colors ${
          language === 'es' ? 'text-yellow-400' : 'text-zinc-500'
        }`}>ES</span>
      </div>
    </header>
  );
}