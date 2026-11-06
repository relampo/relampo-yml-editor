import { createContext, useContext } from 'react';
import type { SearchOccurrence } from './searchOccurrences';

export const SearchNavigationContext = createContext<{
  match: SearchOccurrence | null;
  setMatch: (match: SearchOccurrence | null) => void;
}>({ match: null, setMatch: () => undefined });

export function useSearchNavigation() {
  return useContext(SearchNavigationContext);
}
