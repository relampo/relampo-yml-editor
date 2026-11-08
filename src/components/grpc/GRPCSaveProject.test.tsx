import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { GRPCSaveProject } from './GRPCSaveProject';
import { grpcRequest } from '../../utils/grpcApi';
vi.mock('../../utils/grpcApi', () => ({ grpcRequest: vi.fn() }));
beforeEach(() => {
  vi.mocked(grpcRequest).mockReset();
});
afterEach(() => vi.restoreAllMocks());
function popup() {
  return {
    opener: window,
    closed: false,
    document: { title: '', body: { textContent: '' } },
    location: { replace: vi.fn() },
    close: vi.fn(),
  };
}
it('waits for the project to be saved before navigating the new editor tab', async () => {
  let complete!: (value: unknown) => void;
  const saved = new Promise(resolve => {
    complete = resolve;
  });
  vi.mocked(grpcRequest).mockImplementation(async path =>
    path === 'projects/save-options' ? ({ directory: '/private/tmp/recordings' } as any) : (saved as any),
  );
  const editor = popup();
  vi.spyOn(window, 'open').mockReturnValue(editor as unknown as Window);
  render(
    <GRPCSaveProject
      projectId="fixture"
      language="en"
    />,
  );
  await screen.findByDisplayValue('/private/tmp/recordings');
  fireEvent.change(screen.getByLabelText('Script name'), { target: { value: 'My recording' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save and open in editor' }));
  expect(editor.location.replace).not.toHaveBeenCalled();
  expect(grpcRequest).toHaveBeenCalledWith('projects/fixture/save', {
    directory: '/private/tmp/recordings',
    name: 'My recording',
  });
  await act(async () =>
    complete({
      savedPath: '/private/tmp/recordings/project/My recording.yaml',
      editorUrl: 'http://127.0.0.1:12345/?token=saved',
    }),
  );
  expect(editor.location.replace).toHaveBeenCalledWith('http://127.0.0.1:12345/?token=saved');
  expect(editor.opener).toBeNull();
  expect(screen.getByRole('status')).toHaveTextContent('My recording.yaml');
});
it('keeps Recorder open and closes the placeholder tab when saving fails', async () => {
  vi.mocked(grpcRequest).mockImplementation(async path => {
    if (path === 'projects/save-options') return { directory: '/private/tmp/recordings' } as any;
    throw Error('Could not save recording');
  });
  const editor = popup();
  vi.spyOn(window, 'open').mockReturnValue(editor as unknown as Window);
  render(
    <GRPCSaveProject
      projectId="fixture"
      language="en"
    />,
  );
  await screen.findByDisplayValue('/private/tmp/recordings');
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Save and open in editor' })); });
  expect(screen.getByRole('alert')).toHaveTextContent('Could not save recording');
  expect(editor.close).toHaveBeenCalledOnce();
  expect(editor.location.replace).not.toHaveBeenCalled();
});

it('does not write a project if the browser blocks its editor tab', async () => {
  vi.mocked(grpcRequest).mockResolvedValue({ directory: '/private/tmp/recordings' } as any);
  vi.spyOn(window, 'open').mockReturnValue(null);
  render(
    <GRPCSaveProject
      projectId="fixture"
      language="en"
    />,
  );
  await screen.findByDisplayValue('/private/tmp/recordings');
  fireEvent.click(screen.getByRole('button', { name: 'Save and open in editor' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Allow this site');
  expect(grpcRequest).not.toHaveBeenCalledWith('projects/fixture/save', expect.anything());
});
it('shows where the recording was saved while rejecting an unsafe editor URL', async () => {
  vi.mocked(grpcRequest).mockImplementation(async path =>
    path === 'projects/save-options'
      ? ({ directory: '/private/tmp/recordings' } as any)
      : ({ savedPath: '/private/tmp/recordings/saved.yaml', editorUrl: 'https://external.test/' } as any),
  );
  const editor = popup();
  vi.spyOn(window, 'open').mockReturnValue(editor as unknown as Window);
  render(
    <GRPCSaveProject
      projectId="fixture"
      language="en"
    />,
  );
  await screen.findByDisplayValue('/private/tmp/recordings');
  fireEvent.click(screen.getByRole('button', { name: 'Save and open in editor' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('invalid local editor address');
  expect(screen.getByRole('status')).toHaveTextContent('/private/tmp/recordings/saved.yaml');
  expect(editor.location.replace).not.toHaveBeenCalled();
  expect(editor.close).toHaveBeenCalledOnce();
});
