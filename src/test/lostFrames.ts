import { act } from '@testing-library/react';
import { vi } from 'vitest';

// Contract, section 8, "Lost frames": helpers for the tests of a view that
// must not wait for ever. Use them with fake timers.

/** A request whose answer is lost: it ends only when its signal aborts. */
export function lostAnswer(signal?: AbortSignal): Promise<never> {
  return new Promise((_, reject) => signal?.addEventListener('abort', () => reject(signal.reason)));
}

/** Moves the fake clock and lets React draw. */
export async function advance(milliseconds: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(milliseconds);
  });
}
