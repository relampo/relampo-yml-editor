import { test as base, expect } from '@playwright/test';
/** Existing provider fixtures exercise the static-host fallback; no real API calls. */
export const test = base.extend({
  context: async ({ context }, use) => {
    await context.route('**/__relampo/git-session/**', route =>
      route.fulfill({ status: 404, json: { error: 'fixture_direct_transport' } }),
    );
    await use(context);
  },
});
export { expect };
