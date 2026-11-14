import { createContext } from 'react';
import type { PlanScript } from '../utils/planScriptStorage';

export const PlanScriptsContext = createContext<{
  scripts: PlanScript[];
  selectedId: string;
  disabled: boolean;
  select: (id: string) => void;
} | null>(null);
