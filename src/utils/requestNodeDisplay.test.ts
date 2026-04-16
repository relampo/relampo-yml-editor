import { describe, expect, it } from 'vitest';
import { getUpdatedRequestNodePresentation } from './requestNodeDisplay';

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
