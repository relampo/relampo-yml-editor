import { describe, expect, it } from 'vitest';
import type { YAMLNode } from '../types/yaml';
import { applyNodeUpdateToTree, renameRequestHost } from './nodeUpdate';

describe('applyNodeUpdateToTree', () => {
  it('updates multiple balanced children in a single mutation', () => {
    const tree: YAMLNode = {
      id: 'root',
      type: 'root',
      name: 'Root',
      children: [
        {
          id: 'balanced-1',
          type: 'balanced',
          name: 'Balanced Controller',
          data: { type: 'total', mode: 'iteraciones' },
          children: [
            {
              id: 'request-1',
              type: 'get',
              name: 'GET: /first',
              data: { url: '/first', __balancedPercentage: 10 },
            },
            {
              id: 'request-2',
              type: 'post',
              name: 'POST: /second',
              data: { url: '/second', __balancedPercentage: 20 },
            },
          ],
        },
      ],
    };

    const updatedTree = applyNodeUpdateToTree(tree, 'balanced-1', {
      type: 'total',
      mode: 'iteraciones',
      __batchChildUpdates: [
        { nodeId: 'request-1', data: { url: '/first', __balancedPercentage: 50 } },
        { nodeId: 'request-2', data: { url: '/second', __balancedPercentage: 50 } },
      ],
    });

    const balanced = updatedTree.children?.[0];
    expect(balanced?.children?.[0].data.__balancedPercentage).toBe(50);
    expect(balanced?.children?.[1].data.__balancedPercentage).toBe(50);
  });

  it('preserves an explicit empty name when clearing a request label', () => {
    const tree: YAMLNode = {
      id: 'root',
      type: 'root',
      name: 'Root',
      children: [
        {
          id: 'request-1',
          type: 'request',
          name: 'Custom request',
          data: { method: 'GET', url: '/status' },
        },
      ],
    };

    const updatedTree = applyNodeUpdateToTree(tree, 'request-1', {
      method: 'GET',
      url: '/status',
      __name: '',
    });

    expect(updatedTree.children?.[0].name).toBe('');
  });
});

describe('renameRequestHost', () => {
  const buildTree = (): YAMLNode => ({
    id: 'root',
    type: 'root',
    name: 'Root',
    children: [
      {
        id: 'http-defaults',
        type: 'http_defaults',
        name: 'HTTP Defaults',
        data: { base_url: 'https://primary.example.com' },
      },
      {
        id: 'request-base',
        type: 'get',
        name: 'GET: /home',
        data: { url: '/home' },
      },
      {
        id: 'request-secondary',
        type: 'post',
        name: 'POST: /upload',
        data: { url: 'https://cdn.example.com/upload?token=1' },
      },
      {
        id: 'request-other',
        type: 'get',
        name: 'GET: /ping',
        data: { url: 'https://other.example.com/ping' },
      },
    ],
  });

  it('rewrites absolute request URLs that target the renamed secondary host', () => {
    const updated = renameRequestHost(buildTree(), 'cdn.example.com', 'static.example.com');

    expect(updated.children?.[2].data.url).toBe('https://static.example.com/upload?token=1');
    // Relative and unrelated requests are untouched.
    expect(updated.children?.[1].data.url).toBe('/home');
    expect(updated.children?.[3].data.url).toBe('https://other.example.com/ping');
  });

  it('normalizes a pasted full URL down to its authority before rewriting', () => {
    const updated = renameRequestHost(buildTree(), 'cdn.example.com', 'https://static.example.com/ignored');

    // No double scheme: only the authority is swapped, path/query preserved.
    expect(updated.children?.[2].data.url).toBe('https://static.example.com/upload?token=1');
  });

  it('rewrites the base_url when the primary host is renamed', () => {
    const updated = renameRequestHost(buildTree(), 'primary.example.com', 'api.example.com');

    expect(updated.children?.[0].data.base_url).toBe('https://api.example.com/');
  });

  it('returns the same tree reference when nothing matches or the host is unchanged', () => {
    const tree = buildTree();
    expect(renameRequestHost(tree, 'missing.example.com', 'new.example.com')).toBe(tree);
    expect(renameRequestHost(tree, 'cdn.example.com', 'cdn.example.com')).toBe(tree);
    expect(renameRequestHost(tree, '  ', 'new.example.com')).toBe(tree);
  });
});
