import { useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { ScriptTree } from './ScriptTree';
import { DetailPanel } from './DetailPanel';
import { RenameDialog } from './RenameDialog';
import { Circle, FileText, Sparkles, Bug, Zap, Activity } from 'lucide-react';
import type { ScriptNode } from '../types/script';
import { mockScriptTree } from '../data/mockScriptTree';
import type { AddableNodeType } from './ContextMenu';
import { useLanguage } from '../contexts/LanguageContext';

type WorkbenchTab = 'recording' | 'scripting' | 'correlation' | 'debugging' | 'generation' | 'monitoring';

export function Workbench() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<WorkbenchTab>('scripting');
  const [selectedNode, setSelectedNode] = useState<ScriptNode | null>(null);
  const [scriptTree, setScriptTree] = useState<ScriptNode>(mockScriptTree);
  const [renamingNode, setRenamingNode] = useState<ScriptNode | null>(null);

  const tabs: Array<{ id: WorkbenchTab; label: string; icon: React.ReactNode }> = [
    { 
      id: 'recording', 
      label: t('workbench.recording'),
      icon: <Circle className="w-4 h-4" />
    },
    { 
      id: 'scripting', 
      label: t('workbench.scripting'),
      icon: <FileText className="w-4 h-4" />
    },
    { 
      id: 'correlation', 
      label: t('workbench.correlation'),
      icon: <Sparkles className="w-4 h-4" />
    },
    { 
      id: 'debugging', 
      label: t('workbench.debugging'),
      icon: <Bug className="w-4 h-4" />
    },
    { 
      id: 'generation', 
      label: t('workbench.generation'),
      icon: <Zap className="w-4 h-4" />
    },
    { 
      id: 'monitoring', 
      label: t('workbench.monitoring'),
      icon: <Activity className="w-4 h-4" />
    },
  ];

  const handleNodeSelect = (node: ScriptNode) => {
    setSelectedNode(node);
    // Auto-switch to scripting tab when a node is selected (unless already in a specific context)
    if (activeTab === 'recording' || activeTab === 'scripting') {
      setActiveTab('scripting');
    }
  };

  const handleNodeToggle = (nodeId: string) => {
    const toggleNode = (node: ScriptNode): ScriptNode => {
      if (node.id === nodeId) {
        return { ...node, expanded: !node.expanded };
      }
      if (node.children) {
        return {
          ...node,
          children: node.children.map(toggleNode),
        };
      }
      return node;
    };
    setScriptTree(toggleNode(scriptTree));
  };

  const handleNodeAdd = (parentId: string, nodeType: AddableNodeType) => {
    const generateNodeName = (type: AddableNodeType): string => {
      const nameMap: Record<AddableNodeType, string> = {
        'variables': 'Variables',
        'data-source': 'Data Source',
        'http-defaults': 'HTTP Defaults',
        'scenario': 'New Scenario',
        'metrics': 'Metrics',
        'cookie-manager': 'Cookie Manager',
        'cache-manager': 'Cache Manager',
        'load': 'Load Profile',
        'http-request': 'GET /new-request',
        'controller-group': 'Simple Controller',
        'controller-if': 'If Controller',
        'controller-loop': 'Loop Controller',
        'controller-retry': 'Retry Controller',
        'timer': 'Think Time',
        'extractor': 'Extractor',
        'assertion': 'Assertion',
      };
      return nameMap[type] || 'New Element';
    };

    const generateNodeData = (type: AddableNodeType): any => {
      switch (type) {
        case 'variables':
          return { variables: [] };
        case 'data-source':
          return { type: 'csv', path: '', variables: [] };
        case 'http-defaults':
          return {
            protocol: 'https',
            domain: '',
            port: 443,
            path: '',
            connectTimeout: 5000,
            responseTimeout: 30000,
            followRedirects: true,
            useKeepAlive: true,
            doMultipartPost: false,
            embeddedUrlRecode: false,
            useCookies: true,
            implementation: 'HttpClient4',
          };
        case 'cookie-manager':
          return { cookies: [] };
        case 'cache-manager':
          return { cache: [] };
        case 'load':
          return {
            virtualUsers: 10,
            duration: 60,
            rampUp: 10,
            iterationCount: 1,
            schedule: 'ramp-up',
          };
        case 'http-request':
          return {
            method: 'GET',
            url: '',
            headers: {},
          };
        case 'controller-loop':
          return { loopCount: 1 };
        case 'controller-if':
          return { condition: '' };
        case 'controller-retry':
          return { maxRetries: 3, retryDelay: 1000 };
        case 'timer':
          return { duration: 1000, variance: 200 };
        case 'extractor':
          return {
            extractorType: 'json',
            variableName: '',
            expression: '',
          };
        case 'assertion':
          return {
            assertionType: 'response-code',
            condition: 'equals',
            expected: '200',
          };
        case 'metrics':
          return {
            enabled: true,
            percentiles: [50, 90, 95, 99],
            exportFormat: 'csv',
          };
        default:
          return {};
      }
    };

    const newNode: ScriptNode = {
      id: `${nodeType}-${Date.now()}`,
      type: nodeType as any,
      name: generateNodeName(nodeType),
      expanded: false,
      children: [],
      data: generateNodeData(nodeType),
    };

    const addNodeToTree = (node: ScriptNode): ScriptNode => {
      if (node.id === parentId) {
        return {
          ...node,
          expanded: true,
          children: [...(node.children || []), newNode],
        };
      }
      if (node.children) {
        return {
          ...node,
          children: node.children.map(addNodeToTree),
        };
      }
      return node;
    };

    setScriptTree(addNodeToTree(scriptTree));
  };

  const handleNodeRename = (node: ScriptNode) => {
    setRenamingNode(node);
  };

  const handleRenameConfirm = (newName: string) => {
    const renameNode = (node: ScriptNode): ScriptNode => {
      if (node.id === renamingNode?.id) {
        return { ...node, name: newName };
      }
      if (node.children) {
        return {
          ...node,
          children: node.children.map(renameNode),
        };
      }
      return node;
    };
    setScriptTree(renameNode(scriptTree));
    setRenamingNode(null);
  };

  const handleRenameCancel = () => {
    setRenamingNode(null);
  };

  const handleNodeRemove = (nodeId: string) => {
    // If removing selected node, clear selection
    if (selectedNode?.id === nodeId) {
      setSelectedNode(null);
    }

    const removeNode = (node: ScriptNode): ScriptNode | null => {
      if (node.id === nodeId) {
        return null; // Mark for removal
      }
      if (node.children) {
        return {
          ...node,
          children: node.children.map(removeNode).filter((n): n is ScriptNode => n !== null),
        };
      }
      return node;
    };

    const updatedTree = removeNode(scriptTree);
    if (updatedTree) {
      setScriptTree(updatedTree);
    }
  };

  const handleNodeMove = (nodeId: string, targetId: string, position: 'before' | 'after' | 'inside') => {
    // Can't move onto itself
    if (nodeId === targetId) return;

    let movedNode: ScriptNode | null = null;

    // First, find and remove the node from its current location
    const findAndRemoveNode = (node: ScriptNode): ScriptNode | null => {
      if (node.id === nodeId) {
        movedNode = { ...node };
        return null; // Mark for removal
      }
      if (node.children) {
        return {
          ...node,
          children: node.children.map(findAndRemoveNode).filter((n): n is ScriptNode => n !== null),
        };
      }
      return node;
    };

    // Then, add the node to its new location based on position
    const addNodeToTarget = (node: ScriptNode): ScriptNode => {
      if (position === 'inside') {
        // Add as child of target (original behavior)
        if (node.id === targetId && movedNode) {
          return {
            ...node,
            expanded: true,
            children: [...(node.children || []), movedNode],
          };
        }
      } else {
        // Add as sibling (before or after target)
        if (node.children) {
          const targetIndex = node.children.findIndex(child => child.id === targetId);
          if (targetIndex !== -1 && movedNode) {
            const newChildren = [...node.children];
            const insertIndex = position === 'before' ? targetIndex : targetIndex + 1;
            newChildren.splice(insertIndex, 0, movedNode);
            return {
              ...node,
              children: newChildren,
            };
          }
        }
      }
      
      if (node.children) {
        return {
          ...node,
          children: node.children.map(addNodeToTarget),
        };
      }
      return node;
    };

    // Execute the move
    const treeWithoutNode = findAndRemoveNode(scriptTree);
    if (treeWithoutNode && movedNode) {
      const treeWithMovedNode = addNodeToTarget(treeWithoutNode);
      setScriptTree(treeWithMovedNode);
    }
  };

  return (
    <div className="h-full w-full bg-[#0a0a0a] flex flex-col overflow-hidden">
      {/* Workbench Tabs */}
      <div className="bg-[#111111] border-b border-white/5 flex-shrink-0">
        <div className="flex items-center px-8 gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                group flex items-center gap-2.5 px-5 py-4 text-sm font-medium relative 
                transition-all duration-200 ease-out
                ${activeTab === tab.id
                  ? 'text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-300'
                }
              `}
            >
              <div className={`transition-colors duration-200 ${
                activeTab === tab.id 
                  ? 'text-yellow-400' 
                  : 'text-zinc-600 group-hover:text-zinc-400'
              }`}>
                {tab.icon}
              </div>
              <span className="tracking-tight">{tab.label}</span>
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500 rounded-t-full shadow-lg shadow-yellow-400/30" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main Workbench Area - Split View */}
      <div className="flex flex-1 overflow-hidden min-h-0 min-w-0">
        {/* Script Tree Panel */}
        <DndProvider backend={HTML5Backend}>
          <ScriptTree
            tree={scriptTree}
            selectedNode={selectedNode}
            onNodeSelect={handleNodeSelect}
            onNodeToggle={handleNodeToggle}
            onNodeAdd={handleNodeAdd}
            onNodeRename={handleNodeRename}
            onNodeRemove={handleNodeRemove}
            onNodeMove={handleNodeMove}
          />
        </DndProvider>

        {/* Contextual Detail Panel */}
        <DetailPanel
          selectedNode={selectedNode}
          activeTab={activeTab}
        />
      </div>

      {/* Rename Dialog */}
      {renamingNode && (
        <RenameDialog
          node={renamingNode}
          onConfirm={handleRenameConfirm}
          onCancel={handleRenameCancel}
        />
      )}
    </div>
  );
}