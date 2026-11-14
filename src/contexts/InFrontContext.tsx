import { useContext, type ReactNode } from 'react';
import { InFront } from '../hooks/useInFront';

/** Marks a part of the page that stays mounted, and is hidden while `shown` is false. See useInFront. */
export function InFrontWhen({ shown, children }: { shown: boolean; children: ReactNode }) {
  return <InFront.Provider value={useContext(InFront) && shown}>{children}</InFront.Provider>;
}
