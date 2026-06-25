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
]);

/**
 * Whether an enabled subtree contains at least one enabled HTTP request.
 *
 * Balanced children can be either direct HTTP request steps or controller
 * wrappers such as group/transaction/if/loop/retry that eventually lead to
 * enabled HTTP requests. SQL, think_time, and request-less subtrees never
 * qualify. See RLP-475.
 */
function hasEnabledBalancedHttpRequest(node: YAMLNode): boolean {
  if (node.data?.enabled === false) {
    return false;
  }
  if (BALANCED_REQUEST_NODE_TYPES.has(node.type)) {
    return true;
  }
  return (node.children ?? []).some(hasEnabledBalancedHttpRequest);
}

/**
 * Whether a balanced child actually contributes load.
 *
 * A child is load-bearing when it is an enabled HTTP request itself, or when
 * its enabled subtree contains at least one enabled HTTP request. SQL,
 * think_time, empty containers, and request-less subtrees are excluded from
 * the controller's included elements, its distribution, and the percentage
 * total. See RLP-475.
 */
export function isBalancedLoadBearingChild(node: YAMLNode): boolean {
  // A disabled node produces no load: the serializer emits `enabled: false` and
  // the runtime skips the whole subtree. This applies to samplers and
  // containers, so disabled wrappers with enabled descendants still count as
  // non-load-bearing.
  return hasEnabledBalancedHttpRequest(node);
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
 * @returns Percentages (integers up to 100 items, decimals beyond), in element order. Empty when `count <= 0`.
 */
export function distributeEvenPercentages(count: number): number[] {
  if (!Number.isFinite(count) || count <= 0) {
    return [];
  }

  // For up to 100 items, integer LRM suffices (floor(100/count) >= 1, so no
  // item ever gets 0%). Beyond 100 we pick the minimum decimal precision such
  // that floor(100 * 10^precision / count) >= 1, which eliminates zero slots.
  // ceil(log10(count/100)) gives exactly that precision (1 dp for 101–1000,
  // 2 dp for 1001–10000, etc.).
  const precision = count <= 100 ? 0 : Math.ceil(Math.log10(count / 100));
  const scale = Math.pow(10, precision);
  const totalUnits = Math.round(100 * scale); // Math.round neutralises fp drift
  const baseUnits = Math.floor(totalUnits / count);
  const remainderUnits = totalUnits - baseUnits * count;

  return Array.from({ length: count }, (_, index) => {
    const units = index < remainderUnits ? baseUnits + 1 : baseUnits;
    if (precision === 0) return units;
    return parseFloat((units / scale).toFixed(precision));
  });
}

/**
 * After a structural tree change (add/remove/enable-toggle), walks the new
 * tree and redistributes percentages evenly on any Balanced Controller whose
 * load-bearing child count differs from the old tree.  Pure – returns the
 * same reference when nothing changed.
 */
export function autoRebalanceBalancedControllers(oldTree: YAMLNode, newTree: YAMLNode): YAMLNode {
  function findNode(root: YAMLNode, id: string): YAMLNode | undefined {
    if (root.id === id) return root;
    for (const child of root.children ?? []) {
      const found = findNode(child, id);
      if (found) return found;
    }
    return undefined;
  }

  function visit(node: YAMLNode): YAMLNode {
    if (node.type === 'balanced') {
      const oldNode = findNode(oldTree, node.id);
      const distributionType = normalizeBalancedDistributionType(node.data?.type);
      const newLBC = (node.children ?? []).filter(isBalancedLoadBearingChild);
      const oldCount = oldNode ? (oldNode.children ?? []).filter(isBalancedLoadBearingChild).length : -1;

      if (distributionType === 'total' && oldCount !== newLBC.length && newLBC.length > 0) {
        const percentages = distributeEvenPercentages(newLBC.length);
        const byId = new Map(newLBC.map((c, i) => [c.id, percentages[i]]));
        const nextChildren = (node.children ?? []).map(child => {
          if (byId.has(child.id)) {
            return { ...child, data: { ...(child.data ?? {}), __balancedPercentage: byId.get(child.id) } };
          }
          const nextData = { ...(child.data ?? {}) };
          delete nextData.__balancedPercentage;
          return { ...child, data: nextData };
        });
        return { ...node, children: nextChildren };
      }
    }

    if (!node.children?.length) return node;
    const nextChildren = node.children.map(visit);
    const changed = nextChildren.some((c, i) => c !== node.children![i]);
    return changed ? { ...node, children: nextChildren } : node;
  }

  return visit(newTree);
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
