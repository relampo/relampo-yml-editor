import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { HTTPDynamicReview } from './HTTPDynamicReview';
import { httpRecorderRequest } from '../../utils/httpRecorderApi';
vi.mock('../../utils/httpRecorderApi', () => ({ httpRecorderRequest: vi.fn() }));
it('reviews saved relationships without changing the recording', async () => {
  vi.mocked(httpRecorderRequest).mockResolvedValue({
    readOnly: true,
    candidates: [
      {
        id: 'one',
        variable: 'event_id',
        sourceRequest: 1,
        source: 'response.body.json',
        path: '$.eventId',
        uses: 2,
        confidence: 0.9,
      },
    ],
  });
  render(<HTTPDynamicReview language="en" />);
  fireEvent.click(screen.getByRole('button', { name: 'Review dynamic values' }));
  expect(await screen.findByText('event_id')).toBeInTheDocument();
  expect(screen.getByText(/does not modify your recording/)).toBeInTheDocument();
  expect(httpRecorderRequest).toHaveBeenCalledExactlyOnceWith('correlations', {});
});
