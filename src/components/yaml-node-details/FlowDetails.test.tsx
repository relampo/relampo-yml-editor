import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ThinkTimeDetails } from './FlowDetails';

const node = (distribution: string) => ({
  id: 'think-time',
  type: 'think_time' as const,
  name: 'Think Time',
  data: {
    distribution,
    mean: '7s',
    std_dev: '1s',
    min: '5s',
    max: '10s',
  },
});

describe('ThinkTimeDetails', () => {
  it('disables distribution-only fields for uniform samples', () => {
    render(<ThinkTimeDetails node={node('uniform')} />);

    expect(screen.getByLabelText('Mean')).toBeDisabled();
    expect(screen.getByLabelText('Std Dev')).toBeDisabled();
  });

  it('keeps mean and standard deviation editable for normal samples', () => {
    render(<ThinkTimeDetails node={node('normal')} />);

    expect(screen.getByLabelText('Mean')).not.toBeDisabled();
    expect(screen.getByLabelText('Std Dev')).not.toBeDisabled();
  });
});
