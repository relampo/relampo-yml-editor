import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Upload, Download, Save, Code2, GitBranch } from 'lucide-react';
import { YAMLCodeEditor } from './YAMLCodeEditor';
import { YAMLTreeView } from './YAMLTreeView';
import { YAMLNodeDetails } from './YAMLNodeDetails';
import { parseYAMLToTree, treeToYAML } from '../utils/yamlParser';
import type { YAMLNode } from '../types/yaml';
import { useLanguage } from '../contexts/LanguageContext';
import { useYAML } from '../contexts/YAMLContext';

type ViewMode = 'code' | 'tree';

export function YAMLEditor() {
  const { language, setLanguage, t } = useLanguage();
  const { yamlContent, setYamlContent } = useYAML();
  const [leftPanelWidth, setLeftPanelWidth] = useState(30); // Tree/Code (Default 30%)
  const [isResizing, setIsResizing] = useState(false);

  const [yamlCode, setYamlCode] = useState<string>('');
  const [yamlTree, setYamlTree] = useState<YAMLNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<YAMLNode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'tree' | 'code'>('tree');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const parseDebounceRef = useRef<number | null>(null);
  const serializeDebounceRef = useRef<number | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentFileName, setCurrentFileName] = useState('relampo-script.yaml');
  const [isDirty, setIsDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string>('');
  const actionMessageTimeoutRef = useRef<number | null>(null);

  const showActionMessage = (message: string) => {
    setActionMessage(message);
    if (actionMessageTimeoutRef.current) {
      window.clearTimeout(actionMessageTimeoutRef.current);
    }
    actionMessageTimeoutRef.current = window.setTimeout(() => {
      setActionMessage('');
    }, 1800);
  };

  const normalizeYamlFileName = (name: string) => {
    const trimmed = (name || '').trim();
    if (!trimmed) return 'relampo-script.yaml';
    return /\.(ya?ml)$/i.test(trimmed) ? trimmed : `${trimmed}.yaml`;
  };

  // Initialize tree on mount
  useEffect(() => {
    if (!isInitialized) {
      const defaultYaml = yamlContent || getDefaultYAML();
      setYamlCode(defaultYaml);
      setYamlContent(defaultYaml);
      syncCodeToTree(defaultYaml);
      setIsInitialized(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle Resize Logic
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const containerWidth = window.innerWidth;
      const mouseXPercentage = (e.clientX / containerWidth) * 100;

      // Limit Left panel between 20% and 60%
      const newWidth = Math.min(Math.max(mouseXPercentage, 20), 60);
      setLeftPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing]);

  // Helper to find a node by ID in the tree
  const findNodeById = (node: YAMLNode, id: string): YAMLNode | null => {
    if (node.id === id) return node;
    if (node.children) {
      for (const child of node.children) {
        const found = findNodeById(child, id);
        if (found) return found;
      }
    }
    return null;
  };

  // Synchronize code to tree
  const syncCodeToTree = (code: string) => {
    try {
      const tree = parseYAMLToTree(code);
      console.log('Parsed tree:', tree);
      setYamlTree(tree);

      // Update selectedNode if it exists in the new tree to keep UI in sync
      if (selectedNode && tree) {
        const freshNode = findNodeById(tree, selectedNode.id);
        setSelectedNode(freshNode ?? null);
      }

      setError(null);
    } catch (err) {
      console.error('Parse error:', err);
      setError(err instanceof Error ? err.message : 'Error parsing YAML');
      setYamlTree(null);
    }
  };

  // Synchronize tree to code
  const syncTreeToCode = (tree: YAMLNode) => {
    try {
      const code = treeToYAML(tree);
      setYamlCode(code);
      setYamlContent(code); // Actualizar contexto
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error generating YAML');
    }
  };

  const handleCodeChange = (newCode: string) => {
    setYamlCode(newCode);
    setYamlContent(newCode); // Update context
    if (isInitialized) {
      setIsDirty(true);
    }
    if (parseDebounceRef.current) {
      window.clearTimeout(parseDebounceRef.current);
    }
    parseDebounceRef.current = window.setTimeout(() => {
      syncCodeToTree(newCode);
    }, 350);
  };

  useEffect(() => {
    return () => {
      if (parseDebounceRef.current) {
        window.clearTimeout(parseDebounceRef.current);
      }
      if (serializeDebounceRef.current) {
        window.clearTimeout(serializeDebounceRef.current);
      }
      if (actionMessageTimeoutRef.current) {
        window.clearTimeout(actionMessageTimeoutRef.current);
      }
    };
  }, []);

  const handleTreeChange = (newTree: YAMLNode) => {
    setYamlTree(newTree);
    syncTreeToCode(newTree);
    setIsDirty(true);
  };

  const handleNodeUpdate = (nodeId: string, updatedData: any) => {
    if (!yamlTree) return;

    let updatedSelectedNode: YAMLNode | null = null;

    const updateNodeInTree = (node: YAMLNode): YAMLNode => {
      if (node.id === nodeId) {
        // Extract __name if present and apply it to node.name
        const { __name, ...cleanData } = updatedData || {};
        const updated = {
          ...node,
          name: __name !== undefined ? __name : node.name,
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
    setIsDirty(true);

    // Update selectedNode if it's the node that was modified
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

      // Reset current editor state to avoid stale node references from previous script
      setError(null);
      setSelectedNode(null);
      setYamlTree(null);

      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setYamlCode(content);
        setYamlContent(content); // Update context
        syncCodeToTree(content);
        setCurrentFileName(normalizeYamlFileName(file.name));
        setIsDirty(false);
        showActionMessage(language === 'es' ? 'Archivo cargado' : 'File loaded');
        // Allow uploading the same file again if needed
        e.target.value = '';
      };
      reader.onerror = () => {
        setError('Error reading uploaded file');
      };
      reader.readAsText(file);
    }
  };

  const handleSave = () => {
    const now = new Date();
    localStorage.setItem('relampo-yaml-draft', yamlCode);
    localStorage.setItem('relampo-yaml-draft-timestamp', now.toISOString());
    localStorage.setItem('relampo-yaml-draft-filename', currentFileName);
    setIsDirty(false);
    setLastSavedAt(now.toLocaleTimeString());
    showActionMessage(language === 'es' ? 'Cambios guardados' : 'Changes saved');
  };

  const handleDownload = () => {
    const blob = new Blob([yamlCode], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = normalizeYamlFileName(currentFileName);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showActionMessage(language === 'es' ? 'YAML descargado' : 'YAML downloaded');
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (e.shiftKey) {
          handleDownload();
          return;
        }
        handleSave();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [yamlCode, currentFileName, language]);

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] w-full overflow-hidden">
      {/* Header - Exact Converter Style */}
      <div className="bg-[#1a1a1a] border-b border-white/10 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#fde047] via-[#facc15] to-[#eab308] flex items-center justify-center" style={{ boxShadow: '0 14px 35px rgba(250, 204, 21, 0.40)' }}>
              <svg width="18" height="22" viewBox="0 0 18 22" fill="none" style={{ filter: 'drop-shadow(0 2px 6px rgba(0, 0, 0, 0.25))' }}>
                <path d="M10.5 0L0 12.5H7.5L6 22L18 9H10.5V0Z" fill="white" />
              </svg>
            </div>
            <div>
              <h1 className="text-[20px] font-black text-white tracking-tight m-0">
                RELAMPO
              </h1>
              <p className="text-xs text-zinc-400 font-medium tracking-wide m-0">
                {language === 'es' ? 'Editor de YAML' : 'YAML Editor'}
              </p>
            </div>
          </div>

          {/* Right: Buttons + Language Toggle (Exact Converter Style) */}
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2">
              <span
                className={`text-[11px] px-2 py-1 rounded border ${
                  isDirty
                    ? 'text-amber-300 border-amber-400/30 bg-amber-400/10'
                    : 'text-emerald-300 border-emerald-400/30 bg-emerald-400/10'
                }`}
              >
                {isDirty
                  ? (language === 'es' ? 'Sin guardar' : 'Unsaved')
                  : (language === 'es' ? 'Guardado' : 'Saved')}
              </span>
              {lastSavedAt && !isDirty && (
                <span className="text-[11px] text-zinc-500">
                  {language === 'es' ? 'Último save:' : 'Last save:'} {lastSavedAt}
                </span>
              )}
              {actionMessage && (
                <span className="text-[11px] text-zinc-300">{actionMessage}</span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <Button
                onClick={handleUpload}
                variant="outline"
                size="sm"
                className="border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300"
              >
                <Upload className="w-4 h-4 mr-2" />
                {t('yamlEditor.uploadYaml')}
              </Button>

              <Button
                onClick={handleSave}
                variant="outline"
                size="sm"
                className="border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300"
              >
                <Save className="w-4 h-4 mr-2" />
                {language === 'es' ? 'Guardar' : 'Save'}
              </Button>

              <Button
                onClick={handleDownload}
                variant="outline"
                size="sm"
                className="border-yellow-400/20 bg-yellow-400/5 hover:bg-yellow-400/10 text-yellow-400"
              >
                <Download className="w-4 h-4 mr-2" />
                {t('yamlEditor.downloadYaml')}
              </Button>
            </div>

            {/* Language Toggle - EXACT COPY from Converter */}
            <div className="lang-toggle" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="lang-label" style={{ fontSize: '12px', fontWeight: '600', color: language === 'en' ? '#facc15' : '#a3a3a3', transition: 'color 0.3s ease' }}>EN</span>
              <label className="toggle-switch" style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  id="langToggle"
                  checked={language === 'es'}
                  onChange={() => setLanguage(language === 'en' ? 'es' : 'en')}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span className="toggle-slider" style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: '#1a1a1a',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '24px',
                  transition: 'all 0.3s ease'
                }}></span>
              </label>
              <span className="lang-label" style={{ fontSize: '12px', fontWeight: '600', color: language === 'es' ? '#facc15' : '#a3a3a3', transition: 'color 0.3s ease' }}>ES</span>
              <style>{`
                .toggle-slider:before {
                  position: absolute;
                  content: "";
                  height: 18px;
                  width: 18px;
                  left: 3px;
                  bottom: 2px;
                  background: linear-gradient(135deg, #fde047 0%, #facc15 45%, #eab308 100%);
                  border-radius: 50%;
                  transition: all 0.3s ease;
                  box-shadow: 0 2px 8px rgba(250, 204, 21, 0.4);
                }
                input:checked + .toggle-slider:before {
                  transform: translateX(20px);
                }
                .toggle-switch:hover .toggle-slider {
                  border-color: #facc15;
                }
              `}</style>
            </div>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".yaml,.yml"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Error message */}
      {error && (
        <div className="px-6 py-3 bg-red-500/10 border-b border-red-500/20 flex-shrink-0">
          <p className="text-sm text-red-400">⚠️ {error}</p>
        </div>
      )}

      {/* Main Resizable Layout: Toggled Code/Tree (Left) | Details (Right) */}
      <div className="flex flex-1 overflow-hidden min-h-0 min-w-0 bg-[#0a0a0a]">
        {/* Left Panel: Toggled Code/Tree */}
        <div
          className="min-w-0 flex flex-col bg-[#0a0a0a]"
          style={{ width: `${leftPanelWidth}%` }}
        >
          {/* Tabs */}
          <div className="flex items-center bg-[#111111] border-b border-white/5 flex-shrink-0">
            <button
              onClick={() => setViewMode('tree')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold transition-all duration-200 ${viewMode === 'tree'
                ? 'text-yellow-400 bg-yellow-400/10 border-b-2 border-yellow-400 shadow-[inset_0_-2px_0_rgba(250,204,21,0.5)]'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                }`}
            >
              <GitBranch className="w-4 h-4" />
              {language === 'es' ? 'Árbol' : 'Tree'}
            </button>
            <button
              onClick={() => setViewMode('code')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold transition-all duration-200 ${viewMode === 'code'
                ? 'text-yellow-400 bg-yellow-400/10 border-b-2 border-yellow-400 shadow-[inset_0_-2px_0_rgba(250,204,21,0.5)]'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                }`}
            >
              <Code2 className="w-4 h-4" />
              {language === 'es' ? 'Código' : 'Code'}
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden min-h-0 bg-[#0a0a0a]">
            {viewMode === 'tree' ? (
              <YAMLTreeView
                tree={yamlTree}
                selectedNode={selectedNode}
                onNodeSelect={setSelectedNode}
                onTreeChange={handleTreeChange}
              />
            ) : (
              <YAMLCodeEditor
                value={yamlCode}
                onChange={handleCodeChange}
                readOnly={true}
                active={viewMode === 'code'}
              />
            )}
          </div>
        </div>

        {/* Center Resize Handle */}
        <div
          onMouseDown={() => setIsResizing(true)}
          className="w-1 bg-white/5 hover:bg-yellow-400/40 flex-shrink-0 transition-colors relative active:bg-yellow-400/60 z-50 group"
          style={{ cursor: 'col-resize' }}
        >
          {/* Invisible larger hit area - 32px wide for very easy targeting */}
          <div className="absolute inset-y-0 -left-4 -right-4 z-50" style={{ cursor: 'col-resize' }} />
          {/* Visual line - clearly visible */}
          <div className="absolute inset-y-0 left-1/2 -ml-[1px] w-[2px] bg-white/20 group-hover:bg-yellow-400/80 transition-colors" />
        </div>

        {/* Right Panel: Details */}
        <div className="flex-1 min-w-0 flex flex-col bg-[#0d0d0d]">
          <div className="flex items-center border-b border-white/5 bg-[#111111] flex-shrink-0 px-6 py-3">
            <div className="flex items-center gap-2 text-zinc-400">
              <span className="text-sm font-bold tracking-tight uppercase">{language === 'es' ? 'Detalles del elemento' : 'Element details'}</span>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <YAMLNodeDetails
              node={selectedNode}
              onNodeUpdate={handleNodeUpdate}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function getDefaultYAML(): string {
  return "";
}
