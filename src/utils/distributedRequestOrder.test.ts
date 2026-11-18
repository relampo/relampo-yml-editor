import { expect, it } from 'vitest';
import { orderDistributedRequests } from './distributedRequestOrder';
import type { DistributedScope } from './distributedApi';
const row = (name: string, scenario = 'Checkout') =>
  ({ key: `${scenario}:${name}`, name, scenario, total: { requests: 23 } }) as DistributedScope;
it('uses script sequence and places redirect hops after their original request without changing counters', () => {
  const rows = [
    row('[11] POST /confirm'),
    row('[12] POST /pay -> final 10 GET /done'),
    row('[12] POST /pay -> final 1 GET /next'),
    row('[12] POST /pay'),
    row('[1] GET /'),
    row('[2] GET /login'),
    row('[14] GET /logoff'),
  ];
  const ordered = orderDistributedRequests(rows);
  expect(ordered.map(r => r.name)).toEqual([
    '[1] GET /',
    '[2] GET /login',
    '[11] POST /confirm',
    '[12] POST /pay',
    '[12] POST /pay -> final 1 GET /next',
    '[12] POST /pay -> final 10 GET /done',
    '[14] GET /logoff',
  ]);
  expect(rows[0].name).toBe('[11] POST /confirm');
  expect(ordered.every(r => rows.includes(r) && r.total.requests === 23)).toBe(true);
});
it('respects authored scenario order and preserves unnumbered entries', () => {
  const rows = [row('[1] GET /', 'A'), row('[2] GET /two', 'Z'), row('[1] GET /one', 'Z')];
  expect(orderDistributedRequests(rows, ['Z', 'A']).map(r => r.scenario)).toEqual(['Z', 'Z', 'A']);
  const unnumbered = [row('Login'), row('Checkout')];
  expect(orderDistributedRequests(unnumbered)).toEqual(unnumbered);
});
