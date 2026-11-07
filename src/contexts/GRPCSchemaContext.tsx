import {createContext,useContext,useState,type ReactNode} from 'react';
import type {GRPCCatalog} from '../utils/grpcApi';
const Context=createContext<{catalog:GRPCCatalog|null;setCatalog:(catalog:GRPCCatalog)=>void}>({catalog:null,setCatalog:()=>{}});
export function GRPCSchemaProvider({children}:{children:ReactNode}){const[catalog,setCatalog]=useState<GRPCCatalog|null>(null);return <Context.Provider value={{catalog,setCatalog}}>{children}</Context.Provider>}
export function useGRPCSchema(){return useContext(Context)}
