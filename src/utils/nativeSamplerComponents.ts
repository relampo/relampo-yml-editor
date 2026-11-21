import type { YAMLNodeType } from '../types/yaml';
import { isHttpRequestNodeType } from './requestNodeDisplay';

/** Admission is independent of the optional global defaults/inheritance format. */
export function requiresNativeSamplerComponents(
  kind: string,
  payload: Record<string, unknown>,
  adopted: boolean,
): boolean {
  if (
    isHttpRequestNodeType(kind as YAMLNodeType) &&
    Array.isArray(payload.spark) &&
    payload.spark.some(
      script => script && typeof script === 'object' && !Array.isArray(script) && script.enabled === false,
    )
  )
    return true;
  if (kind === 'sql' && payload.enabled === false) return true;
  if (!['sql', 'grpc', 'websocket'].includes(kind)) return false;
  return (
    ['data_source', 'spark', 'files'].some(field => field in payload) ||
    ('think_time' in payload && (kind !== 'sql' || !adopted)) ||
    (kind === 'sql' && 'assertions' in payload && !adopted)
  );
}
