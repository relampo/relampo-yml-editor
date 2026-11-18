import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { LanguageProvider } from '../contexts/LanguageContext';
import { RunExecutionOptions } from './RunExecutionOptions';
afterEach(cleanup);
it('keeps runtime overrides separate and rejects blank variable names', () => {
  const change = vi.fn(),
    error = vi.fn();
  render(
    <RunExecutionOptions
      disabled={false}
      multi={false}
      onChange={change}
      onError={error}
    />,
    { wrapper: LanguageProvider },
  );
  fireEvent.change(screen.getByLabelText('Execution vus'), { target: { value: '4' } });
  fireEvent.change(screen.getByLabelText('Execution variables'), { target: { value: 'user=QA\ntoken=a=b' } });
  expect(change).toHaveBeenLastCalledWith({ vus: 4, variables: { user: 'QA', token: 'a=b' } });
  fireEvent.change(screen.getByLabelText('Execution variables'), { target: { value: ' =invalid' } });
  expect(error).toHaveBeenLastCalledWith('Use name=value for each variable.');
});
it('uses per-scenario load for multiple scenarios while allowing variables and full capture', () => {
  const change = vi.fn();
  render(
    <RunExecutionOptions
      disabled={false}
      multi
      onChange={change}
      onError={vi.fn()}
    />,
    { wrapper: LanguageProvider },
  );
  for (const name of ['Execution vus', 'Execution duration', 'Execution rps'])
    expect(screen.getByLabelText(name)).toBeDisabled();
  expect(screen.getByLabelText('Execution variables')).toBeEnabled();
  fireEvent.click(screen.getByRole('checkbox'));
  expect(change).toHaveBeenLastCalledWith({ captureDetails: true });
});
