import { useMemo, useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import type { DistributedIntentTick, DistributedState } from '../../utils/distributedApi';
import { IntentRuntimeTimeline } from '../IntentRuntimeTimeline';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

// Each shard owns an Intent controller. Preserve its state, target and percentiles;
// combining independent control ticks would invent a global controller decision.
export function DistributedIntentRuntime({ state, scope }: { state: DistributedState; scope: string }) {
  const { language } = useLanguage();
  const es = language === 'es';
  const [selection, setSelection] = useState('');
  const scopedNode = state.scopes.find(item => item.key === scope)?.node_id;
  const scopedScenario = state.scopes.find(item => item.key === scope)?.scenario;
  const streams = useMemo(() => {
    const groups = new Map<string, { node: number; scenario: string; ticks: DistributedIntentTick[] }>();
    for (const tick of state.intent_ticks ?? []) {
      if (scopedNode && tick.node_id !== scopedNode) continue;
      if (scopedScenario && tick.scenario !== scopedScenario) continue;
      const key = JSON.stringify([tick.node_id, tick.scenario ?? '']);
      const stream = groups.get(key) ?? { node: tick.node_id, scenario: tick.scenario ?? '', ticks: [] };
      if (!stream.ticks.some(previous => previous.tick === tick.tick && previous.at === tick.at))
        stream.ticks.push(tick);
      groups.set(key, stream);
    }
    return [...groups.entries()]
      .map(([key, value]) => ({
        key,
        ...value,
        ticks: value.ticks.sort((a, b) => (a.elapsed_ms ?? 0) - (b.elapsed_ms ?? 0) || a.tick - b.tick),
      }))
      .sort((a, b) => a.node - b.node || a.scenario.localeCompare(b.scenario));
  }, [state.intent_ticks, scopedNode, scopedScenario]);
  const selected = streams.find(stream => stream.key === selection) ?? streams[0];
  if (!selected) return null;
  const label = (stream: typeof selected) =>
    `${es ? 'Nodo' : 'Node'} ${stream.node}${stream.scenario ? ` · ${stream.scenario}` : ''}`;
  return (
    <section
      aria-label={es ? 'Control de Load by Intent' : 'Load by Intent control'}
      className="space-y-2"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-zinc-400">{es ? 'Control de Intent por nodo' : 'Intent control by node'}</p>
        {streams.length > 1 ? (
          <Select
            value={selected.key}
            onValueChange={setSelection}
          >
            <SelectTrigger
              className="w-60"
              aria-label={es ? 'Nodo y escenario de Intent' : 'Intent node and scenario'}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {streams.map(stream => (
                <SelectItem
                  key={stream.key}
                  value={stream.key}
                >
                  {label(stream)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-xs text-zinc-400">{label(selected)}</span>
        )}
      </div>
      <IntentRuntimeTimeline
        ticks={selected.ticks}
        summary={null}
      />
    </section>
  );
}
