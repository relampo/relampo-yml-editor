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

export function serializeBalancedDistributionType(value: unknown): 'total' | 'partial' {
  return normalizeBalancedDistributionType(value) === 'parcial' ? 'partial' : 'total';
}

export function serializeBalancedExecutionMode(value: unknown): 'iterations' | 'virtual_users' {
  return normalizeBalancedExecutionMode(value) === 'usuarios_virtuales' ? 'virtual_users' : 'iterations';
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

const BALANCED_LOAD_NODE_TYPES = new Set<string>([
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

function hasEnabledBalancedExecutableStep(node: YAMLNode): boolean {
  if (node.data?.enabled === false) {
    return false;
  }
  if (BALANCED_LOAD_NODE_TYPES.has(node.type)) {
    return true;
  }
  return (node.children ?? []).some(hasEnabledBalancedExecutableStep);
}

export function isBalancedLoadBearingChild(node: YAMLNode): boolean {
  return hasEnabledBalancedExecutableStep(node);
}

export function distributeEvenPercentages(count: number): number[] {
  if (!Number.isFinite(count) || count <= 0) {
    return [];
  }

  const precision = count <= 100 ? 0 : Math.ceil(Math.log10(count / 100));
  const scale = Math.pow(10, precision);
  const totalUnits = Math.round(100 * scale);
  const baseUnits = Math.floor(totalUnits / count);
  const remainderUnits = totalUnits - baseUnits * count;

  return Array.from({ length: count }, (_, index) => {
    const units = index < remainderUnits ? baseUnits + 1 : baseUnits;
    if (precision === 0) return units;
    return parseFloat((units / scale).toFixed(precision));
  });
}

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
  const validPartialTotal = roundedTotal <= 100;

  return {
    items,
    total: roundedTotal,
    hasChildren,
    invalidItems,
    validTotal,
    validPartialTotal,
    isValid: hasChildren && invalidItems.length === 0 && validTotal,
  };
}

export function validateBalancedController(type: BalancedDistributionType, children: YAMLNode[] = []) {
  const base = validateBalancedChildren(children);
  const requiresExactTotal = type === 'total';

  return {
    ...base,
    requiresExactTotal,
    validForType:
      base.hasChildren &&
      base.invalidItems.length === 0 &&
      (requiresExactTotal ? base.validTotal : base.validPartialTotal),
  };
}
