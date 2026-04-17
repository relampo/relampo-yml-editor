import type { YAMLNodeType } from '../types/yaml';

/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                    PULSE YAML EDITOR - DRAG & DROP RULES                  ║
 * ║                         (Inspired by JMeter hierarchy)                    ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 *
 * HIERARCHY (similar to JMeter):
 *
 * 📁 ROOT (Test Plan)
 *    ├── 📋 test (Test metadata)
 *    ├── 📦 variables (User Defined Variables)
 *    ├── 🗄️ data_source (CSV Data Set Config)
 *    ├── ⚙️ http_defaults (HTTP Request Defaults)
 *    ├── 📊 metrics (Listeners)
 *    └── 📂 scenarios (Thread Groups)
 *         └── 🧵 scenario
 *              ├── ⚡ load (Thread Properties)
 *              ├── 🍪 cookies (HTTP Cookie Manager)
 *              ├── 💾 cache_manager (HTTP Cache Manager)
 *              ├── ⚠️ error_policy (Error Handler)
 *              └── 📋 steps
 *                   ├── 🌐 request/get/post/... (HTTP Sampler)
 *                   │    ├── ⚡ spark_before (JSR223 PreProcessor)
 *                   │    ├── ⚡ spark_after (JSR223 PostProcessor)
 *                   │    ├── 🔍 extractor (Post-Processor/Extractor)
 *                   │    ├── ✅ assertion (Response Assertion)
 *                   │    └── ⏱️ think_time (Constant Timer)
 *                   ├── ⚖️ balanced (Balanced Controller)
 *                   ├── 📦 group (Transaction Controller)
 *                   ├── 🔄 loop (Loop Controller)
 *                   ├── ⛓️ parallel (Parallel Controller)
 *                   ├── ❓ if (If Controller)
 *                   ├── 🔁 retry (Retry Controller)
 *                   ├── ⚡ one_time (One Time Controller)
 *                   └── ⏱️ think_time (Constant Timer)
 */

// ============================================================================
// NODE CATEGORIES (like JMeter element types)
// ============================================================================

/** Root level elements - can only exist at test plan level */
const ROOT_LEVEL_ELEMENTS: YAMLNodeType[] = [
  'test',
  'variables',
  'data_source',
  'http_defaults',
  'scenarios',
  'metrics',
  'error_policy',
];

/** Scenario configuration elements */
const SCENARIO_CONFIG_ELEMENTS: YAMLNodeType[] = ['load', 'cookies', 'cache_manager', 'error_policy'];

/** Logic Controllers - can contain other controllers and samplers */
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

/** HTTP Samplers - the actual requests */
const HTTP_SAMPLERS: YAMLNodeType[] = ['request', 'get', 'post', 'put', 'delete', 'patch', 'head', 'options'];

const SQL_SAMPLERS: YAMLNodeType[] = ['sql'];

/** Pre-Processors - execute before sampler */
const PRE_PROCESSORS: YAMLNodeType[] = ['spark_before'];

/** Post-Processors - execute after sampler */
const POST_PROCESSORS: YAMLNodeType[] = ['spark_after', 'extractor', 'extract'];

/** Assertions - validate responses */
const ASSERTIONS: YAMLNodeType[] = ['assertion', 'assert'];

/** Timers */
const TIMERS: YAMLNodeType[] = ['think_time'];

/** All step-level elements (can be inside steps or controllers) */
const STEP_ELEMENTS: YAMLNodeType[] = [
  ...HTTP_SAMPLERS,
  ...SQL_SAMPLERS,
  ...LOGIC_CONTROLLERS,
  ...TIMERS,
  'data_source',
  'step',
];

/** Elements that can be distributed inside a Balanced Controller */
const BALANCED_CHILD_ELEMENTS: YAMLNodeType[] = [
  ...HTTP_SAMPLERS,
  ...SQL_SAMPLERS,
  'group',
  'transaction',
  'if',
  'loop',
  'retry',
];

