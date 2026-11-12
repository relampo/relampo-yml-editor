import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { LanguageProvider } from '../contexts/LanguageContext';
import { SQLResultTable } from './SQLResultTable';
import { isSQLResult, type SQLResult } from '../utils/sqlResults';
afterEach(cleanup);
const sample: SQLResult = {
  kind: 'query',
  columns: ['id', 'name', 'nullable'],
  rows: [
    [1, 'Evento', null],
    [2, '', false],
  ],
  rows_returned: 2,
  rows_affected: 0,
  truncated: false,
};
it('shows typed SQL values, NULL and columns as a table', () => {
  render(
    <LanguageProvider>
      <SQLResultTable result={sample} />
    </LanguageProvider>,
  );
  const table = screen.getByRole('table', { name: 'Returned SQL rows' });
  expect(within(table).getByRole('columnheader', { name: 'id' })).toBeInTheDocument();
  expect(within(table).getByText('Evento')).toBeInTheDocument();
  expect(within(table).getByText('NULL')).toBeInTheDocument();
  expect(within(table).getByText('false')).toBeInTheDocument();
});
it('distinguishes an empty query from an exec and explains truncated results', () => {
  const { rerender } = render(
    <LanguageProvider>
      <SQLResultTable result={{ ...sample, rows: [], rows_returned: 0 }} />
    </LanguageProvider>,
  );
  expect(screen.getByText('The query returned no rows.')).toBeInTheDocument();
  rerender(
    <LanguageProvider>
      <SQLResultTable result={{ ...sample, kind: 'exec', rows: [], rows_affected: 3 }} />
    </LanguageProvider>,
  );
  expect(screen.getByText('Rows affected: 3')).toBeInTheDocument();
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
  rerender(
    <LanguageProvider>
      <SQLResultTable result={{ ...sample, truncated: true, rows_returned: 150 }} />
    </LanguageProvider>,
  );
  expect(screen.getByText(/Limited sample/)).toBeInTheDocument();
  expect(screen.getByText('Rows returned: 150 · Rows shown: 2')).toBeInTheDocument();
});
it('validates SQL samples received through SSE', () => {
  expect(isSQLResult(sample)).toBe(true);
  expect(isSQLResult({ ...sample, rows: [[{}]] })).toBe(false);
  expect(isSQLResult({ ...sample, rows: [[1]] })).toBe(false);
  expect(isSQLResult({ ...sample, rows_returned: -1 })).toBe(false);
  expect(isSQLResult({ ...sample, rows: Array(101).fill(sample.rows[0]) })).toBe(false);
});

it('shows the executed SQL and bound parameters in the request disclosure', () => {
  render(
    <LanguageProvider>
      <SQLResultTable
        result={{
          ...sample,
          query: 'SELECT id FROM events WHERE name=$1',
          params: ['Live event'],
          dialect: 'postgres',
        }}
      />
    </LanguageProvider>,
  );
  const request = screen.getByText('SQL request');
  request.click();
  expect(screen.getByText('SELECT id FROM events WHERE name=$1')).toBeInTheDocument();
  expect(screen.getByText(/"Live event"/)).toBeInTheDocument();
});
