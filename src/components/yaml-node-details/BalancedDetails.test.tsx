import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LanguageProvider } from '../../contexts/LanguageContext';
import type { YAMLNode } from '../../types/yaml';
import { BalancedDetails } from './BalancedDetails';

function renderWithLanguage(node: YAMLNode) {
  return render(
    <LanguageProvider>
      <BalancedDetails node={node} />
    </LanguageProvider>,
  );
}

describe('BalancedDetails excluded children', () => {
  it('renders excluded children in a collapsible list', () => {
    renderWithLanguage({
      id: 'balanced-1',
      type: 'balanced',
      name: 'Balanced Controller',
      data: {
        type: 'total',
        mode: 'iteraciones',
      },
      children: [
        {
          id: 'req-1',
          type: 'get',
          name: 'Primary Request',
          data: { __balancedPercentage: 100 },
        },
        {
          id: 'wait-1',
          type: 'think_time',
          name: 'Idle wait between phases',
        },
        {
          id: 'group-1',
          type: 'group',
          name: 'Long excluded child label that should wrap naturally instead of splitting midword',
          children: [],
        },
      ],
    });

    expect(
      screen.getByText(
        'Not balanced (no requests): these elements issue no requests, so they receive no load percentage.',
      ),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', {
        name: /Not balanced \(no requests\): these elements issue no requests, so they receive no load percentage\./i,
      }),
    );

    expect(screen.getAllByRole('listitem')).toHaveLength(2);

    const longLabel = screen.getByText(
      'Long excluded child label that should wrap naturally instead of splitting midword',
    );
    expect(longLabel).toHaveClass('break-all');
  });
});
