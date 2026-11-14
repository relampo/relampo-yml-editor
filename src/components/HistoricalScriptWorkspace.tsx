import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useEmbeddedHost } from '../hooks/useEmbeddedHost';
import { parseYAMLToTree } from '../utils/yamlParser';
import type { YAMLNode } from '../types/yaml';
import { YAMLTreeNode } from './YAMLTreeNode';
import { YAMLNodeDetails } from './YAMLNodeDetails';
import { SearchNavigationProvider } from './yaml-tree-view/SearchNavigationProvider';

/** Isolated historical document: never mounts draft storage, recorder, execution, or save hooks. */
export function HistoricalScriptWorkspace() {
  const { language, setLanguage } = useLanguage();
  useEmbeddedHost(setLanguage);
  const [tree, setTree] = useState<YAMLNode | null>(null);
  const [selected, setSelected] = useState<YAMLNode | null>(null);
  const [error, setError] = useState('');
  const details = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const nonce = new URLSearchParams(window.location.search).get('historyNonce');
    const receive = (event: MessageEvent) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== window.parent ||
        event.data?.type !== 'relampo:historical-document' ||
        event.data.nonce !== nonce
      )
        return;
      try {
        if (typeof event.data.yaml !== 'string' || event.data.yaml.length > 20 * 1024 * 1024)
          throw new Error('This version is too large or unreadable.');
        const parsed = parseYAMLToTree(event.data.yaml);
        if (!parsed) throw new Error('This version cannot be opened as a script.');
        setTree(parsed);
        setSelected(parsed);
        setError('');
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause));
      }
    };
    window.addEventListener('message', receive);
    window.parent.postMessage({ type: 'relampo:historical-ready', nonce }, window.location.origin);
    return () => window.removeEventListener('message', receive);
  }, []);
  useEffect(() => {
    const root = details.current;
    if (!root) return;
    const lock = () => {
      root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input,textarea').forEach(control => {
        if (control instanceof HTMLInputElement && ['checkbox', 'radio', 'file', 'range'].includes(control.type))
          control.disabled = true;
        else control.readOnly = true;
      });
      root.querySelectorAll<HTMLSelectElement>('select').forEach(control => {
        control.disabled = true;
      });
      root.querySelectorAll<HTMLButtonElement>('button:not([role="tab"]):not([aria-expanded])').forEach(control => {
        control.disabled = true;
      });
      root.querySelectorAll<HTMLElement>('[contenteditable="true"]').forEach(control => {
        control.contentEditable = 'false';
      });
    };
    lock();
    const observer = new MutationObserver(lock);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [selected]);
  const toggle = (id: string) =>
    setTree(current => {
      const update = (node: YAMLNode): YAMLNode => ({
        ...node,
        expanded: node.id === id ? !(node.expanded ?? true) : node.expanded,
        children: node.children?.map(update),
      });
      return current ? update(current) : current;
    });
  return (
    <SearchNavigationProvider>
      <div
        className="flex h-full min-h-0 flex-col bg-[#0a0a0a]"
        data-historical-workspace
      >
        {error ? (
          <p
            role="alert"
            className="p-4 text-sm text-red-400"
          >
            {error}
          </p>
        ) : !tree ? (
          <p
            role="status"
            className="p-4 text-sm"
          >
            {language === 'es' ? 'Abriendo versión…' : 'Opening version…'}
          </p>
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-[minmax(280px,32%)_minmax(0,1fr)]">
            <div
              className="overflow-auto border-r border-white/10 p-3"
              onDragStartCapture={event => {
                event.preventDefault();
                event.stopPropagation();
              }}
            >
              <p className="mb-3 text-xs font-semibold text-zinc-400">{language === 'es' ? 'Árbol' : 'Tree'}</p>
              <div
                role="tree"
                aria-label="YAML tree"
              >
                <YAMLTreeNode
                  node={tree}
                  depth={0}
                  isSelected={selected?.id === tree.id}
                  selectedNodeIds={selected ? [selected.id] : []}
                  redirectedRequestMap={{}}
                  onNodeSelect={node => setSelected(node)}
                  onNodeToggle={toggle}
                  onContextMenu={event => event.preventDefault()}
                  onNodeMove={() => {}}
                />
              </div>
            </div>
            <div
              className="overflow-auto p-4"
              ref={details}
              aria-label={language === 'es' ? 'Detalles de la versión' : 'Version details'}
            >
              <YAMLNodeDetails
                node={selected}
                tree={tree}
                dataSourceFileBrowseEnabled={false}
              />
            </div>
          </div>
        )}
      </div>
    </SearchNavigationProvider>
  );
}
