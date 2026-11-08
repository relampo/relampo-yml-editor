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
  it('opens gRPC from Recorder and shows HTTP/HTTPS as coming soon', () => {
    const select = vi.fn();
    renderHeader({ onSelectProtocol: select, grpcEnabled: true });
    const recorder = screen.getByRole('button', { name: 'Recorder' });
    expect(recorder.querySelector('.lucide-circle-dot')).toBeInTheDocument();
    fireEvent.pointerDown(recorder, { button: 0 });
    expect(screen.getAllByRole('menuitem')).toHaveLength(2);
    expect(screen.queryByRole('menuitem', { name: 'WebSocket' })).not.toBeInTheDocument();
    const http = screen.getByRole('menuitem', { name: 'HTTP/HTTPS' });
    expect(http).toHaveAttribute('aria-disabled', 'true');
    expect(http).toHaveTextContent('Coming soon');
    fireEvent.click(http);
    expect(select).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('menuitem', { name: 'gRPC' }));
    expect(select).toHaveBeenCalledExactlyOnceWith('grpc');
  });
  it('keeps gRPC unavailable when the connected Studio does not support authoring', () => {
    const select = vi.fn();
    renderHeader({ onSelectProtocol: select, grpcEnabled: false });
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Recorder' }), { button: 0 });
    expect(screen.getByRole('menuitem', { name: 'gRPC' })).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(screen.getByRole('menuitem', { name: 'gRPC' }));
    expect(select).not.toHaveBeenCalled();
  });
});
it('provides New Studio beside Recorder without replacing New document', () => {
  const onNewStudio = vi.fn();
  renderHeader({onNewStudio, onSelectProtocol:vi.fn()});
  const button=screen.getByRole('button',{name:'New Studio'});
  expect(button.previousElementSibling).toBe(screen.getByRole('button',{name:'Recorder'}));
  fireEvent.click(button);
  expect(onNewStudio).toHaveBeenCalledOnce();
  expect(screen.getByRole('button',{name:'New'})).toBeInTheDocument();
});
