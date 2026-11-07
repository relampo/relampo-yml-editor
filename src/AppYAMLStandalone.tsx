import { GRPCSchemaProvider } from './contexts/GRPCSchemaContext';
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
          <GRPCSchemaProvider>
            <YAMLEditor />
          </GRPCSchemaProvider>
        </div>
        <MobileBlockOverlay />
      </YAMLProvider>
    </LanguageProvider>
  );
}
