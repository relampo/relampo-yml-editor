import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../contexts/LanguageContext';
import type { YAMLNode } from '../types/yaml';
import { YAMLNodeDetails } from './YAMLNodeDetails';

function renderDetails(node: YAMLNode, onAddChildNode = vi.fn()) {
  render(
    <LanguageProvider>
      <YAMLNodeDetails
        node={node}
        onAddChildNode={onAddChildNode}
      />
    </LanguageProvider>,
  );
  return { onAddChildNode };
}

describe('YAMLNodeDetails add actions', () => {
  it('renders add actions for steps nodes', () => {
    renderDetails({
      id: 'scenario_steps',
      type: 'steps',
      name: 'Steps',
      children: [],
    });

    expect(screen.getByRole('button', { name: 'Add HTTP Request' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add SQL Request' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Group' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Think Time' })).toBeInTheDocument();
  });

  it('adds a child node to the selected parent from details', () => {
    const { onAddChildNode } = renderDetails({
      id: 'scenario_steps',
      type: 'steps',
      name: 'Steps',
      children: [],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Add HTTP Request' }));

    expect(onAddChildNode).toHaveBeenCalledWith('scenario_steps', 'request');
  });
});
