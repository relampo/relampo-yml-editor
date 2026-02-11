import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Play, Square, Download, CheckSquare, Square as SquareIcon, FileCode2 } from 'lucide-react';
import { RecordingSetup } from './RecordingSetup';
import { TrafficTimeline } from './TrafficTimeline';
import { useYAML } from '../contexts/YAMLContext';

export type RecordingStatus = 'idle' | 'recording' | 'paused' | 'stopped';

export interface RecordedRequest {
  id: string;
  timestamp: number;
  method: string;
  url: string;
  status: number;
  duration: number;
  size: number;
  group?: string;
  headers?: Record<string, string>;
  body?: string;
  response?: {
    status: number;
    headers: Record<string, string>;
    body: string;
  };
  // Propiedades adicionales para la tabla
  path?: string;
  deltaTime?: number;
  excluded?: boolean;
}

export function Recorder() {
  const { setYamlContent } = useYAML();
  const [status, setStatus] = useState<RecordingStatus>('idle');
  const [selectedRequest, setSelectedRequest] = useState<RecordedRequest | null>(null);
  const [includeResponses, setIncludeResponses] = useState(true); // Activado por defecto
  const [showExportModal, setShowExportModal] = useState(false);
  const [generatedYAML, setGeneratedYAML] = useState<string>(''); // Estado local para el YAML generado
  
  // Mock data - 5 requests simulando un flujo de e-commerce con datos realistas
  const [requests] = useState<RecordedRequest[]>([
    {
      id: '1',
      timestamp: Date.now() - 5000,
      deltaTime: 0,
      method: 'POST',
      url: 'https://shop.example.com/api/v1/auth/login',
      path: '/api/v1/auth/login',
      status: 200,
      duration: 189,
      size: 1456,
      group: '01_Authentication',
      headers: { 
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: '{"email":"usuario@example.com","password":"***MASKED***","remember_me":true}',
      response: {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Set-Cookie': 'session_id=abc123def456; Path=/; HttpOnly; Secure',
          'X-Response-Time': '189ms'
        },
        body: '{"success":true,"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...","user":{"id":42,"email":"usuario@example.com","name":"Juan Pérez"},"expires_in":3600}'
      }
    },
    {
      id: '2',
      timestamp: Date.now() - 4500,
      deltaTime: 500,
      method: 'GET',
      url: 'https://shop.example.com/api/v1/user/profile',
      path: '/api/v1/user/profile',
      status: 200,
      duration: 67,
      size: 2340,
      group: '02_Profile',
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      response: {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'private, no-cache'
        },
        body: '{"user":{"id":42,"email":"usuario@example.com","name":"Juan Pérez","accountKey":"acc_9x8y7z6w5v4u","avatar":"https://cdn.example.com/avatars/42.jpg","tier":"premium"}}'
      }
    },
    {
      id: '3',
      timestamp: Date.now() - 4000,
      deltaTime: 500,
      method: 'GET',
      url: 'https://shop.example.com/api/v1/products?category=electronics&page=1',
      path: '/api/v1/products',
      status: 200,
      duration: 234,
      size: 15678,
      group: '03_Browse',
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      response: {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'X-Total-Count': '42'
        },
        body: '{"products":[{"id":1,"name":"Laptop Pro","price":1299.99},{"id":2,"name":"Wireless Mouse","price":29.99}],"total":42,"page":1}'
      }
    },
    {
      id: '4',
      timestamp: Date.now() - 3000,
      deltaTime: 1000,
      method: 'POST',
      url: 'https://shop.example.com/api/v1/cart/items',
      path: '/api/v1/cart/items',
      status: 201,
      duration: 178,
      size: 892,
      group: '04_Cart',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: '{"product_id":1,"quantity":2}',
      response: {
        status: 201,
        headers: { 
          'Content-Type': 'application/json',
          'Location': '/api/v1/cart/items/123'
        },
        body: '{"success":true,"cart_item_id":123,"cart":{"total_items":2,"total_price":2599.98}}'
      }
    },
    {
      id: '5',
      timestamp: Date.now() - 2000,
      deltaTime: 1000,
      method: 'POST',
      url: 'https://shop.example.com/api/v1/orders',
      path: '/api/v1/orders',
      status: 201,
      duration: 456,
      size: 3421,
      group: '05_Checkout',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: '{"payment_method":"credit_card","shipping_address":"123 Main St, City, 12345"}',
      response: {
        status: 201,
        headers: { 
          'Content-Type': 'application/json',
          'Location': '/api/v1/orders/ord_xyz'
        },
        body: '{"success":true,"order_id":"ord_xyz","status":"confirmed","total":2599.98,"estimated_delivery":"2024-01-30"}'
      }
    }
  ]);

  const handleStartRecording = () => {
    setStatus('recording');
    // TODO: Implementar lógica de inicio de proxy
  };

  const handleStopRecording = () => {
    setStatus('stopped');
    // TODO: Implementar lógica de parada de proxy
  };

  const handleExportYAML = () => {
    const yamlContent = generateYAMLFromRequests(requests, includeResponses);
    setYamlContent(yamlContent);
    setGeneratedYAML(yamlContent);
    setShowExportModal(true);
  };

  const generateYAMLFromRequests = (reqs: RecordedRequest[], includeResp: boolean): string => {
    if (reqs.length === 0) return '';

    const now = new Date();
    const recordedAt = now.toISOString();
    
    // Extraer dominio del primer request
    let domain = 'example.com';
    let baseUrl = 'https://api.example.com';
    try {
      const firstUrl = new URL(reqs[0].url);
      domain = firstUrl.hostname;
      baseUrl = `${firstUrl.protocol}//${firstUrl.hostname}`;
    } catch (e) {
      // usar valores por defecto
    }

    // Detectar headers comunes a TODOS los requests (para http_defaults)
    const allHeaders = reqs
      .filter(r => r.headers)
      .map(r => r.headers!);
    
    const commonHeaders: Record<string, string> = {};
    if (allHeaders.length > 0) {
      const firstHeaders = allHeaders[0];
      Object.entries(firstHeaders).forEach(([key, value]) => {
        // Verificar si este header está en TODOS los requests con el mismo valor
        const isPresentInAll = allHeaders.every(h => h[key] === value);
        if (isPresentInAll && !['Authorization', 'Content-Type', 'Content-Length'].includes(key)) {
          commonHeaders[key] = value;
        }
      });
    }

    // Construir YAML según especificación
    let yaml = `# ============================================================================
# RELAMPO YAML - GENERADO AUTOMÁTICAMENTE DESDE GRABACIÓN
# ============================================================================
# Grabado: ${now.toISOString().replace('T', ' ').substring(0, 19)} UTC
# Total de requests capturados: ${reqs.length}
# Configuración: include_responses = ${includeResp}
# ============================================================================

relampo_version: "1.0"

test:
  name: "Recording from ${domain} - ${now.toISOString().substring(0, 19).replace('T', ' ')}"
  description: ""
  version: "1.0"
  recorded_at: "${recordedAt}"
  recorded_from: "${baseUrl}"

http_defaults:
  base_url: "${baseUrl}"
  follow_redirects: true
`;

    // Agregar headers comunes si existen
    if (Object.keys(commonHeaders).length > 0) {
      yaml += `  headers:\n`;
      Object.entries(commonHeaders).forEach(([key, value]) => {
        yaml += `    ${key}: "${value}"\n`;
      });
    }

    // Scenario básico
    yaml += `
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
`;

    // Generar steps para cada request
    reqs.forEach((req, idx) => {
      const pathname = req.path || new URL(req.url).pathname;
      const method = req.method;
      
      yaml += `      # =====================================================\n`;
      yaml += `      # Request ${idx + 1}: ${method} ${pathname}\n`;
      yaml += `      # =====================================================\n`;
      yaml += `      - request:\n`;
      yaml += `          method: ${method}\n`;
      yaml += `          url: ${pathname}\n`;
      
      // Headers específicos (excluir los que ya están en http_defaults)
      if (req.headers && Object.keys(req.headers).length > 0) {
        const specificHeaders = Object.entries(req.headers)
          .filter(([key]) => !commonHeaders[key]);
        
        if (specificHeaders.length > 0) {
          yaml += `          headers:\n`;
          specificHeaders.forEach(([key, value]) => {
            yaml += `            ${key}: "${value}"\n`;
          });
        }
      }
      
      // Body si existe
      if (req.body) {
        try {
          // Intentar parsear como JSON para formato bonito
          const bodyObj = JSON.parse(req.body);
          yaml += `          body:\n`;
          const bodyYaml = JSON.stringify(bodyObj, null, 2)
            .split('\n')
            .map(line => `            ${line}`)
            .join('\n');
          yaml += bodyYaml + '\n';
        } catch {
          // Si no es JSON, incluir como string
          yaml += `          body: |\n`;
          yaml += `            ${req.body.replace(/\n/g, '\n            ')}\n`;
        }
      }
      
      // Timestamp de grabación
      const requestTime = new Date(req.timestamp).toISOString();
      yaml += `          recorded_at: "${requestTime}"\n`;
      
      // Response si está habilitado
      if (includeResp && req.response) {
        yaml += `          response:\n`;
        yaml += `            status: ${req.response.status}\n`;
        
        if (req.response.headers && Object.keys(req.response.headers).length > 0) {
          yaml += `            headers:\n`;
          Object.entries(req.response.headers).forEach(([key, value]) => {
            yaml += `              ${key}: "${value}"\n`;
          });
        }
        
        if (req.response.body) {
          try {
            const respBody = JSON.parse(req.response.body);
            yaml += `            body:\n`;
            const respYaml = JSON.stringify(respBody, null, 2)
              .split('\n')
              .map(line => `              ${line}`)
              .join('\n');
            yaml += respYaml + '\n';
          } catch {
            yaml += `            body: |\n`;
            yaml += `              ${req.response.body.replace(/\n/g, '\n              ')}\n`;
          }
        }
        
        yaml += `            time_ms: ${req.duration}\n`;
      }
      
      yaml += `\n`;
    });

    return yaml;
  };

  const getStatusColor = () => {
    switch (status) {
      case 'recording':
        return 'bg-red-500/10 text-red-400 border-red-400/20';
      case 'paused':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-400/20';
      case 'stopped':
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-400/20';
      default:
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-400/20';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'idle':
        return 'Inactivo';
      case 'recording':
        return 'Grabando';
      case 'paused':
        return 'Pausado';
      case 'stopped':
        return 'Detenido';
      default:
        return 'Inactivo';
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      {/* Header con controles */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/5 bg-[#111111]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-5 bg-gradient-to-b from-yellow-300 via-yellow-400 to-yellow-500 rounded-full shadow-lg shadow-yellow-400/40" />
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">Grabación HTTP/S → Script YAML</h2>
              <p className="text-xs text-zinc-500 mt-0.5">Configurar, grabar y generar scripts YAML de Relampo</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Status indicator */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium ${getStatusColor()}`}>
            {status === 'recording' && (
              <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
            )}
            {getStatusText()}
          </div>

          {/* Include Responses Toggle */}
          <button
            onClick={() => setIncludeResponses(!includeResponses)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
              includeResponses
                ? 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20'
                : 'bg-zinc-500/5 text-zinc-400 border-zinc-500/20 hover:bg-zinc-500/10'
            }`}
          >
            {includeResponses ? (
              <CheckSquare className="w-3.5 h-3.5" />
            ) : (
              <SquareIcon className="w-3.5 h-3.5" />
            )}
            Incluir Responses
          </button>

          {/* Recording controls */}
          {status === 'idle' || status === 'stopped' ? (
            <Button
              onClick={handleStartRecording}
              size="sm"
              className="bg-yellow-400 hover:bg-yellow-500 text-zinc-900 font-medium"
            >
              <Play className="w-4 h-4 mr-2" />
              Iniciar Grabación
            </Button>
          ) : (
            <Button
              onClick={handleStopRecording}
              size="sm"
              variant="outline"
              className="border-red-400/20 bg-red-400/5 hover:bg-red-400/10 text-red-400"
            >
              <Square className="w-4 h-4 mr-2" />
              Detener Grabación
            </Button>
          )}

          {/* Export button */}
          <Button
            onClick={handleExportYAML}
            size="sm"
            variant="outline"
            className="border-yellow-400/20 bg-yellow-400/5 hover:bg-yellow-400/10 text-yellow-400"
            disabled={requests.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar a YAML
          </Button>
        </div>
      </div>

      {/* Layout de 2 columnas */}
      <div className="flex flex-1 overflow-hidden">
        {/* Columna izquierda: Recording Setup */}
        <div className="w-80 border-r border-white/5 bg-[#0a0a0a] overflow-y-auto">
          <RecordingSetup status={status} />
        </div>

        {/* Columna derecha: Traffic Timeline (expandida) */}
        <div className="flex-1 bg-[#0a0a0a] overflow-hidden flex flex-col">
          <TrafficTimeline
            requests={requests}
            selectedRequest={selectedRequest}
            onSelectRequest={setSelectedRequest}
            status={status}
          />
        </div>
      </div>

      {/* Modal de exportación */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#111111] border border-white/10 rounded-lg shadow-2xl w-[600px] max-w-[90vw] mx-4">
            <div className="p-6 border-b border-white/5">
              <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
                <FileCode2 className="w-5 h-5 text-yellow-400" />
                YAML Script Generado
              </h3>
              <p className="text-sm text-zinc-400 mt-1">
                {requests.length} requests capturados • {includeResponses ? 'Con' : 'Sin'} responses
              </p>
            </div>
            
            <div className="p-6">
              <div className="bg-[#0a0a0a] border border-white/10 rounded-lg p-4 max-h-[400px] overflow-auto">
                <pre className="text-xs text-zinc-300 font-mono">{generatedYAML}</pre>
              </div>
            </div>
            
            <div className="p-6 border-t border-white/5 flex gap-3">
              <Button
                onClick={() => setShowExportModal(false)}
                variant="outline"
                className="flex-1 border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300"
              >
                Cerrar
              </Button>
              <Button
                onClick={() => {
                  const blob = new Blob([generatedYAML], { type: 'text/yaml' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `relampo-recording-${Date.now()}.yaml`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
                variant="outline"
                className="flex-1 border-yellow-400/20 bg-yellow-400/5 hover:bg-yellow-400/10 text-yellow-400"
              >
                <Download className="w-4 h-4 mr-2" />
                Descargar archivo
              </Button>
              <Button
                onClick={() => {
                  setShowExportModal(false);
                  // El YAML ya está en el contexto, mostrar mensaje
                  alert('YAML cargado en el editor! Ve a la pestaña "YAML Editor" para verlo.');
                }}
                className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-black font-medium"
              >
                <FileCode2 className="w-4 h-4 mr-2" />
                Abrir en YAML Editor
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}