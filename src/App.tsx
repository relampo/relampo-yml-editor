import { useState } from 'react';
import { LanguageProvider } from './contexts/LanguageContext';
import { AppLayout } from './layouts/AppLayout';
import { Dashboard } from './components/Dashboard';
import { Workbench } from './components/Workbench';
import { Projects } from './components/Projects';
import { Settings } from './components/Settings';
import { DesignDoc } from './components/DesignDoc';
import { LandingPage } from './components/LandingPage';
import { CLI } from './components/CLI';
import { BrandCampaign } from './components/BrandCampaign';
import { YAMLEditorStandalone } from './components/YAMLEditorStandalone';
import { ErrorBoundary } from './components/ErrorBoundary';

export type View = 
  | 'landing'
  | 'dashboard' 
  | 'workbench' 
  | 'projects' 
  | 'cli'
  | 'settings' 
  | 'design-doc'
  | 'brand-campaign'
  | 'yaml-editor-standalone';

export default function App() {
  // Check if we're in standalone mode
  const isStandalone = window.location.hash === '#standalone-yaml-editor';
  
  const [currentView, setCurrentView] = useState<View>('landing');

  // If standalone mode, render only the YAML Editor
  if (isStandalone) {
    return (
      <ErrorBoundary>
        <LanguageProvider>
          <YAMLEditorStandalone />
        </LanguageProvider>
      </ErrorBoundary>
    );
  }

  const renderView = () => {
    switch (currentView) {
      case 'landing':
        return <LandingPage onEnter={() => setCurrentView('workbench')} />;
      case 'dashboard':
        return <Dashboard />;
      case 'workbench':
        return <Workbench />;
      case 'projects':
        return <Projects />;
      case 'cli':
        return <CLI onViewChange={setCurrentView} />;
      case 'settings':
        return <Settings />;
      case 'design-doc':
        return <DesignDoc />;
      case 'brand-campaign':
        return <BrandCampaign />;
      case 'yaml-editor-standalone':
        return <YAMLEditorStandalone />;
      default:
        return <Workbench />;
    }
  };

  return (
    <ErrorBoundary>
      <LanguageProvider>
        {(currentView === 'landing' || currentView === 'yaml-editor-standalone') ? (
          renderView()
        ) : (
          <AppLayout currentView={currentView} onViewChange={setCurrentView}>
            {renderView()}
          </AppLayout>
        )}
      </LanguageProvider>
    </ErrorBoundary>
  );
}