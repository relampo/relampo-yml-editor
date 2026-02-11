import type { ScriptNode } from '../types/script';
import { HttpRequestDetail } from './details/HttpRequestDetail';
import { RecordingView } from './details/RecordingView';
import { DebuggingView } from './details/DebuggingView';
import { GenerationView } from './details/GenerationView';
import { MonitoringView } from './details/MonitoringView';
import { FileText } from 'lucide-react';

type WorkbenchTab = 'recording' | 'scripting' | 'correlation' | 'debugging' | 'generation' | 'monitoring';

interface DetailPanelProps {
  selectedNode: ScriptNode | null;
  activeTab: WorkbenchTab;
}

export function DetailPanel({ selectedNode, activeTab }: DetailPanelProps) {
  // Show tab-specific views for certain tabs
  if (activeTab === 'recording') {
    return <RecordingView />;
  }

  if (activeTab === 'debugging') {
    return <DebuggingView selectedNode={selectedNode} />;
  }

  if (activeTab === 'generation') {
    return <GenerationView />;
  }

  if (activeTab === 'monitoring') {
    return <MonitoringView />;
  }

  if (activeTab === 'correlation') {
    return (
      <div className="flex-1 bg-[#0a0a0a] flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border border-yellow-400/30 rounded-2xl flex items-center justify-center">
            <div className="w-8 h-8 bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500 rounded-lg shadow-lg shadow-yellow-400/40" />
          </div>
          <h3 className="text-zinc-100 mb-3 font-semibold tracking-tight">Correlation AI</h3>
          <p className="text-sm text-zinc-400 leading-relaxed">
            AI-powered correlation detection to automatically identify dynamic values
            that need to be extracted and correlated across requests.
          </p>
        </div>
      </div>
    );
  }

  // Default: Show node-specific detail views
  if (!selectedNode) {
    return (
      <div className="flex-1 bg-[#0a0a0a] flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-6 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center">
            <FileText className="w-8 h-8 text-zinc-600" />
          </div>
          <p className="text-sm font-medium text-zinc-400">Select a node from the Script Tree to view details</p>
        </div>
      </div>
    );
  }

  const renderDetailView = () => {
    switch (selectedNode.type) {
      case 'http-request':
        return <HttpRequestDetail node={selectedNode} />;
      default:
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-zinc-400">
              <p className="text-sm">{selectedNode.name}</p>
              <p className="text-xs mt-1 text-zinc-600">Type: {selectedNode.type}</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex-1 bg-[#0a0a0a] overflow-hidden min-w-0">
      {renderDetailView()}
    </div>
  );
}