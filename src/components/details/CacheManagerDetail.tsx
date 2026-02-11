import { HardDrive, Trash2, Plus } from 'lucide-react';
import type { ScriptNode } from '../../types/script';

interface CacheManagerDetailProps {
  node: ScriptNode;
}

export function CacheManagerDetail({ node }: CacheManagerDetailProps) {
  const data = node.data || { cache: [] };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-neutral-200">
        <div className="flex items-center gap-2 mb-1">
          <HardDrive className="w-5 h-5 text-slate-600" />
          <h3 className="text-neutral-900">{node.name}</h3>
        </div>
        <p className="text-xs text-neutral-500">
          HTTP cache simulation for realistic browser behavior
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6">
          {/* Cache Configuration */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-neutral-900">
                Cache Configuration
              </h4>
              <button className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5">
                <Plus className="w-3 h-3" />
                Add Entry
              </button>
            </div>
            
            <div className="space-y-2 text-sm mb-4">
              <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                <span className="text-neutral-700">Max Cache Size</span>
                <span className="text-neutral-600 font-medium">5000 entries</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                <span className="text-neutral-700">Clear Each Iteration</span>
                <span className="text-emerald-600 font-medium">False</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                <span className="text-neutral-700">Use Cache-Control Headers</span>
                <span className="text-emerald-600 font-medium">True</span>
              </div>
            </div>
          </div>

          {/* Cache Entries */}
          <div>
            <h4 className="text-sm font-medium text-neutral-900 mb-3">
              Cached Items
              {data.cache && data.cache.length > 0 && (
                <span className="ml-2 text-xs text-neutral-500">
                  ({data.cache.length} entries)
                </span>
              )}
            </h4>
            
            {data.cache && data.cache.length > 0 ? (
              <div className="space-y-2">
                {data.cache.map((item: any, idx: number) => (
                  <div 
                    key={idx}
                    className="border border-neutral-200 rounded-lg p-4 hover:border-neutral-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div>
                          <label className="text-xs text-neutral-500 block mb-0.5">Key</label>
                          <code className="text-sm font-mono text-slate-700 bg-slate-50 px-2 py-1 rounded">
                            {item.key}
                          </code>
                        </div>
                        <div>
                          <label className="text-xs text-neutral-500 block mb-0.5">Value</label>
                          <div className="text-sm text-neutral-700 bg-neutral-50 px-2 py-1 rounded font-mono">
                            {item.value}
                          </div>
                        </div>
                        {item.expires && (
                          <div>
                            <label className="text-xs text-neutral-500 block mb-0.5">Expires</label>
                            <div className="text-sm text-neutral-600">
                              {item.expires}
                            </div>
                          </div>
                        )}
                      </div>
                      <button className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-neutral-50 rounded-lg p-8 text-center">
                <HardDrive className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
                <p className="text-sm text-neutral-500 mb-3">No cache entries yet</p>
                <button className="px-4 py-2 text-xs bg-white border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors">
                  Add Cache Entry
                </button>
              </div>
            )}
          </div>

          {/* Info Section */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-xs text-amber-800 leading-relaxed mb-2">
              <strong>Cache Manager</strong> simulates browser HTTP caching behavior.
            </p>
            <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
              <li>Reduces redundant requests during load tests</li>
              <li>Respects Cache-Control and Expires headers</li>
              <li>Improves test realism for web applications</li>
            </ul>
          </div>

          {/* Statistics */}
          <div>
            <h4 className="text-sm font-medium text-neutral-900 mb-3">Cache Statistics</h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-green-700">0</div>
                <div className="text-xs text-green-600 mt-1">Hits</div>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-orange-700">0</div>
                <div className="text-xs text-orange-600 mt-1">Misses</div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-blue-700">0%</div>
                <div className="text-xs text-blue-600 mt-1">Hit Rate</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
