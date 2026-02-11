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
 *                   ├── 📦 group (Transaction Controller)
 *                   ├── 🔄 loop (Loop Controller)
 *                   ├── ❓ if (If Controller)
 *                   ├── 🔁 retry (Retry Controller)
 *                   └── ⏱️ think_time (Constant Timer)
 */

// ============================================================================
// NODE CATEGORIES (like JMeter element types)
// ============================================================================

/** Root level elements - can only exist at test plan level */
const ROOT_LEVEL_ELEMENTS: YAMLNodeType[] = [
  'test', 'variables', 'data_source', 'http_defaults', 'scenarios', 'metrics'
];

/** Scenario configuration elements */
const SCENARIO_CONFIG_ELEMENTS: YAMLNodeType[] = [
  'load', 'cookies', 'cache_manager', 'error_policy'
];

/** Logic Controllers - can contain other controllers and samplers */
const LOGIC_CONTROLLERS: YAMLNodeType[] = [
  'group', 'simple', 'if', 'loop', 'retry'
];

/** HTTP Samplers - the actual requests */
const HTTP_SAMPLERS: YAMLNodeType[] = [
  'request', 'get', 'post', 'put', 'delete', 'patch', 'head', 'options'
];

/** Pre-Processors - execute before sampler */
const PRE_PROCESSORS: YAMLNodeType[] = [
  'spark_before'
];

/** Post-Processors - execute after sampler */
const POST_PROCESSORS: YAMLNodeType[] = [
  'spark_after', 'extractor', 'extract'
];

/** Assertions - validate responses */
const ASSERTIONS: YAMLNodeType[] = [
  'assertion', 'assert'
];

/** Timers */
const TIMERS: YAMLNodeType[] = [
  'think_time'
];

/** All step-level elements (can be inside steps or controllers) */
const STEP_ELEMENTS: YAMLNodeType[] = [
  ...HTTP_SAMPLERS,
  ...LOGIC_CONTROLLERS,
  ...TIMERS,
  'step'
];

/** Elements that can be children of a request/sampler */
const SAMPLER_CHILDREN: YAMLNodeType[] = [
  ...PRE_PROCESSORS,
  ...POST_PROCESSORS,
  ...ASSERTIONS,
  ...TIMERS
];

// ============================================================================
// CONTAINMENT RULES
// ============================================================================

/**
 * Defines what each container type can hold as children.
 * This is the core of the hierarchy rules.
 */
