import { describe, expect, it } from 'vitest';
import type { YAMLNode } from '../types/yaml';
import {
  distributeEvenPercentages,
  isBalancedLoadBearingChild,
  validateBalancedController,
} from './balancedController';

function req(id: string, percentage?: number): YAMLNode {
  return {
    id,
    type: 'get',
    name: id,
    data: percentage === undefined ? {} : { __balancedPercentage: percentage },
  };
}

function thinkTime(id: string, percentage?: number): YAMLNode {
  return {
    id,
    type: 'think_time',
    name: id,
    data: percentage === undefined ? {} : { __balancedPercentage: percentage },
  };
}

describe('isBalancedLoadBearingChild', () => {
  it('treats requests and SQL samplers as load-bearing', () => {
    expect(isBalancedLoadBearingChild(req('r'))).toBe(true);
    expect(isBalancedLoadBearingChild({ id: 's', type: 'sql', name: 's', data: {} })).toBe(true);
  });

  it('treats think_time as non-load-bearing', () => {
    expect(isBalancedLoadBearingChild(thinkTime('t'))).toBe(false);
  });

  it('treats an empty container as non-load-bearing', () => {
    expect(isBalancedLoadBearingChild({ id: 'g', type: 'transaction', name: 'Group', children: [] })).toBe(false);
  });

  it('treats a container with only think_time as non-load-bearing', () => {
    const group: YAMLNode = { id: 'g', type: 'transaction', name: 'Group', children: [thinkTime('t')] };
    expect(isBalancedLoadBearingChild(group)).toBe(false);
  });

  it('treats a container that transitively holds a request as load-bearing', () => {
    const nested: YAMLNode = {
      id: 'g',
      type: 'group',
      name: 'Group',
      children: [{ id: 'tx', type: 'transaction', name: 'Tx', children: [req('r')] }],
    };
    expect(isBalancedLoadBearingChild(nested)).toBe(true);
  });

  it('treats a disabled request as non-load-bearing', () => {
    expect(isBalancedLoadBearingChild({ id: 'r', type: 'get', name: 'r', data: { enabled: false } })).toBe(false);
  });

  it('treats a disabled container as non-load-bearing even with enabled requests inside', () => {
    const disabledGroup: YAMLNode = {
      id: 'g',
      type: 'transaction',
      name: 'Group',
      data: { enabled: false },
      children: [req('r')],
    };
    expect(isBalancedLoadBearingChild(disabledGroup)).toBe(false);
  });
});

describe('validateBalancedController with non-load-bearing children', () => {
  it('ignores a think_time when totalling percentages', () => {
    const result = validateBalancedController('total', [req('a', 50), req('b', 50), thinkTime('t', 5)]);
    expect(result.total).toBe(100);
    expect(result.hasChildren).toBe(true);
    expect(result.validForType).toBe(true);
    expect(result.items).toHaveLength(2);
  });

  it('flags an incomplete total once the think_time percentage is excluded', () => {
    // 50 + 45 = 95 among load-bearing children; the think_time's 5 does not count.
    const result = validateBalancedController('total', [req('a', 50), req('b', 45), thinkTime('t', 5)]);
    expect(result.total).toBe(95);
    expect(result.validForType).toBe(false);
  });

  it('reports no children when every child is non-load-bearing', () => {
    const result = validateBalancedController('total', [thinkTime('t', 5)]);
    expect(result.hasChildren).toBe(false);
    expect(result.validForType).toBe(false);
  });
});

describe('distributeEvenPercentages', () => {
  it('splits evenly when 100 divides the count', () => {
    expect(distributeEvenPercentages(4)).toEqual([25, 25, 25, 25]);
    expect(distributeEvenPercentages(5)).toEqual([20, 20, 20, 20, 20]);
  });

  it('uses the largest remainder method so the gap between any two values is <= 1', () => {
    // 6 requests: 100 / 6 = 16.66… → 4×17 + 2×16, never 5×16 + 1×20. See RLP-475.
    expect(distributeEvenPercentages(6)).toEqual([17, 17, 17, 17, 16, 16]);
    // 3 requests: 34 + 33 + 33.
    expect(distributeEvenPercentages(3)).toEqual([34, 33, 33]);
  });

  it('always sums to exactly 100 across a range of counts', () => {
    for (let count = 1; count <= 50; count++) {
      const percentages = distributeEvenPercentages(count);
      expect(percentages).toHaveLength(count);
      expect(percentages.reduce((sum, value) => sum + value, 0)).toBe(100);
      const max = Math.max(...percentages);
      const min = Math.min(...percentages);
      expect(max - min).toBeLessThanOrEqual(1);
    }
  });

  it('returns an empty distribution for non-positive counts', () => {
    expect(distributeEvenPercentages(0)).toEqual([]);
    expect(distributeEvenPercentages(-3)).toEqual([]);
  });

  it('never assigns 0% to any item, even beyond 100 items', () => {
    // 103 items: floor(100/103) = 0, so integers would give 0 to 3 items.
    // With 1 decimal place: floor(1000/103) = 9, so 73 get 1.0 and 30 get 0.9.
    const result103 = distributeEvenPercentages(103);
    expect(result103).toHaveLength(103);
    expect(Math.min(...result103)).toBeGreaterThan(0);
    expect(Math.max(...result103) - Math.min(...result103)).toBeLessThanOrEqual(0.1);

    // 200 items: 1 decimal place → all get 0.5.
    const result200 = distributeEvenPercentages(200);
    expect(result200).toHaveLength(200);
    expect(Math.min(...result200)).toBeGreaterThan(0);
  });

  it('sums to exactly 100 for counts beyond 100', () => {
    for (const count of [101, 103, 150, 200, 500, 1000]) {
      const percentages = distributeEvenPercentages(count);
      expect(percentages).toHaveLength(count);
      const sum = percentages.reduce((acc, v) => acc + v, 0);
      expect(parseFloat(sum.toFixed(4))).toBe(100);
    }
  });
});
