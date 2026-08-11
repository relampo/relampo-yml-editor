import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { YAMLEditorHeader } from './YAMLEditorHeader';

function renderHeader() {
  const onSave = vi.fn();

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
      onSave={onSave}
      fileInputRef={createRef<HTMLInputElement>()}
      onFileChange={vi.fn()}
    />,
  );

  return onSave;
}

describe('YAMLEditorHeader', () => {
  it('shows Save and hides the saved status and download control', () => {
    const onSave = renderHeader();

    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Download YAML' })).not.toBeInTheDocument();
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
    expect(screen.queryByText(/Last save:/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSave).toHaveBeenCalledOnce();
  });
});
