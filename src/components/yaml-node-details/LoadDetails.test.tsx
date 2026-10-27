import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { LoadDetails } from './LoadDetails';
import type { YAMLNode } from '../../types/yaml';
import { applyNodeUpdateToTree } from '../../utils/nodeUpdate';
import { parseYAMLToTree, treeToYAML } from '../../utils/yamlParser';
import { validateYAMLSemantics } from '../../utils/yamlSemanticValidation';

function renderWithLanguage(ui: ReactElement) {
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

describe('LoadDetails', () => {
  it('switches a constant load to a valid default Segments profile', () => {
    let node: YAMLNode = {
      id: 'load-constant',
      type: 'load',
      name: 'Load: Constant',
      data: { type: 'constant', users: '10', duration: '1h', iterations: '0' },
    };
    const onNodeUpdate = (id: string, data: Record<string, unknown>) => {
      node = applyNodeUpdateToTree(node, id, data);
    };
    renderWithLanguage(<LoadDetails node={node} onNodeUpdate={onNodeUpdate} />);

    fireEvent.click(screen.getByRole('button', { name: 'Segments' }));

    expect(node.name).toBe('Load: Segments');
    expect(node.data?.type).toBe('segments');
    expect(validateYAMLSemantics(node)).toEqual([]);
  });

  it('switches edited segments to valid throughput without retaining segment data', () => {
    let node: YAMLNode = {
      id: 'load-segments',
      type: 'load',
      name: 'Load: Segments',
      data: {
        type: 'segments',
        duration: '1m',
        segments: [{ name: 'rps', duration: '1m', transition: 'constant', target_rps: '5', min_vus: '0', max_vus: '100' }],
      },
    };
    const onNodeUpdate = (id: string, data: Record<string, unknown>) => {
      node = applyNodeUpdateToTree(node, id, data);
    };
    const view = renderWithLanguage(<LoadDetails node={node} onNodeUpdate={onNodeUpdate} />);

    fireEvent.change(screen.getByDisplayValue('5'), { target: { value: '10' } });
    view.rerender(
      <LanguageProvider><LoadDetails node={node} onNodeUpdate={onNodeUpdate} /></LanguageProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Throughput' }));

    expect(node.name).toBe('Load: Throughput');
    expect(node.data).toMatchObject({ type: 'throughput', duration: '60s', target_rps: '20' });
    expect(node.data).not.toHaveProperty('segments');
    expect(validateYAMLSemantics(node)).toEqual([]);
  });

  it('switches a five-minute constant load to segments with a valid derived duration', () => {
    let node: YAMLNode = {
      id: 'load-five-minutes', type: 'load', name: 'Load: Constant',
      data: { type: 'constant', users: '10', duration: '5m' },
    };
    const onNodeUpdate = (id: string, data: Record<string, unknown>) => {
      node = applyNodeUpdateToTree(node, id, data);
    };
    const view = renderWithLanguage(<LoadDetails node={node} onNodeUpdate={onNodeUpdate} />);

    fireEvent.click(screen.getByRole('button', { name: 'Segments' }));
    view.rerender(<LanguageProvider><LoadDetails node={node} onNodeUpdate={onNodeUpdate} /></LanguageProvider>);

    expect(node.data).toMatchObject({ type: 'segments', duration: '3600s' });
    expect(screen.getByLabelText('Total Duration')).toHaveValue('1h');
    expect(validateYAMLSemantics(node)).toEqual([]);
  });

  it('keeps a nanosecond segment valid when editing its name', () => {
    let node: YAMLNode = {
      id: 'load-tiny', type: 'load', name: 'Load: Segments',
      data: {
        type: 'segments',
        segments: [{ name: 'tiny', duration: '0.000000001s', transition: 'constant', target_vus: '1' }],
      },
    };
    const onNodeUpdate = (id: string, data: Record<string, unknown>) => {
      node = applyNodeUpdateToTree(node, id, data);
    };
    renderWithLanguage(<LoadDetails node={node} onNodeUpdate={onNodeUpdate} />);
    expect(validateYAMLSemantics(node)).toEqual([]);

    fireEvent.change(screen.getByDisplayValue('tiny'), { target: { value: 'renamed' } });

    expect(node.data?.duration).toBe('0.000000001s');
    expect(validateYAMLSemantics(node)).toEqual([]);
  });

  it('renders the intent form in grouped sections', () => {
    renderWithLanguage(
      <LoadDetails
        node={{
          id: 'load-1',
          type: 'load',
          name: 'Load Config',
          data: {
            type: 'intent',
            target: { type: 'rps', value: '20' },
            duration: '1m',
            warmup: '30s',
            ramp_up: '20s',
            control_window: '2s',
            min_vus: '1',
            max_vus: '80',
            latency: { metric: 'p95', max_ms: '800' },
            error_rate: { max_pct: '1' },
          },
        }}
      />,
    );

    expect(screen.getByText('Intent Contract')).toBeInTheDocument();
    expect(screen.getByText('RampUp')).toBeInTheDocument();
    expect(screen.getByText('Execution Guardrails')).toBeInTheDocument();
    expect(screen.getByText('SLO Bounds')).toBeInTheDocument();
  });

  it('switches modes through the top selector', () => {
    const onNodeUpdate = vi.fn();

    renderWithLanguage(
      <LoadDetails
        node={{
          id: 'load-2',
          type: 'load',
          name: 'Load Config',
          data: {
            type: 'constant',
            users: 10,
            duration: '1m',
          },
        }}
        onNodeUpdate={onNodeUpdate}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Throughput' }));

    expect(screen.getByRole('button', { name: 'Intent' })).toBeInTheDocument();

    expect(onNodeUpdate).toHaveBeenCalledWith(
      'load-2',
      expect.objectContaining({
        type: 'throughput',
        target_rps: '20',
      }),
    );
  });

  it('auto-fills intent timing, guardrails, and slo bounds from target changes', () => {
    const onNodeUpdate = vi.fn();

    renderWithLanguage(
      <LoadDetails
        node={{
          id: 'load-3',
          type: 'load',
          name: 'Load Config',
          data: {
            type: 'intent',
            target: { type: 'rps', value: '20' },
            aggressiveness: 'medium',
            duration: '10m',
            warmup: '30s',
            ramp_up: '20s',
            control_window: '2s',
            min_vus: '1',
            max_vus: '80',
            latency: { metric: 'p95', max_ms: '750' },
            error_rate: { max_pct: '1' },
            error_4xx_max_pct: '2',
            error_5xx_max_pct: '0.5',
          },
        }}
        onNodeUpdate={onNodeUpdate}
      />,
    );

    fireEvent.change(screen.getByDisplayValue('20'), { target: { value: '80' } });

    expect(onNodeUpdate).toHaveBeenCalledWith(
      'load-3',
      expect.objectContaining({
        target: { type: 'rps', value: '80' },
        duration: '10m',
        warmup: '30s',
        ramp_up: '1m',
        control_window: '2s',
        min_vus: '4',
        max_vus: '20',
        latency: { metric: 'p95', max_ms: '750' },
        error_rate: { max_pct: '1' },
        error_4xx_max_pct: '2',
        error_5xx_max_pct: '0.5',
      }),
    );
  });

  it('requires a deliberate manual-stop opt-in and clears finite limits', () => {
    const onNodeUpdate = vi.fn();

    renderWithLanguage(
      <LoadDetails
        node={{
          id: 'load-manual',
          type: 'load',
          name: 'Load Config',
          data: { type: 'constant', users: 3, duration: '1m', iterations: '10' },
        }}
        onNodeUpdate={onNodeUpdate}
      />,
    );

    fireEvent.click(screen.getByRole('checkbox', { name: /Run until manually stopped/i }));

    expect(onNodeUpdate).toHaveBeenCalledWith(
      'load-manual',
      expect.objectContaining({
        run_until_stopped: true,
        duration: '',
        iterations: '',
      }),
    );
  });

  it('renders the load pattern visualization for segments', () => {
    renderWithLanguage(
      <LoadDetails
        node={{
          id: 'load-segments',
          type: 'load',
          name: 'Load Config',
          data: {
            type: 'segments',
            duration: '1m',
            segments: [
              { name: 'baseline', target_rps: '5', max_vus: '20' },
              { name: 'fixed_users', target_vus: '10' },
            ],
          },
        }}
      />,
    );

    expect(screen.getByText('Load Pattern Visualization')).toBeInTheDocument();
  });
});

it('RLP-806 restores edited segments after switching models and reopening saved YAML', () => {
  let node: YAMLNode = {
    id: 'load-persist', type: 'load', name: 'Load: Segments', data: {
      type: 'segments', iterations: '3', segments: [
        { name: 'baseline', duration: '1m', transition: 'constant', target_vus: '5' },
        { name: 'checkout', duration: '2m', transition: 'constant', target_vus: '25' },
        { name: 'recovery', duration: '1m', transition: 'ramp_down', target_vus: '5' },
      ],
    },
  };
  const onNodeUpdate = (id: string, data: Record<string, unknown>) => { node = applyNodeUpdateToTree(node, id, data); };
  const view = renderWithLanguage(<LoadDetails node={node} onNodeUpdate={onNodeUpdate} />);
  const refresh = () => view.rerender(<LanguageProvider><LoadDetails node={node} onNodeUpdate={onNodeUpdate} /></LanguageProvider>);
  fireEvent.change(screen.getByLabelText('Transition for segment 2'), { target: { value: 'ramp_up' } });
  refresh();
  fireEvent.change(screen.getByLabelText('Duration for segment 2'), { target: { value: '3m' } });
  refresh();
  const expected = node.data!.segments;
  fireEvent.click(screen.getByRole('button', { name: 'Linear' }));
  refresh();
  expect(node.data).not.toHaveProperty('segments');
  fireEvent.click(screen.getByRole('button', { name: 'Segments' }));
  refresh();
  expect(node.data!.segments).toEqual(expected);
  expect(node.data!.duration).toBe('300s');
  expect(node.data!.iterations).toBe('3');
  expect(validateYAMLSemantics(node)).toEqual([]);
  const tree = parseYAMLToTree('scenarios:\n  - name: saved\n    load:\n      type: constant\n      users: 1\n    steps: []\n')!;
  const load = tree.children!.find(child => child.type === 'scenarios')!.children![0].children!.find(child => child.type === 'load')!;
  const saved = treeToYAML(applyNodeUpdateToTree(tree, load.id, { ...node.data }));
  expect(saved).not.toContain('__segmentsProfile');
  const reopened = parseYAMLToTree(saved)!;
  const reopenedLoad = reopened.children!.find(child => child.type === 'scenarios')!.children![0].children!.find(child => child.type === 'load')!;
  expect(reopenedLoad.data!.segments).toEqual(expected);
});

it.each([undefined, '2m'])('RLP-806 restores an imported profile with root duration %s before any segment edit', duration => {
  const source = `scenarios:\n  - name: imported\n    load:\n      type: segments\n${duration ? `      duration: ${duration}\n` : ''}      segments:\n        - name: baseline\n          duration: 1m\n          target_vus: 5\n          transition: constant\n        - name: hold\n          duration: 1m\n          target_vus: 5\n          transition: constant\n    steps: []\n`;
  let tree = parseYAMLToTree(source)!;
  const loadNode = () => tree.children!.find(child => child.type === 'scenarios')!.children![0].children!.find(child => child.type === 'load')!;
  const initialData = loadNode().data;
  const onNodeUpdate = (id: string, data: Record<string, unknown>) => { tree = applyNodeUpdateToTree(tree, id, data); };
  const view = renderWithLanguage(<LoadDetails node={loadNode()} onNodeUpdate={onNodeUpdate} />);
  expect(validateYAMLSemantics(tree)).toEqual([]);
  // Switch immediately after import: a segment edit would derive the root duration.
  fireEvent.click(screen.getByRole('button', { name: 'Linear' }));
  view.rerender(<LanguageProvider><LoadDetails node={loadNode()} onNodeUpdate={onNodeUpdate} /></LanguageProvider>);
  fireEvent.click(screen.getByRole('button', { name: 'Segments' }));
  view.rerender(<LanguageProvider><LoadDetails node={loadNode()} onNodeUpdate={onNodeUpdate} /></LanguageProvider>);
  expect(loadNode().data!.duration).toBe(duration);
  expect(loadNode().data!.segments).toEqual(initialData!.segments);
  expect(validateYAMLSemantics(tree)).toEqual([]);
  const saved = treeToYAML(tree);
  expect(saved).not.toContain('__segmentsProfile');
  tree = parseYAMLToTree(saved)!;
  expect(loadNode().data).toEqual(initialData);
  expect(validateYAMLSemantics(tree)).toEqual([]);
});
