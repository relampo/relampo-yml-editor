import { useState, ReactNode } from 'react';
import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';
import type { View } from '../App';

export type NavigationItem = 'dashboard' | 'workbench' | 'cli' | 'projects' | 'settings' | 'design-doc' | 'brand-campaign';

interface AppLayoutProps {
  children: ReactNode;
  currentView: View;
  onViewChange: (view: View) => void;
}

export function AppLayout({ children, currentView, onViewChange }: AppLayoutProps) {
  const [selectedProject, setSelectedProject] = useState('E-Commerce Load Test');
  const [selectedEnvironment, setSelectedEnvironment] = useState('staging');

  const handleNavigate = (nav: NavigationItem) => {
    onViewChange(nav);
  };

  return (
    <div className="h-screen w-screen bg-neutral-50 flex flex-col overflow-hidden">
      <TopBar
        selectedProject={selectedProject}
        onProjectChange={setSelectedProject}
        selectedEnvironment={selectedEnvironment}
        onEnvironmentChange={setSelectedEnvironment}
      />
      <div className="flex flex-1 overflow-hidden min-h-0 min-w-0">
        <Sidebar activeNav={currentView as NavigationItem} onNavigate={handleNavigate} />
        <main className="flex-1 overflow-hidden min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}