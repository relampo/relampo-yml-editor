import { selectOption } from '../../test/selectOption';
import { useState } from 'react';
import { fireEvent, render as rtlRender, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { YAMLNode } from '../../types/yaml';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { CacheManagerDetails, CookiesDetails } from './OpsDetails';

const render = (ui: React.ReactElement) => rtlRender(ui, { wrapper: LanguageProvider });

it('RLP-822 only offers cache fields supported by the runtime', () => {
  const onNodeUpdate = vi.fn();
  render(
    <CacheManagerDetails
      node={{
        id: 'cache',
        type: 'cache_manager',
        name: 'Cache Manager',
        data: { clear_each_iteration: true, max_elements: 1000 },
      }}
      onNodeUpdate={onNodeUpdate}
    />,
  );
  expect(screen.queryByRole('button', { name: /^(Enabled|Disabled)$/ })).not.toBeInTheDocument();
  fireEvent.change(screen.getByDisplayValue('1000'), { target: { value: '250' } });
  expect(onNodeUpdate).toHaveBeenCalledWith('cache', { clear_each_iteration: true, max_elements: 250 });
});

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

it('RLP-811 shows canonical cookie lifetime and keeps both controls consistent when edited', async () => {
  render(
    <ControlledCookies
      node={{
        id: 'cookies',
        type: 'cookies',
        name: 'Cookies',
        data: { mode: 'manual', persist_across_iterations: true, clear_each_iteration: true, jar_scope: 'vu' },
      }}
    />,
  );
  expect(screen.getByRole('combobox', { name: 'Clear Each Iteration' })).toHaveTextContent('true');
  expect(screen.getByRole('combobox', { name: 'Persist Across Iterations' })).toHaveTextContent('false');
  await selectOption('Persist Across Iterations', 'true');
  expect(screen.getByRole('combobox', { name: 'Clear Each Iteration' })).toHaveTextContent('false');
  await selectOption('Clear Each Iteration', 'true');
  expect(screen.getByRole('combobox', { name: 'Persist Across Iterations' })).toHaveTextContent('false');
});
