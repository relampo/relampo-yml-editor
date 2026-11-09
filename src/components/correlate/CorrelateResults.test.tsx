import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { CorrelateResults } from './CorrelateResults';
import type { AppliedCorrelation } from '../../utils/correlateApi';
it('creates and selects the correlated tab after generation and shows the exact extractor and its uses', () => {
  const source = {
    StepIndex: 0,
    RequestID: 1,
    Method: 'POST',
    URL: 'https://app.test/login',
    Location: 'response.header',
    Path: 'X-CSRF',
  };
  const props = { rows: [], selected: [], onSelected: vi.fn(), onLocate: vi.fn(), disabled: false, language: 'en' };
  const { rerender } = render(
    <CorrelateResults
      {...props}
      results={null}
    />,
  );
  expect(screen.queryByRole('tab', { name: /Correlated/ })).not.toBeInTheDocument();
  const result: AppliedCorrelation = {
    variable: 'csrf',
    placeholder: '{{csrf}}',
    type: 'regex',
    from: 'headers',
    pattern: String.raw`(?im)^X-CSRF:\s*([^\r\n]+)$`,
    expression: '',
    header: '',
    configuration: 'type: regex\nfrom: headers\nvar: csrf\ngroup: 1',
    source,
    targets: [{ ...source, StepIndex: 1, RequestID: 2, Location: 'request.headers' }],
  };
  rerender(
    <CorrelateResults
      {...props}
      results={[result]}
    />,
  );
  expect(screen.getByRole('tab', { name: /Correlated/ })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByText(result.pattern)).toBeVisible();
  fireEvent.click(screen.getByText('View YAML configuration'));
  expect(screen.getByLabelText('Extractor configuration csrf')).toHaveTextContent('group: 1');
  expect(screen.getByLabelText('Extractor configuration csrf').textContent).toBe(result.configuration);
  fireEvent.click(screen.getByRole('tab', { name: /Candidates/ }));
  expect(screen.queryByRole('region', { name: 'Applied correlations' })).not.toBeInTheDocument();
});
