import type { YAMLNodeType } from '../types/yaml';



const ROOT_LEVEL_ELEMENTS: YAMLNodeType[] = [
  'test',
  'variables',
  'data_source',
  'http_defaults',
  'grpc_defaults',
  'sql_defaults',
  'scenarios',
  'metrics',
  'error_policy',
];

const SCENARIO_CONFIG_ELEMENTS: YAMLNodeType[] = ['load', 'cookies', 'cache_manager', 'error_policy'];

const LOGIC_CONTROLLERS: YAMLNodeType[] = [
  'group',
  'simple',
  'transaction',
  'parallel',
  'balanced',
  'if',
  'loop',
  'retry',
  'one_time',
];

const HTTP_SAMPLERS: YAMLNodeType[] = ['request', 'get', 'post', 'put', 'delete', 'patch', 'head', 'options'];

const SQL_SAMPLERS: YAMLNodeType[] = ['sql'];
const GRPC_SAMPLERS: YAMLNodeType[] = ['grpc', 'websocket'];

const PRE_PROCESSORS: YAMLNodeType[] = ['spark_before'];

const POST_PROCESSORS: YAMLNodeType[] = ['spark_after', 'extractor', 'extract'];

const ASSERTIONS: YAMLNodeType[] = ['assertion', 'assert'];

const TIMERS: YAMLNodeType[] = ['think_time'];

const STEP_ELEMENTS: YAMLNodeType[] = [
  ...HTTP_SAMPLERS,
  ...SQL_SAMPLERS,
  ...GRPC_SAMPLERS,
  ...LOGIC_CONTROLLERS,
  ...ASSERTIONS,
  ...TIMERS,
  'data_source',
  'step',
];

const BALANCED_CHILD_ELEMENTS: YAMLNodeType[] = [
  ...HTTP_SAMPLERS,
  ...SQL_SAMPLERS,
  ...GRPC_SAMPLERS,
  'group',
  'transaction',
  'parallel',
  'if',
  'loop',
  'retry',
];

const SAMPLER_CHILDREN: YAMLNodeType[] = [
  'file',
  'headers',
  ...PRE_PROCESSORS,
  ...POST_PROCESSORS,
  ...ASSERTIONS,
  ...TIMERS,
  'error_policy',
  'data_source',
];

interface TreeNodeLike {
  type: YAMLNodeType;
  children?: TreeNodeLike[];
}


const containmentRules: Partial<Record<YAMLNodeType, YAMLNodeType[]>> = {
  root: ROOT_LEVEL_ELEMENTS,

  test: ROOT_LEVEL_ELEMENTS.filter(type => type !== 'test'),
  variables: [],
  data_source: [],
  http_defaults: [],
  grpc_defaults: [],
  sql_defaults: [],
  metrics: [],

  scenarios: ['scenario'],

  scenario: ['load', 'cookies', 'cache_manager', 'error_policy', 'steps'],

  load: [],
  cookies: [],
  cache_manager: [],
  error_policy: [],

  steps: STEP_ELEMENTS,

  request: SAMPLER_CHILDREN,
  get: SAMPLER_CHILDREN,
  post: SAMPLER_CHILDREN,
  put: SAMPLER_CHILDREN,
  delete: SAMPLER_CHILDREN,
  patch: SAMPLER_CHILDREN,
  head: SAMPLER_CHILDREN,
  options: SAMPLER_CHILDREN,

  sql: SAMPLER_CHILDREN.filter(type => !['file', 'headers'].includes(type)),
  grpc: SAMPLER_CHILDREN,
  websocket: SAMPLER_CHILDREN,

  group: STEP_ELEMENTS,
  simple: STEP_ELEMENTS,
  transaction: STEP_ELEMENTS,
  parallel: STEP_ELEMENTS,
  balanced: BALANCED_CHILD_ELEMENTS,
  if: STEP_ELEMENTS,
  loop: STEP_ELEMENTS,
  retry: STEP_ELEMENTS,
  one_time: STEP_ELEMENTS,

  step: [],
  think_time: [],
  spark: [],
  spark_before: [],
  spark_after: [],
  extract: [],
  extractor: [],
  assert: [],
  assertion: [],
};


const siblingGroups: YAMLNodeType[][] = [
  ROOT_LEVEL_ELEMENTS,

  ['scenario'],

  SCENARIO_CONFIG_ELEMENTS,

  STEP_ELEMENTS,

  SAMPLER_CHILDREN,
];

function canBeSiblings(type1: YAMLNodeType, type2: YAMLNodeType): boolean {
  return siblingGroups.some(group => group.includes(type1) && group.includes(type2));
}


export function canDrop(
  draggedType: YAMLNodeType,
  targetType: YAMLNodeType,
  position: 'before' | 'after' | 'inside',
  parentType?: YAMLNodeType,
): boolean {
  if (draggedType === 'root' || draggedType === 'test') {
    return false;
  }

  if (position === 'inside') {
    return canContain(targetType, draggedType);
  }

  if (position === 'before' || position === 'after') {
    if (!canBeSiblings(draggedType, targetType)) {
      return false;
    }
    return parentType ? canContain(parentType, draggedType) : true;
  }

  return false;
}

export function canContain(containerType: YAMLNodeType, childType: YAMLNodeType): boolean {
  const allowedChildren = containmentRules[containerType] || [];
  return allowedChildren.includes(childType);
}

export function getValidDropTargets(draggedType: YAMLNodeType): {
  containers: YAMLNodeType[];
  siblings: YAMLNodeType[];
} {
  const containers: YAMLNodeType[] = [];
  const siblings: YAMLNodeType[] = [];

  for (const [container, children] of Object.entries(containmentRules)) {
    if (children.includes(draggedType)) {
      containers.push(container as YAMLNodeType);
    }
  }

  for (const group of siblingGroups) {
    if (group.includes(draggedType)) {
      siblings.push(...group.filter(t => t !== draggedType));
    }
  }

  return { containers, siblings: [...new Set(siblings)] };
}


export function validateTreeStructure(node: TreeNodeLike): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  function validate(n: TreeNodeLike, path: string = '') {
    if (n.type === 'parallel' && (!n.children || n.children.length === 0)) {
      const currentPath = path || 'parallel';
      errors.push(`Invalid: "parallel" must contain at least one child step at ${currentPath}`);
    }

    if (!n.children) return;

    const allowedChildren = containmentRules[n.type] || [];
    const allowedChildrenSet = new Set(allowedChildren);

    for (const child of n.children) {
      const childPath = path ? `${path} > ${child.type}` : child.type;

      if (!allowedChildrenSet.has(child.type)) {
        errors.push(`Invalid: "${child.type}" inside "${n.type}" at ${childPath}`);
      }

      validate(child, childPath);
    }
  }

  validate(node);

  return {
    valid: errors.length === 0,
    errors,
  };
}
