import { afterEach, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCorrelateSource } from './useCorrelateSource';

afterEach(() => vi.restoreAllMocks());

it('releases sessions of Correlate tabs that were closed without saying goodbye', () => {
  const tabs: Array<{ closed: boolean }> = [];
  vi.spyOn(window, 'open').mockImplementation(() => {
    const tab = { closed: false };
    tabs.push(tab);
    return tab as unknown as Window;
  });
  const onError = vi.fn();
  const { result, unmount } = renderHook(() =>
    useCorrelateSource(
      () => ({ yaml: 'a: 1', fileName: 'a.yaml', revision: 0 }),
      async () => {},
      'en',
      onError,
    ),
  );
  for (let i = 0; i < 8; i++) result.current();
  result.current();
  expect(onError).toHaveBeenCalledWith('Close a Correlate tab before opening another.');
  onError.mockClear();
  tabs.forEach(tab => (tab.closed = true));
  result.current();
  expect(onError).not.toHaveBeenCalled();
  unmount();
});
