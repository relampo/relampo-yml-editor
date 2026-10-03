import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { load } from 'js-yaml';
import { describe, expect, it } from 'vitest';
import { LanguageProvider } from '../../../contexts/LanguageContext';
import type { YAMLNode } from '../../../types/yaml';
import { applyNodeUpdateToTree } from '../../../utils/nodeUpdate';
import { parseYAMLToTree, treeToYAML } from '../../../utils/yamlParser';
import { validateYAMLSemantics } from '../../../utils/yamlSemanticValidation';
import { LoadDetails } from '../LoadDetails';
import type { LoadSegmentData } from '../loadUtils';

const vus = { name: 'A', duration: '125ms', transition: 'constant', target_vus: '50' };
const rps = { name: 'C', duration: '250ms', transition: 'constant', target_rps: '500', min_vus: '10', max_vus: '40' };

function mount(segments: LoadSegmentData[]) {
  let latest: YAMLNode;
  function Harness() {
    const [node, setNode] = useState<YAMLNode>({ id: 'load', name: 'load', type: 'load', data: { type: 'segments', segments } });
    latest = node;
    return <LanguageProvider><LoadDetails node={node} onNodeUpdate={(id, data) => setNode(current => applyNodeUpdateToTree(current, id, data))} /></LanguageProvider>;
  }
  const result = render(<Harness />);
  return { ...result, current: () => latest, messages: () => validateYAMLSemantics(latest).map(issue => issue.message) };
}

function transfer() {
  const values = new Map<string, string>();
  return { effectAllowed: '', dropEffect: '', setData: (type: string, value: string) => values.set(type, value), getData: (type: string) => values.get(type) ?? '' };
}

function drag(from: number, to: number) {
  const source = screen.getByRole('button', { name: `Drag segment ${from}` });
  const target = screen.getByLabelText(`Name for segment ${to}`).closest('[data-segment-row]')!;
  const dataTransfer = transfer();
  fireEvent.dragStart(source, { dataTransfer });
  fireEvent.dragOver(target, { dataTransfer });
  fireEvent.drop(target, { dataTransfer });
  fireEvent.dragEnd(source, { dataTransfer });
}

