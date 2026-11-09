import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { CorrelateCandidates } from './CorrelateCandidates';
const source = {
  StepIndex: 0,
  RequestID: 1,
  Method: 'POST',
  URL: 'https://app.test/login',
  Location: 'response.body.json',
  Path: '$.token',
};
it('shows selectable candidates without confidence or explanation and keeps manual rows disabled', () => {
  const selected = vi.fn(),
    locate = vi.fn();
  render(
    <CorrelateCandidates
      rows={[
        {
          id: '1',
          variable: 'token',
          type: 'auth_token',
          kind: 'auto',
          applicable: true,
          source,
          targets: [{ ...source, StepIndex: 1, RequestID: 2, Location: 'request.headers', Path: 'Authorization' }],
        },
        { id: '2', variable: 'signature', type: 'signature', kind: 'manual', applicable: false, source, targets: null },
      ]}
      selected={[]}
      onSelected={selected}
      onLocate={locate}
      disabled={false}
      language="en"
    />,
  );
  expect(screen.queryByRole('columnheader', { name: /confidence|explanation/i })).not.toBeInTheDocument();
  expect(screen.getByLabelText('Select candidate 2')).toBeDisabled();
  fireEvent.click(screen.getByLabelText('Select candidate 1'));
  expect(selected).toHaveBeenCalledWith(['1']);
  fireEvent.click(screen.getAllByRole('button', { name: /POST.*login/ })[0]);
  expect(locate).toHaveBeenCalled();
});
