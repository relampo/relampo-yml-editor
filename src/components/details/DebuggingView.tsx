import type { ScriptNode } from '../../types/script';
import { Play, CheckCircle, XCircle, AlertCircle, Lightbulb } from 'lucide-react';

interface DebuggingViewProps {
  selectedNode: ScriptNode | null;
}

export function DebuggingView({ selectedNode }: DebuggingViewProps) {
  const executionSamples = [
    {
      id: 1,
      name: 'GET /home',
      status: 'success',
      duration: 145,
      timestamp: '14:23:12.456',
      statusCode: 200,
    },
    {
      id: 2,
      name: 'GET /search?q=headphones',
      status: 'success',
      duration: 89,
      timestamp: '14:23:15.123',
      statusCode: 200,
    },
    {
      id: 3,
      name: 'POST /cart/add',
      status: 'error',
      duration: 234,
      timestamp: '14:23:18.789',
      statusCode: 500,
      error: 'Internal Server Error',
    },
  ];

  const aiSuggestions = [
    'Response time for POST /cart/add increased by 45% compared to baseline',
    'Consider adding retry logic for the cart endpoint',
    'Missing correlation for dynamic session token in subsequent requests',
  ];

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-zinc-100">Debug Execution</h3>
            <p className="text-sm mt-1 text-zinc-400">
              Real-time execution samples with AI-powered insights
            </p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-black font-semibold rounded-lg transition-colors shadow-lg shadow-green-400/30">
            <Play className="w-4 h-4" />
            Run Debug
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Execution Samples */}
          <div>
            <h4 className="text-sm mb-3 text-zinc-300">Execution Samples</h4>
            <div className="space-y-2">
              {executionSamples.map((sample) => (
                <div
                  key={sample.id}
                  className={`px-4 py-3 border rounded-lg transition-colors cursor-pointer ${
                    selectedNode?.name === sample.name
                      ? 'border-yellow-400/30 bg-yellow-500/10'
                      : 'border-white/10 bg-[#111111] hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {sample.status === 'success' ? (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    ) : sample.status === 'error' ? (
                      <XCircle className="w-5 h-5 text-red-400" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-amber-400" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-zinc-100">{sample.name}</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          sample.status === 'success'
                            ? 'bg-green-500/10 text-green-400 border border-green-400/30'
                            : 'bg-red-500/10 text-red-400 border border-red-400/30'
                        }`}>
                          {sample.statusCode}
                        </span>
                        <span className="text-xs text-zinc-500">{sample.duration}ms</span>
                      </div>
                      {sample.error && (
                        <p className="text-xs text-red-400 mt-1">{sample.error}</p>
                      )}
                    </div>
                    <span className="text-xs text-zinc-500">{sample.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Suggestions */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4 text-amber-400" />
              <h4 className="text-sm text-zinc-300">AI Insights</h4>
            </div>
            <div className="space-y-2">
              {aiSuggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 px-4 py-3 border rounded-lg bg-amber-500/10 border-amber-400/30"
                >
                  <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5" />
                  <p className="text-sm flex-1 text-amber-300">{suggestion}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Execution Logs */}
          <div>
            <h4 className="text-sm mb-3 text-zinc-300">Execution Logs</h4>
            <div className="bg-[#0a0a0a] border border-white/10 rounded-lg p-4 font-mono text-xs text-zinc-100 overflow-x-auto">
              <div className="space-y-1">
                <div className="text-green-400">[14:23:12.456] Starting test execution...</div>
                <div className="text-blue-400">[14:23:12.601] GET /home - 200 OK (145ms)</div>
                <div className="text-blue-400">[14:23:15.123] GET /search?q=headphones - 200 OK (89ms)</div>
                <div className="text-red-400">[14:23:18.789] POST /cart/add - 500 Internal Server Error (234ms)</div>
                <div className="text-amber-400">[14:23:18.790] Assertion failed: Expected status 201, got 500</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}