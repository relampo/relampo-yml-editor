import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { YAMLEditorHeader } from './YAMLEditorHeader';

function renderHeader() {
  const onDownload = vi.fn();

  render(
    <YAMLEditorHeader
      language="en"
      setLanguage={vi.fn()}
      t={(key: string) =>
        ({
          'yamlEditor.newDocument': 'New',
          'yamlEditor.uploadYaml': 'Upload YAML',
          'yamlEditor.saveYaml': 'Save',
        })[key] ?? key}
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
