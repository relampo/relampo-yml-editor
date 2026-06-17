import { describe, expect, it } from 'vitest';
import { getDebugEntryStatus, getDebugResultLabel } from './debugEventStatus';
import type { EngineEvent } from '../utils/debugApi';

function event(overrides: Partial<EngineEvent>): EngineEvent {
  return {
    ts: '2026-06-17T21:00:00Z',
    name: 'request',
    method: 'GET',
    path: '/request',
    status: 200,
    latency_ms: 1,
    concurrency: 1,
    ...overrides,
  };
}

describe('debug result labels', () => {
  it('labels a successful 200 root request as Passed', () => {
    const root = event({ status: 200, chain_role: 'parent' });

    expect(getDebugEntryStatus(root)).toBe('passed');
    expect(getDebugResultLabel(root)).toBe('Passed');
  });

  it('labels a successful 302 root request as Redirect', () => {
    const rootRedirect = event({ status: 302, chain_role: 'parent' });

    expect(getDebugEntryStatus(rootRedirect)).toBe('passed');
    expect(getDebugResultLabel(rootRedirect)).toBe('Redirect');
  });

  it('labels a successful 302 redirect child as Redirect', () => {
    const redirectedHop = event({ status: 302, chain_role: 'hop' });

    expect(getDebugEntryStatus(redirectedHop)).toBe('passed');
    expect(getDebugResultLabel(redirectedHop)).toBe('Redirect');
  });

  it('labels a successful 200 redirect child as Passed', () => {
    const redirectedFinal = event({ status: 200, chain_role: 'final' });

    expect(getDebugEntryStatus(redirectedFinal)).toBe('passed');
    expect(getDebugResultLabel(redirectedFinal)).toBe('Passed');
  });

  it('keeps Failed above HTTP redirect labels', () => {
    const failedRedirect = event({ status: 302, err: 'assertion failed' });

    expect(getDebugEntryStatus(failedRedirect)).toBe('failed');
    expect(getDebugResultLabel(failedRedirect)).toBe('Failed');
  });
});
