import { useState, useRef, useEffect } from 'react';
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
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const fileInputRef = useRef<HTMLInputElement>(null);
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
  }, [isInitialized]);

  // Sincronizar código a árbol
  const syncCodeToTree = (code: string) => {
    try {
      const tree = parseYAMLToTree(code);
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
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error generating YAML');
    }
  };

  const handleCodeChange = (newCode: string) => {
    setYamlCode(newCode);
    syncCodeToTree(newCode);
  };

  const handleTreeChange = (newTree: YAMLNode) => {
    setYamlTree(newTree);
    syncTreeToCode(newTree);
  };

  const handleNodeUpdate = (nodeId: string, updatedData: any) => {
    if (!yamlTree) return;
    
    const updateNodeInTree = (node: YAMLNode): YAMLNode => {
      if (node.id === nodeId) {
        // Extraer el nombre si viene en __name
        const newName = updatedData.__name;
        const cleanData = { ...updatedData };
        delete cleanData.__name;
        
        return { 
          ...node, 
          name: newName !== undefined ? newName : node.name,
          data: cleanData 
        };
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
        syncCodeToTree(content);
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

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0a] w-full overflow-hidden">
      {/* Header con Logo de Relampo */}
      <div className="bg-[#111111] border-b border-white/5 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Relampo Logo */}
            <div className="relative w-10 h-10 bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500 rounded-xl flex items-center justify-center shadow-xl shadow-yellow-400/40">
              <svg width="18" height="22" viewBox="0 0 18 22" fill="none">
                <path d="M10.5 0L0 12.5H7.5L6 22L18 9H10.5V0Z" fill="white" className="drop-shadow-lg"/>
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
            <span className={`text-sm font-medium transition-colors ${
              language === 'en' ? 'text-yellow-400' : 'text-zinc-500'
            }`}>EN</span>
            <button
              onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}
              className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-[#111111] bg-zinc-700 hover:bg-zinc-600"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-yellow-400 transition-transform ${
                  language === 'es' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-sm font-medium transition-colors ${
              language === 'es' ? 'text-yellow-400' : 'text-zinc-500'
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
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                viewMode === 'code'
                  ? 'text-yellow-400 bg-yellow-400/10 border-b-2 border-yellow-400'
                  : 'text-zinc-400 hover:text-zinc-300 hover:bg-white/5'
              }`}
            >
              <Code2 className="w-4 h-4" />
              Code
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
              Tree
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

        {/* Resize Handle */}
        <div
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
  return `# ============================================================================
# RELAMPO YAML - AUTO-GENERATED FROM RECORDING
# ============================================================================
# Recorded: 2024-01-24 10:35:22 UTC
# Recording duration: 15 seconds
# Total requests captured: 4
# Configuration: capture_response = true
# ============================================================================

test:
  name: "Recording from shop.example.com - 2024-01-24 10:35:22"
  description: ""
  version: "1.0"
  recorded_at: "2024-01-24T10:35:22Z"
  recorded_from: "https://shop.example.com"

http_defaults:
  base_url: "https://shop.example.com"
  follow_redirects: true
  headers:
    User-Agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    Accept-Language: "es-ES,es;q=0.9,en;q=0.8"

scenarios:
  - name: "Recorded Scenario"
    load:
      type: constant
      users: 1
      duration: 1m
      ramp_up: 1s
      iterations: 1
    cookies:
      mode: auto
    steps:
      # =====================================================
      # Request 1: POST - Login (generates token)
      # =====================================================
      - request:
          method: POST
          url: /api/v1/auth/login
          headers:
            Accept: "application/json"
            Content-Type: "application/json"
            X-Requested-With: "XMLHttpRequest"
          body:
            email: "usuario@example.com"
            password: "***MASKED***"
            remember_me: true
          recorded_at: "2024-01-24T10:35:22.145Z"
          response:
            status: 200
            headers:
              Content-Type: "application/json"
              Set-Cookie: "session_id=abc123def456; Path=/; HttpOnly; Secure"
              X-Response-Time: "189ms"
            body:
              success: true
              token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
              user:
                id: 42
                email: "usuario@example.com"
                name: "Juan Pérez"
              expires_in: 3600
            time_ms: 189

      # =====================================================
      # Request 2: GET - Get profile (uses token, returns accountKey)
      # =====================================================
      - request:
          method: GET
          url: /api/v1/user/profile
          headers:
            Accept: "application/json"
            Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
            X-Requested-With: "XMLHttpRequest"
          recorded_at: "2024-01-24T10:35:24.567Z"
          response:
            status: 200
            headers:
              Content-Type: "application/json"
              Cache-Control: "private, no-cache"
            body:
              user:
                id: 42
                email: "usuario@example.com"
                name: "Juan Pérez"
                accountKey: "acc_9x8y7z6w5v4u"
                avatar: "https://cdn.example.com/avatars/42.jpg"
                joined_at: "2023-05-15T10:30:00Z"
                tier: "premium"
                preferences:
                  language: "es"
                  currency: "USD"
                  notifications: true
            time_ms: 67

      # =====================================================
      # Request 3: GET - Get account settings (uses accountKey in path, returns regionId)
      # =====================================================
      - request:
          method: GET
          url: /api/v1/accounts/acc_9x8y7z6w5v4u/settings
          headers:
            Accept: "application/json"
            Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
            X-Requested-With: "XMLHttpRequest"
          recorded_at: "2024-01-24T10:35:26.890Z"
          response:
            status: 200
            headers:
              Content-Type: "application/json"
              Cache-Control: "private, max-age=300"
              ETag: "\\"settings-v42\\""
            body:
              accountKey: "acc_9x8y7z6w5v4u"
              regionId: "us-east-1"
              settings:
                notifications:
                  email: true
                  push: true
                  sms: false
                privacy:
                  profile_visible: true
                  activity_tracking: false
                billing:
                  auto_renew: true
                  payment_method: "credit_card"
              features:
                - "analytics"
                - "advanced_search"
                - "api_access"
            time_ms: 112

      # =====================================================
      # Request 4: POST - Create resource in region (uses regionId in body)
      # =====================================================
      - request:
          method: POST
          url: /api/v1/resources
          headers:
            Accept: "application/json"
            Content-Type: "application/json"
            Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
            X-Requested-With: "XMLHttpRequest"
          body:
            name: "My New Resource"
            type: "storage"
            regionId: "us-east-1"
            capacity: 100
            auto_scale: true
          recorded_at: "2024-01-24T10:35:30.234Z"
          response:
            status: 201
            headers:
              Content-Type: "application/json"
              Location: "/api/v1/resources/res_a1b2c3d4e5f6"
              X-Response-Time: "456ms"
            body:
              success: true
              resource:
                id: "res_a1b2c3d4e5f6"
                name: "My New Resource"
                type: "storage"
                regionId: "us-east-1"
                capacity: 100
                auto_scale: true
                status: "provisioning"
                created_at: "2024-01-24T10:35:30.234Z"
                estimated_ready_at: "2024-01-24T10:37:30.234Z"
            time_ms: 456
`;
}
