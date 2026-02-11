import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Activity, Cpu, HardDrive, Database } from 'lucide-react';

export function MonitoringView() {
  // Mock data for charts
  const responseTimeData = [
    { time: '0s', responseTime: 120, concurrency: 10, errors: 0, requests: 45 },
    { time: '10s', responseTime: 145, concurrency: 25, errors: 0, requests: 98 },
    { time: '20s', responseTime: 132, concurrency: 50, errors: 1, requests: 156 },
    { time: '30s', responseTime: 168, concurrency: 75, errors: 2, requests: 234 },
    { time: '40s', responseTime: 195, concurrency: 100, errors: 3, requests: 312 },
    { time: '50s', responseTime: 178, concurrency: 100, errors: 1, requests: 298 },
    { time: '60s', responseTime: 156, concurrency: 100, errors: 0, requests: 287 },
  ];

  const cpuMemoryData = [
    { time: '0s', cpu: 15, memory: 42, disk: 35, network: 12 },
    { time: '10s', cpu: 28, memory: 48, disk: 38, network: 25 },
    { time: '20s', cpu: 45, memory: 56, disk: 42, network: 48 },
    { time: '30s', cpu: 68, memory: 65, disk: 45, network: 72 },
    { time: '40s', cpu: 82, memory: 78, disk: 48, network: 85 },
    { time: '50s', cpu: 75, memory: 72, disk: 46, network: 78 },
    { time: '60s', cpu: 65, memory: 68, disk: 44, network: 65 },
  ];

  const currentMetrics = [
    { label: 'Requests', value: '1,248', unit: 'total', icon: Activity, color: 'blue' },
    { label: 'Avg Response Time', value: '156', unit: 'ms', icon: Activity, color: 'green' },
    { label: 'Error %', value: '0.56', unit: '%', icon: Activity, color: 'red' },
    { label: 'Concurrency', value: '100', unit: 'users', icon: Activity, color: 'purple' },
  ];

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-zinc-100">Performance Monitoring</h3>
            <p className="text-sm text-zinc-400 mt-1">
              Real-time metrics and system resource utilization
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-sm text-zinc-300">Live</span>
          </div>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="px-6 py-4 border-b border-white/5 bg-[#0a0a0a]">
        <div className="grid grid-cols-6 gap-4">
          {/* Metric Cards */}
          <div className="bg-[#111111] border border-white/5 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-zinc-400">Requests</span>
            </div>
            <p className="text-zinc-100">1,248</p>
          </div>
          <div className="bg-[#111111] border border-white/5 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-neutral-600" />
              <span className="text-xs text-zinc-400">Count</span>
            </div>
            <p className="text-zinc-100">287</p>
          </div>
          <div className="bg-[#111111] border border-white/5 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-red-400" />
              <span className="text-xs text-zinc-400">Fails</span>
            </div>
            <p className="text-zinc-100">7</p>
          </div>
          <div className="bg-[#111111] border border-white/5 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-zinc-400">Error %</span>
            </div>
            <p className="text-zinc-100">0.56%</p>
          </div>
          <div className="bg-[#111111] border border-white/5 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-green-400" />
              <span className="text-xs text-zinc-400">Avg (ms)</span>
            </div>
            <p className="text-zinc-100">156</p>
          </div>
          <div className="bg-[#111111] border border-white/5 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-zinc-400">P95 (ms)</span>
            </div>
            <p className="text-zinc-100">234</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6">
          {/* Global Overview - Response Time & Concurrency */}
          <div className="bg-white border border-neutral-200 rounded-lg p-4">
            <h4 className="text-sm text-neutral-900 mb-4">Global Overview</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={responseTimeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="time" 
                    tick={{ fontSize: 12 }}
                    stroke="#9ca3af"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    stroke="#9ca3af"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: '12px' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="responseTime" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="Response Time (ms)"
                    dot={{ r: 3 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="concurrency" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    name="Concurrency"
                    dot={{ r: 3 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="errors" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    name="Errors"
                    dot={{ r: 3 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="requests" 
                    stroke="#8b5cf6" 
                    strokeWidth={2}
                    name="Requests/sec"
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Detailed Metrics - CPU & Memory */}
          <div className="grid grid-cols-2 gap-6">
            {/* CPU Usage */}
            <div className="bg-white border border-neutral-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <Cpu className="w-4 h-4 text-blue-600" />
                <h4 className="text-sm text-neutral-900">CPU Usage</h4>
              </div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cpuMemoryData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="time" 
                      tick={{ fontSize: 11 }}
                      stroke="#9ca3af"
                    />
                    <YAxis 
                      tick={{ fontSize: 11 }}
                      stroke="#9ca3af"
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '11px'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="cpu" 
                      stroke="#3b82f6" 
                      fill="#3b82f6" 
                      fillOpacity={0.2}
                      name="CPU %"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Memory Usage */}
            <div className="bg-white border border-neutral-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <Database className="w-4 h-4 text-green-600" />
                <h4 className="text-sm text-neutral-900">Memory Usage</h4>
              </div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cpuMemoryData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="time" 
                      tick={{ fontSize: 11 }}
                      stroke="#9ca3af"
                    />
                    <YAxis 
                      tick={{ fontSize: 11 }}
                      stroke="#9ca3af"
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '11px'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="memory" 
                      stroke="#10b981" 
                      fill="#10b981" 
                      fillOpacity={0.2}
                      name="Memory %"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Disk I/O */}
            <div className="bg-white border border-neutral-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <HardDrive className="w-4 h-4 text-purple-600" />
                <h4 className="text-sm text-neutral-900">Disk I/O</h4>
              </div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cpuMemoryData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="time" 
                      tick={{ fontSize: 11 }}
                      stroke="#9ca3af"
                    />
                    <YAxis 
                      tick={{ fontSize: 11 }}
                      stroke="#9ca3af"
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '11px'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="disk" 
                      stroke="#8b5cf6" 
                      fill="#8b5cf6" 
                      fillOpacity={0.2}
                      name="Disk %"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Network I/O */}
            <div className="bg-white border border-neutral-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4 text-amber-600" />
                <h4 className="text-sm text-neutral-900">Network I/O</h4>
              </div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cpuMemoryData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="time" 
                      tick={{ fontSize: 11 }}
                      stroke="#9ca3af"
                    />
                    <YAxis 
                      tick={{ fontSize: 11 }}
                      stroke="#9ca3af"
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '11px'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="network" 
                      stroke="#f59e0b" 
                      fill="#f59e0b" 
                      fillOpacity={0.2}
                      name="Network MB/s"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}