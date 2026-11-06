import { useMemo, useState, type ReactNode } from 'react';
import type { SearchOccurrence } from './searchOccurrences';
import { SearchNavigationContext } from './SearchNavigationContext';

export function SearchNavigationProvider({ children }: { children: ReactNode }) {
  const [match, setMatch] = useState<SearchOccurrence | null>(null);
  const value = useMemo(() => ({ match, setMatch }), [match]);
  return <SearchNavigationContext.Provider value={value}>{children}</SearchNavigationContext.Provider>;
}
