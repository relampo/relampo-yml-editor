import { createContext } from 'react';
import type { GRPCCatalog } from '../utils/grpcApi';
export const GRPCSchemaContext = createContext<{
  catalog: GRPCCatalog | null;
  setCatalog: (catalog: GRPCCatalog) => void;
}>({ catalog: null, setCatalog: () => {} });
