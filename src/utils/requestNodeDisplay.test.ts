import { describe, expect, it } from 'vitest';
import type { YAMLNode } from '../types/yaml';
import {
  buildRequestNodeLabel,
  collectScenarioHosts,
  getRequestNodeHost,
  getUpdatedRequestNodePresentation,
} from './requestNodeDisplay';

describe('getRequestNodeHost', () => {
  it('returns the host for absolute URLs (secondary hosts)', () => {
    expect(getRequestNodeHost('https://host2.example.com/api/login')).toBe('host2.example.com');
    expect(getRequestNodeHost('http://api.example.org:8080/v1')).toBe('api.example.org:8080');
  });

  it('returns empty string for relative URLs (base host)', () => {
    expect(getRequestNodeHost('/home')).toBe('');
    expect(getRequestNodeHost('assets/player/intro.mp4')).toBe('');
    expect(getRequestNodeHost('')).toBe('');
    expect(getRequestNodeHost(undefined)).toBe('');
  });
});

describe('buildRequestNodeLabel', () => {
  it('strips the host so absolute and relative URLs share the same compact label', () => {
    expect(buildRequestNodeLabel('get', { url: 'https://host2.example.com/api/login?x=1' })).toBe('GET: /api/login?x=1');
    expect(buildRequestNodeLabel('request', { method: 'POST', url: '/cart' })).toBe('POST: /cart');
  });
});

describe('collectScenarioHosts', () => {
  const req = (id: string, url: string): YAMLNode => ({ id, type: 'request', name: id, data: { url } });
  const tree = (children: YAMLNode[]): YAMLNode => ({
    id: 'root',
    type: 'root',
    name: 'root',
    children: [{ id: 'steps', type: 'steps', name: 'steps', children }],
  });

  it('lists the primary host first, then secondary hosts in first-seen order', () => {
    const root = tree([
      req('r1', '/es/aire-ancient-baths-barcelona'),
      req('r2', 'https://aireancientbaths.my.site.com/ESWChat'),
      req('r3', 'https://cmsapi.beaire.com/api/v1/stock/months'),
      req('r4', 'https://cmsapi.beaire.com/api/v1/product'),
    ]);

    expect(collectScenarioHosts(root, 'https://relax.beaire.com')).toEqual([
      'relax.beaire.com',
      'aireancientbaths.my.site.com',
      'cmsapi.beaire.com',
    ]);
  });

  it('dedupes the primary host when a request targets it via an absolute URL', () => {
    const root = tree([req('r1', '/home'), req('r2', 'https://relax.beaire.com/again')]);
    expect(collectScenarioHosts(root, 'https://relax.beaire.com')).toEqual(['relax.beaire.com']);
  });

  it('tolerates a bare-host base_url and a missing tree', () => {
    expect(collectScenarioHosts(null, 'relax.beaire.com')).toEqual(['relax.beaire.com']);
    expect(collectScenarioHosts(undefined, '')).toEqual([]);
  });

  it('ignores non-request nodes', () => {
    const root = tree([
      { id: 't', type: 'think_time', name: 'Think Time', data: { url: 'https://nope.example.com' } },
      req('r1', 'https://cmsapi.beaire.com/api'),
    ]);
    expect(collectScenarioHosts(root, 'https://relax.beaire.com')).toEqual(['relax.beaire.com', 'cmsapi.beaire.com']);
  });
});

describe('getUpdatedRequestNodePresentation', () => {
  it('keeps the original short-form HTTP verb when method is omitted', () => {
    const updated = getUpdatedRequestNodePresentation({
      nodeType: 'post',
      currentName: 'POST: /login',
      currentData: { url: '/login' },
      updatedData: { url: '/login?source=editor' },
    });

    expect(updated.type).toBe('post');
    expect(updated.name).toBe('POST: /login?source=editor');
  });
});
