import { Trophy, TrendingUp, Sparkles, Zap, Award, ChevronRight } from 'lucide-react';
import { mockLeagueDataMonthly, mockLeagueDataAllTime } from '../data/mockLeagueData';
import { PowerTierIcon } from './PowerTierIcon';
import { getTierConfig, type TimeRange } from '../types/league';

interface LeagueSectionProps {
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;
}

export function LandingPageLeagueSection({ timeRange, setTimeRange }: LeagueSectionProps) {
  const data = timeRange === 'monthly' ? mockLeagueDataMonthly : mockLeagueDataAllTime;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-400';
    if (rank === 2) return 'text-zinc-400';
    if (rank === 3) return 'text-orange-400';
    return 'text-zinc-600';
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return null;
  };

  return (
    <section id="league" className="py-12 md:py-16">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-4">
          <Trophy className="h-4 w-4 text-[#facc15]" />
          Relampo League
        </div>
        <h2 className="text-4xl font-bold tracking-tight md:text-5xl mb-4">
          Compete with the
          <span className="block bg-gradient-to-r from-[#fde047] via-[#facc15] to-[#eab308] bg-clip-text text-transparent">
            performance testing community
          </span>
        </h2>
        <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
          Earn points for testing, contributing, and finding issues. Climb the ranks and win monthly rewards.
        </p>
      </div>

      <div className="max-w-3xl mx-auto">
        {/* League Widget */}
        <div className="bg-[#111111] rounded-xl border border-white/5 shadow-2xl overflow-hidden relative">
          {/* Coming Soon Badge */}
          <div className="absolute top-4 right-4 z-10 inline-flex items-center gap-2 rounded-full bg-[#facc15]/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#facc15] border border-[#facc15]/30">
            <Sparkles className="h-3 w-3" />
            Coming Soon
          </div>

          {/* Header */}
          <div className="p-6 border-b border-white/5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500 flex items-center justify-center shadow-lg shadow-yellow-400/40">
                  <svg width="18" height="22" viewBox="0 0 18 22" fill="none">
                    <path d="M10.5 0L0 12.5H7.5L6 22L18 9H10.5V0Z" fill="white" className="drop-shadow-lg"/>
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-zinc-100 flex items-center gap-2">
                    Relampo League
                    <Trophy className="w-4 h-4 text-yellow-400" />
                  </h3>
                  <p className="text-xs text-zinc-500">
                    {timeRange === 'monthly' ? 'Top performers this month' : 'All-time rankings'}
                  </p>
                </div>
              </div>
            </div>

            {/* Time Range Toggle */}
            <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5 border border-white/10">
              <button
                onClick={() => setTimeRange('monthly')}
                className={`flex-1 px-3 py-1.5 text-xs rounded-md transition-colors font-medium ${
                  timeRange === 'monthly'
                    ? 'bg-yellow-500/20 text-yellow-400 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setTimeRange('all-time')}
                className={`flex-1 px-3 py-1.5 text-xs rounded-md transition-colors font-medium ${
                  timeRange === 'all-time'
                    ? 'bg-yellow-500/20 text-yellow-400 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                All-time
              </button>
            </div>
          </div>

          {/* Leaderboard */}
          <div className="divide-y divide-white/5">
            {data.slice(0, 10).map((entry) => {
              const tierConfig = getTierConfig(entry.currentTier);
              const rankBadge = getRankBadge(entry.rank);
              
              return (
                <div
                  key={entry.userId}
                  className="px-6 py-3.5 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {/* Rank */}
                    <div className="w-8 flex items-center justify-center">
                      {rankBadge ? (
                        <span className="text-xl">{rankBadge}</span>
                      ) : (
                        <span className={`font-bold text-sm ${getRankColor(entry.rank)}`}>
                          #{entry.rank}
                        </span>
                      )}
                    </div>

                    {/* Avatar */}
                    <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-semibold shadow-lg">
                      {getInitials(entry.userName)}
                    </div>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-zinc-100 truncate">
                          {entry.userName}
                        </span>
                        {entry.delta !== undefined && entry.delta !== 0 && (
                          <span className={`flex items-center gap-0.5 text-xs ${
                            entry.delta > 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {entry.delta > 0 ? (
                              <TrendingUp className="w-3 h-3" />
                            ) : (
                              <TrendingUp className="w-3 h-3 rotate-180" />
                            )}
                            {Math.abs(entry.delta)}
                          </span>
                        )}
                      </div>

                      {/* Power Tier & Monthly Wins */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {tierConfig && (
                          <span
                            className={`px-2 py-0.5 text-[10px] font-semibold rounded border ${tierConfig.bgColor} ${tierConfig.color} ${tierConfig.borderColor} flex items-center gap-1`}
                          >
                            <PowerTierIcon tier={entry.currentTier!} className="w-2.5 h-2.5" />
                            {tierConfig.name}
                          </span>
                        )}
                        {entry.monthlyWins.length > 0 && (
                          <span className="px-2 py-0.5 text-[10px] font-semibold rounded border bg-amber-500/10 text-amber-400 border-amber-400/30 flex items-center gap-1">
                            <Award className="w-2.5 h-2.5" />
                            {entry.monthlyWins[0]}
                          </span>
                        )}
                      </div>

                      {/* Points Breakdown */}
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                          <span>{entry.pointsBreakdown.explorers} exp</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                          <span>{entry.pointsBreakdown.contributors} contrib</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                          <span>{entry.pointsBreakdown.detectors} issues</span>
                        </div>
                      </div>
                    </div>

                    {/* Total Points */}
                    <div className="text-right">
                      <div className="text-lg font-bold text-zinc-100">
                        {entry.totalPoints}
                      </div>
                      <div className="text-[10px] text-zinc-500 font-medium">
                        points
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Monthly Rewards Info */}
          <div className="p-5 bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border-t border-yellow-400/20">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-yellow-400" />
              <div className="text-xs text-zinc-300 font-semibold">Monthly Rewards — Top 3</div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-white/5 border border-white/10 rounded-lg p-2 text-center">
                <div className="text-yellow-400 font-bold mb-0.5">
                  <span className="text-zinc-600 line-through mr-1">500</span>750
                </div>
                <div className="text-zinc-500">Virtual Users</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg p-2 text-center">
                <div className="text-yellow-400 font-bold mb-0.5">
                  <span className="text-zinc-600 line-through mr-1">4</span>6
                </div>
                <div className="text-zinc-500">Load Generators</div>
              </div>
            </div>
            <p className="text-[10px] text-zinc-500 text-center mt-2">
              Rewards applied automatically for 1 month
            </p>
          </div>

          {/* CTA */}
          <button
            disabled
            className="w-full px-6 py-3 flex items-center justify-center gap-2 text-sm font-medium text-zinc-500 cursor-not-allowed border-t border-white/5 opacity-60"
          >
            View full leaderboard (Coming Soon)
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
}