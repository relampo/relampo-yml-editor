import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useResizePanel } from './useResizePanel';

describe('useResizePanel', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1000 });
  });

  afterEach(() => {
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  });

  it('initialises with the given width', () => {
    const { result } = renderHook(() => useResizePanel(40));
    expect(result.current.leftPanelWidth).toBe(40);
    expect(result.current.isResizing).toBe(false);
  });

  it('defaults to 30 when no initial width is provided', () => {
    const { result } = renderHook(() => useResizePanel());
    expect(result.current.leftPanelWidth).toBe(30);
  });

  it('sets isResizing to true when setIsResizing(true) is called', () => {
    const { result } = renderHook(() => useResizePanel());
    act(() => { result.current.setIsResizing(true); });
    expect(result.current.isResizing).toBe(true);
  });

  it('changes cursor and userSelect while resizing', () => {
    const { result } = renderHook(() => useResizePanel());
    act(() => { result.current.setIsResizing(true); });
    expect(document.body.style.cursor).toBe('col-resize');
    expect(document.body.style.userSelect).toBe('none');
  });

  it('resets cursor and userSelect when mouseup fires', () => {
    const { result } = renderHook(() => useResizePanel());
    act(() => { result.current.setIsResizing(true); });
    act(() => { document.dispatchEvent(new MouseEvent('mouseup')); });
    expect(result.current.isResizing).toBe(false);
    expect(document.body.style.cursor).toBe('');
    expect(document.body.style.userSelect).toBe('');
  });

  it('updates width on mousemove', () => {
    const { result } = renderHook(() => useResizePanel(30));
    act(() => { result.current.setIsResizing(true); });
    // window.innerWidth = 1000, so clientX=500 → 50%
    act(() => {
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 500 }));
    });
    expect(result.current.leftPanelWidth).toBe(50);
  });

  it('clamps width to minimum 20%', () => {
    const { result } = renderHook(() => useResizePanel(30));
    act(() => { result.current.setIsResizing(true); });
    act(() => {
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 10 })); // 1%
    });
    expect(result.current.leftPanelWidth).toBe(20);
  });

  it('clamps width to maximum 60%', () => {
    const { result } = renderHook(() => useResizePanel(30));
    act(() => { result.current.setIsResizing(true); });
    act(() => {
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 900 })); // 90%
    });
    expect(result.current.leftPanelWidth).toBe(60);
  });

  it('does not update width when not resizing', () => {
    const { result } = renderHook(() => useResizePanel(30));
    // isResizing is false by default — mousemove should be ignored
    act(() => {
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 500 }));
    });
    expect(result.current.leftPanelWidth).toBe(30);
  });

  it('removes event listeners on unmount', () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    const { result, unmount } = renderHook(() => useResizePanel());
    act(() => { result.current.setIsResizing(true); });
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('mouseup', expect.any(Function));
    removeSpy.mockRestore();
  });
});
