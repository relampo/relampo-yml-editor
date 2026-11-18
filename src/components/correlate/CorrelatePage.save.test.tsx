import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { CorrelatePage } from './CorrelatePage';
vi.mock('./CorrelateDocumentPanel', () => ({ CorrelateDocumentPanel: () => null }));
vi.mock('./CorrelateResults', () => ({ CorrelateResults: () => null }));
it('shows bottom save choices and always appends correlated once to a new filename', async () => {
  const onSave = vi.fn(async () => {});
  render(
    <LanguageProvider>
      <CorrelatePage
        source={{ yaml: 'test: original', fileName: 'login.yml', revision: 1 }}
        onCommit={vi.fn()}
        onSave={onSave}
      />
    </LanguageProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Overwrite script with correlations' }));
  await waitFor(() => expect(onSave).toHaveBeenCalledWith('test: original', 'login.yml', false));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Save as new script' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Save as new script' }));
  expect(screen.getByLabelText('New script filename')).toHaveValue('login.correlated.yaml');
  fireEvent.change(screen.getByLabelText('New script filename'), { target: { value: 'checkout.yml' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save as new script' }));
  await waitFor(() => expect(onSave).toHaveBeenLastCalledWith('test: original', 'checkout.correlated.yaml', true));
});
it('keeps save errors visible and allows retrying the same correlation', async () => {
  const onSave = vi.fn().mockRejectedValueOnce(new Error('Folder unavailable')).mockResolvedValue(undefined);
  render(
    <LanguageProvider>
      <CorrelatePage
        source={{ yaml: 'test: original', fileName: 'login.yaml', revision: 1 }}
        onCommit={vi.fn()}
        onSave={onSave}
      />
    </LanguageProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Overwrite script with correlations' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Folder unavailable');
  fireEvent.click(screen.getByRole('button', { name: 'Overwrite script with correlations' }));
  await waitFor(() => expect(onSave).toHaveBeenCalledTimes(2));
});
