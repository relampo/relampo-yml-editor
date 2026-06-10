import type { YAMLNode } from '../types/yaml';

type BalancedExecutionMode = 'iteraciones' | 'usuarios_virtuales';
type BalancedDistributionType = 'total' | 'parcial';

const BALANCED_MODE_ALIASES: Record<string, BalancedExecutionMode> = {
  iteraciones: 'iteraciones',
  iterations: 'iteraciones',
  usuarios_virtuales: 'usuarios_virtuales',
  virtual_users: 'usuarios_virtuales',
  users: 'usuarios_virtuales',
};

const BALANCED_TYPE_ALIASES: Record<string, BalancedDistributionType> = {
  total: 'total',
  parcial: 'parcial',
  partial: 'parcial',
};

export function normalizeBalancedDistributionType(value: unknown): BalancedDistributionType {
  if (typeof value !== 'string') {
    return 'total';
  }

  return BALANCED_TYPE_ALIASES[value.trim().toLowerCase()] || 'total';
}

export function normalizeBalancedExecutionMode(value: unknown): BalancedExecutionMode {
  if (typeof value !== 'string') {
    return 'iteraciones';
  }

  return BALANCED_MODE_ALIASES[value.trim().toLowerCase()] || 'iteraciones';
}

export function readBalancedPercentage(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

const BALANCED_REQUEST_NODE_TYPES = new Set<string>([
  'request',
  'get',
  'post',
  'put',
  'delete',
  'patch',
  'head',
  'options',
  'sql',
]);

/**
 * Whether a balanced child actually contributes load.
 *
 * A child is load-bearing when it is a request/SQL sampler, or a container
 * (group, transaction, if, loop, retry…) that transitively holds at least one
 * enabled request. think_time steps, empty containers, and request-less subtrees
 * are NOT load-bearing: assigning them a percentage of a Balanced Controller
 * routes virtual users to zero work, silently lowering the real load. They are
 * therefore excluded from the controller's included elements, its distribution,
 * and the percentage total. See RLP-475.
 */
export function isBalancedLoadBearingChild(node: YAMLNode): boolean {
  // A disabled node produces no load: the serializer emits `enabled: false` and
  // the runtime skips the whole subtree. This applies to samplers AND containers
  // — a disabled transaction/group with enabled requests inside still runs no
  // requests, so it must not receive a percentage either.
  if (node.data?.enabled === false) {
    return false;
  }
  if (BALANCED_REQUEST_NODE_TYPES.has(node.type)) {
    return true;
  }
  return (node.children ?? []).some(isBalancedLoadBearingChild);
}

/**
 * Spread 100% across `count` load-bearing elements as evenly as possible.
 *
 * Uses the largest remainder method: every element gets `floor(100 / count)`,
 * then the leftover units are handed out one-by-one to the first elements. The
 * result always sums to exactly 100 and the gap between any two values is ≤ 1,
 * so 6 requests yield `[17, 17, 17, 17, 16, 16]` instead of dumping the whole
 * remainder on the last element (`[16, 16, 16, 16, 16, 20]`). See RLP-475.
 *
 * @param count - Number of elements to distribute across.
 * @returns Integer percentages, in element order. Empty when `count <= 0`.
 */
export function distributeEvenPercentages(count: number): number[] {
  if (!Number.isFinite(count) || count <= 0) {
    return [];
  }

  const base = Math.floor(100 / count);
  const remainder = 100 - base * count;
  return Array.from({ length: count }, (_, index) => (index < remainder ? base + 1 : base));
}

export function sanitizeBalancedNodeData<T>(data: T): T {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return data;
  }

  const next = { ...(data as Record<string, unknown>) };
  delete next.__balancedPercentage;
  return next as T;
}

function validateBalancedChildren(children: YAMLNode[] = []) {
  // Only load-bearing children participate in the balance: think_time and
  // request-less subtrees never consume a percentage. See RLP-475.
  const loadBearing = children.filter(isBalancedLoadBearingChild);
  const items = loadBearing.map(child => {
    const percentage = readBalancedPercentage(child.data?.__balancedPercentage);
    return {
      id: child.id,
      name: child.name,
      type: child.type,
      percentage,
      valid: percentage !== null && percentage > 0 && percentage <= 100,
    };
  });

  const total = items.reduce((sum, item) => sum + (item.percentage ?? 0), 0);
  const roundedTotal = Math.round(total * 1000) / 1000;
  const invalidItems = items.filter(item => !item.valid);
  const hasChildren = items.length > 0;
  const validTotal = Math.abs(roundedTotal - 100) < 0.0001;

  return {
    items,
    total: roundedTotal,
    hasChildren,
    invalidItems,
    validTotal,
    isValid: hasChildren && invalidItems.length === 0 && validTotal,
  };
}

export function validateBalancedController(type: BalancedDistributionType, children: YAMLNode[] = []) {
  const base = validateBalancedChildren(children);
  const requiresExactTotal = type === 'total';

  return {
    ...base,
    requiresExactTotal,
    validForType: base.hasChildren && base.invalidItems.length === 0 && (!requiresExactTotal || base.validTotal),
  };
}
