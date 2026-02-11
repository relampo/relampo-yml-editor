import { Activity, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { RelampoLeague } from './RelampoLeague';
import { RelampoLeagueExpanded } from './RelampoLeagueExpanded';

export function Dashboard() {
  const { t } = useLanguage();
  const [showExpandedLeague, setShowExpandedLeague] = useState(false);
  
  const stats = [
    { label: t('dashboard.activeTests'), value: '3', icon: Activity, color: 'blue' },
    { label: t('dashboard.avgResponseTime'), value: '156ms', icon: Clock, color: 'green' },
    { label: t('dashboard.successRate'), value: '99.2%', icon: CheckCircle, color: 'emerald' },
    { label: t('dashboard.throughput'), value: '1.2k/s', icon: TrendingUp, color: 'purple' },
  ];

  const recentTests = [
    { name: t('dashboard.ecommerceTest'), status: 'passed', duration: '15m 23s', date: t('dashboard.today') + ', 14:23' },
    { name: t('dashboard.apiGatewayTest'), status: 'running', duration: '3m 12s', date: t('dashboard.today') + ', 14:18' },
    { name: t('dashboard.mobileBackendTest'), status: 'failed', duration: '8m 45s', date: t('dashboard.yesterday') + ', 16:45' },
  ];

  return (
    <div className="h-full overflow-y-auto bg-[#0a0a0a] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-zinc-100">{t('dashboard.title')}</h1>
          <p className="text-zinc-400 mt-1">{t('dashboard.subtitle')}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            const colorMap: Record<string, string> = {
              blue: 'bg-blue-500/10 text-blue-400',
              green: 'bg-green-500/10 text-green-400',
              emerald: 'bg-emerald-500/10 text-emerald-400',
              purple: 'bg-purple-500/10 text-purple-400',
            };
            return (
              <div key={stat.label} className="bg-[#111111] border border-white/5 rounded-lg p-4 shadow-2xl hover:shadow-yellow-400/10 transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-zinc-400">{stat.label}</span>
                  <div className={`p-2 rounded-lg ${colorMap[stat.color]}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-zinc-100 font-semibold">{stat.value}</p>
              </div>
            );
          })}
        </div>

        {/* Main Content - Two Columns */}
        <div className="grid grid-cols-2 gap-6">
          {/* Left Column - Recent Tests */}
          <div className="bg-[#111111] border border-white/5 rounded-lg shadow-2xl">
            <div className="px-6 py-4 border-b border-white/5">
              <h3 className="text-zinc-100">{t('dashboard.recentTests')}</h3>
            </div>
            <div className="divide-y divide-white/5">
              {recentTests.map((test, index) => (
                <div key={index} className="px-6 py-4 flex items-center justify-between hover:bg-white/5 cursor-pointer transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-2 rounded-full ${
                      test.status === 'passed' ? 'bg-green-400' :
                      test.status === 'running' ? 'bg-blue-400 animate-pulse' :
                      'bg-red-400'
                    }`} />
                    <div>
                      <p className="text-sm text-zinc-100">{test.name}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{test.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="text-sm text-zinc-400">{test.duration}</span>
                    <span className={`px-3 py-1 rounded-full text-xs capitalize ${
                      test.status === 'passed' ? 'bg-green-500/10 text-green-400 border border-green-400/30' :
                      test.status === 'running' ? 'bg-blue-500/10 text-blue-400 border border-blue-400/30' :
                      'bg-red-500/10 text-red-400 border border-red-400/30'
                    }`}>
                      {t(`dashboard.status.${test.status}`)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column - Relampo League */}
          <RelampoLeague onViewFull={() => setShowExpandedLeague(true)} />
        </div>
      </div>

      {/* Expanded League Modal */}
      {showExpandedLeague && (
        <RelampoLeagueExpanded onClose={() => setShowExpandedLeague(false)} />
      )}
    </div>
  );
}