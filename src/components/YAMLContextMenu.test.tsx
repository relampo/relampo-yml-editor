import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../contexts/LanguageContext';
import { YAMLContextMenu } from './YAMLContextMenu';

describe('YAMLContextMenu', () => {
  it('keeps desktop add options for steps nodes', () => {
    render(
      <LanguageProvider>
        <YAMLContextMenu
          x={10}
          y={10}
          node={{
            id: 'scenario_steps',
            type: 'steps',
            name: 'Steps',
            children: [],
          }}
          onClose={vi.fn()}
          onAddNode={vi.fn()}
          onRemove={vi.fn()}
        />
      </LanguageProvider>,
    );

    expect(screen.getByRole('button', { name: 'HTTP Request Request HTTP' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'SQL Request Database request for PostgreSQL or MySQL' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Group Group steps' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Think Time Pause between requests' })).toBeInTheDocument();
  });
});
