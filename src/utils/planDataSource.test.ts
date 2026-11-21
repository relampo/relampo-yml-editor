import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { uploadPlanDataSource, previewPlanDataSource } from './planDataSource';
const mocks = vi.hoisted(() => ({ persist: vi.fn(), project: vi.fn(), upload: vi.fn(), preview: vi.fn() }));
vi.mock('./embeddedFileStorage', () => ({ persistEmbeddedRecordingFiles: mocks.persist }));
vi.mock('./executionProject', () => ({ requestExecutionProject: mocks.project }));
vi.mock('./debugApi', () => ({ uploadStudioDataSourceFile: mocks.upload, previewStudioDataSourceFile: mocks.preview }));
const originalParent = window.parent;
beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(window, 'parent', { configurable: true, value: {} });
  window.history.replaceState({}, '', '/?embedded=1&account=qa&plan=plan-one');
  mocks.persist.mockResolvedValue(undefined);
});
afterEach(() => {
  Object.defineProperty(window, 'parent', { configurable: true, value: originalParent });
  window.history.replaceState({}, '', '/');
});
it('persists CSV bytes in plan Data before returning a portable path, without agent-temporary storage', async () => {
  const file = new File(['user\nalice\n'], 'users.csv');
  await expect(uploadPlanDataSource(file)).resolves.toEqual({ name: 'users.csv', path: 'Data/users.csv' });
  expect(mocks.persist).toHaveBeenCalledWith([{ path: 'Data/users.csv', data: btoa('user\nalice\n') }]);
  expect(mocks.upload).not.toHaveBeenCalled();
});
it('never changes the data source when the host cannot save the file', async () => {
  mocks.persist.mockRejectedValue(Error('Folder permission required'));
  await expect(uploadPlanDataSource(new File(['id'], 'users.csv'))).rejects.toThrow('Folder permission');
});
it('previews copied Data files from the current plan and supports the old alias', async () => {
  mocks.project.mockResolvedValue({
    scriptPath: 'Scripts/test.yaml',
    files: [{ path: 'Data/users.csv', data: btoa('id\n1\n') }],
  });
  const result = await previewPlanDataSource('.relampo/datasources/users.csv');
  expect(result.lines).toEqual(['id', '1', '']);
  expect(mocks.preview).not.toHaveBeenCalled();
  await expect(previewPlanDataSource('../other/users.csv')).rejects.toThrow('not in this Test Plan');
});
it('retains standalone CLI upload behavior', async () => {
  window.history.replaceState({}, '', '/');
  mocks.upload.mockResolvedValue({ path: '.relampo/datasources/users.csv', name: 'users.csv' });
  await uploadPlanDataSource(new File(['id'], 'users.csv'));
  expect(mocks.upload).toHaveBeenCalledTimes(1);
  expect(mocks.persist).not.toHaveBeenCalled();
});
