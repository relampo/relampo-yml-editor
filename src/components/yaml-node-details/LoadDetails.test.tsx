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
            target: { type: 'rps', value: '20' },
            duration: '1m',
            warmup: '30s',
            ramp_up: '20s',
            control_window: '2s',
            min_vus: '1',
            max_vus: '80',
            latency: { metric: 'p95', max_ms: '800' },
            error_rate: { max_pct: '1' },
          },
        }}
      />,
    );

    expect(screen.getByText('Intent Contract')).toBeInTheDocument();
    expect(screen.getByText('RampUp')).toBeInTheDocument();
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

    expect(screen.getByRole('button', { name: 'Intent' })).toBeInTheDocument();

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
            target: { type: 'rps', value: '20' },
            aggressiveness: 'medium',
            duration: '10m',
            warmup: '30s',
            ramp_up: '20s',
            control_window: '2s',
            min_vus: '1',
            max_vus: '80',
            latency: { metric: 'p95', max_ms: '750' },
            error_rate: { max_pct: '1' },
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
        target: { type: 'rps', value: '80' },
        duration: '10m',
        warmup: '30s',
        ramp_up: '1m',
        control_window: '2s',
        min_vus: '4',
        max_vus: '20',
        latency: { metric: 'p95', max_ms: '750' },
        error_rate: { max_pct: '1' },
        error_4xx_max_pct: '2',
        error_5xx_max_pct: '0.5',
      }),
    );
  });

  it('requires a deliberate manual-stop opt-in and clears finite limits', () => {
    const onNodeUpdate = vi.fn();

    renderWithLanguage(
      <LoadDetails
        node={{
          id: 'load-manual',
          type: 'load',
          name: 'Load Config',
          data: { type: 'constant', users: 3, duration: '1m', iterations: '10' },
        }}
        onNodeUpdate={onNodeUpdate}
      />,
    );

    fireEvent.click(screen.getByRole('checkbox', { name: /Run until manually stopped/i }));

    expect(onNodeUpdate).toHaveBeenCalledWith(
      'load-manual',
      expect.objectContaining({
        run_until_stopped: true,
        duration: '',
        iterations: '',
      }),
    );
  });
});
