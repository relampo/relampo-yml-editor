import { Play, Settings, Users, Server } from 'lucide-react';

export function GenerationView() {
  return (
    <div className="h-full flex flex-col bg-[#0a0a0a]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-zinc-100">Load Test Generation</h3>
            <p className="text-sm text-zinc-400 mt-1">
              Configure and execute distributed performance tests
            </p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-300 hover:to-yellow-400 text-black font-semibold rounded-lg transition-colors shadow-lg shadow-yellow-400/30">
            <Play className="w-4 h-4" />
            Start Test
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6">
          {/* Load Profile */}
          <div>
            <label className="block text-sm text-zinc-300 mb-3">Load Profile</label>
            <div className="grid grid-cols-3 gap-3">
              <button className="px-4 py-3 border-2 border-yellow-400 bg-yellow-500/10 rounded-lg text-left">
                <p className="text-sm text-yellow-400">Ramp Up</p>
                <p className="text-xs text-yellow-500 mt-1">Gradually increase load</p>
              </button>
              <button className="px-4 py-3 border border-white/10 bg-[#111111] rounded-lg text-left hover:border-white/20">
                <p className="text-sm text-zinc-100">Spike</p>
                <p className="text-xs text-zinc-400 mt-1">Sudden traffic spike</p>
              </button>
              <button className="px-4 py-3 border border-white/10 bg-[#111111] rounded-lg text-left hover:border-white/20">
                <p className="text-sm text-zinc-100">Sustained</p>
                <p className="text-xs text-zinc-400 mt-1">Constant load over time</p>
              </button>
            </div>
          </div>

          {/* Virtual Users */}
          <div>
            <label className="block text-sm text-zinc-300 mb-2">Virtual Users</label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Initial Users</label>
                <div className="relative">
                  <Users className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                  <input
                    type="number"
                    defaultValue={10}
                    className="w-full pl-10 pr-3 py-2 border border-white/10 bg-[#111111] text-zinc-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Target Users</label>
                <div className="relative">
                  <Users className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                  <input
                    type="number"
                    defaultValue={100}
                    className="w-full pl-10 pr-3 py-2 border border-white/10 bg-[#111111] text-zinc-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm text-zinc-300 mb-2">Test Duration</label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Ramp-up Period (min)</label>
                <input
                  type="number"
                  defaultValue={5}
                  className="w-full px-3 py-2 border border-white/10 bg-[#111111] text-zinc-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Hold Duration (min)</label>
                <input
                  type="number"
                  defaultValue={10}
                  className="w-full px-3 py-2 border border-white/10 bg-[#111111] text-zinc-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
          </div>

          {/* Distributed Execution */}
          <div>
            <label className="block text-sm text-zinc-300 mb-3">Distributed Execution</label>
            <div className="space-y-3">
              <div className="flex items-center gap-3 px-4 py-3 bg-[#111111] border border-white/10 rounded-lg">
                <Server className="w-5 h-5 text-blue-400" />
                <div className="flex-1">
                  <p className="text-sm text-zinc-100">us-east-1 (Primary)</p>
                  <p className="text-xs text-zinc-400">4 runners available</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400">50%</span>
                  <input type="checkbox" defaultChecked className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-center gap-3 px-4 py-3 bg-[#111111] border border-white/10 rounded-lg">
                <Server className="w-5 h-5 text-blue-400" />
                <div className="flex-1">
                  <p className="text-sm text-zinc-100">eu-west-1</p>
                  <p className="text-xs text-zinc-400">4 runners available</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400">30%</span>
                  <input type="checkbox" defaultChecked className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-center gap-3 px-4 py-3 bg-[#111111] border border-white/10 rounded-lg">
                <Server className="w-5 h-5 text-zinc-600" />
                <div className="flex-1">
                  <p className="text-sm text-zinc-100">ap-southeast-1</p>
                  <p className="text-xs text-zinc-400">4 runners available</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400">20%</span>
                  <input type="checkbox" className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>

          {/* Advanced Settings */}
          <div>
            <button className="flex items-center gap-2 text-sm text-yellow-400 hover:text-yellow-300">
              <Settings className="w-4 h-4" />
              Advanced Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}