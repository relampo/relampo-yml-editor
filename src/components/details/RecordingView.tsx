import { useState } from 'react';
import { 
  Play, Square, Pause, Trash2, Flag, Download, Copy, Check, 
  X, AlertTriangle, CheckCircle2, Filter, Search, Pin, 
  ChevronDown, ChevronRight, Settings, Save, FileDown, Shield, Info
} from 'lucide-react';
import { CertificateStatus, type CertStatus } from '../CertificateStatus';
import { InstallCertModal, InstallInstructionsDrawer } from '../InstallCertModal';

type ProxyStatus = 'disconnected' | 'connected' | 'capturing' | 'stopping';
type RecordingState = 'idle' | 'recording' | 'paused';

interface CertificateData {
  status: CertStatus;
  trusted_os?: boolean;
  trusted_firefox?: boolean;
  expires_at?: string;
  fingerprint?: string;
}

interface CapturedRequest {
  id: number;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS';
  path: string;
  host: string;
  status: number;
  type: string;
  duration: number;
  size: string;
  timestamp: string;
  isPinned?: boolean;
  requestHeaders: Record<string, string>;
  requestBody?: string;
  responseHeaders: Record<string, string>;
  responseBody?: string;
  timing: {
    dns: number;
    connect: number;
    ssl: number;
    send: number;
    wait: number;
    receive: number;
  };
}

