import { describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach } from 'vitest';
import { TestDetails } from './TestDetails';
import { parseYAMLToTree, treeToYAML } from '../../../utils/yamlParser';
import { validateYAMLSemantics } from '../../../utils/yamlSemanticValidation';
import type { YAMLNodeData } from '../../../types/yaml';

afterEach(cleanup);

describe('scenario scheduling', () => {
  it('authors explicit scheduling without dropping script or scenario fields', () => {
    const tree = parseYAMLToTree(`test: {name: script, description: preserved, custom_field: keep}
variables: {user: alice}
scenarios:
 - name: first
   load: {users: 1, iterations: 1}
   steps: [{get: /same}]
 - name: second
   data_source: {type: csv, file: users.csv, variable_names: user, mode: shared}
   load: {users: 1, iterations: 1}
   steps: [{get: /same}]
`);
    if (!tree) throw new Error('Expected a parsed script');
    render(<TestDetails node={tree} onNodeUpdate={(_id, data) => { tree.data = data as YAMLNodeData; }} />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Scenario scheduling' }), { target: { value: 'parallel' } });
    const yaml = treeToYAML(tree);
    expect(yaml).toContain('scenario_mode: parallel');
    expect(yaml).toContain('custom_field: keep');
    expect(yaml).toContain('description: preserved');
    expect(yaml).toContain('file: users.csv');
    expect(validateYAMLSemantics(parseYAMLToTree(yaml))).toEqual([]);
  });
});
