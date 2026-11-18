import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { correlateRequest } from '../../utils/correlateApi';
import { CorrelatePage } from './CorrelatePage';
vi.mock('./CorrelateDocumentPanel', () => ({ CorrelateDocumentPanel: () => null }));
vi.mock('./CorrelateResults', () => ({
  CorrelateResults: ({ rows, onSelected }: any) =>
    rows ? <button onClick={() => onSelected(['token'])}>Select token</button> : null,
}));
vi.mock('../../utils/correlateApi', async importOriginal => ({
  ...(await importOriginal<typeof import('../../utils/correlateApi')>()),
  correlateRequest: vi.fn(),
}));
beforeEach(() => {
  vi.mocked(correlateRequest).mockReset();
  vi.mocked(correlateRequest).mockImplementation(async path =>
    path === 'analyze'
      ? { digest: 'analysis', requests: 1, responses: 1, candidates: [] }
      : { yaml: 'test: correlated', applied: [] },
  );
});
async function completeCorrelation() {
  fireEvent.click(screen.getByRole('button', { name: 'Analyze' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Select token' }));
  fireEvent.click(screen.getByRole('button', { name: 'Correlate' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Overwrite script with correlations' })).toBeEnabled());
}

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
  await completeCorrelation();
  fireEvent.click(screen.getByRole('button', { name: 'Overwrite script with correlations' }));
  await waitFor(() => expect(onSave).toHaveBeenCalledWith('test: correlated', 'login.yml', false));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Save as new script' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Save as new script' }));
  expect(screen.getByLabelText('New script filename')).toHaveValue('login.correlated.yaml');
  fireEvent.change(screen.getByLabelText('New script filename'), { target: { value: 'checkout.yml' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save as new script' }));
  await waitFor(() => expect(onSave).toHaveBeenLastCalledWith('test: correlated', 'checkout.correlated.yaml', true));
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
  await completeCorrelation();
  fireEvent.click(screen.getByRole('button', { name: 'Overwrite script with correlations' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Folder unavailable');
  fireEvent.click(screen.getByRole('button', { name: 'Overwrite script with correlations' }));
  await waitFor(() => expect(onSave).toHaveBeenCalledTimes(2));
});

it('enables both save choices only after Correlate completes successfully', async () => {
  const onSave = vi.fn();
  render(
    <LanguageProvider>
      <CorrelatePage
        source={{ yaml: 'test: original', fileName: 'login.yaml', revision: 1 }}
        onCommit={vi.fn()}
        onSave={onSave}
      />
    </LanguageProvider>,
  );
  const overwrite = screen.getByRole('button', { name: 'Overwrite script with correlations' });
  const copy = screen.getByRole('button', { name: 'Save as new script' });
  expect(overwrite).toBeDisabled();
  expect(copy).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Analyze' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Select token' }));
  expect(overwrite).toBeDisabled();
  expect(copy).toBeDisabled();
  let finish!: (value: unknown) => void;
  vi.mocked(correlateRequest).mockImplementationOnce(
    () =>
      new Promise(resolve => {
        finish = resolve;
      }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Correlate' }));
  expect(overwrite).toBeDisabled();
  expect(copy).toBeDisabled();
  finish({ yaml: 'test: correlated', applied: [] });
  await waitFor(() => expect(overwrite).toBeEnabled());
  expect(copy).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: 'Analyze' }));
  await screen.findByRole('button', { name: 'Select token' });
  expect(overwrite).toBeDisabled();
  expect(copy).toBeDisabled();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Analyze' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Select token' }));
  vi.mocked(correlateRequest).mockRejectedValueOnce(new Error('Correlation failed'));
  fireEvent.click(screen.getByRole('button', { name: 'Correlate' }));
  await screen.findByRole('alert');
  expect(overwrite).toBeDisabled();
  expect(copy).toBeDisabled();
  expect(onSave).not.toHaveBeenCalled();
});
