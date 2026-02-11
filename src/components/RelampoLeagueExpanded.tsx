import { 
  X, 
  Trophy, 
  TrendingUp, 
  TrendingDown, 
  Award, 
  Search,
  Zap,
  Info,
  Target,
  GitPullRequest,
  Bug
} from 'lucide-react';
import { useState } from 'react';
import { POWER_TIERS, getTierConfig, type TimeRange } from '../types/league';
import { mockLeagueDataMonthly, mockLeagueDataAllTime } from '../data/mockLeagueData';
import { PowerTierIcon } from './PowerTierIcon';

interface RelampoLeagueExpandedProps {
  onClose: () => void;
}

export function RelampoLeagueExpanded({ onClose }: RelampoLeagueExpandedProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('monthly');
  const [searchQuery, setSearchQuery] = useState('');
  const [showInfo, setShowInfo] = useState(false);

  const data = timeRange === 'monthly' ? mockLeagueDataMonthly : mockLeagueDataAllTime;
  
  const filteredData = searchQuery
    ? data.filter(entry => 
        entry.userName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : data;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRankMedal = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return null;
  };

  const getRankStyle = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border-yellow-400/30';
    if (rank === 2) return 'bg-gradient-to-br from-zinc-500/10 to-zinc-400/10 border-zinc-400/30';
    if (rank === 3) return 'bg-gradient-to-br from-orange-500/10 to-amber-500/10 border-orange-400/30';
    return 'bg-[#111111] border-white/5';
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0a0a0a] rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden border border-white/10">
        {/* Header */}
        <div className="p-8 border-b border-white/5 bg-gradient-to-br from-yellow-500/10 to-amber-500/10">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500 flex items-center justify-center shadow-xl shadow-yellow-400/40">
                <svg width="30" height="37" viewBox="0 0 18 22" fill="none">
                  <path d="M10.5 0L0 12.5H7.5L6 22L18 9H10.5V0Z" fill="white" className="drop-shadow-lg"/>
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-zinc-100 mb-1 flex items-center gap-2">
                  Relampo League
                  <Trophy className="w-6 h-6 text-yellow-400" />
                </h1>
                <p className="text-sm text-zinc-400">
                  Measuring technical impact, not consumption
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowInfo(!showInfo)}
                className={`p-2 rounded-lg transition-colors ${
                  showInfo ? 'bg-yellow-500/20 text-yellow-400' : 'hover:bg-white/5 text-zinc-400'
                }`}
              >
                <Info className="w-5 h-5" />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors text-zinc-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Info Panel */}
          {showInfo && (
            <div className="mb-6 p-5 bg-[#111111] border border-white/10 rounded-xl">
              <h3 className="text-sm font-bold text-zinc-100 mb-3 flex items-center gap-2">
                <Info className="w-4 h-4 text-yellow-400" />
                How Relampo League Works
              </h3>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-blue-400 font-semibold text-xs">
                    <Target className="w-3.5 h-3.5" />
                    Performance Explorers
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    <span className="text-yellow-400 font-bold">+1 point</span> per different project tested (max 10/month)
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-green-400 font-semibold text-xs">
                    <GitPullRequest className="w-3.5 h-3.5" />
                    Relampo Contributors
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    <span className="text-yellow-400 font-bold">+2-10 points</span> per accepted PR in YAML, CLI, Recorder, etc.
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-purple-400 font-semibold text-xs">
                    <Bug className="w-3.5 h-3.5" />
                    Issue Detectors
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    <span className="text-yellow-400 font-bold">+1-5 points</span> per valid, relevant or critical issue
                  </p>
                </div>
              </div>
              <div className="pt-3 border-t border-white/5">
                <div className="text-[11px] text-zinc-400 space-y-1">
                  <p>✓ Points are earned monthly and <strong className="text-zinc-300">DO NOT reset</strong></p>
                  <p>✓ There is monthly ranking and all-time ranking</p>
                  <p>✓ Power Tiers represent <strong className="text-zinc-300">behavior</strong>, not just points</p>
                </div>
              </div>
            </div>
          )}

          {/* Filters & Search */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="flex-1 min-w-[240px] relative">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-[#111111] border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500/50 text-zinc-100 placeholder:text-zinc-600"
              />
            </div>

            {/* Time Range */}
            <div className="flex items-center gap-1 bg-[#111111] rounded-lg p-0.5 border border-white/10">
              <button
                onClick={() => setTimeRange('monthly')}
                className={`px-4 py-2 text-sm rounded-md transition-colors font-medium ${
                  timeRange === 'monthly'
                    ? 'bg-yellow-500/20 text-yellow-400 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setTimeRange('all-time')}
                className={`px-4 py-2 text-sm rounded-md transition-colors font-medium ${
                  timeRange === 'all-time'
                    ? 'bg-yellow-500/20 text-yellow-400 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                All-time
              </button>
            </div>
          </div>
        </div>

        {/* Monthly Rewards Banner */}
        <div className="px-8 py-5 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-b border-yellow-400/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-yellow-400" />
              <div>
                <div className="font-bold text-sm text-zinc-100">Monthly Rewards — Top 3</div>
                <div className="text-xs text-zinc-400">Applied automatically for 1 month</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center px-4 py-2 bg-[#111111] border border-white/10 rounded-lg">
                <div className="text-xs text-zinc-500 mb-1">Virtual Users</div>
                <div className="text-lg font-bold text-yellow-400">
                  <span className="text-zinc-600 line-through mr-2 text-sm">500</span>750
                </div>
              </div>
              <div className="text-center px-4 py-2 bg-[#111111] border border-white/10 rounded-lg">
                <div className="text-xs text-zinc-500 mb-1">Load Generators</div>
                <div className="text-lg font-bold text-yellow-400">
                  <span className="text-zinc-600 line-through mr-2 text-sm">4</span>6
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Power Tiers Legend */}
        <div className="px-8 py-4 border-b border-white/5 bg-[#0a0a0a]">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Power Tiers:</span>
            {POWER_TIERS.map((tier) => (
              <div key={tier.name} className={`px-3 py-1.5 text-xs font-semibold rounded-lg border ${tier.bgColor} ${tier.color} ${tier.borderColor} flex items-center gap-1.5`}>
                <PowerTierIcon tier={tier.name} className="w-3 h-3" />
                <span>{tier.name}</span>
                <span className="text-[10px] opacity-60">({tier.minPoints}+ pts)</span>
              </div>
            ))}
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="flex-1 overflow-y-auto">
          {filteredData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center px-4">
              <Search className="w-12 h-12 text-zinc-700 mb-3" />
              <h3 className="font-semibold text-zinc-100 mb-1">No results found</h3>
              <p className="text-sm text-zinc-500">Try adjusting your search</p>
            </div>
          ) : (
            <div className="p-6 space-y-2">
              {filteredData.map((entry) => {
                const tierConfig = getTierConfig(entry.currentTier);
                const medal = getRankMedal(entry.rank);
                
                return (
                  <div
                    key={entry.userId}
                    className={`border rounded-xl p-4 transition-all hover:shadow-lg ${getRankStyle(entry.rank)}`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Rank */}
                      <div className="w-12 flex flex-col items-center">
                        {medal ? (
                          <>
                            <div className="text-2xl mb-1">{medal}</div>
                            <div className="text-xs font-semibold text-zinc-500">
                              #{entry.rank}
                            </div>
                          </>
                        ) : (
                          <div className="text-lg font-bold text-zinc-400">
                            #{entry.rank}
                          </div>
                        )}
                      </div>

                      {/* Avatar */}
                      <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg text-sm">
                        {getInitials(entry.userName)}
                      </div>

                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-bold text-zinc-100 text-base">
                            {entry.userName}
                          </span>
                          {entry.delta !== undefined && entry.delta !== 0 && (
                            <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                              entry.delta > 0 
                                ? 'bg-green-500/20 text-green-400 border border-green-400/30' 
                                : 'bg-red-500/20 text-red-400 border border-red-400/30'
                            }`}>
                              {entry.delta > 0 ? (
                                <TrendingUp className="w-3 h-3" />
                              ) : (
                                <TrendingDown className="w-3 h-3" />
                              )}
                              {Math.abs(entry.delta)}
                            </span>
                          )}
                        </div>

                        {/* Power Tier & Monthly Wins */}
                        <div className="flex items-center gap-2 mb-2">
                          {tierConfig && (
                            <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${tierConfig.bgColor} ${tierConfig.color} ${tierConfig.borderColor} flex items-center gap-1.5`}>
                              <PowerTierIcon tier={entry.currentTier!} className="w-3 h-3" />
                              <span>{tierConfig.name}</span>
                            </span>
                          )}
                          {entry.monthlyWins.length > 0 && (
                            <span className="px-2.5 py-1 text-xs font-bold rounded-lg border bg-amber-500/20 text-amber-400 border-amber-400/30 flex items-center gap-1.5">
                              <Award className="w-3 h-3" />
                              <span>{entry.monthlyWins[0]} Winner</span>
                            </span>
                          )}
                          {entry.monthlyWins.length > 1 && (
                            <span className="text-[10px] text-zinc-500">
                              +{entry.monthlyWins.length - 1} more
                            </span>
                          )}
                        </div>

                        {/* Points Breakdown */}
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                            <span className="text-zinc-400">{entry.pointsBreakdown.explorers} explorers</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="w-2 h-2 rounded-full bg-green-400"></span>
                            <span className="text-zinc-400">{entry.pointsBreakdown.contributors} contrib</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                            <span className="text-zinc-400">{entry.pointsBreakdown.detectors} issues</span>
                          </div>
                        </div>
                      </div>

                      {/* Total Points */}
                      <div className="text-right">
                        <div className="text-3xl font-bold text-zinc-100 mb-1">
                          {entry.totalPoints}
                        </div>
                        <div className="text-xs text-zinc-500 font-medium uppercase tracking-wide">
                          Points
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 bg-[#0a0a0a]">
          <div className="flex items-center justify-between">
            <div className="text-sm text-zinc-400">
              Showing <span className="font-semibold text-zinc-200">{filteredData.length}</span> {filteredData.length === 1 ? 'user' : 'users'}
            </div>
            <button
              onClick={onClose}
              className="px-5 py-2 bg-white/5 border border-white/10 rounded-lg text-sm font-medium text-zinc-300 hover:bg-white/10 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}