describe('RLP-768 segment reordering', () => {
  it('moves both data and DOM identity, keeps duplicate names and invalid values, and permits repeated edits/removal', () => {
    const original = [vus, { ...rps, name: 'A', target_rps: 'invalid', min_vus: '', max_vus: '-2' }, { ...vus, name: 'A', target_vus: '', transition: 'ramp_down' }];
    const { current } = mount(original);
    const inputs = original.map((_, index) => screen.getByLabelText(`Name for segment ${index + 1}`));
    drag(3, 1);
    expect(current().data!.segments).toEqual([original[2], original[0], original[1]]);
    expect(screen.getByLabelText('Name for segment 1')).toBe(inputs[2]);
    expect(screen.getByLabelText('Name for segment 2')).toBe(inputs[0]);
    expect(screen.getByLabelText('Name for segment 3')).toBe(inputs[1]);
    drag(1, 3);
    expect(current().data!.segments).toEqual(original);
    fireEvent.change(screen.getByLabelText('Name for segment 2'), { target: { value: 'edited-rps' } });
    drag(2, 1);
    expect(current().data!.segments![0]).toEqual({ ...original[1], name: 'edited-rps' });
    fireEvent.click(screen.getByRole('button', { name: 'Remove segment 2' }));
    expect(current().data!.segments!.map(segment => segment.name)).toEqual(['edited-rps', 'A']);
    expect(screen.getByLabelText('Name for segment 2')).toBe(inputs[2]);
    fireEvent.click(screen.getByRole('button', { name: 'Add Segment' }));
    drag(3, 1);
    expect(current().data!.segments![0].name).toBe('new_segment');
  });

  for (const transition of ['constant', 'ramp_up', 'ramp_down']) {
    it(`moves VUs ${transition} first without rewriting it and validates from zero`, () => {
      const moved = { ...vus, name: 'B', target_vus: '20', transition };
      const { current, messages, container } = mount([rps, moved]);
      drag(2, 1);
      expect(current().data!.segments).toEqual([moved, rps]);
      expect(screen.getByLabelText('Transition for segment 1')).toHaveValue(transition);
      expect(messages()).toEqual(transition === 'ramp_down' ? ['Segment 1 cannot use Ramp down as the first segment.'] : []);
      if (transition === 'ramp_up') {
        expect(container.querySelector('polyline[stroke-width="3"]')).toHaveAttribute('points', expect.stringContaining('40,170'));
      }
      if (transition === 'ramp_down') {
        expect(within(screen.getByLabelText('Transition for segment 1')).getByRole('option', { name: /Ramp down/ })).toBeDisabled();
        fireEvent.change(screen.getByLabelText('Transition for segment 1'), { target: { value: 'constant' } });
        expect(messages()).toEqual([]);
      }
    });
  }

  for (const previous of [vus, rps] as LoadSegmentData[]) {
    for (const moved of [{ ...vus, name: 'B', target_vus: '20' }, { ...rps, name: 'B', target_rps: '200', min_vus: '2', max_vus: '30' }] as LoadSegmentData[]) {
      it(`revalidates ${previous.target_vus ? 'VUs' : 'RPS'} → ${moved.target_vus ? 'VUs' : 'RPS'} using only configured values`, () => {
        const { current, messages } = mount([previous, rps, moved]);
        drag(3, 2);
        expect(current().data!.segments).toEqual([previous, moved, rps]);
        const start = previous.target_vus ? 50 : 40;
        expect(messages()).toEqual(moved.target_vus ? [`Segment 2 Transition must be Ramp down from ${start} VUs to 20 VUs.`] : []);
      });
    }
  }

  it('reports simultaneous errors on the moved segment and its former successor', () => {
    const b = { ...vus, name: 'B', target_vus: '20', transition: 'ramp_down' };
    const c = { ...vus, name: 'C', target_vus: '40', transition: 'ramp_up' };
    const d = { ...vus, name: 'D', target_vus: '40' };
    const { messages } = mount([vus, b, c, d]);
    expect(messages()).toEqual([]);
    drag(3, 2);
    expect(messages()).toEqual([
      'Segment 2 Transition must be Ramp down from 50 VUs to 40 VUs.',
      'Segment 4 Transition must be Ramp up from 20 VUs to 40 VUs.',
    ]);
    expect(screen.getByLabelText('Transition for segment 2')).toHaveValue('ramp_up');
    expect(screen.getByLabelText('Transition for segment 4')).toHaveValue('constant');
  });

  for (const inserted of [rps, { ...vus, name: 'C', target_vus: '40', transition: 'ramp_down' }]) {
    it(`revalidates both insertion and removal neighbors when moving ${inserted.name}`, () => {
      const b = { ...vus, name: 'B', target_vus: '20', transition: 'ramp_down' };
      const d = { ...vus, name: 'D', target_vus: '40' };
      const { current, messages } = mount([vus, b, inserted, d]);
      drag(3, 2);
      expect(current().data!.segments).toEqual([vus, inserted, b, d]);
      expect(messages()).toEqual(['Segment 4 Transition must be Ramp up from 20 VUs to 40 VUs.']);
      fireEvent.change(screen.getByLabelText('Transition for segment 3'), { target: { value: 'constant' } });
      expect(messages()).toContain('Segment 3 Transition must be Ramp down from 40 VUs to 20 VUs.');
    });
  }

  it('moves an RPS first and relocates its dashed target for exactly its duration without changing total', () => {
    const { current, container } = mount([vus, rps, { ...vus, name: 'B', target_vus: '20', transition: 'ramp_down' }]);
    drag(2, 1);
    expect(current().data!.segments![0]).toEqual(rps);
    expect(screen.getByLabelText('Total Duration')).toHaveValue('500ms');
    const line = container.querySelector('line[data-segment-rps-target]')!;
    expect(line).toHaveAttribute('data-segment-rps-target', '500');
    expect(line).toHaveAttribute('x1', '40');
    expect(line).toHaveAttribute('x2', '210');
    expect(line).toHaveAttribute('stroke-dasharray', '6 5');
    drag(1, 3);
    expect(current().data!.segments).toEqual([vus, { ...vus, name: 'B', target_vus: '20', transition: 'ramp_down' }, rps]);
    expect(line).toHaveAttribute('x1', '210');
    expect(line).toHaveAttribute('x2', '380');
    expect(screen.getByLabelText('Total Duration')).toHaveValue('500ms');
  });

  it('ignores self drops, cancelled drags and unrelated drops without stale movement', () => {
    const { current } = mount([vus, rps]);
    const original = current();
    drag(1, 1);
    expect(current()).toBe(original);
    const source = screen.getByRole('button', { name: 'Drag segment 1' });
    const target = screen.getByLabelText('Name for segment 2').closest('[data-segment-row]')!;
    const dataTransfer = transfer();
    fireEvent.dragStart(source, { dataTransfer });
    fireEvent.dragEnd(source, { dataTransfer });
    fireEvent.drop(target, { dataTransfer });
    fireEvent.drop(target, { dataTransfer: transfer() });
    expect(current()).toBe(original);
    drag(2, 1);
    expect(current().data!.segments).toEqual([rps, vus]);
  });

  it('offers bounded button/keyboard movement and keeps focus attached to the moved row', () => {
    const { current } = mount([vus, rps]);
    expect(screen.getByRole('button', { name: 'Move segment 1 up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move segment 2 down' })).toBeDisabled();
    const up = screen.getByRole('button', { name: 'Move segment 2 up' });
    up.focus();
    fireEvent.click(up);
    expect(current().data!.segments).toEqual([rps, vus]);
    expect(up).toHaveFocus();
    expect(screen.getByRole('status')).toHaveTextContent('C moved to position 1');
    fireEvent.click(screen.getByRole('button', { name: 'Move segment 1 down' }));
    expect(current().data!.segments).toEqual([vus, rps]);
  });

  it('round-trips the new execution order without adding UI identity fields', () => {
    const { current } = mount([vus, rps]);
    drag(2, 1);
    const root = parseYAMLToTree('test:\n  name: reorder\nscenarios:\n  - name: reorder\n    load:\n      type: constant\n      users: 1\n    steps:\n      - get: /health\n')!;
    const findLoad = (node: YAMLNode): YAMLNode | undefined => node.type === 'load' ? node : node.children?.map(findLoad).find(Boolean);
    const loadNode = findLoad(root)!;
    const output = treeToYAML(applyNodeUpdateToTree(root, loadNode.id, { ...current().data! }));
    const parsed = load(output) as { scenarios: Array<{ load: { segments: LoadSegmentData[] } }> };
    expect(parsed.scenarios[0].load.segments).toEqual([rps, vus]);
    expect(output).not.toContain('rowKey');
    expect(output).not.toContain('segment-row');
  });

  it('disables reordering of malformed imported entries instead of discarding them', () => {
    const original = [vus, null as unknown as LoadSegmentData, rps];
    const { current } = mount(original);
    expect(screen.getByRole('button', { name: 'Drag segment 1' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move segment 2 up' })).toBeDisabled();
    expect(current().data!.segments).toEqual(original);
  });

  it('preserves the exported total across non-binary fractional durations and repeated moves', () => {
    const { current } = mount(['100ms', '200ms', '300ms'].map((duration, index) => ({ ...vus, name: String(index), duration })));
    fireEvent.change(screen.getByLabelText('Duration for segment 1'), { target: { value: '150ms' } });
    fireEvent.change(screen.getByLabelText('Duration for segment 1'), { target: { value: '100ms' } });
    const total = current().data!.duration;
    drag(1, 3);
    expect(current().data!.duration).toBe(total);
    drag(3, 1);
    expect(current().data!.duration).toBe(total);
    expect(screen.getByLabelText('Total Duration')).toHaveValue('600ms');
  });
});
