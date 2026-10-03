import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { LanguageProvider } from '../../../contexts/LanguageContext';
import { LoadDetails } from '../LoadDetails';
import { applyNodeUpdateToTree } from '../../../utils/nodeUpdate';
import { validateYAMLSemantics } from '../../../utils/yamlSemanticValidation';
import { parseYAMLToTree, treeToYAML } from '../../../utils/yamlParser';
import type { YAMLNode } from '../../../types/yaml';

function mountSegments(segments: NonNullable<YAMLNode['data']>['segments']) {
  let latest: YAMLNode;
  function Harness() {
    const [node, setNode] = useState<YAMLNode>({ id: 'load', name: 'Segments', type: 'load', data: { type: 'segments', segments } });
    latest = node;
    return <LanguageProvider><LoadDetails node={node} onNodeUpdate={(id, data) => setNode(current => applyNodeUpdateToTree(current, id, data))} /></LanguageProvider>;
  }
  render(<Harness />);
  return () => latest;
}

const vus = { name: 'pause', duration: '1m', transition: 'constant', target_vus: '0' };

describe('Segments form RLP-765', () => {
  it('keeps Min/Max visible and disabled for VUs and offers all VU transitions', () => {
    const current = mountSegments([vus]);
    expect(screen.getByLabelText('VUs Min for segment 1')).toBeDisabled();
    expect(screen.getByLabelText('VUs Max for segment 1')).toBeDisabled();
    const transition = screen.getByLabelText('Transition for segment 1');
    expect(within(transition).getAllByRole('option').map(option => option.textContent)).toEqual(['Select transition', 'Constant', 'Ramp up', 'Ramp down']);
    expect(validateYAMLSemantics(current())).toEqual([]);
    fireEvent.change(transition, { target: { value: 'ramp_up' } });
    expect(current().data!.segments![0].transition).toBe('ramp_up');
  });

  it('restricts RPS to Constant, enables required bounds and clears a previous VU ramp', () => {
    const current = mountSegments([{ ...vus, target_vus: '5', transition: 'ramp_down' }]);
    fireEvent.change(screen.getByLabelText('Target type for segment 1'), { target: { value: 'rps' } });
    const transition = screen.getByLabelText('Transition for segment 1');
    expect(within(transition).queryByRole('option', { name: 'Ramp up' })).not.toBeInTheDocument();
    expect(within(transition).queryByRole('option', { name: 'Ramp down' })).not.toBeInTheDocument();
    expect(transition).toHaveValue('constant');
    for (const field of ['VUs Min', 'VUs Max']) {
      expect(screen.getByLabelText(`${field} for segment 1`)).toBeEnabled();
      expect(screen.getByLabelText(`${field} for segment 1`)).toBeRequired();
    }
    expect(current().data!.segments![0]).toMatchObject({ target_rps: '5', min_vus: '0', max_vus: '100', transition: 'constant' });
    expect(validateYAMLSemantics(current())).toEqual([]);
    fireEvent.change(screen.getByLabelText('Target type for segment 1'), { target: { value: 'vus' } });
    expect(current().data!.segments![0]).not.toHaveProperty('target_rps');
    expect(current().data!.segments![0]).not.toHaveProperty('min_vus');
    expect(current().data!.segments![0]).not.toHaveProperty('max_vus');
  });

  it('keeps VU type while clearing the target and blocks missing mandatory fields', () => {
    const current = mountSegments([vus]);
    fireEvent.change(screen.getByLabelText('Target for segment 1'), { target: { value: '' } });
    expect(screen.getByLabelText('Target type for segment 1')).toHaveValue('vus');
    expect(validateYAMLSemantics(current())).toEqual([{ nodeId: 'load', message: 'Segment 1 must define exactly one target: Target RPS or Target VUs.' }]);
    fireEvent.change(screen.getByLabelText('Name for segment 1'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Duration for segment 1'), { target: { value: '' } });
    expect(validateYAMLSemantics(current()).map(issue => issue.message)).toContain('Segment 1 Name is required.');
    expect(validateYAMLSemantics(current()).map(issue => issue.message)).toContain('Segment 1 must define a positive Duration.');
  });

  it('derives a read-only total from segment edits, addition and removal', () => {
    const current = mountSegments([vus, { ...vus, name: 'ramp', duration: '20s', target_vus: '2', transition: 'ramp_up' }, { ...vus, name: 'end', duration: '2m' }]);
    expect(screen.getByLabelText('Total Duration')).toHaveValue('200s');
    expect(screen.getByLabelText('Total Duration')).toHaveAttribute('readonly');
    fireEvent.change(screen.getByLabelText('Duration for segment 2'), { target: { value: '40s' } });
    expect(current().data!.duration).toBe('220s');
    fireEvent.click(screen.getByRole('button', { name: 'Add Segment' }));
    expect(current().data!.duration).toBe('280s');
    expect(validateYAMLSemantics(current())).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: 'Remove segment 2' }));
    expect(current().data!.duration).toBe('240s');
    expect(current().data!.segments!.map(segment => segment.name)).toEqual(['pause', 'end', 'new_segment']);
  });

  it('round-trips zero targets, zero RPS minima and transitions through YAML', () => {
    const root = parseYAMLToTree(`test:\n  name: segments\nscenarios:\n  - name: test\n    load:\n      type: segments\n      segments:\n        - name: pause\n          duration: 1m\n          transition: ramp_down\n          target_vus: 0\n        - name: rps\n          duration: 20s\n          transition: constant\n          target_rps: 2.5\n          min_vus: 0\n          max_vus: 1\n    steps:\n      - get: /health\n`)!;
    const output = treeToYAML(root);
    expect(output).toContain('transition: ramp_down');
    expect(output).toContain('target_vus: 0');
    expect(output).toContain('min_vus: 0');
    expect(validateYAMLSemantics(parseYAMLToTree(output)!)).toEqual([]);
  });
});
