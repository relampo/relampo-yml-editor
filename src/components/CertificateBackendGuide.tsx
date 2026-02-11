import { Code, Server, Shield, CheckCircle, Terminal } from 'lucide-react';

export function CertificateBackendGuide() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900 mb-2">Certificate Backend Implementation Guide</h1>
        <p className="text-neutral-600">
          Complete API specification for the local agent that handles certificate generation, installation, and proxy management.
        </p>
      </div>

      {/* Architecture Overview */}
      <section className="mb-12 p-6 bg-blue-50 border-2 border-blue-200 rounded-xl">
        <div className="flex items-start gap-3 mb-4">
          <Server className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
          <div>
            <h2 className="text-xl font-bold text-blue-900 mb-2">Architecture Overview</h2>
            <p className="text-sm text-blue-800 mb-3">
              The UI (web/Electron) should NOT touch the trust store directly. Instead, create a local agent (daemon/service) 
              that runs on <code className="bg-blue-100 px-1 rounded">localhost</code> and exposes REST APIs.
            </p>
            <div className="bg-white rounded-lg p-4 text-sm text-neutral-700 space-y-1 font-mono">
              <div>┌─ <span className="text-blue-600 font-semibold">UI (React App)</span></div>
              <div>│  └─ calls localhost APIs</div>
              <div>│</div>
              <div>└─ <span className="text-green-600 font-semibold">Local Agent (Node.js/Go/Rust)</span></div>
              <div>   ├─ generates/stores CA certificate</div>
              <div>   ├─ installs CA in OS trust store</div>
              <div>   ├─ runs MITM proxy</div>
              <div>   ├─ sets/unsets system proxy</div>
              <div>   └─ runs diagnostics</div>
            </div>
          </div>
        </div>
      </section>

      {/* API Endpoints */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-neutral-900 mb-4 flex items-center gap-2">
          <Terminal className="w-6 h-6" />
          API Endpoints
        </h2>

        {/* Certificate APIs */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-3 bg-neutral-100 px-3 py-2 rounded-lg">
            Certificate Management
          </h3>
          <div className="space-y-4">
            {/* GET /cert/status */}
            <div className="border border-neutral-300 rounded-lg overflow-hidden">
              <div className="bg-neutral-50 px-4 py-2 border-b border-neutral-300 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-semibold">GET</span>
                  <code className="text-sm font-mono text-neutral-900">/cert/status</code>
                </div>
                <span className="text-xs text-neutral-600">Check certificate status</span>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <p className="text-sm font-semibold text-neutral-700 mb-1">Response:</p>
                  <pre className="bg-neutral-900 text-green-400 rounded p-3 text-xs font-mono overflow-x-auto">
{`{
  "status": "trusted",           // missing | needs_install | trusted | expired | invalid
  "trusted_os": true,             // Is it in OS trust store?
  "trusted_firefox": false,       // Is it in Firefox NSS store?
  "expires_at": "2025-12-31T23:59:59Z",
  "fingerprint": "A1:B2:C3:D4:..."
}`}
                  </pre>
                </div>
              </div>
            </div>

            {/* POST /cert/generate */}
            <div className="border border-neutral-300 rounded-lg overflow-hidden">
              <div className="bg-neutral-50 px-4 py-2 border-b border-neutral-300 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-semibold">POST</span>
                  <code className="text-sm font-mono text-neutral-900">/cert/generate</code>
                </div>
                <span className="text-xs text-neutral-600">Generate new CA certificate</span>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <p className="text-sm font-semibold text-neutral-700 mb-1">Action:</p>
                  <ul className="list-disc list-inside text-sm text-neutral-600 space-y-1">
                    <li>Create Root CA certificate with private key</li>
                    <li>Store securely (Keychain/DPAPI/encrypted file)</li>
                    <li>Set validity to 365 days</li>
                    <li>Use subject: CN=Relampo CA, O=Relampo</li>
                  </ul>
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-700 mb-1">Response:</p>
                  <pre className="bg-neutral-900 text-green-400 rounded p-3 text-xs font-mono overflow-x-auto">
{`{
  "success": true,
  "fingerprint": "A1:B2:C3:D4:..."
}`}
                  </pre>
                </div>
              </div>
            </div>

            {/* GET /cert/export */}
            <div className="border border-neutral-300 rounded-lg overflow-hidden">
              <div className="bg-neutral-50 px-4 py-2 border-b border-neutral-300 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-semibold">GET</span>
                  <code className="text-sm font-mono text-neutral-900">/cert/export?format=crt</code>
                </div>
                <span className="text-xs text-neutral-600">Export certificate (public key only)</span>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <p className="text-sm font-semibold text-neutral-700 mb-1">Query Params:</p>
                  <code className="text-xs bg-neutral-100 px-2 py-1 rounded">format: crt | pem | der</code>
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-700 mb-1">Response:</p>
                  <p className="text-sm text-neutral-600">Binary certificate file (triggers download)</p>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded">
                  <p className="text-xs text-amber-900">
                    <strong>⚠️ Security:</strong> Never export the private key! Only export the public certificate.
                  </p>
                </div>
              </div>
            </div>

            {/* POST /cert/install */}
            <div className="border border-neutral-300 rounded-lg overflow-hidden">
              <div className="bg-neutral-50 px-4 py-2 border-b border-neutral-300 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-semibold">POST</span>
                  <code className="text-sm font-mono text-neutral-900">/cert/install?target=os</code>
                </div>
                <span className="text-xs text-neutral-600">Install CA in trust store</span>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <p className="text-sm font-semibold text-neutral-700 mb-1">Query Params:</p>
                  <code className="text-xs bg-neutral-100 px-2 py-1 rounded">target: os | firefox</code>
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-700 mb-1">Platform-Specific Actions:</p>
                  <div className="space-y-2 text-sm text-neutral-600">
                    <div className="flex items-start gap-2">
                      <span className="font-semibold min-w-[80px]">Windows:</span>
                      <span>Use certutil.exe -addstore Root cert.crt (requires admin)</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-semibold min-w-[80px]">macOS:</span>
                      <span>security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain cert.crt</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-semibold min-w-[80px]">Linux:</span>
                      <span>cp cert.crt /usr/local/share/ca-certificates/ && update-ca-certificates</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-semibold min-w-[80px]">Firefox:</span>
                      <span>certutil -A -n "Relampo CA" -t "C,," -d sql:$HOME/.mozilla/firefox/*.default -i cert.crt</span>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-700 mb-1">Success Response:</p>
                  <pre className="bg-neutral-900 text-green-400 rounded p-3 text-xs font-mono">
{`{
  "success": true,
  "message": "Certificate installed successfully"
}`}
                  </pre>
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-700 mb-1">Error Response:</p>
                  <pre className="bg-neutral-900 text-red-400 rounded p-3 text-xs font-mono">
{`{
  "success": false,
  "error": "NEEDS_ADMIN" | "INSTALL_FAILED",
  "message": "Administrator privileges required"
}`}
                  </pre>
                </div>
              </div>
            </div>

            {/* POST /cert/rotate */}
            <div className="border border-neutral-300 rounded-lg overflow-hidden">
              <div className="bg-neutral-50 px-4 py-2 border-b border-neutral-300 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-semibold">POST</span>
                  <code className="text-sm font-mono text-neutral-900">/cert/rotate</code>
                </div>
                <span className="text-xs text-neutral-600">Rotate expired/invalid certificate</span>
              </div>
              <div className="p-4">
                <p className="text-sm text-neutral-600">Alias for generate + install (handles expired certs)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Proxy APIs */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-3 bg-neutral-100 px-3 py-2 rounded-lg">
            Proxy Management
          </h3>
          <div className="space-y-4">
            {/* POST /proxy/start */}
            <div className="border border-neutral-300 rounded-lg overflow-hidden">
              <div className="bg-neutral-50 px-4 py-2 border-b border-neutral-300 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-semibold">POST</span>
                  <code className="text-sm font-mono text-neutral-900">/proxy/start</code>
                </div>
                <span className="text-xs text-neutral-600">Start MITM proxy</span>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <p className="text-sm font-semibold text-neutral-700 mb-1">Request Body:</p>
                  <pre className="bg-neutral-900 text-green-400 rounded p-3 text-xs font-mono">
{`{
  "port": 8888
}`}
                  </pre>
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-700 mb-1">Response:</p>
                  <pre className="bg-neutral-900 text-green-400 rounded p-3 text-xs font-mono">
{`{
  "success": true,
  "port": 8888,
  "recommended_port": 8888  // If port busy, suggest alternative
}`}
                  </pre>
                </div>
              </div>
            </div>

            {/* POST /proxy/stop */}
            <div className="border border-neutral-300 rounded-lg overflow-hidden">
              <div className="bg-neutral-50 px-4 py-2 border-b border-neutral-300 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-semibold">POST</span>
                  <code className="text-sm font-mono text-neutral-900">/proxy/stop</code>
                </div>
                <span className="text-xs text-neutral-600">Stop MITM proxy</span>
              </div>
            </div>

            {/* POST /proxy/set_system */}
            <div className="border border-neutral-300 rounded-lg overflow-hidden">
              <div className="bg-neutral-50 px-4 py-2 border-b border-neutral-300 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-semibold">POST</span>
                  <code className="text-sm font-mono text-neutral-900">/proxy/set_system</code>
                </div>
                <span className="text-xs text-neutral-600">Configure OS proxy settings</span>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <p className="text-sm font-semibold text-neutral-700 mb-1">Request Body:</p>
                  <pre className="bg-neutral-900 text-green-400 rounded p-3 text-xs font-mono">
{`{
  "host": "127.0.0.1",
  "port": 8888,
  "bypass": ["localhost", "127.0.0.1", "*.local"]
}`}
                  </pre>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-xs text-blue-900">
                    <strong>Important:</strong> Always include localhost in bypass list to avoid infinite loops!
                  </p>
                </div>
              </div>
            </div>

            {/* POST /proxy/unset_system */}
            <div className="border border-neutral-300 rounded-lg overflow-hidden">
              <div className="bg-neutral-50 px-4 py-2 border-b border-neutral-300 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-semibold">POST</span>
                  <code className="text-sm font-mono text-neutral-900">/proxy/unset_system</code>
                </div>
                <span className="text-xs text-neutral-600">Remove OS proxy settings</span>
              </div>
              <div className="p-4">
                <p className="text-sm text-neutral-600">Restore original proxy settings (if any)</p>
              </div>
            </div>

            {/* GET /proxy/status */}
            <div className="border border-neutral-300 rounded-lg overflow-hidden">
              <div className="bg-neutral-50 px-4 py-2 border-b border-neutral-300 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-semibold">GET</span>
                  <code className="text-sm font-mono text-neutral-900">/proxy/status</code>
                </div>
                <span className="text-xs text-neutral-600">Check proxy status</span>
              </div>
              <div className="p-4">
                <pre className="bg-neutral-900 text-green-400 rounded p-3 text-xs font-mono">
{`{
  "running": true,
  "port": 8888,
  "system_proxy_set": true
}`}
                </pre>
              </div>
            </div>
          </div>
        </div>

        {/* Diagnostics APIs */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-3 bg-neutral-100 px-3 py-2 rounded-lg">
            Diagnostics
          </h3>
          <div className="space-y-4">
            {/* POST /diagnostics/run */}
            <div className="border border-neutral-300 rounded-lg overflow-hidden">
              <div className="bg-neutral-50 px-4 py-2 border-b border-neutral-300 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-semibold">POST</span>
                  <code className="text-sm font-mono text-neutral-900">/diagnostics/run</code>
                </div>
                <span className="text-xs text-neutral-600">Run full diagnostics</span>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <p className="text-sm font-semibold text-neutral-700 mb-1">Checks:</p>
                  <ul className="list-disc list-inside text-sm text-neutral-600 space-y-1">
                    <li>CA certificate exists</li>
                    <li>CA certificate trusted (OS + Firefox)</li>
                    <li>Proxy reachable (localhost:port)</li>
                    <li>HTTPS interception working (test request)</li>
                  </ul>
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-700 mb-1">Response:</p>
                  <pre className="bg-neutral-900 text-green-400 rounded p-3 text-xs font-mono overflow-x-auto">
{`{
  "checks": [
    { "name": "CA exists", "passed": true },
    { "name": "CA trusted", "passed": true },
    { "name": "Proxy reachable", "passed": true },
    { "name": "HTTPS interception", "passed": true }
  ],
  "all_passed": true
}`}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Critical Implementation Details */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-neutral-900 mb-4 flex items-center gap-2">
          <Shield className="w-6 h-6" />
          Critical Implementation Details
        </h2>
        <div className="space-y-4">
          <div className="border-l-4 border-amber-500 bg-amber-50 p-4 rounded-r-lg">
            <h3 className="font-semibold text-amber-900 mb-2">🔐 Security: Private Key Storage</h3>
            <p className="text-sm text-amber-800 mb-2">
              The CA private key must be stored securely and NEVER exported:
            </p>
            <ul className="list-disc list-inside text-sm text-amber-800 space-y-1 ml-3">
              <li><strong>macOS:</strong> Store in Keychain with SecureEnclave if possible</li>
              <li><strong>Windows:</strong> Use DPAPI (Data Protection API) to encrypt</li>
              <li><strong>Linux:</strong> Encrypted file with restricted permissions (chmod 600)</li>
            </ul>
          </div>

          <div className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded-r-lg">
            <h3 className="font-semibold text-blue-900 mb-2">🌐 Bypass List (Critical!)</h3>
            <p className="text-sm text-blue-800 mb-2">
              Always include these in the proxy bypass list to avoid infinite loops:
            </p>
            <code className="text-xs bg-white px-3 py-2 rounded border border-blue-200 block font-mono text-blue-900">
              ["localhost", "127.0.0.1", "*.local", "[agent_host]"]
            </code>
          </div>

          <div className="border-l-4 border-green-500 bg-green-50 p-4 rounded-r-lg">
            <h3 className="font-semibold text-green-900 mb-2">♻️ Recovery & Idempotency</h3>
            <ul className="list-disc list-inside text-sm text-green-800 space-y-1 ml-3">
              <li><code>/proxy/start</code> and <code>/proxy/set_system</code> must be idempotent (safe to call multiple times)</li>
              <li>On agent startup, check for "stale" system proxy settings and clean them up</li>
              <li>On agent crash, system proxy must be auto-restored (use OS shutdown hooks)</li>
            </ul>
          </div>

          <div className="border-l-4 border-purple-500 bg-purple-50 p-4 rounded-r-lg">
            <h3 className="font-semibold text-purple-900 mb-2">🦊 Firefox Special Handling</h3>
            <p className="text-sm text-purple-800">
              Firefox uses its own NSS certificate store and ignores OS trust store. You must:
            </p>
            <ul className="list-disc list-inside text-sm text-purple-800 space-y-1 ml-3 mt-2">
              <li>Detect Firefox profile directories</li>
              <li>Use <code>certutil</code> CLI to install certificate</li>
              <li>Provide manual instructions as fallback</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Success Checklist */}
      <section className="mb-8 p-6 bg-green-50 border-2 border-green-200 rounded-xl">
        <h2 className="text-xl font-bold text-green-900 mb-4 flex items-center gap-2">
          <CheckCircle className="w-6 h-6" />
          Implementation Checklist
        </h2>
        <div className="space-y-2">
          {[
            'Badge component shows 4 states (Missing, Needs Install, Trusted, Expired)',
            'Start Recording button orchestrates cert → proxy → recording',
            'Modal appears when certificate not Trusted',
            'Install Instructions drawer supports all OS platforms',
            'Run Diagnostics checks all requirements',
            'Stop Recording executes: stop recording → unset_system → stop_proxy',
            'Local agent implements all /cert/* endpoints',
            'Local agent implements all /proxy/* endpoints',
            'Local agent implements /diagnostics/run',
            'Private key stored securely (Keychain/DPAPI)',
            'Bypass list includes localhost to avoid loops',
            'System proxy auto-restored on agent crash',
            'Firefox NSS store handled separately'
          ].map((item, index) => (
            <div key={index} className="flex items-start gap-2">
              <input type="checkbox" className="mt-1 w-4 h-4" />
              <label className="text-sm text-green-900">{item}</label>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
