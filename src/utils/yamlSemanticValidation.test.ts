import { describe, expect, it } from 'vitest';
import type { YAMLNode } from '../types/yaml';
import { validateYAMLSemantics } from './yamlSemanticValidation';

describe('validateYAMLSemantics', () => {
  it('flags transactions with no steps', () => {
    const tree: YAMLNode = {
      id: 'root',
      type: 'test',
      name: 'Test',
      children: [
        {
          id: 'transaction-1',
          type: 'transaction',
          name: 'Checkout',
          data: { name: 'Checkout' },
          children: [],
        },
      ],
    };

    expect(validateYAMLSemantics(tree)).toEqual([
      {
        nodeId: 'transaction-1',
        message: '"Checkout" must contain at least 1 related step.',
      },
    ]);
  });

  it('accepts transactions with one step', () => {
    const tree: YAMLNode = {
      id: 'root',
      type: 'test',
      name: 'Test',
      children: [
        {
          id: 'transaction-1',
          type: 'transaction',
          name: 'Checkout',
          data: { name: 'Checkout' },
          children: [
            { id: 'req-1', type: 'post', name: 'POST /cart', data: { url: '/cart' }, children: [] },
          ],
        },
      ],
    };

    expect(validateYAMLSemantics(tree)).toEqual([]);
  });

  it('ignores empty disabled transactions', () => {
    const tree: YAMLNode = {
      id: 'root',
      type: 'test',
      name: 'Test',
      children: [
        {
          id: 'transaction-1',
          type: 'transaction',
          name: 'Group 03 - demo',
          data: { name: 'Group 03 - demo', enabled: false },
          children: [],
        },
      ],
    };

    expect(validateYAMLSemantics(tree)).toEqual([]);
  });

  it('accepts transactions with multiple steps', () => {
    const tree: YAMLNode = {
      id: 'root',
      type: 'test',
      name: 'Test',
      children: [
        {
          id: 'transaction-1',
          type: 'transaction',
          name: 'Checkout',
          data: { name: 'Checkout' },
          children: [
            { id: 'req-1', type: 'post', name: 'POST /cart', data: { url: '/cart' }, children: [] },
            { id: 'req-2', type: 'post', name: 'POST /payment', data: { url: '/payment' }, children: [] },
          ],
        },
      ],
    };

    expect(validateYAMLSemantics(tree)).toEqual([]);
  });

  it('ignores an empty disabled transaction', () => {
    const tree: YAMLNode = {
      id: 'root',
      type: 'test',
      name: 'Test',
      children: [
        {
          id: 'transaction-1',
          type: 'transaction',
          name: 'Group 03 - demo',
          data: { name: 'Group 03 - demo', enabled: false },
          children: [],
        },
      ],
    };

    expect(validateYAMLSemantics(tree)).toEqual([]);
  });

  it('flags an enabled transaction whose children are all disabled', () => {
    const tree: YAMLNode = {
      id: 'root',
      type: 'test',
      name: 'Test',
      children: [
        {
          id: 'transaction-1',
          type: 'transaction',
          name: 'Group 03 - demo',
          data: { name: 'Group 03 - demo' },
          children: [
            {
              id: 'request-1',
              type: 'get',
              name: 'GET /disabled',
              data: { url: '/disabled', enabled: false },
              children: [],
            },
          ],
        },
      ],
    };

    expect(validateYAMLSemantics(tree)).toEqual([
      {
        nodeId: 'transaction-1',
        message: '"Group 03 - demo" must contain at least 1 related step.',
      },
    ]);
  });

  it('flags more than one scenario', () => {
    const tree: YAMLNode = {
      id: 'root',
      type: 'test',
      name: 'Test',
      children: [
        {
          id: 'scenarios',
          type: 'scenarios',
          name: 'Scenarios',
          children: [
            { id: 'scenario-1', type: 'scenario', name: 'Scenario A', children: [] },
            { id: 'scenario-2', type: 'scenario', name: 'Scenario B', children: [] },
          ],
        },
      ],
    };

    expect(validateYAMLSemantics(tree)).toEqual([
      {
        nodeId: 'scenarios',
        message: 'Relampo Studio supports only one scenario. Remove or merge extra scenarios before running Debug.',
      },
    ]);
  });

  it('blocks explicitly empty duration and iterations', () => {
    const tree: YAMLNode = {
      id: 'root',
      type: 'test',
      name: 'Test',
      children: [
        {
          id: 'load-1',
          type: 'load',
          name: 'Load Config',
          data: { users: 3, duration: '', iterations: '' },
        },
      ],
    };

    expect(validateYAMLSemantics(tree)).toEqual([
      {
        nodeId: 'load-1',
        message: 'Define Duration or Iterations, or explicitly enable Run until manually stopped.',
      },
    ]);
  });

  it('accepts an explicit manual-stop load without finite limits', () => {
    const tree: YAMLNode = {
      id: 'root',
      type: 'test',
      name: 'Test',
      children: [
        {
          id: 'load-1',
          type: 'load',
          name: 'Load Config',
          data: { users: 3, duration: '', iterations: '', run_until_stopped: true },
        },
      ],
    };

    expect(validateYAMLSemantics(tree)).toEqual([]);
  });

  it('rejects manual-stop mode combined with a finite limit', () => {
    const tree: YAMLNode = {
      id: 'root',
      type: 'test',
      name: 'Test',
      children: [
        {
          id: 'load-1',
          type: 'load',
          name: 'Load Config',
          data: { users: 3, duration: '1m', iterations: '', run_until_stopped: true },
        },
      ],
    };

    expect(validateYAMLSemantics(tree)).toEqual([
      {
        nodeId: 'load-1',
        message: 'Run until manually stopped cannot be combined with Duration or Iterations.',
      },
    ]);
  });
});
