import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { dump, load } from 'js-yaml';
import { LanguageProvider } from '../../contexts/LanguageContext';
import type { YAMLNode } from '../../types/yaml';
import { COMPONENT_FEATURES, type ComponentCapabilities } from '../../utils/componentConfiguration';
import { parseYAMLToTree, treeToYAML } from '../../utils/yamlParser';
import { applyNodeUpdateToTree } from '../../utils/nodeUpdate';
import { ComponentConfigurationDetails } from './ComponentConfigurationDetails';
const capabilities: ComponentCapabilities = { version: 1, features: [...COMPONENT_FEATURES] };
function requestNode(tree: YAMLNode): YAMLNode | undefined {
  if (tree.type === 'request') return tree;
  for (const child of tree.children || []) {
    const node = requestNode(child);
    if (node) return node;
  }
}
function Harness({
  yaml,
  sampler = false,
  supported = capabilities,
}: {
  yaml: string;
  sampler?: boolean;
  supported?: ComponentCapabilities;
}) {
  const [tree, setTree] = useState(parseYAMLToTree(yaml)!);
  const node = sampler ? requestNode(tree)! : tree;
  return (
    <LanguageProvider>
      <ComponentConfigurationDetails
        tree={tree}
        node={node}
        capabilities={supported}
        onNodeUpdate={(id, data) => setTree(current => applyNodeUpdateToTree(current, id, data))}
      />
      <pre data-testid="written-yaml">{treeToYAML(tree)}</pre>
    </LanguageProvider>
  );
}
function written(): any {
  return load(screen.getByTestId('written-yaml').textContent!);
}
const base = {
  test: { name: 'UI scopes' },
  scenarios: [{ name: 'S', steps: [{ request: { method: 'GET', url: '/ok' } }] }],
};

describe('component configuration controls', () => {
  it('requires explicit adoption and writes only the selected declarations', () => {
    render(<Harness yaml={dump(base)} />);
    expect(written()).not.toHaveProperty('defaults');
    fireEvent.click(screen.getByLabelText('Adopt component configuration version 1'));
    expect(written().component_configuration_version).toBe(1);
    expect(written()).not.toHaveProperty('defaults');
    fireEvent.change(screen.getByLabelText('data_source mode'), { target: { value: 'disable' } });
    fireEvent.change(screen.getByLabelText('think_time mode'), { target: { value: 'disable' } });
    expect(written().defaults).toEqual({ data_source: { enabled: false }, think_time: { enabled: false } });
  });
  it('shows authored/effective/origin without invoking updates', () => {
    const tree = parseYAMLToTree(
      dump({ ...base, component_configuration_version: 1, defaults: { http: { timeout: '5s' } } }),
    )!;
    const update = vi.fn();
    render(
      <LanguageProvider>
        <ComponentConfigurationDetails
          tree={tree}
          node={requestNode(tree)!}
          capabilities={capabilities}
          onNodeUpdate={update}
        />
      </LanguageProvider>,
    );
    expect(screen.getByLabelText('http.timeout mode')).toHaveValue('inherit');
    expect(screen.getByText('"5s"', { exact: true })).toBeVisible();
    expect(screen.getByText(/UI scopes: defaults.http.timeout/)).toBeVisible();
    expect(update).not.toHaveBeenCalled();
  });
  it('returns local auth and assertions to inheritance without stale child data', () => {
    const input = {
      ...base,
      component_configuration_version: 1,
      defaults: { http: { auth: { type: 'bearer', token: 'root' }, assertions: [{ type: 'status', value: 200 }] } },
      scenarios: [
        { name: 'S', steps: [{ request: { method: 'GET', url: '/ok', auth: { type: 'none' }, assertions: [] } }] },
      ],
    };
    render(
      <Harness
        yaml={dump(input)}
        sampler
      />,
    );
    expect(screen.getByLabelText('http.auth mode')).toHaveValue('disable');
    expect(screen.getByLabelText('http.assertions mode')).toHaveValue('disable');
    fireEvent.change(screen.getByLabelText('http.auth mode'), { target: { value: 'inherit' } });
    fireEvent.change(screen.getByLabelText('http.assertions mode'), { target: { value: 'inherit' } });
    expect(written().scenarios[0].steps[0].request).not.toHaveProperty('auth');
    expect(written().scenarios[0].steps[0].request).not.toHaveProperty('assertions');
    expect(screen.getByLabelText('http.auth mode')).toHaveValue('inherit');
  });
  it('disables unavailable feature controls on a partial backend', () => {
    render(
      <Harness
        yaml={dump({ ...base, component_configuration_version: 1 })}
        supported={{ version: 1, features: ['http_defaults'] }}
      />,
    );
    expect(screen.getByLabelText('http.timeout mode')).toBeEnabled();
    expect(screen.getByLabelText('data_source mode')).toBeDisabled();
    expect(screen.getByLabelText('http.assertions mode')).toBeDisabled();
    expect(screen.getByLabelText('sql.assertions mode')).toBeDisabled();
  });
  it('keeps all new controls unavailable without the base HTTP contract capability', () => {
    render(
      <Harness
        yaml={dump({ ...base, component_configuration_version: 1 })}
        supported={{ version: 1, features: ['sql_assertions'] }}
      />,
    );
    expect(screen.getByLabelText('Adopt component configuration version 1')).toBeDisabled();
    expect(screen.getByLabelText('sql.assertions mode')).toBeDisabled();
    expect(screen.getByLabelText('http.timeout mode')).toBeDisabled();
  });
  it('keeps malformed structured edits out of YAML and reports the error', () => {
    render(<Harness yaml={dump({ ...base, component_configuration_version: 1 })} />);
    fireEvent.change(screen.getByLabelText('http.headers mode'), { target: { value: 'local' } });
    const editor = screen.getByLabelText('http.headers value');
    fireEvent.change(editor, { target: { value: '{invalid' } });
    fireEvent.blur(editor);
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid JSON');
    expect(written().defaults.http.headers).toEqual({});
  });
});