/** Elements that can be children of a request/sampler */
const SAMPLER_CHILDREN: YAMLNodeType[] = [
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

// ============================================================================
// CONTAINMENT RULES
// ============================================================================

/**
 * Defines what each container type can hold as children.
 * This is the core of the hierarchy rules.
 */
const containmentRules: Partial<Record<YAMLNodeType, YAMLNodeType[]>> = {
  // ROOT - Test Plan level
  root: ROOT_LEVEL_ELEMENTS,

  // Config elements (leaf nodes - no children)
  test: [],
  variables: [],
  data_source: [],
  http_defaults: [],
  metrics: [],

  // Scenarios container
  scenarios: ['scenario'],

  // Single scenario (Thread Group)
  scenario: ['load', 'cookies', 'cache_manager', 'error_policy', 'steps'],

  // Scenario config (leaf nodes)
  load: [],
  cookies: [],
  cache_manager: [],
  error_policy: [],

  // Steps container
  steps: STEP_ELEMENTS,

  // HTTP Samplers - can contain pre/post processors, assertions, timers
  request: SAMPLER_CHILDREN,
  get: SAMPLER_CHILDREN,
  post: SAMPLER_CHILDREN,
  put: SAMPLER_CHILDREN,
  delete: SAMPLER_CHILDREN,
  patch: SAMPLER_CHILDREN,
  head: SAMPLER_CHILDREN,
  options: SAMPLER_CHILDREN,

  // SQL steps are leaf executable steps
  sql: [],

  // Logic Controllers - can contain steps and other controllers
  group: STEP_ELEMENTS,
  simple: STEP_ELEMENTS,
  transaction: STEP_ELEMENTS,
  parallel: STEP_ELEMENTS,
  balanced: BALANCED_CHILD_ELEMENTS,
  if: STEP_ELEMENTS,
  loop: STEP_ELEMENTS,
  retry: STEP_ELEMENTS,
  one_time: STEP_ELEMENTS,

  // Leaf nodes (no children)
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

// ============================================================================
// SIBLING RULES (what can be next to what)
// ============================================================================

/**
 * Defines what types can be siblings (at the same level).
 * Used for before/after drop positioning.
 */
const siblingGroups: YAMLNodeType[][] = [
  // Root level siblings
  ROOT_LEVEL_ELEMENTS,

  // Scenarios are siblings of each other
  ['scenario'],

  // Scenario config siblings
  SCENARIO_CONFIG_ELEMENTS,

  // Step-level siblings (can be reordered among themselves)
  STEP_ELEMENTS,

  // Sampler children siblings
  SAMPLER_CHILDREN,
];

/**
 * Check if two types can be siblings
 */
function canBeSiblings(type1: YAMLNodeType, type2: YAMLNodeType): boolean {
  return siblingGroups.some(group => group.includes(type1) && group.includes(type2));
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Determines if a node can be dropped at a specific position
 */
export function canDrop(
  draggedType: YAMLNodeType,
  targetType: YAMLNodeType,
  position: 'before' | 'after' | 'inside',
): boolean {
  // Cannot move root
  if (draggedType === 'root') {
    return false;
  }

  // Inside: check containment rules
  if (position === 'inside') {
    return canContain(targetType, draggedType);
  }

  // Before/After: check sibling rules
  if (position === 'before' || position === 'after') {
    return canBeSiblings(draggedType, targetType);
  }

  return false;
}

/**
 * Determines if a container can contain a specific child type
 */
export function canContain(containerType: YAMLNodeType, childType: YAMLNodeType): boolean {
  const allowedChildren = containmentRules[containerType] || [];
  return allowedChildren.includes(childType);
}

/**
 * Gets valid drop targets for a given node type
 */
export function getValidDropTargets(draggedType: YAMLNodeType): {
  containers: YAMLNodeType[];
  siblings: YAMLNodeType[];
} {
  const containers: YAMLNodeType[] = [];
  const siblings: YAMLNodeType[] = [];

  // Find valid containers
  for (const [container, children] of Object.entries(containmentRules)) {
    if (children.includes(draggedType)) {
      containers.push(container as YAMLNodeType);
    }
  }

  // Find valid siblings
  for (const group of siblingGroups) {
    if (group.includes(draggedType)) {
      siblings.push(...group.filter(t => t !== draggedType));
    }
  }

  return { containers, siblings: [...new Set(siblings)] };
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validates the entire tree structure
 */
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

    for (const child of n.children) {
      const childPath = path ? `${path} > ${child.type}` : child.type;

      if (!allowedChildren.includes(child.type)) {
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

// ============================================================================
// EXPORTS FOR DOCUMENTATION
// ============================================================================
