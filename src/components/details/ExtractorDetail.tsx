import type { ScriptNode, ExtractorData } from '../../types/script';
import { Code } from 'lucide-react';

interface ExtractorDetailProps {
  node: ScriptNode;
}

export function ExtractorDetail({ node }: ExtractorDetailProps) {
  const data = node.data as ExtractorData;

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-zinc-100">{node.name}</h3>
            <p className="text-sm text-zinc-400 mt-1">
              Extract values from responses for use in subsequent requests
            </p>
          </div>
          <div className="px-3 py-1 rounded-md bg-violet-500/10 text-violet-400 border border-violet-400/30 text-xs">
            {data.extractorType.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6">
          {/* Variable Name */}
          <div>
            <label className="block text-sm text-zinc-300 mb-2">Variable Name</label>
            <input
              type="text"
              value={data.variableName}
              readOnly
              className="w-full px-3 py-2 border border-white/10 rounded-lg bg-[#111111] text-sm font-mono text-zinc-100"
              placeholder="e.g., user_id"
            />
            <p className="text-xs text-zinc-500 mt-1">
              Use as ${'{' + data.variableName + '}'} in subsequent requests
            </p>
          </div>

          {/* Extractor Type */}
          <div>
            <label className="block text-sm text-zinc-300 mb-2">Extractor Type</label>
            <select
              value={data.extractorType}
              disabled
              className="w-full px-3 py-2 border border-white/10 rounded-lg bg-[#111111] text-sm text-zinc-100"
            >
              <option value="json">JSON Path</option>
              <option value="regex">Regular Expression</option>
              <option value="xpath">XPath</option>
            </select>
          </div>

          {/* Expression */}
          <div>
            <label className="block text-sm text-zinc-300 mb-2">
              {data.extractorType === 'json' ? 'JSON Path Expression' : 'Expression'}
            </label>
            <div className="relative">
              <Code className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                value={data.expression}
                readOnly
                className="w-full pl-10 pr-3 py-2 border border-white/10 rounded-lg bg-[#111111] text-sm font-mono text-zinc-100"
              />
            </div>
          </div>

          {/* Preview */}
          {data.preview && (
            <div>
              <label className="block text-sm text-zinc-300 mb-2">Extracted Value (Preview)</label>
              <div className="px-4 py-3 bg-green-500/10 border border-green-400/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="text-sm text-green-900 font-mono">{data.preview}</span>
                </div>
              </div>
            </div>
          )}

          {/* Match Number */}
          {data.matchNo !== undefined && (
            <div>
              <label className="block text-sm text-zinc-300 mb-2">Match Number</label>
              <input
                type="number"
                value={data.matchNo}
                readOnly
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-neutral-50 text-sm"
              />
              <p className="text-xs text-neutral-500 mt-1">
                0 = random, 1 = first match, 2 = second match, etc.
              </p>
            </div>
          )}

          {/* Default Value */}
          <div>
            <label className="block text-sm text-zinc-300 mb-2">Default Value</label>
            <input
              type="text"
              value={data.defaultValue || ''}
              readOnly
              placeholder="Value to use if extraction fails"
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-neutral-50 text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
}