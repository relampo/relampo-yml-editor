import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { indexDocumentIssues } from '../utils/documentIssues';
import { parseYAMLToTree } from '../utils/yamlParser';
import { YAMLEditorStatusBanners } from './YAMLEditorStatusBanners';

const tree = parseYAMLToTree(`
test:
  name: doc
  future_root: true
scenarios:
  - name: smoke
    future_scenario: 1
    steps: []
`)!;

describe('YAMLEditorStatusBanners', () => {
  it('summarizes unrecognized fields in one line and can be closed', () => {
    render(
      <YAMLEditorStatusBanners
        error={null}
        issueIndex={indexDocumentIssues(tree, [], [])}
        onGoToIssue={vi.fn()}
        language="en"
      />,
    );

    expect(screen.getByText(/2 unrecognized fields/)).toBeInTheDocument();
    expect(screen.queryByText('scenarios[0].future_scenario')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close notice' }));
    expect(screen.queryByText(/2 unrecognized fields/)).not.toBeInTheDocument();
  });

  it('cannot be closed while configuration errors block Debug and Run, and goes to errors first', () => {
    const onGoToIssue = vi.fn();
    const scenarioId = tree.children!.find(node => node.type === 'scenarios')!.children![0].id;
    render(
      <YAMLEditorStatusBanners
        error={null}
        issueIndex={indexDocumentIssues(tree, ['Duration is required.'], [scenarioId])}
        selectedNodeId={undefined}
        onGoToIssue={onGoToIssue}
        language="es"
      />,
    );

    expect(screen.getByText(/1 error de configuración · 2 campos no reconocidos/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cerrar aviso' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Ir al siguiente' }));
    expect(onGoToIssue).toHaveBeenCalledWith(scenarioId);
  });
});
