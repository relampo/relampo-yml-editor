import { createRef, type ComponentProps } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { YAMLEditorHeader } from './YAMLEditorHeader';

function renderHeader(extra: Partial<ComponentProps<typeof YAMLEditorHeader>> = {}) {
  const onDownload = vi.fn();

  render(
    <YAMLEditorHeader
      {...extra}
      language="en"
      setLanguage={vi.fn()}
      t={(key: string) =>
        ({
          'yamlEditor.newDocument': 'New',
          'yamlEditor.uploadYaml': 'Upload YAML',
          'yamlEditor.saveYaml': 'Save',
        })[key] ?? key
      }
      isDocumentEmpty={false}
      onNew={vi.fn()}
      onUpload={vi.fn()}
      onDownload={onDownload}
      fileInputRef={createRef<HTMLInputElement>()}
      onFileChange={vi.fn()}
    />,
  );

  return onDownload;
}

describe('YAMLEditorHeader', () => {
  it('shows Save options without changing the trigger wording', () => {
    const onDownload = renderHeader();

    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Download YAML' })).not.toBeInTheDocument();
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
    expect(screen.queryByText(/Last save:/)).not.toBeInTheDocument();

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Save' }), { button: 0 });

    expect(screen.getByRole('menuitem', { name: /Save with responses/ })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Save without responses/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('menuitem', { name: /Save with responses/ }));
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Save' }), { button: 0 });
    fireEvent.click(screen.getByRole('menuitem', { name: /Save without responses/ }));

    expect(onDownload).toHaveBeenCalledTimes(2);
    expect(onDownload).toHaveBeenNthCalledWith(1, true);
    expect(onDownload).toHaveBeenCalledWith(false);
  });
});

describe('protocol dropdown', () => {
  it('groups gRPC, WebSocket and HTTPS and dispatches the chosen protocol', () => {
    const select = vi.fn();
    renderHeader({ onSelectProtocol: select, grpcEnabled: true });
    expect(screen.queryByRole('button', { name: 'gRPC' })).not.toBeInTheDocument();
    for (const [label, protocol] of [
      ['gRPC', 'grpc'],
      ['WebSocket', 'websocket'],
      ['HTTPS', 'https'],
    ]) {
      fireEvent.pointerDown(screen.getByRole('button', { name: 'Other Protocols' }), { button: 0 });
      expect(screen.getAllByRole('menuitem')).toHaveLength(3);
      fireEvent.click(screen.getByRole('menuitem', { name: label }));
      expect(select).toHaveBeenLastCalledWith(protocol);
    }
  });
  it('keeps gRPC unavailable when the connected Studio does not support authoring', () => {
    const select = vi.fn();
    renderHeader({ onSelectProtocol: select, grpcEnabled: false });
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Other Protocols' }), { button: 0 });
    expect(screen.getByRole('menuitem', { name: 'gRPC' })).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(screen.getByRole('menuitem', { name: 'gRPC' }));
    expect(select).not.toHaveBeenCalled();
  });
});
