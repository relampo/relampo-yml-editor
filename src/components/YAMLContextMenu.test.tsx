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

  it('offers another scenario under a populated scenarios container', () => {
    render(
      <LanguageProvider>
        <YAMLContextMenu
          x={10}
          y={10}
          node={{
            id: 'scenarios',
            type: 'scenarios',
            name: 'Scenarios',
            children: [{ id: 'scenario-1', type: 'scenario', name: 'Scenario', children: [] }],
          }}
          onClose={vi.fn()}
          onAddNode={vi.fn()}
          onRemove={vi.fn()}
        />
      </LanguageProvider>,
    );

    expect(screen.getByRole('button', { name: 'Scenario New load scenario' })).toBeInTheDocument();
  });

  it('offers scenario creation when scenarios is empty', () => {
    render(
      <LanguageProvider>
        <YAMLContextMenu
          x={10}
          y={10}
          node={{
            id: 'scenarios',
            type: 'scenarios',
            name: 'Scenarios',
            children: [],
          }}
          onClose={vi.fn()}
          onAddNode={vi.fn()}
          onRemove={vi.fn()}
        />
      </LanguageProvider>,
    );

    expect(screen.getByRole('button', { name: 'Scenario New load scenario' })).toBeInTheDocument();
  });

  it('offers duplicate and copy for individual scenarios', () => {
    const onDuplicate = vi.fn();
    const onCopy = vi.fn();
    render(
      <LanguageProvider>
        <YAMLContextMenu
          x={10}
          y={10}
          node={{
            id: 'scenario-1',
            type: 'scenario',
            name: 'Scenario',
            children: [],
          }}
          onClose={vi.fn()}
          onAddNode={vi.fn()}
          onRemove={vi.fn()}
          onDuplicate={onDuplicate}
          onCopy={onCopy}
        />
      </LanguageProvider>,
    );

    screen.getByRole('button', { name: 'Duplicate' }).click();
    screen.getByRole('button', { name: 'Copy' }).click();
    expect(onDuplicate).toHaveBeenCalledWith('scenario-1');
    expect(onCopy).toHaveBeenCalledWith('scenario-1');
  });

  it('offers copy and compatible paste actions for request children', () => {
    const onCopy = vi.fn();
    const onPaste = vi.fn();

    render(
      <LanguageProvider>
        <YAMLContextMenu
          x={10}
          y={10}
          node={{ id: 'headers', type: 'headers', name: 'Headers', data: {} }}
          onClose={vi.fn()}
          onAddNode={vi.fn()}
          onRemove={vi.fn()}
          onCopy={onCopy}
          onPaste={onPaste}
          canPaste
        />
      </LanguageProvider>,
    );

    screen.getByRole('button', { name: 'Copy' }).click();
    screen.getByRole('button', { name: 'Paste' }).click();

    expect(onCopy).toHaveBeenCalledWith('headers');
    expect(onPaste).toHaveBeenCalledWith('headers');
  });
});
