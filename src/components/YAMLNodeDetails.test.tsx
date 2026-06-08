import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../contexts/LanguageContext';
import type { YAMLNode } from '../types/yaml';
import { YAMLNodeDetails } from './YAMLNodeDetails';

function renderDetails(node: YAMLNode, onAddChildNode = vi.fn(), onAddChildAction = vi.fn()) {
  render(
    <LanguageProvider>
      <YAMLNodeDetails
        node={node}
        onAddChildNode={onAddChildNode}
        onAddChildAction={onAddChildAction}
      />
    </LanguageProvider>,
  );
  return { onAddChildNode, onAddChildAction };
}

describe('YAMLNodeDetails add actions', () => {
  //TODO - re-enable this test when the add child node functionality is implemented
  it.skip('renders add actions for steps nodes', () => {
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
  it.skip('adds a child node to the selected parent from details', () => {
    const { onAddChildNode, onAddChildAction } = renderDetails({
      id: 'scenario_steps',
      type: 'steps',
      name: 'Steps',
      children: [],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Add HTTP Request' }));

    expect(onAddChildNode).toHaveBeenCalledWith('scenario_steps', 'request');
    expect(onAddChildAction).toHaveBeenCalledWith({
      parentNodeType: 'steps',
      childNodeType: 'request',
    });
  });
});
