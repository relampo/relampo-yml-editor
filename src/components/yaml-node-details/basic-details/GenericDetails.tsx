import type { NodeDetailProps } from '../types';

export function GenericDetails({ node }: NodeDetailProps) {
  if (!node.data || Object.keys(node.data).length === 0) {
    return <div className="text-sm text-zinc-500 italic">No additional properties</div>;
  }

  return (
    <div>
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Properties</p>
      <pre className="p-3 bg-white/5 border border-white/10 rounded text-xs font-mono text-zinc-300 overflow-x-auto">
        {JSON.stringify(node.data, null, 2)}
      </pre>
    </div>
  );
}
