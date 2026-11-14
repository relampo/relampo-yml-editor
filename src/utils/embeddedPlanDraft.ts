/** A local draft belongs to one opaque browser account namespace and stable test-plan ID. */
export function embeddedPlanDraftKey(search = window.location.search): string | null {
  const params = new URLSearchParams(search);
  if (params.get('embedded') !== '1') return null;
  const plan = params.get('plan');
  const account = params.get('account');
  if (!plan || !/^[a-zA-Z0-9_-]{1,100}$/.test(plan) || !account || !/^[a-zA-Z0-9_-]{1,80}$/.test(account)) {
    throw new Error('Embedded Studio requires an account namespace and a test plan.');
  }
  return `saas-plan:${account}:${plan}`;
}

/** The legacy plan document is the first script; keep its existing storage key. */
export function embeddedScriptDraftKey(search = window.location.search): string | null {
  const plan = embeddedPlanDraftKey(search);
  if (!plan) return null;
  const script = new URLSearchParams(search).get('script') || 'default';
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(script)) throw new Error('Invalid script ID.');
  return script === 'default' ? plan : `${plan}:script:${script}`;
}
