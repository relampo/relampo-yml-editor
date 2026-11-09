import { useContext } from 'react';
import { GRPCSchemaContext } from '../contexts/grpcSchemaState';
export function useGRPCSchema() {
  return useContext(GRPCSchemaContext);
}
