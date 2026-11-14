import { createContext, useCallback, useContext, useEffect, useRef, useSyncExternalStore } from 'react';

// Contract, section 8, "Lost frames": Studio reads on a timer only while the
// view that shows the result is in front. A hidden view sends no frame; when
// it comes to the front, it reads at once. Through the relay each frame costs
// money, and Studio keeps some views mounted and hidden.

/** False inside a part of the page that is mounted and hidden. Set it with InFrontWhen. */
export const InFront = createContext(true);

function watchTab(change: () => void) {
  document.addEventListener('visibilitychange', change);
  return () => document.removeEventListener('visibilitychange', change);
}

/**
 * For a read on a timer. `inFront` is false while a parent hides the view,
 * while `shown` is false, and while the browser tab is hidden: read only
 * while it is true. `cameBack()` is true one time after the view was hidden:
 * the first read then goes at once.
 */
export function useInFront(shown = true): [inFront: boolean, cameBack: () => boolean] {
  const tabShown = useSyncExternalStore(watchTab, () => document.visibilityState !== 'hidden');
  const inFront = useContext(InFront) && shown && tabShown;
  const wasHidden = useRef(false);
  useEffect(() => {
    if (!inFront) wasHidden.current = true;
  }, [inFront]);
  const cameBack = useCallback(() => {
    const back = wasHidden.current;
    wasHidden.current = false;
    return back;
  }, []);
  return [inFront, cameBack];
}
