import type { ScriptNode } from '../../types/script';
import { Clock } from 'lucide-react';

interface TimerDetailProps {
  node: ScriptNode;
}

export function TimerDetail({ node }: TimerDetailProps) {
  const data = node.data || { duration: 0, variance: 0 };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-neutral-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-neutral-900">{node.name}</h3>
            <p className="text-sm text-neutral-600 mt-1">
              Simulates user think time between requests
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-cyan-100 text-cyan-700">
            <Clock className="w-4 h-4" />
            <span className="text-xs">Timer</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6">
          {/* Duration */}
          <div>
            <label className="block text-sm text-neutral-700 mb-2">Duration (ms)</label>
            <input
              type="number"
              value={data.duration}
              readOnly
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-neutral-50 text-sm"
            />
            <p className="text-xs text-neutral-500 mt-1">
              Base delay duration in milliseconds
            </p>
          </div>

          {/* Variance */}
          <div>
            <label className="block text-sm text-neutral-700 mb-2">Random Variance (ms)</label>
            <input
              type="number"
              value={data.variance}
              readOnly
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-neutral-50 text-sm"
            />
            <p className="text-xs text-neutral-500 mt-1">
              Random variance added/subtracted from duration (±{data.variance}ms)
            </p>
          </div>

          {/* Calculated Range */}
          <div className="p-4 bg-cyan-50 border border-cyan-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-cyan-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-cyan-900">Actual Delay Range</p>
                <p className="text-xs text-cyan-700 mt-1">
                  Between {data.duration - data.variance}ms and {data.duration + data.variance}ms
                </p>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg">
            <p className="text-xs text-neutral-700">
              Timers help simulate realistic user behavior by introducing delays between requests.
              The random variance makes the load pattern more natural and less predictable.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
