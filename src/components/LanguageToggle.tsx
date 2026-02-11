import { motion } from "motion/react";
import { Language } from "../i18n/translations";

interface LanguageToggleProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
}

export function LanguageToggle({ language, onLanguageChange }: LanguageToggleProps) {
  return (
    <div className="relative inline-flex items-center gap-1 rounded-full bg-white/5 p-1 border border-white/10 mr-4">
      {/* Background slider */}
      <motion.div
        className="absolute h-[calc(100%-8px)] w-[calc(50%-4px)] rounded-full bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500"
        initial={false}
        animate={{
          x: language === 'en' ? 4 : 'calc(100% + 4px)',
        }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 30,
        }}
      />
      
      {/* EN Button */}
      <button
        onClick={() => onLanguageChange('en')}
        className={`relative z-10 px-3 py-1.5 text-sm font-semibold transition-colors duration-200 ${
          language === 'en' ? 'text-black' : 'text-zinc-400 hover:text-zinc-300'
        }`}
        aria-label="Switch to English"
      >
        EN
      </button>
      
      {/* ES Button */}
      <button
        onClick={() => onLanguageChange('es')}
        className={`relative z-10 px-3 py-1.5 text-sm font-semibold transition-colors duration-200 ${
          language === 'es' ? 'text-black' : 'text-zinc-400 hover:text-zinc-300'
        }`}
        aria-label="Cambiar a Español"
      >
        ES
      </button>
    </div>
  );
}
