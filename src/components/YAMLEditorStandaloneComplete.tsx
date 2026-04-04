import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Upload, Download, Code2, GitBranch } from 'lucide-react';
import { YAMLCodeEditor } from './YAMLCodeEditor';
import { YAMLTreeView } from './YAMLTreeView';
import { YAMLNodeDetails } from './YAMLNodeDetails';
import { parseYAMLToTree, treeToYAML } from '../utils/yamlParser';
import type { YAMLNode } from '../types/yaml';
import { useLanguage } from '../contexts/LanguageContext';

type ViewMode = 'code' | 'tree';

export function YAMLEditorStandaloneComplete() {
  const { language, setLanguage } = useLanguage();
  const [yamlCode, setYamlCode] = useState<string>('');
  const [yamlTree, setYamlTree] = useState<YAMLNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<YAMLNode | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const parseDebounceRef = useRef<number | null>(null);
  const serializeDebounceRef = useRef<number | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [leftPanelWidth, setLeftPanelWidth] = useState(50); // Porcentaje
  const [isResizing, setIsResizing] = useState(false);

  // Inicializar árbol al montar
  useEffect(() => {
    if (!isInitialized) {
      const defaultYaml = getDefaultYAML();
      setYamlCode(defaultYaml);
      syncCodeToTree(defaultYaml);
      setIsInitialized(true);
    }
  }, [isInitialized, syncCodeToTree]);

  // Helper to find a node by ID in the tree
  const findNodeById = useCallback((node: YAMLNode, id: string): YAMLNode | null => {
    if (node.id === id) return node;
    if (node.children) {
      for (const child of node.children) {
        const found = findNodeById(child, id);
        if (found) return found;
      }
    }
    return null;
  }, []);

  const syncSelectionWithTree = useCallback((tree: YAMLNode | null) => {
    if (!tree) {
      setSelectedNode(null);
      setSelectedNodeIds([]);
      return;
    }

    const survivingIds = selectedNodeIds.filter((id) => findNodeById(tree, id));
    setSelectedNodeIds(survivingIds);

    if (selectedNode && survivingIds.includes(selectedNode.id)) {
      const freshNode = findNodeById(tree, selectedNode.id);
      setSelectedNode(freshNode ?? null);
      return;
    }

    if (survivingIds.length > 0) {
      const nextPrimary = findNodeById(tree, survivingIds[survivingIds.length - 1]);
      setSelectedNode(nextPrimary ?? null);
      return;
    }

    setSelectedNode(null);
  }, [selectedNodeIds, selectedNode, findNodeById]);

  // Sincronizar código a árbol
  const syncCodeToTree = useCallback((code: string) => {
    try {
      const tree = parseYAMLToTree(code);
      setYamlTree(tree);
      syncSelectionWithTree(tree);

      setError(null);
    } catch (err) {
      console.error('Parse error:', err);
      setError(err instanceof Error ? err.message : 'Error parsing YAML');
      setYamlTree(null);
    }
  }, [syncSelectionWithTree]);

  // Sincronizar árbol a código
  const syncTreeToCode = (tree: YAMLNode) => {
    try {
      const code = treeToYAML(tree);
      setYamlCode(code);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error generating YAML');
    }
  };

  const handleCodeChange = (newCode: string) => {
    setYamlCode(newCode);
    if (parseDebounceRef.current) {
      window.clearTimeout(parseDebounceRef.current);
    }
    parseDebounceRef.current = window.setTimeout(() => {
      syncCodeToTree(newCode);
    }, 350);
  };

  const handleTreeChange = (newTree: YAMLNode) => {
    setYamlTree(newTree);
    syncSelectionWithTree(newTree);
    syncTreeToCode(newTree);
  };

  const handleSelectionChange = (primaryNode: YAMLNode | null, nodeIds: string[]) => {
    setSelectedNode(primaryNode);
    setSelectedNodeIds(nodeIds);
  };

  const handleNodeUpdate = (nodeId: string, updatedData: any) => {
    if (!yamlTree) return;

    let updatedSelectedNode: YAMLNode | null = null;

    const updateNodeInTree = (node: YAMLNode): YAMLNode => {
      if (node.id === nodeId) {
        // Extraer el nombre si viene en __name
        const newName = updatedData.__name;
        const cleanData = { ...updatedData };
        delete cleanData.__name;

        const updated = {
          ...node,
          name: newName !== undefined ? newName : node.name,
          data: cleanData
        };
        if (selectedNode?.id === nodeId) {
          updatedSelectedNode = updated;
        }
        return updated;
      }
      if (node.children) {
        return {
          ...node,
          children: node.children.map(updateNodeInTree),
        };
      }
      return node;
    };

    const updatedTree = updateNodeInTree(yamlTree);
    setYamlTree(updatedTree);

    if (updatedSelectedNode) {
      setSelectedNode(updatedSelectedNode);
    }

    if (serializeDebounceRef.current) {
      window.clearTimeout(serializeDebounceRef.current);
    }
    serializeDebounceRef.current = window.setTimeout(() => {
      syncTreeToCode(updatedTree);
    }, 220);
  };

  const handleUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (parseDebounceRef.current) {
        window.clearTimeout(parseDebounceRef.current);
      }
      if (serializeDebounceRef.current) {
        window.clearTimeout(serializeDebounceRef.current);
      }

      // Limpiar estado anterior para evitar referencias stale al cambiar de script
      setError(null);
      setSelectedNode(null);
      setYamlTree(null);

      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setYamlCode(content);
        syncCodeToTree(content);
        e.target.value = '';
      };
      reader.onerror = () => {
        setError('Error reading uploaded file');
      };
      reader.readAsText(file);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([yamlCode], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'relampo-script.yaml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  // Effect para manejar mouse move y mouse up global durante resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const containerWidth = window.innerWidth;
      const newWidth = (e.clientX / containerWidth) * 100;

      // Limitar entre 20% y 80%
      const clampedWidth = Math.min(Math.max(newWidth, 20), 80);
      setLeftPanelWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
      }
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isResizing]);

  useEffect(() => {
    return () => {
      if (parseDebounceRef.current) {
        window.clearTimeout(parseDebounceRef.current);
      }
      if (serializeDebounceRef.current) {
        window.clearTimeout(serializeDebounceRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0a] w-full overflow-hidden">
      {/* Header con Logo de Relampo */}
      <div className="bg-[#111111] border-b border-white/5 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Relampo Logo */}
            <div className="relative w-10 h-10 bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500 rounded-xl flex items-center justify-center shadow-xl shadow-yellow-400/40">
              <svg width="18" height="22" viewBox="0 0 18 22" fill="none">
                <path d="M10.5 0L0 12.5H7.5L6 22L18 9H10.5V0Z" fill="white" className="drop-shadow-lg" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-black text-zinc-100 tracking-tight">
                RELAMPO
              </h1>
              <p className="text-xs text-zinc-500">{language === 'es' ? 'Editor de YAML' : 'YAML Editor'}</p>
            </div>
          </div>

          {/* Language Toggle */}
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium transition-colors ${language === 'en' ? 'text-yellow-400' : 'text-zinc-500'
              }`}>EN</span>
            <button
              onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}
              className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-[#111111] bg-zinc-700 hover:bg-zinc-600"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-yellow-400 transition-transform ${language === 'es' ? 'translate-x-6' : 'translate-x-1'
                  }`}
              />
            </button>
            <span className={`text-sm font-medium transition-colors ${language === 'es' ? 'text-yellow-400' : 'text-zinc-500'
              }`}>ES</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleUpload}
              variant="outline"
              size="sm"
              className="border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-zinc-100"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload YAML
            </Button>

            <Button
              onClick={handleDownload}
              variant="outline"
              size="sm"
              className="border-yellow-400/20 bg-yellow-400/5 hover:bg-yellow-400/10 text-yellow-400 hover:text-yellow-300"
            >
              <Download className="w-4 h-4 mr-2" />
              Download YAML
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".yaml,.yml"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="px-6 py-3 bg-red-500/10 border-b border-red-500/20 flex-shrink-0">
          <p className="text-sm text-red-400">⚠️ {error}</p>
        </div>
      )}

      {/* Panel dividido: Editor/Árbol + Detalles */}
      <div className="flex flex-1 overflow-hidden min-h-0 min-w-0">
        {/* Panel Izquierdo: Código o Árbol */}
        <div className="min-w-0 flex flex-col" style={{ width: `${leftPanelWidth}%` }}>
          {/* Toggle Code/Tree */}
          <div className="flex items-center border-b border-white/5 bg-[#111111] flex-shrink-0">
            <button
              onClick={() => setViewMode('code')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${viewMode === 'code'
                ? 'text-yellow-400 bg-yellow-400/10 border-b-2 border-yellow-400'
                : 'text-zinc-400 hover:text-zinc-300 hover:bg-white/5'
                }`}
            >
              <Code2 className="w-4 h-4" />
              Code
            </button>
            <button
              onClick={() => setViewMode('tree')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${viewMode === 'tree'
                ? 'text-yellow-400 bg-yellow-400/10 border-b-2 border-yellow-400'
                : 'text-zinc-400 hover:text-zinc-300 hover:bg-white/5'
                }`}
            >
              <GitBranch className="w-4 h-4" />
              Tree
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden min-h-0">
            {viewMode === 'code' ? (
              <YAMLCodeEditor
                value={yamlCode}
                onChange={handleCodeChange}
                readOnly={true}
                active={viewMode === 'code'}
              />
            ) : (
              <YAMLTreeView
                tree={yamlTree}
                selectedNode={selectedNode}
                selectedNodeIds={selectedNodeIds}
                onSelectionChange={handleSelectionChange}
                onTreeChange={handleTreeChange}
              />
            )}
          </div>
        </div>

        {/* Resize Handle */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize panel"
          tabIndex={0}
          onMouseDown={handleResizeStart}
          className="w-2 bg-white/5 hover:bg-yellow-400/30 cursor-col-resize flex-shrink-0 transition-colors relative active:bg-yellow-400/40"
        />

        {/* Panel Derecho: Detalles */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <YAMLNodeDetails
            node={selectedNode}
            onNodeUpdate={handleNodeUpdate}
          />
        </div>
      </div>
    </div>
  );
}

function getDefaultYAML(): string {
  return "";
}
