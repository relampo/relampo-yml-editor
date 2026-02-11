import { createContext, useContext, useState, ReactNode } from 'react';

interface YAMLContextType {
  yamlContent: string;
  setYamlContent: (content: string) => void;
  fileName: string;
  setFileName: (name: string) => void;
}

const YAMLContext = createContext<YAMLContextType | undefined>(undefined);

export function YAMLProvider({ children }: { children: ReactNode }) {
  const [yamlContent, setYamlContent] = useState('');
  const [fileName, setFileName] = useState('');

  return (
    <YAMLContext.Provider value={{ yamlContent, setYamlContent, fileName, setFileName }}>
      {children}
    </YAMLContext.Provider>
  );
}

export function useYAML() {
  const context = useContext(YAMLContext);
  if (!context) {
    throw new Error('useYAML must be used within YAMLProvider');
  }
  return context;
}
