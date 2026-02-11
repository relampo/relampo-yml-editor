import type { ScriptNode, AssertionData } from '../../types/script';
import { CheckCircle, XCircle } from 'lucide-react';

interface AssertionDetailProps {
  node: ScriptNode;
}

export function AssertionDetail({ node }: AssertionDetailProps) {
  const data = node.data as AssertionData;

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-zinc-100">{node.name}</h3>
            <p className="text-sm text-zinc-400 mt-1">
              Validate response data and ensure expected behavior
            </p>
          </div>
          {data.passed !== undefined && (
            <div className={`flex items-center gap-2 px-3 py-1 rounded-md ${
              data.passed
                ? 'bg-green-500/10 text-green-400 border border-green-400/30'
                : 'bg-red-500/10 text-red-400 border border-red-400/30'
            }`}>
              {data.passed ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-xs">Passed</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4" />
                  <span className="text-xs">Failed</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6">
          {/* Assertion Type */}
          <div>
            <label className="block text-sm text-zinc-300 mb-2">Assertion Type</label>
            <select
              value={data.assertionType}
              disabled
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-neutral-50 text-sm"
            >
              <option value="response-code">Response Code</option>
              <option value="response-text">Response Text</option>
              <option value="json-path">JSON Path</option>
            </select>
          </div>

          {/* Condition */}
          <div>
            <label className="block text-sm text-neutral-700 mb-2">Condition</label>
            <input
              type="text"
              value={data.condition}
              readOnly
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-neutral-50 text-sm font-mono"
            />
          </div>

          {/* Expected Value */}
          <div>
            <label className="block text-sm text-neutral-700 mb-2">Expected Value</label>
            <input
              type="text"
              value={data.expected}
              readOnly
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-neutral-50 text-sm font-mono"
            />
          </div>

          {/* Actual Value */}
          {data.actual !== undefined && (
            <div>
              <label className="block text-sm text-neutral-700 mb-2">Actual Value</label>
              <div className={`px-3 py-2 border rounded-lg text-sm font-mono ${
                data.passed
                  ? 'bg-green-50 border-green-200 text-green-900'
                  : 'bg-red-50 border-red-200 text-red-900'
              }`}>
                {data.actual}
              </div>
            </div>
          )}

          {/* Validation Result */}
          {data.passed !== undefined && (
            <div className={`p-4 rounded-lg ${
              data.passed
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-start gap-3">
                {data.passed ? (
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={`text-sm ${
                    data.passed ? 'text-green-900' : 'text-red-900'
                  }`}>
                    {data.passed
                      ? 'Assertion passed successfully'
                      : 'Assertion failed - expected and actual values do not match'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}