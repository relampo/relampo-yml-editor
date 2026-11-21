import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { ExtractorDetails } from './ValidationDetails';
afterEach(cleanup);
it('uses the shared variable and default controls with SQL-specific column and row fields', () => {
  const update = vi.fn();
  render(
    <LanguageProvider>
      <ExtractorDetails
        node={{
          id: 'ext',
          type: 'extractor',
          name: 'Extractor',
          data: { type: 'sql', var: 'event_id', column: 'id', row: 1 },
        }}
        onNodeUpdate={update}
      />
    </LanguageProvider>,
  );
  expect(screen.getByRole('button', { name: 'SQL' })).toHaveAttribute('aria-pressed', 'true');
  fireEvent.change(screen.getByLabelText('Variable Name *'), { target: { value: 'selected_event_id' } });
  expect(update).toHaveBeenLastCalledWith(
    'ext',
    expect.objectContaining({ var: 'selected_event_id', variable: 'selected_event_id' }),
  );
  fireEvent.change(screen.getByLabelText('Column name or alias'), { target: { value: 'event_id' } });
  expect(update).toHaveBeenLastCalledWith('ext', expect.objectContaining({ column: 'event_id' }));
  fireEvent.change(screen.getByLabelText('Row (starting at 1)'), { target: { value: '2' } });
  expect(update).toHaveBeenLastCalledWith('ext', expect.objectContaining({ row: 2 }));
  fireEvent.change(screen.getByLabelText('Default Value (if not found)'), { target: { value: 'NOT_FOUND' } });
  expect(update).toHaveBeenLastCalledWith('ext', expect.objectContaining({ default: 'NOT_FOUND' }));
  for (const name of [/^regex$/i, /^jsonpath$/i, /^xpath$/i, /^boundary$/i])
    expect(screen.getByRole('button', { name })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /^regex$/i }));
  expect(update).toHaveBeenLastCalledWith(
    'ext',
    expect.objectContaining({ type: 'regex', from: 'body', column: 'id', row: 1, var: 'event_id' }),
  );
});
it('keeps the HTTP extractor choices and JSONPath controls without SQL fields', () => {
  const update = vi.fn();
  render(
    <LanguageProvider>
      <ExtractorDetails
        node={{
          id: 'http',
          type: 'extractor',
          name: 'Extractor',
          data: { type: 'jsonpath', var: 'id', expression: '$.id', from: 'body' },
        }}
        onNodeUpdate={update}
      />
    </LanguageProvider>,
  );
  expect(screen.getByRole('button', { name: /^jsonpath$/i })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByLabelText('Variable Name *')).toHaveValue('id');
  expect(screen.getByLabelText('Default Value (if not found)')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'SQL' })).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Column name or alias')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Variable Name *'), { target: { value: 'next_id' } });
  expect(update).toHaveBeenLastCalledWith(
    'http',
    expect.objectContaining({
      type: 'jsonpath',
      var: 'next_id',
      variable: 'next_id',
      expression: '$.id',
      from: 'body',
    }),
  );
});
