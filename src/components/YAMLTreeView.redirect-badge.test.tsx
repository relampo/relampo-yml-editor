import { render, screen } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../contexts/LanguageContext';
import type { YAMLNode, YAMLResponseData } from '../types/yaml';
import { YAMLTreeView } from './YAMLTreeView';
import { detectRedirectFollowUps } from './yamlEditorHelpers';

const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
beforeAll(() => {
  HTMLElement.prototype.scrollIntoView = vi.fn();
});
afterAll(() => {
  HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
});

function reqNode(
  id: string,
  url: string,
  role: 'parent' | 'hop' | 'final',
  chainId: string,
  opts: { status?: number; location?: string; enabled?: boolean } = {},
): YAMLNode {
  const response: YAMLResponseData = {};
  if (opts.status !== undefined) response.status = opts.status;
  if (opts.location !== undefined) response.headers = { Location: opts.location };
  return {
    id,
    type: 'request',
    name: id,
    expanded: true,
    data: {
      url,
      chain_id: chainId,
      chain_role: role,
      ...(opts.enabled !== undefined ? { enabled: opts.enabled } : {}),
      ...(Object.keys(response).length ? { response } : {}),
    },
  };
}

describe('YAMLTreeView redirect badge (RLP-604)', () => {
  function renderChainTree() {
    const tree: YAMLNode = {
      id: 'steps',
      type: 'steps',
      name: 'Steps',
      expanded: true,
      children: [
        reqNode('r123', '/login', 'parent', 'rc-123', { status: 302, location: '/step?token=RECORDED' }),
        reqNode('r124', '/step?token=LIVE1', 'hop', 'rc-123', {
          status: 302,
          location: '/done?token=RECORDED2',
          enabled: false,
        }),
        reqNode('r125', '/done?token=LIVE2', 'final', 'rc-123', { status: 200, enabled: false }),
      ],
    };
    const redirectedRequestMap = detectRedirectFollowUps(tree);
    render(
      <LanguageProvider>
        <YAMLTreeView
          tree={tree}
          selectedNode={null}
          selectedNodeIds={[]}
          redirectedRequestMap={redirectedRequestMap}
          onSelectionChange={vi.fn()}
          onTreeChange={vi.fn()}
          onContextMenuOpened={vi.fn()}
        />
      </LanguageProvider>,
    );
    return redirectedRequestMap;
  }

  it('badges the chain final (status 200) and hop, not the parent', () => {
    const map = renderChainTree();

    expect(map.r125).toBeDefined();
    expect(map.r124).toBeDefined();
    expect(map.r123).toBeUndefined();

    expect(screen.getAllByText('Redirected')).toHaveLength(2);

    const finalRow = screen.getByRole('treeitem', { name: /r125/i });
    expect(finalRow).toHaveTextContent('Redirected');
  });
});
