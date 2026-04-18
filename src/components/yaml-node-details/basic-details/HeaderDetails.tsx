import { EditableList } from '../../EditableList';
import { Input } from '../../ui/input';
import { createNodeDataUpdater } from '../nodeDetailHelpers';
import type { NodeDetailProps } from '../types';

export function HeaderDetails({ node, onNodeUpdate }: NodeDetailProps) {
  const { data, updateField } = createNodeDataUpdater(node, onNodeUpdate);
  const commonHeaders = [
    'Authorization',
    'Content-Type',
    'Accept',
    'User-Agent',
    'Accept-Language',
    'Accept-Encoding',
    'Cache-Control',
    'X-Api-Key',
    'X-Requested-With',
  ];

  return (
    <div className="space-y-4">
      <div className="py-3 px-1 border-b border-white/5 flex items-center gap-3 w-full min-w-0 hover:bg-white/2 transition-colors group">
        <div className="flex-1 flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 shrink-0 w-17.5">
            <Input
              value={data.name || ''}
              onChange={event => updateField('name', event.target.value)}
              placeholder="Content-Type"
              list="header-names-list"
              className="flex-1 px-2 py-1 text-xs font-mono text-purple-400 font-bold bg-purple-400/5 border-purple-400/20 focus:border-purple-400/40"
            />
            <span className="text-zinc-500 font-bold shrink-0">=</span>
          </div>
          <div className="w-0 flex-1 min-w-0">
            <Input
              value={data.value || ''}
              onChange={event => updateField('value', event.target.value)}
              placeholder="application/json"
              className="w-full px-2 py-1 text-sm font-mono text-zinc-300 bg-white/5 border-white/10 focus:border-white/30"
            />
          </div>
        </div>
        <datalist id="header-names-list">
          {commonHeaders.map(header => (
            <option
              key={header}
              value={header}
            />
          ))}
        </datalist>
      </div>

      <div className="p-3 bg-slate-400/5 border border-slate-400/20 rounded text-xs text-zinc-400">
        🏷️ This header will be sent with the HTTP request
      </div>
    </div>
  );
}

export function HeadersDetails({ node, onNodeUpdate }: NodeDetailProps) {
  const data = node.data || {};

  return (
    <>
      <EditableList
        title="HTTP Headers"
        items={data}
        onUpdate={items => onNodeUpdate?.(node.id, items)}
        keyPlaceholder="Header-Name"
        valuePlaceholder="Header value"
        keyLabel="Header Name"
        valueLabel="Value"
        enableCheckboxes={false}
        enableBulkActions={false}
        variant="minimal"
      />

      <div className="mt-4 p-3 bg-red-400/5 border border-red-400/20 rounded text-xs text-zinc-400">
        🏷️ These headers will be sent with the HTTP request
      </div>
    </>
  );
}
