import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { RunRequestTable, type RunRequestRow } from './RunRequestTable';
afterEach(cleanup);
const rows: RunRequestRow[] = Array.from({ length: 105 }, (_, i) => ({
  key: String(i),
  label: `/login/${i + 1}`,
  title: `Request ${i + 1}`,
  method: 'GET',
  count: i + 1,
  failures: i,
  avg: i,
  p50: i,
  p90: i,
  p95: i,
  p99: i,
}));
const view = (data = rows) => (
  <RunRequestTable
    rows={data}
    es={false}
    formatLatency={v => (v == null ? '—' : `${v}ms`)}
  />
);
it('shows 50 rows by default and navigates all pages without dropping requests', () => {
  render(view());
  const table = screen.getByRole('table');
  expect(within(table).getAllByRole('row')).toHaveLength(51);
  expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(within(table).getByText('/login/51')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(within(table).getAllByRole('row')).toHaveLength(6);
  expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
});
it.each(['Count', 'Fail', 'Avg', 'p50', 'p90', 'p95', 'p99'])(
  'sorts all rows numerically by %s before pagination',
  column => {
    render(view());
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: column }));
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('row')[1]).toHaveTextContent('/login/1');
    fireEvent.click(screen.getByRole('button', { name: column }));
    expect(within(table).getAllByRole('row')[1]).toHaveTextContent('/login/105');
  },
);
it('sorts request paths naturally and retains the page as live counts update', () => {
  const { rerender } = render(view());
  fireEvent.click(screen.getByRole('button', { name: 'Request' }));
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  rerender(view(rows.map(row => ({ ...row, count: row.count + 5 }))));
  expect(within(screen.getByRole('table')).getAllByRole('row')[1]).toHaveTextContent('/login/51');
});

it('searches all pages by request or method without case sensitivity and resets to page one', () => {
  render(view(rows.map((row, index) => ({ ...row, method: index === 104 ? 'POST' : 'GET' }))));
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  fireEvent.change(screen.getByRole('searchbox', { name: 'Search requests' }), { target: { value: '/login/105' } });
  const table = screen.getByRole('table');
  expect(within(table).getAllByRole('row')).toHaveLength(2);
  expect(within(table).getByText('/login/105')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: ' pOsT ' } });
  expect(within(table).getByText('/login/105')).toBeInTheDocument();
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: '' } });
  expect(within(table).getAllByRole('row')).toHaveLength(51);
  expect(within(table).getByText('/login/1')).toBeInTheDocument();
});
it('shows no matches without dropping the search as live requests arrive', () => {
  const { rerender } = render(view());
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: '/checkout' } });
  expect(screen.getByRole('status')).toHaveTextContent('No matching requests.');
  expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  rerender(view([...rows, { ...rows[0], key: 'checkout', label: '/checkout' }]));
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  expect(within(screen.getByRole('table')).getByText('/checkout')).toBeInTheDocument();
});
