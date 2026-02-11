import { LanguageToggle } from "./LanguageToggle";
import { useLanguage } from "../contexts/LanguageContext";

export function LanguageToggleWithContext() {
  const { language, setLanguage } = useLanguage();
  
  return <LanguageToggle language={language} onLanguageChange={setLanguage} />;
}
