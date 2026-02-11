import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { RelampoLeague } from './RelampoLeague';
import { RelampoLeagueExpanded } from './RelampoLeagueExpanded';
import { RelampoLeagueLoading, RelampoLeagueEmpty } from './RelampoLeagueStates';

export function ComponentsShowcase() {
  const [showExpanded, setShowExpanded] = useState(false);
  const [currentView, setCurrentView] = useState<'default' | 'loading' | 'empty'>('default');

  return (
    <div className="min-h-screen bg-neutral-50 p-8">
      {/* Header */}
      <div className="mb-12 pb-8 border-b-2 border-neutral-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500 flex items-center justify-center shadow-xl shadow-yellow-400/40">
            <svg width="32" height="38" viewBox="0 0 32 38" fill="none">
              <path d="M18.5 0L0 21H14L10.5 38L32 16.5H18.5V0Z" fill="white" className="drop-shadow-lg"/>
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">Relampo League Component</h1>
            <p className="text-neutral-600">Gamification system for performance testing teams</p>
          </div>
        </div>
      </div>

      {/* Overview */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-neutral-900 mb-6 flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500 flex items-center justify-center">
            <svg width="12" height="14" viewBox="0 0 12 14" fill="none">
              <path d="M7 0L0 7.5H5L3.5 14L12 6H7V0Z" fill="white"/>
            </svg>
          </div>
          System Overview
        </h2>
        
        <div className="grid grid-cols-3 gap-6 mb-6">
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl p-6">
            <div className="text-lg font-bold text-purple-900 mb-2">5 Levels</div>
            <div className="text-sm text-purple-700 mb-3">Progressive achievement tiers</div>
            <div className="space-y-1 text-xs text-purple-800">
              <div>⚡ Spark (1-5h)</div>
              <div>🔥 Bolt (6-20h) → +2h</div>
              <div>⛈️ Thunder (21-50h) → +5h</div>
              <div>🌪️ Storm (51-100h) → +10h</div>
              <div>⚡ Lightning (100h+) → +20h</div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6">
            <div className="text-lg font-bold text-green-900 mb-2">6 Badges</div>
            <div className="text-sm text-green-700 mb-3">Achievement recognition</div>
            <div className="space-y-1 text-xs text-green-800">
              <div>🎯 Consistency</div>
              <div>🛡️ Regression Guardian</div>
              <div>🔍 Signal Hunter</div>
              <div>🔨 Scenario Builder</div>
              <div>🤝 Team Enabler</div>
              <div>✨ Clean Runner</div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-6">
            <div className="text-lg font-bold text-blue-900 mb-2">Bonus Hours</div>
            <div className="text-sm text-blue-700 mb-3">Monthly rewards</div>
            <div className="space-y-2 text-xs text-blue-800">
              <div className="bg-white border border-blue-200 rounded p-2">
                Automatically added at month-end based on performance level
              </div>
              <div className="bg-white border border-blue-200 rounded p-2">
                Drives consistent usage and engagement
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-neutral-900 mb-6">Key Features</h2>
        
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white border border-neutral-200 rounded-xl p-6">
            <h3 className="font-semibold text-neutral-900 mb-3">Filtering & Scoping</h3>
            <ul className="space-y-2 text-sm text-neutral-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span><strong>Time Range:</strong> This month, Last 30 days, All time</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span><strong>Metrics:</strong> Hours or Runs</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span><strong>Scope:</strong> Organization, Team, or Project</span>
              </li>
            </ul>
          </div>

          <div className="bg-white border border-neutral-200 rounded-xl p-6">
            <h3 className="font-semibold text-neutral-900 mb-3">Visual Elements</h3>
            <ul className="space-y-2 text-sm text-neutral-700">
              <li className="flex items-start gap-2">
                <span className="text-purple-600">•</span>
                <span><strong>Rankings:</strong> #1-3 with medal icons, #4+ with numbers</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600">•</span>
                <span><strong>Progress bars:</strong> Visual progress to next level</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600">•</span>
                <span><strong>Delta indicators:</strong> Trending up/down from previous period</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Component States */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-neutral-900 mb-6 flex items-center gap-2">
          <ArrowLeft className="w-6 h-6 text-blue-600" />
          Component States
        </h2>

        <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm font-medium text-neutral-700">View state:</span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentView('default')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  currentView === 'default'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-neutral-700 hover:bg-neutral-100'
                }`}
              >
                Default
              </button>
              <button
                onClick={() => setCurrentView('loading')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  currentView === 'loading'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-neutral-700 hover:bg-neutral-100'
                }`}
              >
                Loading
              </button>
              <button
                onClick={() => setCurrentView('empty')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  currentView === 'empty'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-neutral-700 hover:bg-neutral-100'
                }`}
              >
                Empty
              </button>
            </div>
          </div>
        </div>

        {/* Widget Preview */}
        <div className="grid grid-cols-2 gap-8">
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">Compact Widget</h3>
            {currentView === 'loading' ? (
              <RelampoLeagueLoading />
            ) : currentView === 'empty' ? (
              <RelampoLeagueEmpty />
            ) : (
              <RelampoLeague onViewFull={() => setShowExpanded(true)} />
            )}
          </div>

          <div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">Implementation Notes</h3>
            <div className="bg-white border border-neutral-200 rounded-xl p-6 space-y-4">
              <div>
                <div className="font-mono text-sm text-blue-900 mb-2">Compact Widget</div>
                <ul className="text-xs text-neutral-600 space-y-1">
                  <li>• Top 10 users only</li>
                  <li>• Fits in dashboard sidebar/column</li>
                  <li>• Click "View full leaderboard" to expand</li>
                  <li>• Shows rewards footer</li>
                </ul>
              </div>
              
              <div>
                <div className="font-mono text-sm text-purple-900 mb-2">Expanded View</div>
                <ul className="text-xs text-neutral-600 space-y-1">
                  <li>• Shows up to 50 users</li>
                  <li>• Full-screen modal overlay</li>
                  <li>• Search functionality</li>
                  <li>• Enhanced filtering</li>
                </ul>
              </div>

              <div>
                <div className="font-mono text-sm text-green-900 mb-2">States</div>
                <ul className="text-xs text-neutral-600 space-y-1">
                  <li>• <strong>Loading:</strong> Skeleton UI while fetching</li>
                  <li>• <strong>Empty:</strong> First-time user guidance</li>
                  <li>• <strong>Default:</strong> Populated leaderboard</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Design Specifications */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-neutral-900 mb-6">Design Specifications</h2>
        
        <div className="bg-white border border-neutral-200 rounded-xl p-6">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-neutral-900 mb-4">Typography & Spacing</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between py-2 border-b border-neutral-100">
                  <span className="text-neutral-600">Rank number</span>
                  <code className="bg-neutral-100 px-2 py-1 rounded text-xs">#1: text-yellow-600, #2: text-neutral-400, #3: text-orange-600</code>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-neutral-100">
                  <span className="text-neutral-600">User name</span>
                  <code className="bg-neutral-100 px-2 py-1 rounded text-xs">text-sm font-medium</code>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-neutral-100">
                  <span className="text-neutral-600">Metric value</span>
                  <code className="bg-neutral-100 px-2 py-1 rounded text-xs">text-lg font-bold</code>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-neutral-100">
                  <span className="text-neutral-600">Badge text</span>
                  <code className="bg-neutral-100 px-2 py-1 rounded text-xs">text-[10px] font-medium</code>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-neutral-100">
                  <span className="text-neutral-600">Row padding</span>
                  <code className="bg-neutral-100 px-2 py-1 rounded text-xs">px-6 py-3</code>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-neutral-900 mb-4">Colors & Effects</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between py-2 border-b border-neutral-100">
                  <span className="text-neutral-600">Progress bar</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-16 bg-gradient-to-r from-purple-500 to-blue-600 rounded-full"></div>
                    <code className="bg-neutral-100 px-2 py-1 rounded text-xs">purple-500 → blue-600</code>
                  </div>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-neutral-100">
                  <span className="text-neutral-600">Row hover</span>
                  <code className="bg-neutral-100 px-2 py-1 rounded text-xs">hover:bg-neutral-50</code>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-neutral-100">
                  <span className="text-neutral-600">Shadow</span>
                  <code className="bg-neutral-100 px-2 py-1 rounded text-xs">shadow-sm</code>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-neutral-100">
                  <span className="text-neutral-600">Border radius</span>
                  <code className="bg-neutral-100 px-2 py-1 rounded text-xs">rounded-xl (12px)</code>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Usage Examples */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-neutral-900 mb-6">Code Example</h2>
        
        <div className="bg-neutral-900 text-green-400 p-6 rounded-xl font-mono text-sm overflow-x-auto">
          <pre>{`import { RelampoLeague } from './components/RelampoLeague';
import { RelampoLeagueExpanded } from './components/RelampoLeagueExpanded';

function Dashboard() {
  const [showExpanded, setShowExpanded] = useState(false);

  return (
    <div>
      {/* Compact widget in dashboard */}
      <RelampoLeague 
        onViewFull={() => setShowExpanded(true)} 
      />

      {/* Expanded modal view */}
      {showExpanded && (
        <RelampoLeagueExpanded 
          onClose={() => setShowExpanded(false)} 
        />
      )}
    </div>
  );
}`}</pre>
        </div>
      </section>

      {/* Expanded View Modal */}
      {showExpanded && (
        <RelampoLeagueExpanded onClose={() => setShowExpanded(false)} />
      )}
    </div>
  );
}