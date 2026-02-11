import {
  Code,
  FileCode,
  Globe,
  Folder,
  CheckCircle,
  Package,
  GitBranch,
  MousePointerClick,
  GripVertical,
  ArrowRight,
  Sparkles,
  Layers,
  Play,
  Square,
  Pause,
  Download,
  Shield,
  Cookie,
} from 'lucide-react';

export function FrontendImplementationDoc() {
  return (
    <div className="max-w-7xl mx-auto px-8 py-12">
      {/* Header */}
      <div className="mb-16 pb-8 border-b-2 border-neutral-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
            <Code className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">Frontend Implementation Guide</h1>
            <p className="text-neutral-600">Architecture, Components & Features</p>
          </div>
        </div>
        <p className="text-lg text-neutral-700 max-w-3xl">
          Comprehensive documentation of Relampo's frontend implementation, including the Script Tree with drag & drop, 
          Recording UI with HTTPS certificate management, internationalization, and all interactive components.
        </p>
      </div>

      {/* Technology Stack */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-neutral-900 mb-6 flex items-center gap-2">
          <Package className="w-6 h-6 text-blue-600" />
          Technology Stack
        </h2>
        
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl p-6">
            <div className="text-2xl font-bold text-blue-900 mb-2">React 18</div>
            <div className="text-sm text-blue-700 mb-3">UI Framework</div>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• Functional Components</li>
              <li>• Hooks (useState, useRef, etc.)</li>
              <li>• TypeScript Support</li>
            </ul>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 rounded-xl p-6">
            <div className="text-2xl font-bold text-purple-900 mb-2">TypeScript</div>
            <div className="text-sm text-purple-700 mb-3">Type Safety</div>
            <ul className="text-xs text-purple-800 space-y-1">
              <li>• Strict Type Checking</li>
              <li>• Interface Definitions</li>
              <li>• Type Guards</li>
            </ul>
          </div>

          <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 border-2 border-cyan-200 rounded-xl p-6">
            <div className="text-2xl font-bold text-cyan-900 mb-2">Tailwind CSS v4</div>
            <div className="text-sm text-cyan-700 mb-3">Styling</div>
            <ul className="text-xs text-cyan-800 space-y-1">
              <li>• Utility-First CSS</li>
              <li>• Custom Design Tokens</li>
              <li>• Responsive Design</li>
            </ul>
          </div>
        </div>

        <div className="bg-neutral-50 border-2 border-neutral-200 rounded-xl p-6">
          <h3 className="font-semibold text-neutral-900 mb-4">Key Libraries</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white border border-neutral-200 rounded-lg p-4">
              <div className="font-mono text-sm font-semibold text-neutral-900 mb-2">react-dnd</div>
              <p className="text-xs text-neutral-600">Drag & Drop functionality for Script Tree node reordering</p>
            </div>
            <div className="bg-white border border-neutral-200 rounded-lg p-4">
              <div className="font-mono text-sm font-semibold text-neutral-900 mb-2">react-dnd-html5-backend</div>
              <p className="text-xs text-neutral-600">HTML5 backend for drag & drop operations</p>
            </div>
            <div className="bg-white border border-neutral-200 rounded-lg p-4">
              <div className="font-mono text-sm font-semibold text-neutral-900 mb-2">lucide-react</div>
              <p className="text-xs text-neutral-600">Icon library for consistent UI elements</p>
            </div>
            <div className="bg-white border border-neutral-200 rounded-lg p-4">
              <div className="font-mono text-sm font-semibold text-neutral-900 mb-2">Context API</div>
              <p className="text-xs text-neutral-600">State management for i18n (English/Spanish/Portuguese)</p>
            </div>
          </div>
        </div>
      </section>

      {/* Script Tree Implementation */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-neutral-900 mb-6 flex items-center gap-2">
          <Folder className="w-6 h-6 text-purple-600" />
          Script Tree Implementation
        </h2>

        <div className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl p-8 mb-6">
          <h3 className="text-xl font-bold text-purple-900 mb-4">Architecture Overview</h3>
          <p className="text-neutral-700 mb-6">
            The Script Tree is the core component that represents the hierarchical structure of performance tests. 
            It's implemented as a recursive tree with full drag & drop support and business rule validation.
          </p>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white border border-purple-200 rounded-lg p-6">
              <h4 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                <FileCode className="w-5 h-5" />
                Key Components
              </h4>
              <div className="space-y-3 text-sm">
                <div className="font-mono text-xs bg-purple-50 p-2 rounded border border-purple-200">
                  <div className="text-purple-900 font-semibold">/components/ScriptTree.tsx</div>
                  <div className="text-purple-700 mt-1">Main tree component with context menu handling</div>
                </div>
                <div className="font-mono text-xs bg-purple-50 p-2 rounded border border-purple-200">
                  <div className="text-purple-900 font-semibold">/components/TreeNode.tsx</div>
                  <div className="text-purple-700 mt-1">Individual node with drag & drop hooks</div>
                </div>
                <div className="font-mono text-xs bg-purple-50 p-2 rounded border border-purple-200">
                  <div className="text-purple-900 font-semibold">/components/ContextMenu.tsx</div>
                  <div className="text-purple-700 mt-1">Right-click menu for node operations</div>
                </div>
                <div className="font-mono text-xs bg-purple-50 p-2 rounded border border-purple-200">
                  <div className="text-purple-900 font-semibold">/components/RenameDialog.tsx</div>
                  <div className="text-purple-700 mt-1">Modal for renaming nodes</div>
                </div>
                <div className="font-mono text-xs bg-purple-50 p-2 rounded border border-purple-200">
                  <div className="text-purple-900 font-semibold">/utils/dragDropRules.ts</div>
                  <div className="text-purple-700 mt-1">Business rules for drag & drop validation</div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-blue-200 rounded-lg p-6">
              <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <Layers className="w-5 h-5" />
                Data Structure
              </h4>
              <div className="bg-neutral-900 text-green-400 p-4 rounded-lg font-mono text-xs overflow-x-auto">
                <pre>{`interface ScriptNode {
  id: string;
  type: NodeType;
  name: string;
  expanded: boolean;
  children?: ScriptNode[];
  data?: any;
}`}</pre>
              </div>
              <div className="mt-4 text-xs text-neutral-600 space-y-1">
                <div>• <strong>Recursive structure</strong> allows unlimited nesting</div>
                <div>• <strong>Type-safe</strong> with TypeScript interfaces</div>
                <div>• <strong>Flexible data</strong> property for node-specific config</div>
              </div>
            </div>
          </div>
        </div>

        {/* Drag & Drop Features */}
        <div className="bg-neutral-50 border-2 border-neutral-200 rounded-xl p-8 mb-6">
          <h3 className="text-xl font-bold text-neutral-900 mb-6 flex items-center gap-2">
            <GripVertical className="w-6 h-6 text-neutral-700" />
            Drag & Drop System
          </h3>

          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="bg-white border border-green-200 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h4 className="font-semibold text-green-900">Visual Feedback</h4>
              </div>
              <ul className="space-y-2 text-sm text-neutral-700">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span><strong>Green ring</strong> when drop is allowed (nesting inside)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">—</span>
                  <span><strong>Blue line</strong> showing insert position (before/after sibling)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 font-bold">✗</span>
                  <span><strong>Red ring</strong> when drop is prohibited</span>
                </li>
                <li className="flex items-start gap-2">
                  <GripVertical className="w-4 h-4 text-neutral-400 mt-0.5" />
                  <span><strong>Grip icon</strong> appears on draggable nodes</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="opacity-50">⚡</span>
                  <span><strong>50% opacity</strong> while dragging</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>📂</span>
                  <span><strong>Auto-expand</strong> target on drop (when nesting)</span>
                </li>
              </ul>
            </div>

            <div className="bg-white border border-blue-200 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <Code className="w-5 h-5 text-blue-600" />
                <h4 className="font-semibold text-blue-900">Implementation</h4>
              </div>
              <div className="space-y-3 text-xs">
                <div>
                  <div className="font-mono text-blue-900 font-semibold mb-1">useDrag Hook</div>
                  <div className="text-neutral-600">Makes nodes draggable, tracks drag state, includes parent info</div>
                </div>
                <div>
                  <div className="font-mono text-blue-900 font-semibold mb-1">useDrop Hook</div>
                  <div className="text-neutral-600">Accepts drops, validates rules, detects mouse position</div>
                </div>
                <div>
                  <div className="font-mono text-blue-900 font-semibold mb-1">hover() callback</div>
                  <div className="text-neutral-600">Detects top 25% / middle 50% / bottom 25% zones</div>
                </div>
                <div>
                  <div className="font-mono text-blue-900 font-semibold mb-1">canDropNode()</div>
                  <div className="text-neutral-600">Validates nesting inside a parent</div>
                </div>
                <div>
                  <div className="font-mono text-blue-900 font-semibold mb-1">canReorderNodes()</div>
                  <div className="text-neutral-600">Validates reordering as siblings</div>
                </div>
              </div>
            </div>
          </div>

          {/* Drop Zones Visualization */}
          <div className="bg-white border border-blue-200 rounded-lg p-6 mb-6">
            <h4 className="font-semibold text-blue-900 mb-4">Drop Zone Detection</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 border-2 border-blue-400 rounded-lg p-4 text-center">
                <div className="text-xs font-semibold text-blue-900 mb-2">TOP ZONE (25%)</div>
                <div className="h-2 bg-blue-500 rounded-full mb-2"></div>
                <div className="text-xs text-blue-700">Insert <strong>BEFORE</strong> this node</div>
                <div className="text-xs text-blue-600 mt-1">(Reorder as sibling)</div>
              </div>
              <div className="bg-green-50 border-2 border-green-400 rounded-lg p-4 text-center">
                <div className="text-xs font-semibold text-green-900 mb-2">MIDDLE ZONE (50%)</div>
                <div className="h-16 bg-green-500 rounded-lg mb-2 flex items-center justify-center text-white text-xs">
                  Node Content
                </div>
                <div className="text-xs text-green-700">Insert <strong>INSIDE</strong> this node</div>
                <div className="text-xs text-green-600 mt-1">(Nest as child)</div>
              </div>
              <div className="bg-blue-50 border-2 border-blue-400 rounded-lg p-4 text-center">
                <div className="text-xs font-semibold text-blue-900 mb-2">BOTTOM ZONE (25%)</div>
                <div className="h-2 bg-blue-500 rounded-full mb-2"></div>
                <div className="text-xs text-blue-700">Insert <strong>AFTER</strong> this node</div>
                <div className="text-xs text-blue-600 mt-1">(Reorder as sibling)</div>
              </div>
            </div>
          </div>

          {/* Business Rules */}
          <div className="bg-white border border-neutral-200 rounded-lg p-6">
            <h4 className="font-semibold text-neutral-900 mb-4">Drag & Drop Business Rules</h4>
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div>
                <div className="font-semibold text-blue-700 mb-2">HTTP Requests</div>
                <div className="space-y-1 text-neutral-600">
                  <div>✓ Inside Scenarios</div>
                  <div>✓ Inside Controllers</div>
                  <div>✗ Inside other Requests</div>
                  <div>✗ At Test Plan level</div>
                </div>
              </div>
              <div>
                <div className="font-semibold text-orange-700 mb-2">Controllers</div>
                <div className="space-y-1 text-neutral-600">
                  <div>✓ Inside Scenarios</div>
                  <div>✓ Nested in Controllers</div>
                  <div>✗ Inside Requests</div>
                  <div>✗ At Test Plan level</div>
                </div>
              </div>
              <div>
                <div className="font-semibold text-cyan-700 mb-2">Think Time / Assertions</div>
                <div className="space-y-1 text-neutral-600">
                  <div>✓ Inside HTTP Requests</div>
                  <div>✗ Everywhere else</div>
                </div>
              </div>
              <div>
                <div className="font-semibold text-pink-700 mb-2">Cookie / Cache Mgr</div>
                <div className="space-y-1 text-neutral-600">
                  <div>✓ Inside Scenarios</div>
                  <div>✗ Everywhere else</div>
                </div>
              </div>
              <div>
                <div className="font-semibold text-neutral-700 mb-2">HTTP Defaults / Vars</div>
                <div className="space-y-1 text-neutral-600">
                  <div>✓ Inside Test Plan</div>
                  <div>✗ Everywhere else</div>
                </div>
              </div>
              <div>
                <div className="font-semibold text-purple-700 mb-2">Scenarios</div>
                <div className="space-y-1 text-neutral-600">
                  <div>✓ Inside Test Plan</div>
                  <div>✗ Cannot nest</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Context Menu */}
        <div className="bg-neutral-50 border-2 border-neutral-200 rounded-xl p-8">
          <h3 className="text-xl font-bold text-neutral-900 mb-6 flex items-center gap-2">
            <MousePointerClick className="w-6 h-6 text-neutral-700" />
            Context Menu System
          </h3>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white border border-neutral-200 rounded-lg p-6">
              <h4 className="font-semibold text-neutral-900 mb-3">Features</h4>
              <ul className="space-y-2 text-sm text-neutral-700">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600">+</span>
                  <div>
                    <strong>Add Child Nodes</strong>
                    <div className="text-xs text-neutral-500 mt-0.5">Dynamic options based on parent type</div>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600">✎</span>
                  <div>
                    <strong>Rename</strong>
                    <div className="text-xs text-neutral-500 mt-0.5">Special handling for HTTP requests (preserves method prefix)</div>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600">×</span>
                  <div>
                    <strong>Delete</strong>
                    <div className="text-xs text-neutral-500 mt-0.5">Test Plan cannot be deleted (protected)</div>
                  </div>
                </li>
              </ul>
            </div>

            <div className="bg-white border border-neutral-200 rounded-lg p-6">
              <h4 className="font-semibold text-neutral-900 mb-3">Rename Logic</h4>
              <div className="bg-amber-50 border border-amber-200 rounded p-3 mb-3">
                <div className="text-xs font-semibold text-amber-900 mb-2">HTTP Request Special Case</div>
                <div className="font-mono text-xs text-amber-800">
                  <div>Original: "GET /api/users"</div>
                  <div className="mt-1">Editable: "/api/users"</div>
                  <div className="mt-1 text-green-700">Result: "GET " + userInput</div>
                </div>
              </div>
              <div className="text-xs text-neutral-600">
                The rename dialog intelligently preserves HTTP method prefixes (GET, POST, PUT, DELETE, etc.) 
                to maintain semantic correctness.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recording UI */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-neutral-900 mb-6 flex items-center gap-2">
          <Play className="w-6 h-6 text-red-600" />
          Recording UI Implementation
        </h2>

        <div className="bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200 rounded-xl p-8 mb-6">
          <h3 className="text-xl font-bold text-red-900 mb-4">HTTPS Certificate Management</h3>
          <p className="text-neutral-700 mb-6">
            Complete system for managing SSL/TLS certificates required for recording HTTPS traffic. 
            Includes certificate generation, installation guides, and status monitoring.
          </p>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white border border-red-200 rounded-lg p-6">
              <h4 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Components
              </h4>
              <div className="space-y-3 text-sm">
                <div className="font-mono text-xs bg-red-50 p-2 rounded border border-red-200">
                  <div className="text-red-900 font-semibold">/components/details/RecordingView.tsx</div>
                  <div className="text-red-700 mt-1">Main recording interface with proxy controls</div>
                </div>
                <div className="font-mono text-xs bg-red-50 p-2 rounded border border-red-200">
                  <div className="text-red-900 font-semibold">/components/CertificateStatus.tsx</div>
                  <div className="text-red-700 mt-1">Real-time certificate status indicator</div>
                </div>
                <div className="font-mono text-xs bg-red-50 p-2 rounded border border-red-200">
                  <div className="text-red-900 font-semibold">/components/InstallCertModal.tsx</div>
                  <div className="text-red-700 mt-1">Step-by-step installation wizard</div>
                </div>
                <div className="font-mono text-xs bg-red-50 p-2 rounded border border-red-200">
                  <div className="text-red-900 font-semibold">/components/CertificateBackendGuide.tsx</div>
                  <div className="text-red-700 mt-1">Backend integration documentation</div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-orange-200 rounded-lg p-6">
              <h4 className="font-semibold text-orange-900 mb-3 flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Features
              </h4>
              <ul className="space-y-2 text-sm text-neutral-700">
                <li className="flex items-start gap-2">
                  <Download className="w-4 h-4 text-blue-600 mt-0.5" />
                  <div>
                    <strong>Certificate Download</strong>
                    <div className="text-xs text-neutral-500 mt-0.5">Download .crt file for OS installation</div>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                  <div>
                    <strong>Status Monitoring</strong>
                    <div className="text-xs text-neutral-500 mt-0.5">Real-time check: Installed vs Not Installed</div>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <FileCode className="w-4 h-4 text-purple-600 mt-0.5" />
                  <div>
                    <strong>OS-Specific Instructions</strong>
                    <div className="text-xs text-neutral-500 mt-0.5">macOS, Windows, Linux, iOS, Android</div>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <Play className="w-4 h-4 text-red-600 mt-0.5" />
                  <div>
                    <strong>Recording Controls</strong>
                    <div className="text-xs text-neutral-500 mt-0.5">Start, Stop, Pause with visual indicators</div>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Proxy Configuration */}
        <div className="bg-neutral-50 border-2 border-neutral-200 rounded-xl p-8">
          <h3 className="text-xl font-bold text-neutral-900 mb-4">Proxy Configuration UI</h3>
          <div className="bg-white border border-neutral-200 rounded-lg p-6">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <div className="text-xs font-semibold text-blue-900 mb-1">Proxy Host</div>
                <div className="font-mono text-sm text-blue-700">localhost</div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <div className="text-xs font-semibold text-blue-900 mb-1">Proxy Port</div>
                <div className="font-mono text-sm text-blue-700">8888</div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded p-3">
                <div className="text-xs font-semibold text-green-900 mb-1">Status</div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div className="text-sm text-green-700 font-semibold">Active</div>
                </div>
              </div>
            </div>
            <div className="text-xs text-neutral-600">
              <strong>Note:</strong> Proxy configuration is editable and persisted to localStorage. 
              Users can configure their preferred host/port for the recording proxy.
            </div>
          </div>
        </div>
      </section>

      {/* Internationalization */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-neutral-900 mb-6 flex items-center gap-2">
          <Globe className="w-6 h-6 text-green-600" />
          Internationalization (i18n)
        </h2>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-8 mb-6">
          <h3 className="text-xl font-bold text-green-900 mb-4">Multi-Language Support</h3>
          <p className="text-neutral-700 mb-6">
            Complete internationalization system supporting English, Spanish, and Portuguese with context-based translations 
            and a persistent language selector in the TopBar.
          </p>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white border border-green-200 rounded-lg p-6">
              <h4 className="font-semibold text-green-900 mb-3">Implementation</h4>
              <div className="space-y-3 text-sm">
                <div className="font-mono text-xs bg-green-50 p-2 rounded border border-green-200">
                  <div className="text-green-900 font-semibold">/contexts/LanguageContext.tsx</div>
                  <div className="text-green-700 mt-1">React Context for global language state</div>
                </div>
                <div className="font-mono text-xs bg-green-50 p-2 rounded border border-green-200">
                  <div className="text-green-900 font-semibold">/i18n/translations.ts</div>
                  <div className="text-green-700 mt-1">Translation dictionary for all languages</div>
                </div>
                <div className="font-mono text-xs bg-green-50 p-2 rounded border border-green-200">
                  <div className="text-green-900 font-semibold">/components/TopBar.tsx</div>
                  <div className="text-green-700 mt-1">Language selector dropdown</div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-emerald-200 rounded-lg p-6">
              <h4 className="font-semibold text-emerald-900 mb-3">Supported Languages</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-2 bg-emerald-50 rounded border border-emerald-200">
                  <span className="text-2xl">🇺🇸</span>
                  <div>
                    <div className="font-semibold text-emerald-900">English</div>
                    <div className="text-xs text-emerald-700">Default language</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-2 bg-emerald-50 rounded border border-emerald-200">
                  <span className="text-2xl">🇪🇸</span>
                  <div>
                    <div className="font-semibold text-emerald-900">Español</div>
                    <div className="text-xs text-emerald-700">Spanish translation</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-2 bg-emerald-50 rounded border border-emerald-200">
                  <span className="text-2xl">🇧🇷</span>
                  <div>
                    <div className="font-semibold text-emerald-900">Português</div>
                    <div className="text-xs text-emerald-700">Portuguese translation</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-neutral-50 border-2 border-neutral-200 rounded-xl p-8">
          <h3 className="text-xl font-bold text-neutral-900 mb-4">Usage Example</h3>
          <div className="bg-neutral-900 text-green-400 p-4 rounded-lg font-mono text-xs overflow-x-auto">
            <pre>{`import { useLanguage } from '../contexts/LanguageContext';

function MyComponent() {
  const { t } = useLanguage();
  
  return (
    <div>
      <h1>{t('workbench.recording')}</h1>
      <button>{t('common.start')}</button>
    </div>
  );
}`}</pre>
          </div>
          <div className="mt-4 text-xs text-neutral-600">
            <strong>Note:</strong> Language preference is persisted to localStorage and automatically restored on page reload.
          </div>
        </div>
      </section>

      {/* State Management */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-neutral-900 mb-6 flex items-center gap-2">
          <GitBranch className="w-6 h-6 text-purple-600" />
          State Management
        </h2>

        <div className="bg-neutral-50 border-2 border-neutral-200 rounded-xl p-8">
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white border border-neutral-200 rounded-lg p-6">
              <h3 className="font-semibold text-neutral-900 mb-3">Workbench State</h3>
              <div className="bg-neutral-50 border border-neutral-200 rounded p-3 mb-3 font-mono text-xs">
                <div className="text-neutral-900 mb-2">useState hooks in Workbench.tsx:</div>
                <div className="space-y-1 text-neutral-600">
                  <div>• scriptTree: ScriptNode</div>
                  <div>• selectedNode: ScriptNode | null</div>
                  <div>• activeTab: WorkbenchTab</div>
                  <div>• renamingNode: ScriptNode | null</div>
                </div>
              </div>
              <div className="text-xs text-neutral-600">
                Tree state is managed at the Workbench level and passed down to child components via props.
              </div>
            </div>

            <div className="bg-white border border-neutral-200 rounded-lg p-6">
              <h3 className="font-semibold text-neutral-900 mb-3">Tree Operations</h3>
              <ul className="space-y-2 text-sm text-neutral-700">
                <li className="flex items-start gap-2">
                  <ArrowRight className="w-4 h-4 text-blue-600 mt-0.5" />
                  <div>
                    <strong>handleNodeAdd</strong>
                    <div className="text-xs text-neutral-500 mt-0.5">Immutable tree update with new node</div>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="w-4 h-4 text-amber-600 mt-0.5" />
                  <div>
                    <strong>handleNodeRename</strong>
                    <div className="text-xs text-neutral-500 mt-0.5">Immutable update preserving structure</div>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="w-4 h-4 text-red-600 mt-0.5" />
                  <div>
                    <strong>handleNodeRemove</strong>
                    <div className="text-xs text-neutral-500 mt-0.5">Filter out node and update tree</div>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="w-4 h-4 text-green-600 mt-0.5" />
                  <div>
                    <strong>handleNodeMove</strong>
                    <div className="text-xs text-neutral-500 mt-0.5">Remove from source, add to target</div>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Component Architecture */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-neutral-900 mb-6 flex items-center gap-2">
          <Layers className="w-6 h-6 text-blue-600" />
          Component Architecture
        </h2>

        <div className="bg-neutral-50 border-2 border-neutral-200 rounded-xl p-8">
          <div className="bg-white border border-neutral-200 rounded-lg p-6 font-mono text-sm">
            <div className="space-y-1 text-neutral-700">
              <div>App.tsx</div>
              <div className="ml-4">├─ LanguageProvider (Context)</div>
              <div className="ml-4">├─ Sidebar (Global Nav)</div>
              <div className="ml-4">├─ TopBar (Project/Env + Language Selector)</div>
              <div className="ml-4">└─ Workbench</div>
              <div className="ml-8">├─ DndProvider (Drag & Drop Context)</div>
              <div className="ml-8">│  └─ ScriptTree</div>
              <div className="ml-12">│     ├─ TreeNode (Recursive)</div>
              <div className="ml-12">│     │  ├─ useDrag</div>
              <div className="ml-12">│     │  └─ useDrop</div>
              <div className="ml-12">│     └─ ContextMenu</div>
              <div className="ml-8">├─ DetailPanel (Context-aware)</div>
              <div className="ml-12">│  ├─ RecordingView</div>
              <div className="ml-12">│  │  ├─ CertificateStatus</div>
              <div className="ml-12">│  │  └─ InstallCertModal</div>
              <div className="ml-12">│  ├─ HttpRequestDetail</div>
              <div className="ml-12">│  ├─ ControllerDetail</div>
              <div className="ml-12">│  └─ [Other Detail Views...]</div>
              <div className="ml-8">└─ RenameDialog (Modal)</div>
            </div>
          </div>
        </div>
      </section>

      {/* Best Practices */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-neutral-900 mb-6 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-amber-600" />
          Best Practices & Patterns
        </h2>

        <div className="grid grid-cols-2 gap-6">
          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <h3 className="font-semibold text-green-900 text-lg">React Best Practices</h3>
            </div>
            <ul className="space-y-2 text-sm text-neutral-700">
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>Hooks at component top-level (Rules of Hooks)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>Immutable state updates for tree operations</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>Unique keys for list rendering</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>TypeScript for type safety</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>Component composition over inheritance</span>
              </li>
            </ul>
          </div>

          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Code className="w-6 h-6 text-blue-600" />
              <h3 className="font-semibold text-blue-900 text-lg">Code Organization</h3>
            </div>
            <ul className="space-y-2 text-sm text-neutral-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">✓</span>
                <span>Separate TreeNode component for hook compliance</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">✓</span>
                <span>Business logic in /utils (dragDropRules.ts)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">✓</span>
                <span>Type definitions in /types directory</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">✓</span>
                <span>Mock data in /data directory</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">✓</span>
                <span>Context providers for cross-cutting concerns</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Footer */}
      <div className="mt-16 pt-8 border-t-2 border-neutral-200 text-center text-neutral-600">
        <p className="text-sm">
          This documentation reflects the current state of Relampo's frontend implementation.
        </p>
        <p className="text-xs mt-2">
          For questions or contributions, refer to the main README or contact the development team.
        </p>
      </div>
    </div>
  );
}