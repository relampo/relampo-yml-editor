import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { LoadDetails } from './LoadDetails';

function renderWithLanguage(ui: ReactElement) {
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

describe('LoadDetails', () => {
  it('renders the intent form in grouped sections', () => {
    renderWithLanguage(
      <LoadDetails
        node={{
          id: 'load-1',
          type: 'load',
          name: 'Load Config',
          data: {
            type: 'intent',
            target_unit: 'rps',
            target_value: '20',
            duration: '1m',
            warmup: '30s',
            window: '2s',
            min_vus: '1',
            max_vus: '80',
            p95_max_ms: '800',
            error_rate_max_pct: '1',
          },
        }}
      />,
    );

    expect(screen.getByText('Intent Contract')).toBeInTheDocument();
    expect(screen.getByText('Execution Guardrails')).toBeInTheDocument();
    expect(screen.getByText('SLO Bounds')).toBeInTheDocument();
  });

  it('switches modes through the top selector', () => {
    const onNodeUpdate = vi.fn();

    renderWithLanguage(
      <LoadDetails
        node={{
          id: 'load-2',
          type: 'load',
          name: 'Load Config',
          data: {
            type: 'constant',
            users: 10,
            duration: '1m',
          },
        }}
        onNodeUpdate={onNodeUpdate}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Throughput' }));

    expect(onNodeUpdate).toHaveBeenCalledWith(
      'load-2',
      expect.objectContaining({
        type: 'throughput',
        target_rps: '20',
      }),
    );
  });

  it('auto-fills intent timing, guardrails, and slo bounds from target changes', () => {
    const onNodeUpdate = vi.fn();

    renderWithLanguage(
      <LoadDetails
        node={{
          id: 'load-3',
          type: 'load',
          name: 'Load Config',
          data: {
            type: 'intent',
            target_unit: 'rps',
            target_value: '20',
            aggressiveness: 'medium',
            duration: '10m',
            warmup: '30s',
            window: '2s',
            ramp_up: '1m',
            ramp_down: '1m',
            min_vus: '1',
            max_vus: '80',
            p95_max_ms: '750',
            error_rate_max_pct: '1',
            error_4xx_max_pct: '2',
            error_5xx_max_pct: '0.5',
          },
        }}
        onNodeUpdate={onNodeUpdate}
      />,
    );

    fireEvent.change(screen.getByDisplayValue('20'), { target: { value: '80' } });

    expect(onNodeUpdate).toHaveBeenCalledWith(
      'load-3',
      expect.objectContaining({
        target_value: '80',
        duration: '10m',
        warmup: '30s',
        window: '2s',
        ramp_up: '1m',
        ramp_down: '1m',
        min_vus: '4',
        max_vus: '20',
        p95_max_ms: '800',
        error_rate_max_pct: '1',
        error_4xx_max_pct: '2',
        error_5xx_max_pct: '0.5',
      }),
    );
  });
});
