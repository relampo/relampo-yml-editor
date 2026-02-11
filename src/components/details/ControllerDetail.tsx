import type { ScriptNode } from '../../types/script';
import { GitBranch, Code } from 'lucide-react';

interface ControllerDetailProps {
  node: ScriptNode;
}

export function ControllerDetail({ node }: ControllerDetailProps) {
  const getControllerTypeLabel = () => {
    switch (node.type) {
      case 'controller-simple':
        return 'Simple Controller';
      case 'controller-if':
        return 'If Controller';
      case 'controller-transaction':
        return 'Transaction Controller';
      default:
        return 'Controller';
    }
  };

  const getControllerDescription = () => {
    switch (node.type) {
      case 'controller-simple':
        return 'Groups requests together for organizational purposes';
      case 'controller-if':
        return 'Conditionally executes child elements based on a condition';
      case 'controller-transaction':
        return 'Groups requests into a single transaction for timing measurements';
      default:
        return 'Controls the execution flow of child elements';
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-neutral-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-neutral-900">{node.name}</h3>
            <p className="text-sm text-neutral-600 mt-1">{getControllerDescription()}</p>
          </div>
          <div className="px-3 py-1 rounded-md bg-orange-100 text-orange-700 text-xs">
            {getControllerTypeLabel()}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6">
          {/* Controller Type */}
          <div>
            <label className="block text-sm text-neutral-700 mb-2">Controller Type</label>
            <div className="flex items-center gap-3 px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg">
              {node.type === 'controller-if' ? (
                <Code className="w-5 h-5 text-orange-600" />
              ) : (
                <GitBranch className="w-5 h-5 text-orange-600" />
              )}
              <span className="text-sm text-neutral-900">{getControllerTypeLabel()}</span>
            </div>
          </div>

          {/* Conditional Logic (for If Controller) */}
          {node.type === 'controller-if' && node.data?.condition && (
            <div>
              <label className="block text-sm text-neutral-700 mb-2">Condition</label>
              <div className="px-3 py-2 border border-neutral-300 rounded-lg bg-neutral-50">
                <code className="text-sm text-neutral-900">{node.data.condition}</code>
              </div>
              <p className="text-xs text-neutral-500 mt-2">
                Child elements will only execute if this condition evaluates to true
              </p>
            </div>
          )}

          {/* Child Elements */}
          <div>
            <label className="block text-sm text-neutral-700 mb-2">Child Elements</label>
            <div className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                {node.children?.length || 0} child element(s)
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Expand this node in the Script Tree to view and configure child elements
              </p>
            </div>
          </div>

          {/* Execution Flow */}
          {node.type === 'controller-transaction' && (
            <div>
              <label className="block text-sm text-neutral-700 mb-2">Transaction Settings</label>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="include-timers"
                    defaultChecked
                    className="w-4 h-4 text-blue-600"
                  />
                  <label htmlFor="include-timers" className="text-sm text-neutral-700">
                    Include timer duration in transaction time
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="generate-parent"
                    defaultChecked
                    className="w-4 h-4 text-blue-600"
                  />
                  <label htmlFor="generate-parent" className="text-sm text-neutral-700">
                    Generate parent sample
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
