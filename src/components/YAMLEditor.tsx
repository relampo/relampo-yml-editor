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
  const [yamlCode, setYamlCode] = useState<string>('');
  const [yamlTree, setYamlTree] = useState<YAMLNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<YAMLNode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Inicializar árbol al montar
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

  // Sincronizar código a árbol
  const syncCodeToTree = (code: string) => {
    try {
      const tree = parseYAMLToTree(code);
      console.log('Parsed tree:', tree);
      setYamlTree(tree);
      setError(null);
    } catch (err) {
      console.error('Parse error:', err);
      setError(err instanceof Error ? err.message : 'Error parsing YAML');
      setYamlTree(null);
    }
  };

  // Sincronizar árbol a código
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
    setYamlContent(newCode); // Actualizar contexto
    syncCodeToTree(newCode);
  };

  const handleTreeChange = (newTree: YAMLNode) => {
    setYamlTree(newTree);
    syncTreeToCode(newTree);
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
    
    // Actualizar selectedNode si es el nodo que se modificó
    if (updatedSelectedNode) {
      setSelectedNode(updatedSelectedNode);
    }
    
    syncTreeToCode(updatedTree);
  };

  const handleUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setYamlCode(content);
        setYamlContent(content); // Actualizar contexto
        syncCodeToTree(content);
      };
      reader.readAsText(file);
    }
  };

  const handleSave = () => {
    localStorage.setItem('relampo-yaml-draft', yamlCode);
    localStorage.setItem('relampo-yaml-draft-timestamp', new Date().toISOString());
    alert(language === 'es' ? '✓ Cambios guardados' : '✓ Changes saved');
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

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] w-full overflow-hidden">
      {/* Header - Exact Converter Style */}
      <div className="bg-[#1a1a1a] border-b border-white/10 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#fde047] via-[#facc15] to-[#eab308] flex items-center justify-center" style={{ boxShadow: '0 14px 35px rgba(250, 204, 21, 0.40)' }}>
              <svg width="18" height="22" viewBox="0 0 18 22" fill="none" style={{ filter: 'drop-shadow(0 2px 6px rgba(0, 0, 0, 0.25))' }}>
                <path d="M10.5 0L0 12.5H7.5L6 22L18 9H10.5V0Z" fill="white"/>
              </svg>
            </div>
            <div>
              <h1 className="text-[20px] font-black text-white tracking-tight m-0">
                RELAMPO
              </h1>
              <p className="text-xs text-[#71717a] m-0">{language === 'es' ? 'Editor de YAML' : 'YAML Editor'}</p>
            </div>
          </div>
          
          {/* Right: Buttons + Language Toggle (Exact Converter Style) */}
          <div className="flex items-center gap-4">
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

      {/* Panel dividido: Editor/Árbol + Detalles */}
      <div className="flex flex-1 overflow-hidden min-h-0 min-w-0">
        {/* Panel Izquierdo: Código o Árbol */}
        <div className="w-1/2 min-w-0 border-r border-white/5 flex flex-col">
          {/* Toggle Code/Tree */}
          <div className="flex items-center border-b border-white/5 bg-[#111111] flex-shrink-0">
            <button
              onClick={() => setViewMode('code')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                viewMode === 'code'
                  ? 'text-yellow-400 bg-yellow-400/10 border-b-2 border-yellow-400'
                  : 'text-zinc-400 hover:text-zinc-300 hover:bg-white/5'
              }`}
            >
              <Code2 className="w-4 h-4" />
              {t('yamlEditor.codeView')}
            </button>
            <button
              onClick={() => setViewMode('tree')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                viewMode === 'tree'
                  ? 'text-yellow-400 bg-yellow-400/10 border-b-2 border-yellow-400'
                  : 'text-zinc-400 hover:text-zinc-300 hover:bg-white/5'
              }`}
            >
              <GitBranch className="w-4 h-4" />
              {t('yamlEditor.treeView')}
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden min-h-0">
            {viewMode === 'code' ? (
              <YAMLCodeEditor
                value={yamlCode}
                onChange={handleCodeChange}
              />
            ) : (
              <YAMLTreeView
                tree={yamlTree}
                selectedNode={selectedNode}
                onNodeSelect={setSelectedNode}
                onTreeChange={handleTreeChange}
              />
            )}
          </div>
        </div>

        {/* Panel Derecho: Detalles */}
        <div className="w-1/2 min-w-0 overflow-hidden">
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
  return `test:
  name: "Pulse Performance Test"
  description: "Test de rendimiento con Spark Scripts"
  version: "1.0"

variables:
  baseUrl: "https://api.example.com"
  email: "test@example.com"
  password: "secret123"

http_defaults:
  base_url: "https://api.example.com"
  follow_redirects: true
  timeout: 30s
  headers:
    User-Agent: "Pulse/1.0"
    Accept: "application/json"

scenarios:
  - name: "User Authentication Flow"
    load:
      type: constant
      users: 10
      duration: 5m
      ramp_up: 30s
    cookies:
      mode: auto
      persist_across_iterations: true
    steps:
      - group:
          name: "Login"
          steps:
            - request:
                name: "01 - Get Login Page"
                method: GET
                url: /login
                spark:
                  - when: before
                    script: |
                      vars.sessionStart = Date.now();
                      console.log("Starting session...");
                  - when: after
                    script: |
                      if (response.status !== 200) {
                        console.error("Login page failed!");
                      }
                extractors:
                  - type: regex
                    var: CSRF_TOKEN
                    pattern: "csrf_token=([a-f0-9]+)"
                    match_no: 1
                    default: "TOKEN_NOT_FOUND"
                assertions:
                  - type: status
                    value: 200
                  - type: response_time
                    max_ms: 2000
                think_time: "3s"

            - request:
                name: "02 - Submit Login"
                method: POST
                url: /api/auth/login
                headers:
                  Content-Type: "application/json"
                body: |
                  {"email":"{{email}}","password":"{{password}}","csrf":"{{CSRF_TOKEN}}"}
                spark:
                  - when: after
                    script: |
                      if (response.body.includes("Welcome")) {
                        console.log("Login successful!");
                        vars.isLoggedIn = true;
                      } else {
                        console.error("Login failed");
                      }
                assertions:
                  - type: status
                    value: 200
                  - type: contains
                    value: "Welcome"

      - think_time: 5s

      - loop: 3
        steps:
          - request:
              name: "03 - Browse Products"
              method: GET
              url: /api/products
              headers:
                Authorization: "Bearer {{AUTH_TOKEN}}"
              assertions:
                - type: status
                  value: 200
          - think_time: 2s
`;
}
