import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { YAMLNode } from '../../types/yaml';
import { applyNodeUpdateToTree } from '../../utils/nodeUpdate';
import { parseYAMLToTree, treeToYAML } from '../../utils/yamlParser';
import { ErrorPolicyDetails } from './OpsDetails';

const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
beforeAll(() => { HTMLElement.prototype.scrollIntoView = () => {}; });
afterAll(() => { HTMLElement.prototype.scrollIntoView = originalScrollIntoView; });
afterEach(cleanup);

function PolicyEditor({ yaml }: { yaml: string }) {
  const [tree, setTree] = useState(() => parseYAMLToTree(yaml)!);
  const findPolicy = (node: YAMLNode): YAMLNode | undefined =>
    node.type === 'error_policy' ? node : node.children?.map(findPolicy).find(Boolean);
  const policy = findPolicy(tree)!;
  return <>
    <ErrorPolicyDetails node={policy} onNodeUpdate={(id, data) => {
      setTree(applyNodeUpdateToTree(tree, id, data));
    }} />
    <output aria-label="Saved YAML">{treeToYAML(tree)}</output>
  </>;
}

const importedYAML = `test:\n  name: Policy test\nscenarios:\n  - name: Login\n    error_policy:\n      on_error: next_iteration\n      on_5xx: stop\n    steps:\n      - get: /login\n`;

describe('Error policy editing and saving', () => {
  it('shows imported policies and saves a change to Stop user', async () => {
    render(<PolicyEditor yaml={importedYAML} />);
    const otherErrors = screen.getByRole('combobox', { name: 'Other Errors Action' });
    expect(otherErrors).toBeEnabled();
    expect(otherErrors).toHaveTextContent('Next iteration (same user)');
    expect(screen.getByRole('combobox', { name: 'On 5xx Action' })).toBeEnabled();
    fireEvent.keyDown(otherErrors, { key: 'Enter' });
    fireEvent.click(await screen.findByRole('option', { name: 'Stop this user' }));
    expect(screen.getByLabelText('Saved YAML').textContent).toContain('on_error: stop_user');
    expect(screen.getByLabelText('Saved YAML').textContent).toContain('on_5xx: stop');
  });
  it('removes a disabled rule from saved YAML and can enable the fallback', () => {
    render(<PolicyEditor yaml={importedYAML} />);
    fireEvent.click(screen.getByRole('button', { name: 'On 5xx' }));
    expect(screen.getByRole('combobox', { name: 'On 5xx Action' })).toBeDisabled();
    expect(screen.getByLabelText('Saved YAML').textContent).not.toContain('on_5xx:');
    fireEvent.click(screen.getByRole('button', { name: 'Other Errors' }));
    expect(screen.getByLabelText('Saved YAML').textContent).not.toContain('on_error:');
    fireEvent.click(screen.getByRole('button', { name: 'Other Errors' }));
    expect(screen.getByLabelText('Saved YAML').textContent).toContain('on_error: continue');
  });

  it('explains the user scope and keeps legacy stop unchanged until edited', () => {
    render(<PolicyEditor yaml={importedYAML} />);
    expect(screen.getByRole('combobox', { name: 'On 5xx Action' })).toHaveTextContent('Stop this user');
    expect(screen.getByText(/Stop this user ends only the failing virtual user/)).toBeInTheDocument();
    expect(screen.getByLabelText('Saved YAML').textContent).toContain('on_5xx: stop');
  });

});
