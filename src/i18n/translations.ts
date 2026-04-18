import { enTranslations } from './en';
import { esTranslations } from './es';

export type Language = 'en' | 'es';

export const translations = {
  en: enTranslations,
  es: esTranslations,
} as const;
