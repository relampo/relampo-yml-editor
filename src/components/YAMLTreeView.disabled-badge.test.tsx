import { render, screen } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../contexts/LanguageContext';
import type { YAMLNode, YAMLNodeType } from '../types/yaml';
import { YAMLTreeView } from './YAMLTreeView';

const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;

beforeAll(() => {
  HTMLElement.prototype.scrollIntoView = vi.fn();
});

afterAll(() => {
  HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
});

function disabledNode(id: string, type: YAMLNodeType, name: string): YAMLNode {
  return { id, type, name, data: { enabled: false } };
}

describe('YAMLTreeView disabled badges', () => {
  it('labels disabled requests, controllers, groups, and other elements consistently', () => {
    const tree: YAMLNode = {
      id: 'steps',
      type: 'steps',
      name: 'Steps',
      expanded: true,
      children: [
        disabledNode('request', 'request', 'Login request'),
        disabledNode('loop', 'loop', 'Business loop'),
        disabledNode('group', 'group', 'Group 03 - demo'),
        disabledNode('timer', 'think_time', 'Pause'),
      ],
    };

    render(
      <LanguageProvider>
        <YAMLTreeView
          tree={tree}
          selectedNode={null}
          selectedNodeIds={[]}
          redirectedRequestMap={{}}
          onSelectionChange={vi.fn()}
          onTreeChange={vi.fn()}
        />
      </LanguageProvider>,
    );

    expect(screen.getAllByText('disabled')).toHaveLength(4);
    for (const name of ['Login request', 'Business loop', 'Group 03 - demo', 'Pause']) {
      expect(screen.getByRole('treeitem', { name: new RegExp(name, 'i') })).toHaveTextContent('disabled');
    }
  });
});
