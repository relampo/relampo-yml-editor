import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { YAMLNode } from '../../types/yaml';
import { CookiesDetails } from './OpsDetails';

function ControlledCookies({ node }: { node: YAMLNode }) {
  const [currentNode, setCurrentNode] = useState(node);
  return (
    <CookiesDetails
      node={currentNode}
      onNodeUpdate={(nodeId, data) => setCurrentNode(previous => ({ ...previous, id: nodeId, data }))}
    />
  );
}

describe('CookiesDetails', () => {
  it('keeps focus while editing a seed cookie name', () => {
    const node: YAMLNode = {
      id: 'cookies-focus',
      type: 'cookies',
      name: 'Cookies',
      data: {
        mode: 'manual',
        cookies: [{ name: 'session', value: 'abc123', domain: 'example.test', path: '/' }],
      },
      children: [],
    };

    render(<ControlledCookies node={node} />);

    const input = screen.getByDisplayValue('session') as HTMLInputElement;
    input.focus();
    fireEvent.change(input, { target: { value: 'session-updated' } });

    const updatedInput = screen.getByDisplayValue('session-updated');
    expect(document.activeElement).toBe(updatedInput);
  });
});