export function RecordingView() {
  // Proxy & Certificate State
  const [proxyStatus, setProxyStatus] = useState<ProxyStatus>('disconnected');
  const [port, setPort] = useState('8888');
  const [portCopied, setPortCopied] = useState(false);

  // Certificate State (mock data - simulate different states)
  const [certData, setCertData] = useState<CertificateData>({
    status: 'missing' // Start with missing certificate
  });
  const [isLoadingCert, setIsLoadingCert] = useState(false);

  // Modal State
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [showInstructionsDrawer, setShowInstructionsDrawer] = useState(false);
  const [installError, setInstallError] = useState<string | null>(null);

  // Recording State
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [showFilters, setShowFilters] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  // Capture Filters
  const [filterPreset, setFilterPreset] = useState<'full' | 'web' | 'api'>('full');
  const [excludeEmbedded, setExcludeEmbedded] = useState(false);
  const [excludeThirdParty, setExcludeThirdParty] = useState(false);
  const [ignoreOptions, setIgnoreOptions] = useState(true);
  const [dedupe, setDedupe] = useState(false);
  const [collapseRedirects, setCollapseRedirects] = useState(false);

  // Quick Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [hostFilter, setHostFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Inspector State
  const [selectedRequest, setSelectedRequest] = useState<CapturedRequest | null>(null);
  const [inspectorTab, setInspectorTab] = useState<'request' | 'response' | 'timing'>('request');

  // Mock Data
  const [capturedRequests] = useState<CapturedRequest[]>([
    {
      id: 1,
      method: 'GET',
      path: '/api/users',
      host: 'api.example.com',
      status: 200,
      type: 'application/json',
      duration: 145,
      size: '2.3 KB',
      timestamp: '14:23:12.456',
      requestHeaders: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json',
        'Authorization': '[REDACTED]'
      },
      responseHeaders: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      responseBody: '{"users": [{"id": 1, "name": "John Doe"}]}',
      timing: { dns: 5, connect: 12, ssl: 23, send: 2, wait: 98, receive: 5 }
    },
    {
      id: 2,
      method: 'POST',
      path: '/api/auth/login',
      host: 'api.example.com',
      status: 201,
      type: 'application/json',
      duration: 234,
      size: '512 B',
      timestamp: '14:23:13.102',
      requestHeaders: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      requestBody: '{"email": "user@example.com", "password": "[REDACTED]"}',
      responseHeaders: {
        'Content-Type': 'application/json',
        'Set-Cookie': '[REDACTED]'
      },
      responseBody: '{"token": "[REDACTED]", "user": {"id": 1}}',
      timing: { dns: 2, connect: 8, ssl: 18, send: 3, wait: 195, receive: 8 }
    },
    {
      id: 3,
      method: 'GET',
      path: '/styles/main.css',
      host: 'cdn.example.com',
      status: 200,
      type: 'text/css',
      duration: 67,
      size: '45.2 KB',
      timestamp: '14:23:13.289',
      requestHeaders: {
        'Accept': 'text/css'
      },
      responseHeaders: {
        'Content-Type': 'text/css',
        'Cache-Control': 'max-age=3600'
      },
      responseBody: '[Binary content not displayed]',
      timing: { dns: 1, connect: 5, ssl: 12, send: 1, wait: 42, receive: 6 }
    },
    {
      id: 4,
      method: 'GET',
      path: '/api/products',
      host: 'api.example.com',
      status: 500,
      type: 'application/json',
      duration: 523,
      size: '156 B',
      timestamp: '14:23:14.012',
      isPinned: true,
      requestHeaders: {
        'Accept': 'application/json'
      },
      responseHeaders: {
        'Content-Type': 'application/json'
      },
      responseBody: '{"error": "Internal Server Error"}',
      timing: { dns: 3, connect: 8, ssl: 15, send: 2, wait: 490, receive: 5 }
    }
  ]);

  // MOCK API CALLS (simulating backend agent)
  const mockGenerateCert = async () => {
    setIsLoadingCert(true);
    // Simulate API call: POST /cert/generate
    await new Promise(resolve => setTimeout(resolve, 1500));
    setCertData({
      status: 'needs_install',
      trusted_os: false,
      trusted_firefox: false,
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      fingerprint: 'A1:B2:C3:D4:E5:F6:G7:H8:I9:J0:K1:L2:M3:N4:O5:P6:Q7:R8:S9:T0'
    });
    setIsLoadingCert(false);
  };

  const mockInstallCert = async () => {
    setIsLoadingCert(true);
    setInstallError(null);
    // Simulate API call: POST /cert/install?target=os
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simulate 80% success rate
    if (Math.random() > 0.2) {
      setCertData(prev => ({
        ...prev,
        status: 'trusted',
        trusted_os: true
      }));
      setShowInstallModal(false);
      setIsLoadingCert(false);
    } else {
      setInstallError("We couldn't install automatically. You may need admin permissions.");
      setIsLoadingCert(false);
    }
  };

  const mockDownloadCert = () => {
    // Simulate: GET /cert/export?format=crt
    console.log('📥 Downloading certificate...');
    alert('Certificate downloaded to: ~/Downloads/relampo-ca.crt\n\n(This is a demo - no actual file downloaded)');
  };

  const mockRunDiagnostics = async () => {
    setIsLoadingCert(true);
    setShowDiagnostics(true);
    // Simulate: POST /diagnostics/run
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Re-check cert status
    const recheckStatus = await mockCheckCertStatus();
    setCertData(recheckStatus);
    setIsLoadingCert(false);
  };

  const mockCheckCertStatus = async (): Promise<CertificateData> => {
    // Simulate: GET /cert/status
    await new Promise(resolve => setTimeout(resolve, 500));
    return certData; // In real app, this would call backend
  };

  // ORCHESTRATED FLOW: Start Recording
  const handleStartRecording = async () => {
    try {
      // Step 1: Check certificate status
      const certStatus = await mockCheckCertStatus();
      
      // Step 2: Handle certificate issues
      if (certStatus.status === 'missing' || certStatus.status === 'expired' || certStatus.status === 'invalid') {
        // Auto-generate certificate
        await mockGenerateCert();
        // After generation, cert will be "needs_install" - show modal
        setShowInstallModal(true);
        return;
      }
      
      if (certStatus.status === 'needs_install') {
        // Show install modal
        setShowInstallModal(true);
        return;
      }
      
      // Step 3: Certificate is trusted - proceed with recording
      if (certStatus.status === 'trusted') {
        // Start proxy
        setProxyStatus('connected');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Set system proxy (simulated)
        console.log('🔧 Setting system proxy...');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Start recording
        setProxyStatus('capturing');
        setRecordingState('recording');
        console.log('🔴 Recording started!');
      }
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('Failed to start recording. Check console for details.');
    }
  };

  // Stop Recording (proper cleanup)
  const handleStopRecording = async () => {
    try {
      setProxyStatus('stopping');
      
      // Stop recording
      console.log('⏹️ Stopping recording...');
      await new Promise(resolve => setTimeout(resolve, 500));
      setRecordingState('idle');
      
      // Unset system proxy
      console.log('🔧 Unsetting system proxy...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Stop proxy
      console.log('🛑 Stopping proxy...');
      await new Promise(resolve => setTimeout(resolve, 500));
      setProxyStatus('connected'); // Proxy stays on, just not capturing
      
      setShowSaveModal(true);
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  };

  const handlePauseRecording = () => {
    setRecordingState('paused');
  };

  const handleResumeRecording = () => {
    setRecordingState('recording');
  };

  const handleStartProxy = async () => {
    // Power user: start proxy without recording
    setProxyStatus('connected');
  };

  const handleDisconnectProxy = () => {
    setProxyStatus('disconnected');
    setRecordingState('idle');
  };

  const copyPort = () => {
    navigator.clipboard.writeText(`localhost:${port}`);
    setPortCopied(true);
    setTimeout(() => setPortCopied(false), 2000);
  };

  const filteredRequests = capturedRequests.filter(req => {
    if (statusFilter !== 'all' && !req.status.toString().startsWith(statusFilter)) return false;
    if (typeFilter !== 'all' && !req.type.includes(typeFilter)) return false;
    if (hostFilter !== 'all' && req.host !== hostFilter) return false;
    if (searchQuery && !req.path.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const uniqueHosts = Array.from(new Set(capturedRequests.map(r => r.host)));
  const keptCount = filteredRequests.length;
  const removedCount = capturedRequests.length - keptCount;

  return (
    <div className="h-full bg-[#0a0a0a] flex flex-col">
      {/* Connection & Certificates Bar */}
      <div className="shadow-sm bg-[#111111] border-b border-white/5">
        <div className="px-6 py-4">
          <div className="flex items-start justify-between gap-6">
            {/* Left: Proxy Status & Port */}
            <div className="flex items-center gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="text-sm font-medium text-zinc-100">Proxy Status</h4>
                  {proxyStatus === 'disconnected' && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-white/5 text-zinc-400">
                      Disconnected
                    </span>
                  )}
                  {proxyStatus === 'connected' && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700 flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      Connected (Idle)
                    </span>
                  )}
                  {proxyStatus === 'capturing' && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700 flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      Recording
                    </span>
                  )}
                  {proxyStatus === 'stopping' && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700 flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      Stopping...
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <label className="text-xs text-neutral-400">Port:</label>
                  <input
                    type="text"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    disabled={proxyStatus !== 'disconnected'}
                    className="w-20 px-2 py-1 bg-white border border-neutral-300 disabled:bg-neutral-50 rounded text-sm"
                  />
                  <button
                    onClick={copyPort}
                    className="p-1.5 rounded hover:bg-neutral-100 transition-colors"
                    title="Copy proxy address"
                  >
                    {portCopied ? (
                      <Check className="w-3.5 h-3.5 text-green-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-neutral-600" />
                    )}
                  </button>
                  {proxyStatus === 'disconnected' && (
                    <button
                      onClick={handleStartProxy}
                      className="ml-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition-colors"
                    >
                      Start Proxy
                    </button>
                  )}
                  {(proxyStatus === 'connected' || proxyStatus === 'capturing') && (
                    <button
                      onClick={handleDisconnectProxy}
                      disabled={recordingState === 'recording'}
                      className="ml-2 px-3 py-1 border border-neutral-300 hover:bg-neutral-50 text-neutral-700 text-xs rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Disconnect
                    </button>
                  )}
                </div>
              </div>

              <div className="h-12 w-px bg-neutral-300" />

              {/* Certificate Section - NEW COMPONENT */}
              <div className="flex-1 min-w-0">
                <CertificateStatus
                  certData={certData}
                  onGenerate={mockGenerateCert}
                  onInstall={() => setShowInstallModal(true)}
                  onDownload={mockDownloadCert}
                  onShowInstructions={() => setShowInstructionsDrawer(true)}
                  onRunDiagnostics={mockRunDiagnostics}
                  isLoading={isLoadingCert}
                />
              </div>
            </div>
          </div>

          {/* Diagnostics Panel */}
          {showDiagnostics && (
            <div className="mt-4 p-4 border rounded-lg bg-neutral-50 border-neutral-200">
              <div className="flex items-center justify-between mb-3">
                <h5 className="text-sm font-semibold text-neutral-900">Diagnostics Results</h5>
                <button
                  onClick={() => setShowDiagnostics(false)}
                  className="text-neutral-400 hover:text-neutral-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-neutral-700">CA certificate exists</span>
                </div>
                <div className="flex items-center gap-2">
                  {certData.status === 'trusted' ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <X className="w-4 h-4 text-red-600" />
                  )}
                  <span className="text-neutral-700">CA certificate trusted</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-neutral-700">Proxy reachable</span>
                </div>
                <div className="flex items-center gap-2">
                  {certData.status === 'trusted' ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                  )}
                  <span className="text-neutral-700">HTTPS interception {certData.status === 'trusted' ? 'working' : 'not configured'}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recording Controls */}
      <div className="px-6 py-4 border-b border-neutral-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {recordingState === 'idle' && (
              <button
                onClick={handleStartRecording}
                disabled={isLoadingCert}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  isLoadingCert
                    ? 'bg-neutral-200 text-neutral-500 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white shadow-sm'
                }`}
              >
                <Play className="w-4 h-4" />
                Start Recording
              </button>
            )}

            {recordingState === 'recording' && (
              <>
                <button
                  onClick={handlePauseRecording}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors shadow-sm"
                >
                  <Pause className="w-4 h-4" />
                  Pause
                </button>
                <button
                  onClick={handleStopRecording}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-sm"
                >
                  <Square className="w-4 h-4" />
                  Stop
                </button>
              </>
            )}

            {recordingState === 'paused' && (
              <>
                <button
                  onClick={handleResumeRecording}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors shadow-sm"
                >
                  <Play className="w-4 h-4" />
                  Resume
                </button>
                <button
                  onClick={handleStopRecording}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-sm"
                >
                  <Square className="w-4 h-4" />
                  Stop
                </button>
              </>
            )}

            <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
              <Trash2 className="w-4 h-4" />
              Clear
            </button>

            <div className="h-6 w-px bg-neutral-300 mx-2" />

            <button className="flex items-center gap-2 px-3 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors">
              <Flag className="w-4 h-4 text-neutral-600" />
              <span className="text-sm text-neutral-700">Add Marker</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-600">
              {capturedRequests.length} requests captured
            </span>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                showFilters
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'border border-neutral-300 hover:bg-neutral-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span className="text-sm">Filters</span>
            </button>
          </div>
        </div>
      </div>

      {/* Capture Filters Panel */}
      {showFilters && (
        <div className="px-6 py-4 border-b border-neutral-200 bg-neutral-50">
          <div className="space-y-4">
            {/* Presets */}
            <div>
              <label className="text-xs font-medium text-neutral-700 mb-2 block">Presets</label>
              <div className="flex gap-2">
                {(['full', 'web', 'api'] as const).map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setFilterPreset(preset)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      filterPreset === preset
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50'
                    }`}
                  >
                    {preset === 'full' && 'Full Capture'}
                    {preset === 'web' && 'Web App'}
                    {preset === 'api' && 'API Only'}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggles */}
            <div>
              <label className="text-xs font-medium text-neutral-700 mb-2 block">Options</label>
              <div className="grid grid-cols-5 gap-3">
                {[
                  { label: 'Exclude Embedded', value: excludeEmbedded, setter: setExcludeEmbedded },
                  { label: 'Exclude 3rd-party', value: excludeThirdParty, setter: setExcludeThirdParty },
                  { label: 'Ignore OPTIONS', value: ignoreOptions, setter: setIgnoreOptions },
                  { label: 'Dedupe', value: dedupe, setter: setDedupe },
                  { label: 'Collapse Redirects', value: collapseRedirects, setter: setCollapseRedirects }
                ].map((toggle) => (
                  <div key={toggle.label} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={toggle.label}
                      checked={toggle.value}
                      onChange={(e) => toggle.setter(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <label htmlFor={toggle.label} className="text-sm text-neutral-700">
                      {toggle.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Filter Preview */}
            <div className="flex items-center justify-between pt-2 border-t border-neutral-200">
              <div className="flex items-center gap-4 text-xs">
                <span className="text-neutral-600">
                  Preview: <span className="font-medium text-green-700">{keptCount} kept</span>
                  {' / '}
                  <span className="font-medium text-red-700">{removedCount} removed</span>
                </span>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1 text-xs border border-neutral-300 rounded-lg hover:bg-white transition-colors">
                  Reset
                </button>
                <button className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition-colors">
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content - 2 Columns */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Samples Table */}
        <div className="flex-1 flex flex-col bg-white border-r border-neutral-200">
          {/* Quick Filters */}
          <div className="px-4 py-3 border-b border-neutral-200 bg-white">
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search requests..."
                  className="w-full pl-9 pr-3 py-1.5 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2 py-1.5 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="2">2xx Success</option>
                <option value="4">4xx Client Error</option>
                <option value="5">5xx Server Error</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-2 py-1.5 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="json">JSON</option>
                <option value="html">HTML</option>
                <option value="css">CSS</option>
              </select>

              <select
                value={hostFilter}
                onChange={(e) => setHostFilter(e.target.value)}
                className="px-2 py-1.5 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Hosts</option>
                {uniqueHosts.map(host => (
                  <option key={host} value={host}>{host}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Table Header */}
          <div className="px-4 py-2 border-b border-neutral-200 bg-neutral-50 text-xs font-medium text-neutral-700">
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-1">Method</div>
              <div className="col-span-4">Path</div>
              <div className="col-span-2">Host</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-2">Type</div>
              <div className="col-span-1">Duration</div>
              <div className="col-span-1">Size</div>
            </div>
          </div>

          {/* Table Body */}
          <div className="flex-1 overflow-y-auto">
            {filteredRequests.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <p className="text-sm text-neutral-600">No requests captured yet</p>
                  <p className="text-xs text-neutral-500 mt-1">Click "Start Recording" to capture HTTP traffic</p>
                </div>
              </div>
            ) : (
              filteredRequests.map((request) => (
                <div
                  key={request.id}
                  onClick={() => setSelectedRequest(request)}
                  className={`px-4 py-2.5 border-b border-neutral-200 cursor-pointer hover:bg-neutral-50 transition-colors ${
                    selectedRequest?.id === request.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-1">
                      <div className={`px-2 py-0.5 rounded text-xs font-medium text-center ${
                        request.method === 'GET' ? 'bg-blue-100 text-blue-700' :
                        request.method === 'POST' ? 'bg-green-100 text-green-700' :
                        request.method === 'PUT' ? 'bg-amber-100 text-amber-700' :
                        request.method === 'DELETE' ? 'bg-red-100 text-red-700' :
                        'bg-neutral-100 text-neutral-700'
                      }`}>
                        {request.method}
                      </div>
                    </div>
                    <div className="col-span-4 flex items-center gap-2">
                      {request.isPinned && <Pin className="w-3 h-3 text-amber-600 flex-shrink-0" />}
                      <span className="text-xs font-mono text-neutral-900 truncate">{request.path}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-xs text-neutral-600 truncate">{request.host}</span>
                    </div>
                    <div className="col-span-1">
                      <div className={`px-2 py-0.5 rounded text-xs font-medium text-center ${
                        request.status >= 200 && request.status < 300 ? 'bg-green-100 text-green-700' :
                        request.status >= 400 && request.status < 500 ? 'bg-amber-100 text-amber-700' :
                        request.status >= 500 ? 'bg-red-100 text-red-700' :
                        'bg-neutral-100 text-neutral-700'
                      }`}>
                        {request.status}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <span className="text-xs text-neutral-600 truncate">{request.type}</span>
                    </div>
                    <div className="col-span-1">
                      <span className="text-xs text-neutral-700">{request.duration}ms</span>
                    </div>
                    <div className="col-span-1">
                      <span className="text-xs text-neutral-600">{request.size}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Request Inspector */}
        {selectedRequest && (
          <div className="w-1/2 flex flex-col bg-white">
            {/* Inspector Header */}
            <div className="px-4 py-3 border-b border-neutral-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-neutral-900">Request Inspector</h3>
                <p className="text-xs text-neutral-600 mt-0.5">
                  {selectedRequest.method} {selectedRequest.path}
                </p>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Inspector Tabs */}
            <div className="border-b border-neutral-200">
              <div className="flex px-4">
                {(['request', 'response', 'timing'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setInspectorTab(tab)}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${
                      inspectorTab === tab
                        ? 'text-blue-700 border-blue-600'
                        : 'text-neutral-600 border-transparent hover:text-neutral-900'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Inspector Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {inspectorTab === 'request' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-semibold text-neutral-700 mb-2">Headers</h4>
                    <div className="bg-neutral-50 rounded-lg p-3 space-y-1.5">
                      {Object.entries(selectedRequest.requestHeaders).map(([key, value]) => (
                        <div key={key} className="flex gap-2 text-xs">
                          <span className="font-medium text-neutral-700 min-w-[120px]">{key}:</span>
                          <span className="text-neutral-600 font-mono">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {selectedRequest.requestBody && (
                    <div>
                      <h4 className="text-xs font-semibold text-neutral-700 mb-2">Body</h4>
                      <pre className="bg-neutral-900 text-green-400 rounded-lg p-3 text-xs font-mono overflow-x-auto">
                        {selectedRequest.requestBody}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {inspectorTab === 'response' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-semibold text-neutral-700 mb-2">Headers</h4>
                    <div className="bg-neutral-50 rounded-lg p-3 space-y-1.5">
                      {Object.entries(selectedRequest.responseHeaders).map(([key, value]) => (
                        <div key={key} className="flex gap-2 text-xs">
                          <span className="font-medium text-neutral-700 min-w-[120px]">{key}:</span>
                          <span className="text-neutral-600 font-mono">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {selectedRequest.responseBody && (
                    <div>
                      <h4 className="text-xs font-semibold text-neutral-700 mb-2">Body</h4>
                      <pre className="bg-neutral-900 text-green-400 rounded-lg p-3 text-xs font-mono overflow-x-auto">
                        {selectedRequest.responseBody}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {inspectorTab === 'timing' && (
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-neutral-700 mb-2">Request Timing</h4>
                  {Object.entries(selectedRequest.timing).map(([phase, duration]) => (
                    <div key={phase} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-neutral-700 capitalize">{phase}</span>
                        <span className="font-mono text-neutral-900">{duration}ms</span>
                      </div>
                      <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${(duration / selectedRequest.duration) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  <div className="pt-3 border-t border-neutral-200 flex items-center justify-between text-sm">
                    <span className="font-semibold text-neutral-900">Total</span>
                    <span className="font-mono font-semibold text-neutral-900">{selectedRequest.duration}ms</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <InstallCertModal
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
        onInstall={mockInstallCert}
        onDownload={mockDownloadCert}
        onShowInstructions={() => {
          setShowInstallModal(false);
          setShowInstructionsDrawer(true);
        }}
        isInstalling={isLoadingCert}
        installError={installError}
      />

      <InstallInstructionsDrawer
        isOpen={showInstructionsDrawer}
        onClose={() => setShowInstructionsDrawer(false)}
        certPath="~/Downloads/relampo-ca.crt"
      />

      {/* Save Modal (simple placeholder) */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowSaveModal(false)}></div>
          <div className="relative bg-white rounded-xl shadow-2xl p-6 max-w-md">
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">Save Recording?</h3>
            <p className="text-sm text-neutral-600 mb-4">
              Save the captured {capturedRequests.length} requests to a test scenario?
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
              >
                Discard
              </button>
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Save to Script Tree
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}