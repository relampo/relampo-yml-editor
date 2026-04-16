import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LoadVisualization } from './LoadVisualization';

describe('LoadVisualization', () => {
  it('renders intent mode without crashing when only intent fields are present', () => {
    render(
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
});
