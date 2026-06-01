import { describe, expect, it } from 'vitest';
import type { YAMLNode } from '../types/yaml';
import { isBalancedLoadBearingChild, validateBalancedController } from './balancedController';

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
