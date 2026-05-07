import { LanguageProvider } from './contexts/LanguageContext';
import { YAMLProvider } from './contexts/YAMLContext';
import { YAMLEditor } from './components/YAMLEditor';
import { MobileBlockOverlay } from './components/MobileBlockOverlay';

/**
 * 🔥 Relampo YAML Editor - Standalone Version
 */
export default function AppYAMLStandalone() {
  return (
    <LanguageProvider>
      <YAMLProvider>
        <div className="h-screen w-screen overflow-hidden bg-[#0a0a0a]">
          <YAMLEditor />
        </div>
        <MobileBlockOverlay />
      </YAMLProvider>
    </LanguageProvider>
  );
}
