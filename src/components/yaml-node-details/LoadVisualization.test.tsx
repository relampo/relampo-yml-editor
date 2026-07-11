import { render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { LoadVisualization } from './LoadVisualization';

function renderWithLanguage(ui: ReactElement) {
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

describe('LoadVisualization', () => {
  it('renders intent mode without crashing when only intent fields are present', () => {
    renderWithLanguage(
      <LoadVisualization
        loadType="intent"
        data={{
          type: 'intent',
          target_unit: 'rps',
          target_value: '25',
          duration: '3s',
          warmup: '400ms',
          window: '200ms',
          min_vus: '1',
          max_vus: '6',
          p95_max_ms: '180',
          error_rate_max_pct: '2',
          aggressiveness: 'medium',
        }}
      />,
    );

    expect(screen.getByText('Load Pattern Visualization')).toBeInTheDocument();
    expect(screen.getByText('Execution Phases')).toBeInTheDocument();
    expect(screen.getByText(/1500 req\/min target/i)).toBeInTheDocument();
  });

  it('uses effective intent suggestions in the chart when editable fields are blank', () => {
    renderWithLanguage(
      <LoadVisualization
        loadType="intent"
        data={{
          type: 'intent',
          target_unit: 'rps',
          target_value: '25',
          aggressiveness: 'medium',
          duration: '',
          warmup: '',
          min_vus: '',
          max_vus: '',
        }}
      />,
    );

    expect(screen.getByText(/VU guardrails:\s*2\.\.7\./i)).toBeInTheDocument();
    expect(screen.getByText(/warmup 30s/i)).toBeInTheDocument();
    expect(screen.getByText(/Total:\s*10m/i)).toBeInTheDocument();
  });

  it('shows an infinite total when no duration is configured', () => {
    renderWithLanguage(
      <LoadVisualization
        loadType="constant"
        data={{ type: 'constant', users: '15', duration: '', ramp_up: '15' }}
      />,
    );

    expect(screen.getByText(/Peak Users:\s*15\s*\|\s*Total:\s*∞/i)).toBeInTheDocument();
  });

  it('treats unitless duration and ramp up values as seconds', () => {
    renderWithLanguage(
      <LoadVisualization
        loadType="constant"
        data={{ type: 'constant', users: '15', duration: '15', ramp_up: '5' }}
      />,
    );

    expect(screen.getByText(/Total:\s*15s/i)).toBeInTheDocument();
    expect(screen.getByText('5s')).toBeInTheDocument();
  });

  it('formats sub-second totals in milliseconds', () => {
    renderWithLanguage(
      <LoadVisualization
        loadType="constant"
        data={{ type: 'constant', users: '15', duration: '15ms' }}
      />,
    );

    expect(screen.getByText(/Total:\s*15ms/i)).toBeInTheDocument();
  });
});
