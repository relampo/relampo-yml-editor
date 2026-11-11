import { PlanScriptSelector } from '../PlanScriptSelector';
import { useEffect, useMemo, useState } from 'react';
import { GitBranch, Code } from 'lucide-react';
import type { YAMLNode } from '../../types/yaml';
import { parseYAMLToTree, treeToYAML } from '../../utils/yamlParser';
import { YAMLTreeView } from '../YAMLTreeView';
import { expandAncestorsInTree } from '../yaml-tree-view/treeOperations';
import { YAMLCodeEditor } from '../YAMLCodeEditor';
import { SearchNavigationProvider } from '../yaml-tree-view/SearchNavigationProvider';
import type { CorrelateCandidate } from '../../utils/correlateApi';
export function CorrelateDocumentPanel({
  yaml,
  onChange,
  language,
  locate,
  scriptSelectionDisabled = false,
}: {
  yaml: string;
  onChange: (yaml: string) => void;
  language: string;
  locate: CorrelateCandidate | null;
  scriptSelectionDisabled?: boolean;
}) {
  const [view, setView] = useState<'tree' | 'code'>('tree');
  const [selected, setSelected] = useState<YAMLNode | null>(null);
  const parsed = useMemo(() => {
    try {
      return { tree: yaml.trim() ? parseYAMLToTree(yaml) : null, error: '' };
    } catch (error) {
      return { tree: null, error: String(error) };
    }
  }, [yaml]);
  const [treeView, setTreeView] = useState<{ base: YAMLNode | null; tree: YAMLNode | null }>({
    base: null,
    tree: null,
  });
  const displayedTree = treeView.base === parsed.tree ? treeView.tree : parsed.tree;
  const source = useMemo(() => {
    if (!locate || !parsed.tree) return null;
    const requests: YAMLNode[] = [];
    let grpc: YAMLNode | null = null;
    const walk = (node: YAMLNode) => {
      if (['request', 'get', 'post', 'put', 'delete', 'patch', 'head', 'options'].includes(node.type))
        requests.push(node);
      if (node.type === 'grpc' && locate.source.NodePath && node.path) {
        const pointer = '/' + node.path.join('/');
        if (locate.source.NodePath === pointer || locate.source.NodePath === pointer + '/grpc') grpc = node;
      }
      node.children?.forEach(walk);
    };
    walk(parsed.tree);
    return (
      grpc ??
      requests.find(
        node => Number(node.data?.request_id) > 0 && Number(node.data?.request_id) === locate.source.RequestID,
      ) ??
      requests[locate.source.StepIndex] ??
      null
    );
  }, [locate, parsed.tree]);
  useEffect(() => {
    if (source) {
      setSelected(source);
      setView('tree');
      if (parsed.tree) setTreeView({ base: parsed.tree, tree: expandAncestorsInTree(parsed.tree, source.id) });
    }
  }, [source, locate, parsed.tree]);
  const active = selected;
  return (
    <SearchNavigationProvider>
      <section
        role="region"
        aria-label="Correlation script"
        className="flex min-h-0 min-w-0 flex-col overflow-hidden"
      >
        <div className="flex h-9 shrink-0 border-b border-white/10 bg-[#111111] text-xs">
          {(['tree', 'code'] as const).map(mode => (
            <button
              key={mode}
              type="button"
              onClick={() => setView(mode)}
              className={
                'flex flex-1 items-center justify-center gap-2 border-b-2 ' +
                (view === mode
                  ? 'border-yellow-400 bg-yellow-400/5 text-yellow-400'
                  : 'border-transparent text-zinc-500')
              }
            >
              {mode === 'tree' ? <GitBranch className="h-3.5 w-3.5" /> : <Code className="h-3.5 w-3.5" />}
              {mode === 'tree' ? (language === 'es' ? 'Árbol' : 'Tree') : 'Code'}
            </button>
          ))}
        </div>
        <PlanScriptSelector language={language} disabled={scriptSelectionDisabled} />
        <div className="min-h-0 flex-1 overflow-hidden">
          {view === 'code' ? (
            <YAMLCodeEditor
              value={yaml}
              onChange={onChange}
            />
          ) : displayedTree ? (
            <YAMLTreeView
              tree={displayedTree}
              selectedNode={active}
              selectedNodeIds={active ? [active.id] : []}
              redirectedRequestMap={{}}
              onSelectionChange={node => setSelected(node)}
              onTreeViewChange={tree => setTreeView({ base: parsed.tree, tree })}
              onTreeChange={tree => onChange(treeToYAML(tree))}
            />
          ) : null}
        </div>
        {parsed.error && (
          <p
            role="alert"
            className="p-2 text-xs text-red-300"
          >
            {parsed.error}
          </p>
        )}
      </section>
    </SearchNavigationProvider>
  );
}
