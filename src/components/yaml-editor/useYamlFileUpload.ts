import { useRef, useState } from 'react';
import type { YAMLNode } from '../../types/yaml';
import { normalizeYamlFileName } from '../yamlEditorHelpers';

const isYamlFile = (file: File) => /\.(ya?ml)$/i.test(file.name);

interface UseYamlFileUploadParams {
  language: string;
  setError: (value: string | null) => void;
  setSelectedNode: (node: YAMLNode | null) => void;
  setSelectedNodeIds: (ids: string[]) => void;
  setYamlTree: (tree: YAMLNode | null) => void;
  setYamlCode: (code: string) => void;
  setYamlContent: (content: string) => void;
  setViewMode: (mode: 'tree') => void;
  fallbackRootNameRef: React.RefObject<string | null>;
  syncCodeToTree: (code: string, options?: { force?: boolean; defaultRootName?: string }) => void;
  setCurrentFileName: (name: string) => void;
  setHasDocumentActivity: (value: boolean) => void;
  setIsDirty: (value: boolean) => void;
  setIsFileLoading: (value: boolean) => void;
  parseDebounceRef: React.RefObject<number | null>;
  serializeDebounceRef: React.RefObject<number | null>;
}

/** File upload (browse + drag-and-drop) state and handlers for loading a .yaml/.yml file into the document. */
export function useYamlFileUpload({
  language,
  setError,
  setSelectedNode,
  setSelectedNodeIds,
  setYamlTree,
  setYamlCode,
  setYamlContent,
  setViewMode,
  fallbackRootNameRef,
  syncCodeToTree,
  setCurrentFileName,
  setHasDocumentActivity,
  setIsDirty,
  setIsFileLoading,
  parseDebounceRef,
  serializeDebounceRef,
}: UseYamlFileUploadParams) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleUpload = () => {
    fileInputRef.current?.click();
  };

  const loadYamlFile = (file: File, clearInput?: () => void) => {
    if (parseDebounceRef.current) window.clearTimeout(parseDebounceRef.current);
    if (serializeDebounceRef.current) window.clearTimeout(serializeDebounceRef.current);
    setIsFileLoading(true);
    setError(null);
    setSelectedNode(null);
    setSelectedNodeIds([]);
    setYamlTree(null);

    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      setYamlCode(content);
      setYamlContent(content);
      setViewMode('tree');
      const displayName = file.name.replace(/\.(ya?ml)$/i, '');
      fallbackRootNameRef.current = displayName;
      syncCodeToTree(content, { force: true, defaultRootName: displayName });
      setCurrentFileName(normalizeYamlFileName(file.name));
      setHasDocumentActivity(true);
      setIsDirty(false);
      clearInput?.();
    };
    reader.onerror = () => {
      setIsFileLoading(false);
      setError(language === 'es' ? 'Error al leer el archivo cargado' : 'Error reading uploaded file');
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!isYamlFile(file)) {
      setError(language === 'es' ? 'Solo se permiten archivos .yaml o .yml' : 'Only .yaml or .yml files are supported');
      e.target.value = '';
      return;
    }
    loadYamlFile(file, () => {
      e.target.value = '';
    });
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!e.dataTransfer.types.includes('Files')) return;
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!isYamlFile(file)) {
      setError(language === 'es' ? 'Solo se permiten archivos .yaml o .yml' : 'Only .yaml or .yml files are supported');
      return;
    }
    loadYamlFile(file);
  };

  return {
    fileInputRef,
    isDragOver,
    handleUpload,
    handleFileChange,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
}
