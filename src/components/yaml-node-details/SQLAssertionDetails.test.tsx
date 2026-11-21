import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { SQLAssertionDetails } from './SQLAssertionDetails';
import { FileDetails } from './basic-details/FileDetails';
it('edits SQL row bounds without offering HTTP status assertions', () => {
  const update = vi.fn();
  render(
    <LanguageProvider>
      <SQLAssertionDetails
        sqlKind="query"
        node={{ id: 'a', type: 'assertion', name: 'Assertion', data: { type: 'rows_returned', value: { min: 1 } } }}
        onNodeUpdate={update}
      />
    </LanguageProvider>,
  );
  expect(screen.getByRole('button', { name: 'Rows returned' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /HTTP Status/ })).not.toBeInTheDocument();
  fireEvent.change(screen.getByRole('textbox', { name: 'Minimum' }), { target: { value: '{{expected}}' } });
  expect(update).toHaveBeenCalledWith('a', expect.objectContaining({ value: { min: '{{expected}}' } }));
});
it('configures a protobuf bytes field using the existing file editor', () => {
  const update = vi.fn();
  render(
    <LanguageProvider>
      <FileDetails
        protocol="grpc"
        node={{ id: 'f', type: 'file', name: 'File', data: { path: 'file.bin', field: 'payload' } }}
        onNodeUpdate={update}
      />
    </LanguageProvider>,
  );
  fireEvent.change(screen.getByRole('textbox', { name: /Message bytes field/ }), {
    target: { value: 'message.content' },
  });
  expect(update).toHaveBeenCalledWith('f', expect.objectContaining({ field: 'message.content' }));
});
