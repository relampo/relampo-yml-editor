import { describe, expect, it } from 'vitest';
import { embeddedPlanDraftKey } from './embeddedPlanDraft';

describe('embedded test-plan draft identity', () => {
  it('isolates plans and browser accounts using stable IDs', () => {
    expect(embeddedPlanDraftKey('?embedded=1&account=user-a&plan=tp-01')).toBe('saas-plan:user-a:tp-01');
    expect(embeddedPlanDraftKey('?embedded=1&account=user-a&plan=tp-02')).not.toBe(
      embeddedPlanDraftKey('?embedded=1&account=user-a&plan=tp-01'),
    );
    expect(embeddedPlanDraftKey('?embedded=1&account=user-b&plan=tp-01')).not.toBe(
      embeddedPlanDraftKey('?embedded=1&account=user-a&plan=tp-01'),
    );
  });
  it('does not change independent Studio draft storage', () => {
    expect(embeddedPlanDraftKey('?editor=existing-id')).toBeNull();
  });
  it.each(['?embedded=1', '?embedded=1&account=a', '?embedded=1&account=a&plan=../other', '?embedded=1&plan=tp-01'])(
    'rejects incomplete or invalid context instead of falling back to a shared draft: %s',
    search => {
      expect(() => embeddedPlanDraftKey(search)).toThrow();
    },
  );
});
