import { Loader2, Trophy } from 'lucide-react';

export function RelampoLeagueLoading() {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-neutral-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500 flex items-center justify-center shadow-lg shadow-yellow-400/40">
              <svg width="20" height="24" viewBox="0 0 20 24" fill="none">
                <path d="M11 0L0 13H8.5L6.5 24L20 10H11V0Z" fill="white" className="drop-shadow-lg"/>
              </svg>
            </div>
            <div>
              <h2 className="font-semibold text-neutral-900">Relampo League</h2>
              <p className="text-xs text-neutral-500">Top performers this period</p>
            </div>
          </div>
          <Trophy className="w-5 h-5 text-amber-500" />
        </div>
      </div>

      {/* Loading State */}
      <div className="p-12 flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
        <p className="text-sm text-neutral-600">Loading leaderboard...</p>
      </div>
    </div>
  );
}

export function RelampoLeagueEmpty() {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-neutral-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500 flex items-center justify-center shadow-lg shadow-yellow-400/40">
              <svg width="20" height="24" viewBox="0 0 20 24" fill="none">
                <path d="M11 0L0 13H8.5L6.5 24L20 10H11V0Z" fill="white" className="drop-shadow-lg"/>
              </svg>
            </div>
            <div>
              <h2 className="font-semibold text-neutral-900">Relampo League</h2>
              <p className="text-xs text-neutral-500">Top performers this period</p>
            </div>
          </div>
          <Trophy className="w-5 h-5 text-amber-500" />
        </div>
      </div>

      {/* Empty State */}
      <div className="p-12 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
          <Trophy className="w-8 h-8 text-neutral-400" />
        </div>
        <h3 className="font-semibold text-neutral-900 mb-2">No data yet</h3>
        <p className="text-sm text-neutral-600 max-w-xs">
          Start running tests to see your team appear on the leaderboard!
        </p>
      </div>
    </div>
  );
}