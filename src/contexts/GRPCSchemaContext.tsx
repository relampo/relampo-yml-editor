import { useState, type ReactNode } from 'react';
import type { GRPCCatalog } from '../utils/grpcApi';
import { GRPCSchemaContext } from './grpcSchemaState';
export function GRPCSchemaProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState<GRPCCatalog | null>(null);
  return <GRPCSchemaContext.Provider value={{ catalog, setCatalog }}>{children}</GRPCSchemaContext.Provider>;
}
