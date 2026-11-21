import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useDistributedSelectedFiles } from './useDistributedSelectedFiles';
afterEach(() => vi.restoreAllMocks());
it('bounds file reads before starting FileReader', async () => {
  const read = vi.spyOn(FileReader.prototype, 'readAsDataURL');
  const files = Array.from({ length: 64 }, (_, i) => new File([''], `file-${i}.csv`));
  const { result } = renderHook(() => useDistributedSelectedFiles(files));
  await waitFor(() => expect(result.current.error).toContain('63'));
  expect(read).not.toHaveBeenCalled();
});
it('compares actual bytes instead of identical file metadata', async () => {
  const first = [new File(['id\n1'], 'users.csv', { lastModified: 100 })];
  const second = [new File(['id\n2'], 'users.csv', { lastModified: 100 })];
  const { result, rerender } = renderHook(({ files }) => useDistributedSelectedFiles(files), {
    initialProps: { files: first },
  });
  await waitFor(() => expect(result.current.ready).toBe(true));
  const previous = result.current.contents.get('users.csv');
  rerender({ files: second });
  await waitFor(() => expect(result.current.ready).toBe(true));
  expect(result.current.contents.get('users.csv')).not.toBe(previous);
});