const containmentRules: Partial<Record<YAMLNodeType, YAMLNodeType[]>> = {
  // ROOT - Test Plan level
  'root': ROOT_LEVEL_ELEMENTS,
  
  // Config elements (leaf nodes - no children)
  'test': [],
  'variables': [],
  'data_source': [],
  'http_defaults': [],
  'metrics': [],
  
  // Scenarios container
  'scenarios': ['scenario'],
  
  // Single scenario (Thread Group)
  'scenario': ['load', 'cookies', 'cache_manager', 'error_policy', 'steps'],
  
  // Scenario config (leaf nodes)
  'load': [],
  'cookies': [],
  'cache_manager': [],
  'error_policy': [],
  
  // Steps container
  'steps': STEP_ELEMENTS,
  
  // HTTP Samplers - can contain pre/post processors, assertions, timers
  'request': SAMPLER_CHILDREN,
  'get': SAMPLER_CHILDREN,
  'post': SAMPLER_CHILDREN,
  'put': SAMPLER_CHILDREN,
  'delete': SAMPLER_CHILDREN,
  'patch': SAMPLER_CHILDREN,
  'head': SAMPLER_CHILDREN,
  'options': SAMPLER_CHILDREN,
  
  // Logic Controllers - can contain steps and other controllers
  'group': STEP_ELEMENTS,
  'simple': STEP_ELEMENTS,
  'if': STEP_ELEMENTS,
  'loop': STEP_ELEMENTS,
  'retry': STEP_ELEMENTS,
  
  // Leaf nodes (no children)
  'step': [],
  'think_time': [],
  'spark': [],
  'spark_before': [],
  'spark_after': [],
  'extract': [],
  'extractor': [],
  'assert': [],
  'assertion': [],
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
  return siblingGroups.some(group => 
    group.includes(type1) && group.includes(type2)
  );
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
  position: 'before' | 'after' | 'inside'
): boolean {
  // Cannot move root or test
  if (draggedType === 'root' || draggedType === 'test') {
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
 * Validates if a node can be moved (not all nodes are movable)
 */
export function canMove(nodeType: YAMLNodeType): boolean {
  const immovableTypes: YAMLNodeType[] = ['root', 'test', 'scenarios', 'steps'];
  return !immovableTypes.includes(nodeType);
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

/**
 * Gets the category of a node type
 */
export function getNodeCategory(nodeType: YAMLNodeType): string {
  if (ROOT_LEVEL_ELEMENTS.includes(nodeType)) return 'config';
  if (SCENARIO_CONFIG_ELEMENTS.includes(nodeType)) return 'scenario-config';
  if (LOGIC_CONTROLLERS.includes(nodeType)) return 'controller';
  if (HTTP_SAMPLERS.includes(nodeType)) return 'sampler';
  if (PRE_PROCESSORS.includes(nodeType)) return 'pre-processor';
  if (POST_PROCESSORS.includes(nodeType)) return 'post-processor';
  if (ASSERTIONS.includes(nodeType)) return 'assertion';
  if (TIMERS.includes(nodeType)) return 'timer';
  return 'other';
}

/**
 * Gets an error message when drop is not allowed
 */
export function getDropErrorMessage(
  draggedType: YAMLNodeType,
  targetType: YAMLNodeType,
  position: 'before' | 'after' | 'inside'
): string {
  if (draggedType === 'root' || draggedType === 'test') {
    return 'This element cannot be moved';
  }

  const draggedCategory = getNodeCategory(draggedType);
  const targetCategory = getNodeCategory(targetType);

  if (position === 'inside') {
    if (!canContain(targetType, draggedType)) {
      // Provide specific error messages
      if (HTTP_SAMPLERS.includes(targetType as any) && STEP_ELEMENTS.includes(draggedType as any)) {
        return `Requests can only contain: Spark scripts, Extractors, Assertions, Think Time`;
      }
      if (targetType === 'scenario') {
        return `Scenarios can only contain: Load config, Cookies, Cache, Error Policy, Steps`;
      }
      if (LOGIC_CONTROLLERS.includes(targetType as any)) {
        return `${targetType} can contain: Requests, Controllers, Think Time`;
      }
      return `"${targetType}" cannot contain "${draggedType}"`;
    }
  }

  if (position === 'before' || position === 'after') {
    if (!canBeSiblings(draggedType, targetType)) {
      if (draggedCategory !== targetCategory) {
        return `"${draggedType}" (${draggedCategory}) cannot be placed next to "${targetType}" (${targetCategory})`;
      }
      return `"${draggedType}" cannot be placed next to "${targetType}"`;
    }
  }

  return 'Cannot drop here';
}

/**
 * Gets insertion hints for UI feedback
 */
export function getInsertionHint(
  draggedType: YAMLNodeType,
  targetType: YAMLNodeType
): { canInsertBefore: boolean; canInsertAfter: boolean; canInsertInside: boolean } {
  return {
    canInsertBefore: canDrop(draggedType, targetType, 'before'),
    canInsertAfter: canDrop(draggedType, targetType, 'after'),
    canInsertInside: canDrop(draggedType, targetType, 'inside'),
  };
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validates the entire tree structure
 */
export function validateTreeStructure(node: { type: YAMLNodeType; children?: any[] }): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  function validate(n: { type: YAMLNodeType; children?: any[] }, path: string = '') {
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

export const nodeCategories = {
  ROOT_LEVEL_ELEMENTS,
  SCENARIO_CONFIG_ELEMENTS,
  LOGIC_CONTROLLERS,
  HTTP_SAMPLERS,
  PRE_PROCESSORS,
  POST_PROCESSORS,
  ASSERTIONS,
  TIMERS,
  STEP_ELEMENTS,
  SAMPLER_CHILDREN,
};
