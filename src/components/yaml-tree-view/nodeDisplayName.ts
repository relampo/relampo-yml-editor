import type { YAMLNode } from '../../types/yaml';
import { normalizeLoadType } from '../yaml-node-details/loadUtils';

// The parser and node factory give structural nodes fixed English names that are
// never written to YAML. Translate them only for display; user-chosen names stay as typed.
const FIXED_NAMES: Record<string, string> = {
  'variables|Variables': 'variables',
  'error_policy|Error Policy': 'errorPolicy',
  'http_defaults|HTTP Defaults': 'httpDefaults',
  'grpc_defaults|gRPC Defaults': 'grpcDefaults',
  'assertion|Assertion': 'assert',
  'scenarios|Scenarios': 'scenarios',
  'metrics|Metrics': 'metrics',
  'cookies|Cookie Manager': 'cookieManager',
  'cookies|Cookies': 'cookies',
  'cache_manager|Cache Manager': 'cacheManager',
  'steps|Steps': 'steps',
  'think_time|Think Time': 'thinkTime',
  'headers|Headers': 'headers',
  'header|Header': 'header',
  'data_source|Data Source': 'dataSource',
  'group|Assertions': 'assertions',
  'loop|Loop': 'loop',
  'retry|Retry': 'retry',
  'step|Unknown Step': 'unknownStep',
  'load|Load Config': 'loadConfig',
};

const PREFIXES: Array<[types: string[], prefix: string, key: string]> = [
  [['assertion', 'assert'], 'Assert: ', 'assert'],
  [['extractor', 'extract'], 'Extract: ', 'extract'],
  [['if'], 'If: ', 'if'],
  [['on_error'], 'On Error: ', 'onError'],
];

export function getNodeDisplayName(node: YAMLNode, t: (key: string) => string): string {
  const fixed = FIXED_NAMES[`${node.type}|${node.name}`];
  if (fixed) return t(`yamlEditor.shell.nodeNames.${fixed}`);
  if (node.type === 'load' && node.name.startsWith('Load: ')) {
    const loadType = normalizeLoadType(node.data?.type ?? 'constant');
    return `${t('yamlEditor.shell.nodeNames.load')}: ${t(`yamlEditor.nodeDetails.load.type_${loadType}`)}`;
  }
  for (const [types, prefix, key] of PREFIXES) {
    if (types.includes(node.type) && node.name.startsWith(prefix)) {
      return `${t(`yamlEditor.shell.nodeNames.${key}`)}: ${node.name.slice(prefix.length)}`;
    }
  }
  return node.name;
}
