import { useState } from 'react';
import type { YAMLNode } from '../types/yaml';
import type { NodeUpdateHandler } from '../types/shared';
import { LoadDetails } from './yaml-node-details/LoadDetails';

export function RunLoadEditor({
  tree,
  language,
  width,
  onNodeUpdate,
  preferredNodeId,
}: {
  tree: YAMLNode | null;
  language: string;
  width: number;
  onNodeUpdate: NodeUpdateHandler;
  preferredNodeId?: string;
}) {
  const loads: { node: YAMLNode; scenario: string }[] = [];
  const visit = (node: YAMLNode, scenario = '') => {
    const name = node.type === 'scenario' ? node.name : scenario;
    if (node.type === 'load') loads.push({ node, scenario: name });
    node.children?.forEach(child => visit(child, name));
  };
  if (tree) visit(tree);
  const [selected, setSelected] = useState('');
  const active =
    loads.find(load => load.node.id === selected) ?? loads.find(load => load.node.id === preferredNodeId) ?? loads[0];
  const es = language === 'es';
  return (
    <section
      aria-label={es ? 'Configuración de carga' : 'Load configuration'}
      className="flex h-full min-h-0 min-w-0 flex-col bg-[#0d0d0d]"
      style={{ width: `${width}%` }}
    >
      <div className="shrink-0 border-b border-white/10 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-200">{es ? 'Configuración de carga' : 'Load configuration'}</h2>
        {loads.length > 1 && (
          <label className="mt-3 flex items-center gap-2 text-xs text-zinc-400">
            {es ? 'Escenario' : 'Scenario'}
            <select
              aria-label={es ? 'Escenario de carga' : 'Load scenario'}
              value={active?.node.id ?? ''}
              onChange={event => setSelected(event.target.value)}
              className="min-w-0 flex-1 rounded border border-white/15 bg-[#18181b] px-2 py-1 text-zinc-200"
            >
              {loads.map(load => (
                <option
                  key={load.node.id}
                  value={load.node.id}
                >
                  {load.scenario}
                </option>
              ))}
            </select>
          </label>
        )}
        {loads.length === 1 && <p className="mt-1 text-xs text-zinc-400">{active.scenario}</p>}
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-4">
        {active ? (
          <LoadDetails
            key={active.node.id}
            node={active.node}
            onNodeUpdate={onNodeUpdate}
          />
        ) : (
          <p className="text-sm text-zinc-400">
            {es
              ? 'Agrega un escenario en Scripting para configurar su carga.'
              : 'Add a scenario in Scripting to configure its load.'}
          </p>
        )}
      </div>
    </section>
  );
}
