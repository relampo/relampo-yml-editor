import type { YAMLNode } from '../types/yaml';

export type BalancedExecutionMode = 'iteraciones' | 'usuarios_virtuales';
export type BalancedDistributionType = 'total' | 'parcial';

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

export function sanitizeBalancedNodeData<T>(data: T): T {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return data;
  }

  const next = { ...(data as Record<string, unknown>) };
  delete next.__balancedPercentage;
  return next as T;
}

export function validateBalancedChildren(children: YAMLNode[] = []) {
  const items = children.map(child => {
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
