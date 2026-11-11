import { EmbeddedStudioWorkspace } from './components/EmbeddedStudioWorkspace';
import { CorrelatePage } from './components/correlate/CorrelatePage';
import { HTTPRecorderControlPage } from './components/recorder/HTTPRecorderControlPage';
import { HTTPRecorderPage } from './components/recorder/HTTPRecorderPage';
import { GRPCRecorderPage } from './components/grpc/GRPCRecorderPage';
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
            {window.parent !== window && new URLSearchParams(window.location.search).get('embedded') === '1' ? (
              <EmbeddedStudioWorkspace />
            ) : window.location.pathname.replace(/\/$/, '') === '/correlate' ? (
              <CorrelatePage />
            ) : window.location.pathname.replace(/\/$/, '') === '/recorder/grpc' ? (
              <GRPCRecorderPage />
            ) : window.location.pathname.replace(/\/$/, '') === '/recorder/http/control' ? (
              <HTTPRecorderControlPage />
            ) : window.location.pathname.replace(/\/$/, '') === '/recorder/http' ? (
              <HTTPRecorderPage />
            ) : (
              <YAMLEditor />
            )}
          </GRPCSchemaProvider>
        </div>
        {window.location.pathname.replace(/\/$/, '') !== '/recorder/http/control' && <MobileBlockOverlay />}
      </YAMLProvider>
    </LanguageProvider>
  );
}
