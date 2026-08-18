import { describe, it } from 'vitest';
import { allowConsoleErrorOnce } from './setup';

describe('test safety setup', () => {
  it('allows one console error only when the test declares its exact message', () => {
    allowConsoleErrorOnce('expected boundary failure');
    console.error('expected boundary failure');
  });
});
