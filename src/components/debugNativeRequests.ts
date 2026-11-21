import type { YAMLNode } from '../types/yaml';
import { isNativeSampler, protocolData } from '../utils/protocolChildren';
type Data = Record<string, unknown>;
const record = (value: unknown): Data =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Data) : {};
/** Execution configuration only: recorder examples are not requests or captures. */
export function nativeDebugConfiguration(node: YAMLNode): Data | null {
  if (!isNativeSampler(node.type)) return null;
  const data = protocolData(node);
  const removeEvidence = (owner: Data) => {
    for (const key of ['response', 'response_preview', 'response_template', 'recorded_data', 'recorded_at'])
      delete owner[key];
  };
  removeEvidence(data);
  if (node.type === 'websocket') {
    removeEvidence(record(data.send));
    removeEvidence(record(data.receive));
    if (Array.isArray(data.actions))
      for (const action of data.actions) {
        removeEvidence(record(record(action).send));
        removeEvidence(record(record(action).receive));
      }
  }
  return data;
}
export function nativeDebugExtractorNames(node: YAMLNode): string[] | null {
  const data = nativeDebugConfiguration(node);
  if (!data) return null;
  const out: Data[] = [];
  const add = (owner: Data) => {
    if (Array.isArray(owner.extractors))
      for (const value of owner.extractors) {
        const ext = record(value);
        if (ext.enabled !== false) out.push(ext);
      }
  };
  if (node.type !== 'websocket') add(data);
  if (node.type === 'grpc') {
    const stream = record(data.stream);
    if (Array.isArray(stream.receive)) for (const rule of stream.receive) add(record(rule));
  }
  if (node.type === 'websocket') {
    add(record(data.receive));
    if (Array.isArray(data.actions)) for (const action of data.actions) add(record(record(action).receive));
  }
  return [
    ...new Set(
      out.flatMap(ext => {
        const name = [ext.var, ext.variable, ext.name].find(value => typeof value === 'string' && value.trim());
        return typeof name === 'string' ? [name.trim()] : [];
      }),
    ),
  ];
}
export function dataSourceVariableNames(data: Data): string[] {
  const names = Object.values(record(data.bind)).filter((v): v is string => typeof v === 'string' && Boolean(v.trim()));
  const columns = Array.isArray(data.variable_names)
    ? data.variable_names
    : typeof data.variable_names === 'string'
      ? data.variable_names.split(',')
      : [];
  return [
    ...new Set([
      ...names,
      ...columns
        .filter((v): v is string => typeof v === 'string')
        .map(v => v.trim())
        .filter(Boolean),
    ]),
  ];
}
