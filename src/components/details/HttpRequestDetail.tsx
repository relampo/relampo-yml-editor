import { useState } from 'react';
import type { ScriptNode, HttpRequestData } from '../../types/script';
import { Clock, Database } from 'lucide-react';

interface HttpRequestDetailProps {
  node: ScriptNode;
}

export function HttpRequestDetail({ node }: HttpRequestDetailProps) {
  const [activeSection, setActiveSection] = useState<'request' | 'response'>('request');
  const data = node.data as HttpRequestData;

  const formatJson = (str: string) => {
    try {
      return JSON.stringify(JSON.parse(str), null, 2);
    } catch {
      return str;
    }
  };

  return (
    <div className="h-full bg-[#0a0a0a] flex flex-col">
      {/* Header */}
      <div className="px-8 py-6 bg-[#111111] border-b border-white/5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-zinc-100 font-semibold tracking-tight">{node.name}</h3>
            <p className="text-sm text-zinc-400 mt-1.5 font-mono">{data.url}</p>
          </div>
          <div className={`px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide ${
            data.method === 'GET' 
              ? 'bg-blue-500/10 text-blue-400 border border-blue-400/30'
              : data.method === 'POST'
              ? 'bg-green-500/10 text-green-400 border border-green-400/30'
              : data.method === 'PUT'
              ? 'bg-amber-500/10 text-amber-400 border border-amber-400/30'
              : data.method === 'DELETE'
              ? 'bg-red-500/10 text-red-400 border border-red-400/30'
              : 'bg-white/5 text-zinc-400'
          }`}>
            {data.method}
          </div>
        </div>
      </div>

      {/* Request/Response Tabs */}
      <div className="bg-[#0a0a0a] border-b border-white/5">
        <div className="flex gap-1 px-8">
          <button
            onClick={() => setActiveSection('request')}
            className={`
              px-4 py-3 text-sm font-medium relative transition-all duration-200
              ${activeSection === 'request'
                ? 'text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-300'
              }
            `}
          >
            Request
            {activeSection === 'request' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500 rounded-t-full shadow-lg shadow-yellow-400/40" />
            )}
          </button>
          <button
            onClick={() => setActiveSection('response')}
            className={`
              px-4 py-3 text-sm font-medium relative transition-all duration-200
              ${activeSection === 'response'
                ? 'text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-300'
              }
            `}
          >
            Response
            {activeSection === 'response' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500 rounded-t-full shadow-lg shadow-yellow-400/40" />
            )}
          </button>
        </div>
      </div>

      {/* Content - Dark Theme Cards */}
      <div className="flex-1 overflow-y-auto p-8 bg-[#0a0a0a]">
        {activeSection === 'request' && (
          <div className="space-y-6 max-w-4xl">
            {/* URL */}
            <div className="bg-[#111111] rounded-xl p-6 border border-white/5 shadow-2xl">
              <label className="block text-sm font-semibold text-zinc-100 mb-3 tracking-tight">URL</label>
              <input
                type="text"
                value={data.url}
                readOnly
                className="w-full px-4 py-2.5 border border-white/10 rounded-lg bg-[#0a0a0a] text-sm font-mono text-zinc-300 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Headers */}
            <div className="bg-[#111111] rounded-xl p-6 border border-white/5 shadow-2xl">
              <label className="block text-sm font-semibold text-zinc-100 mb-3 tracking-tight">Headers</label>
              <div className="border border-white/10 rounded-lg overflow-hidden">
                {Object.entries(data.headers).map(([key, value]) => (
                  <div key={key} className="flex border-b border-white/5 last:border-b-0 hover:bg-white/5 transition-colors">
                    <div className="w-1/3 px-4 py-3 bg-white/5 text-sm font-medium text-zinc-300 border-r border-white/10">
                      {key}
                    </div>
                    <div className="flex-1 px-4 py-3 text-sm text-zinc-400 font-mono">
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Body */}
            {data.body && (
              <div className="bg-[#111111] rounded-xl p-6 border border-white/5 shadow-2xl">
                <label className="block text-sm font-semibold text-zinc-100 mb-3 tracking-tight">Body</label>
                <pre className="bg-[#0a0a0a] text-zinc-300 p-5 rounded-lg text-xs overflow-x-auto font-mono leading-relaxed border border-white/10">
                  {formatJson(data.body)}
                </pre>
              </div>
            )}
          </div>
        )}

        {activeSection === 'response' && data.response && (
          <div className="space-y-6 max-w-4xl">
            {/* Status Metrics */}
            <div className="bg-[#111111] rounded-xl p-6 border border-white/5 shadow-2xl">
              <div className="flex items-center gap-8">
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-2 tracking-wide uppercase">Status</label>
                  <div className={`px-4 py-1.5 rounded-lg text-sm font-semibold inline-block ${
                    data.response.status >= 200 && data.response.status < 300
                      ? 'bg-green-500/10 text-green-400 border border-green-400/30'
                      : data.response.status >= 400
                      ? 'bg-red-500/10 text-red-400 border border-red-400/30'
                      : 'bg-white/5 text-zinc-400'
                  }`}>
                    {data.response.status} {data.response.statusText}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-2 tracking-wide uppercase">Duration</label>
                  <div className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
                    <Clock className="w-4 h-4 text-yellow-400" />
                    {data.response.duration}ms
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-2 tracking-wide uppercase">Size</label>
                  <div className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
                    <Database className="w-4 h-4 text-yellow-400" />
                    {data.response.size}B
                  </div>
                </div>
              </div>
            </div>

            {/* Response Headers */}
            <div className="bg-[#111111] rounded-xl p-6 border border-white/5 shadow-2xl">
              <label className="block text-sm font-semibold text-zinc-100 mb-3 tracking-tight">Response Headers</label>
              <div className="border border-white/10 rounded-lg overflow-hidden">
                {Object.entries(data.response.headers).map(([key, value]) => (
                  <div key={key} className="flex border-b border-white/5 last:border-b-0 hover:bg-white/5 transition-colors">
                    <div className="w-1/3 px-4 py-3 bg-white/5 text-sm font-medium text-zinc-300 border-r border-white/10">
                      {key}
                    </div>
                    <div className="flex-1 px-4 py-3 text-sm text-zinc-400 font-mono">
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Response Body */}
            <div className="bg-[#111111] rounded-xl p-6 border border-white/5 shadow-2xl">
              <label className="block text-sm font-semibold text-zinc-100 mb-3 tracking-tight">Response Body</label>
              <pre className="bg-[#0a0a0a] text-zinc-300 p-5 rounded-lg text-xs overflow-x-auto font-mono leading-relaxed border border-white/10">
                {formatJson(data.response.body)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}