import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../contexts/LanguageContext';
import type { YAMLNode } from '../types/yaml';
import { YAMLNodeDetails } from './YAMLNodeDetails';

function renderDetails({
  node,
  hosts = [],
  onNodeUpdate = vi.fn(),
  onRenameHost = vi.fn(),
  onAddChildNode = vi.fn(),
  onAddChildAction = vi.fn(),
}: {
  node: YAMLNode;
  hosts?: string[];
  onNodeUpdate?: (nodeId: string, updatedData: any) => void;
  onRenameHost?: (oldHost: string, newHost: string) => void;
  onAddChildNode?: (...args: any[]) => void;
  onAddChildAction?: (...args: any[]) => void;
}) {
  render(
    <LanguageProvider>
      <YAMLNodeDetails
        node={node}
        hosts={hosts}
        onNodeUpdate={onNodeUpdate}
        onRenameHost={onRenameHost}
        onAddChildNode={onAddChildNode}
        onAddChildAction={onAddChildAction}
      />
    </LanguageProvider>,
  );
  return { onNodeUpdate, onRenameHost, onAddChildNode, onAddChildAction };
}

describe('YAMLNodeDetails add actions', () => {
  //TODO - re-enable this test when the add child node functionality is implemented
  it.skip('renders add actions for steps nodes', () => {
    renderDetails({
      node: {
        id: 'scenario_steps',
        type: 'steps',
        name: 'Steps',
        children: [],
      },
    });

    expect(screen.getByRole('button', { name: 'Add HTTP Request' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add SQL Request' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Group' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Think Time' })).toBeInTheDocument();
  });
  it.skip('adds a child node to the selected parent from details', () => {
    const { onAddChildNode, onAddChildAction } = renderDetails({
      node: {
        id: 'scenario_steps',
        type: 'steps',
        name: 'Steps',
        children: [],
      },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Add HTTP Request' }));

    expect(onAddChildNode).toHaveBeenCalledWith('scenario_steps', 'request');
    expect(onAddChildAction).toHaveBeenCalledWith({
      parentNodeType: 'steps',
      childNodeType: 'request',
    });
  });
});

describe('YAMLNodeDetails http defaults hosts', () => {
  it('renders secondary hosts as editable fields and renames them on commit', () => {
    const onRenameHost = vi.fn();
    renderDetails({
      node: {
        id: 'http-defaults',
        type: 'http_defaults',
        name: 'HTTP Defaults',
        data: {
          base_url: 'https://api.example.com',
        },
        children: [],
      },
      hosts: ['api.example.com', 'cdn.example.com'],
      onRenameHost,
    });

    expect(screen.getByText('base_url1')).toBeInTheDocument();
    expect(
      screen.getByText('Extra hosts this recording targets. Editing one renames that host on every request that uses it.'),
    ).toBeInTheDocument();

    const input = screen.getByDisplayValue('cdn.example.com');
    fireEvent.change(input, { target: { value: 'static.example.com' } });
    fireEvent.blur(input);

    expect(onRenameHost).toHaveBeenCalledWith('cdn.example.com', 'static.example.com');
  });

  it('cancels the edit on Escape without renaming', () => {
    const onRenameHost = vi.fn();
    renderDetails({
      node: {
        id: 'http-defaults',
        type: 'http_defaults',
        name: 'HTTP Defaults',
        data: {
          base_url: 'https://api.example.com',
        },
        children: [],
      },
      hosts: ['api.example.com', 'cdn.example.com'],
      onRenameHost,
    });

    const input = screen.getByDisplayValue('cdn.example.com');
    fireEvent.change(input, { target: { value: 'static.example.com' } });
    // Escape resets the draft and blurs; the blur must not commit the edit.
    fireEvent.keyDown(input, { key: 'Escape' });
    fireEvent.blur(input);

    expect(onRenameHost).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue('cdn.example.com')).toBeInTheDocument();
  });

  it('drops unsupported base_urlN fields when editable defaults change', () => {
    const onNodeUpdate = vi.fn();
    renderDetails({
      node: {
        id: 'http-defaults',
        type: 'http_defaults',
        name: 'HTTP Defaults',
        data: {
          base_url: 'https://api.example.com',
          base_url1: 'stale.example.com',
        },
        children: [],
      },
      hosts: ['api.example.com', 'cdn.example.com'],
      onNodeUpdate,
    });

    fireEvent.change(screen.getByDisplayValue('https://api.example.com'), {
      target: { value: 'https://next.example.com' },
    });

    expect(onNodeUpdate).toHaveBeenCalledWith('http-defaults', {
      base_url: 'https://next.example.com',
      headers: {},
    });
  });
});
