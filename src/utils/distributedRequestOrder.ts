import type { DistributedScope } from './distributedApi';

/** Script sequence first, followed by the redirects belonging to each request. */
export function orderDistributedRequests(rows: DistributedScope[], scenarioOrder: string[] = []): DistributedScope[] {
  const scenarios = new Map(scenarioOrder.map((name, index) => [name, index]));
  for (const row of rows) {
    const scenario = row.scenario ?? '';
    if (!scenarios.has(scenario)) scenarios.set(scenario, scenarios.size);
  }
  const position = (name = '') => {
    const step = /^\[(\d+)\]/.exec(name);
    const redirect = / -> final (\d+)\b/.exec(name);
    return { step: step ? Number(step[1]) : null, redirect: redirect ? Number(redirect[1]) : 0 };
  };
  return [...rows].sort((a, b) => {
    const scenario =
      (scenarios.get(a.scenario ?? '') ?? scenarioOrder.length) -
      (scenarios.get(b.scenario ?? '') ?? scenarioOrder.length);
    if (scenario) return scenario;
    if (a.scenario !== b.scenario) return 0;
    const left = position(a.name),
      right = position(b.name);
    if (left.step == null) return right.step == null ? 0 : 1;
    if (right.step == null) return -1;
    return left.step - right.step || left.redirect - right.redirect;
  });
}
