import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { translations } from '../i18n/translations';
import type { Language } from '../i18n/translations';

type TranslationBranch = string | readonly TranslationBranch[] | { readonly [key: string]: TranslationBranch };

function isTranslationBranch(value: TranslationBranch): value is { readonly [key: string]: TranslationBranch } {
  return typeof value === 'object' && !Array.isArray(value);
}

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  const t = useCallback(
    (key: string): string => {
      const keys = key.split('.');
      let value: TranslationBranch = translations[language];

      for (const k of keys) {
        if (isTranslationBranch(value)) {
          value = value[k];
        } else {
          return key; // Return key if translation not found
        }
      }

      return typeof value === 'string' ? value : key;
    },
    [language],
  );

  const value = useMemo(() => ({ language, setLanguage, t }), [language, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
