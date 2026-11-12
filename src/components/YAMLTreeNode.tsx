import { useSearchNavigation } from './yaml-tree-view/SearchNavigationContext';
import {
  ServerCog,
  AlertTriangle,
  BarChart3,
  BetweenHorizontalStart,
  Braces,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Code,
  CodeXml,
  Cookie,
  Database,
  FileText,
  Filter,
  FolderOpen,
  Gauge,
  GitBranch,
  Globe,
  HardDrive,
  Layers,
  List,
  ArrowRightLeft,
  PlugZap,
  Package,
  Paperclip,
  Play,
  Repeat,
  RotateCcw,
  Scale,
  Settings,
  Tag,
  Waves,
  Zap,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { describeIssueMarker, type IssueMarker } from '../utils/documentIssues';
import { DescendantIssueDot, IssueBadge } from './DocumentIssues';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { buildRequestNumbers } from './yaml-tree-view/requestNumbers';
import type { RedirectedRequestInfo, YAMLNode, YAMLNodeType } from '../types/yaml';
import { canContain, canDrop } from '../utils/yamlDragDropRules';
import { HighlightText } from './ui/HighlightedInput';
import { getNodeDisplayName } from './yaml-tree-view/nodeDisplayName';
import {
  getNodeSearchHitFlags,
  nodeMatchExpandsDescendants,
  subtreeHasMatch,
  type SearchNodeState,
} from './yaml-tree-view/search';

// Track the dragged node outside React so dragOver can resolve it.
let currentDraggedNode: { id: string; type: YAMLNodeType } | null = null;
const DND_CLEAR_EVENT = 'yaml-tree-dnd-clear-indicators';

function setDraggedNode(node: { id: string; type: YAMLNodeType } | null) {
  currentDraggedNode = node;
}

function getDraggedNode() {
  return currentDraggedNode;
}

function clearDragIndicatorsGlobally() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(DND_CLEAR_EVENT));
}

function handleDragEnd() {
  clearDragIndicatorsGlobally();
  setDraggedNode(null);
}

const CONTROLLER_LABELS: Partial<Record<YAMLNodeType, string>> = {
  group: 'Group',
  parallel: 'Parallel',
  one_time: 'One time',
  transaction: 'Transaction',
  simple: 'Simple',
  balanced: 'Balanced',
  if: 'If',
  loop: 'Loop',
  retry: 'Retry',
  on_error: 'On error',
};

const NO_ISSUE_MARKERS: Record<string, IssueMarker> = {};

interface YAMLTreeNodeProps {
  node: YAMLNode;
  depth: number;
  parentType?: YAMLNodeType;
  requestNumbers?: Map<string, number>;
  isSelected: boolean;
  selectedNodeIds: string[];
  issueMarkers?: Record<string, IssueMarker>;
  redirectedRequestMap: Record<string, RedirectedRequestInfo>;
  baseHost?: string;
  onNodeSelect: (node: YAMLNode, event: React.MouseEvent) => void;
  onNodeToggle: (nodeId: string) => void;
  onContextMenu: (event: React.MouseEvent, node: YAMLNode) => void;
  onNodeMove: (draggedId: string, targetId: string, position: 'before' | 'after' | 'inside') => void;
  searchQuery?: string;
  searchIndex?: Map<string, SearchNodeState>;
  ancestorMatchesSearch?: boolean;
  activeReplaceMatchNodeId?: string | null;
}

export function YAMLTreeNode({
  node,
  depth,
  parentType,
  requestNumbers,
  isSelected,
  selectedNodeIds,
  issueMarkers = NO_ISSUE_MARKERS,
  redirectedRequestMap,
  baseHost = '',
  onNodeSelect,
  onNodeToggle,
  onContextMenu,
  onNodeMove,
  searchQuery = '',
  searchIndex,
  ancestorMatchesSearch = false,
  activeReplaceMatchNodeId = null,
}: YAMLTreeNodeProps) {
  const numbers = useMemo(() => requestNumbers ?? buildRequestNumbers(node), [requestNumbers, node]);
  const [dragOver, setDragOver] = useState<'before' | 'after' | 'inside' | null>(null);
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = node.expanded ?? true;
  const hoverTimerRef = useRef<number | null>(null);
  const indexedState = searchIndex?.get(node.id);
  const passAncestor = searchIndex
    ? ancestorMatchesSearch || Boolean(indexedState?.expandsDescendants)
    : ancestorMatchesSearch || nodeMatchExpandsDescendants(node, searchQuery);
  const showChildrenWhileSearching =
    Boolean(searchQuery.trim()) &&
    (passAncestor ||
      node.children?.some(child =>
        searchIndex ? Boolean(searchIndex.get(child.id)?.subtreeMatch) : subtreeHasMatch(child, searchQuery),
      ));
  const showChildren = hasChildren && (isExpanded || showChildrenWhileSearching);
  const selectedIdSet = new Set(selectedNodeIds);
  const visibleChildren = node.children
    ? node.children.reduce<YAMLNode[]>((acc, child) => {
        if (
          Boolean(indexedState?.scope) ||
          !searchQuery.trim() ||
          passAncestor ||
          (searchIndex ? Boolean(searchIndex.get(child.id)?.subtreeMatch) : subtreeHasMatch(child, searchQuery))
        ) {
          acc.push(child);
        }
        return acc;
      }, [])
    : [];

  useEffect(() => {
    const clearIndicator = () => {
      setDragOver(null);
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
    };

    window.addEventListener(DND_CLEAR_EVENT, clearIndicator);

    return () => {
      window.removeEventListener(DND_CLEAR_EVENT, clearIndicator);
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
    };
  }, []);

  const handleDragStart = (e: React.DragEvent) => {
    clearDragIndicatorsGlobally();
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', node.id);
    setDraggedNode({ id: node.id, type: node.type });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const dragged = getDraggedNode();
    if (!dragged) {
      setDragOver(null);
      return;
    }

    const draggedNodeId = dragged.id;
    const draggedNodeType = dragged.type;

    if (draggedNodeId === node.id) {
      setDragOver(null);
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;
    const percentage = (y / height) * 100;

    const canContainResult = canContain(node.type, draggedNodeType);

    if (canContainResult && hasChildren && !isExpanded) {
      if (!hoverTimerRef.current) {
        hoverTimerRef.current = window.setTimeout(() => {
          onNodeToggle(node.id);
          hoverTimerRef.current = null;
        }, 600);
      }
    } else {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
    }

    let position: 'before' | 'after' | 'inside';

    if (percentage < 25) {
      position = 'before';
    } else if (percentage > 75) {
      position = 'after';
    } else {
      position = canContainResult ? 'inside' : 'after';
    }

    const canDropResult = canDrop(draggedNodeType, node.type, position, parentType);

    if (canDropResult) {
      e.dataTransfer.dropEffect = 'move';
      setDragOver(position);
    } else {
      e.dataTransfer.dropEffect = 'none';
      setDragOver(null);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOver(null);

      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const dragged = getDraggedNode();

    if (dragged && dragged.id !== node.id && dragOver) {
      onNodeMove(dragged.id, node.id, dragOver);
    }

    setDragOver(null);
    setDraggedNode(null);
    clearDragIndicatorsGlobally();
  };

  return (
    <div className="select-none">
      <YAMLTreeNodeRow
        node={node}
        depth={depth}
        requestNumber={numbers.get(node.id)}
        isSelected={isSelected}
        dragOver={dragOver}
        issueMarkers={issueMarkers}
        redirectedRequestMap={redirectedRequestMap}
        activeReplaceMatchNodeId={activeReplaceMatchNodeId}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onNodeSelect={onNodeSelect}
        onNodeToggle={onNodeToggle}
        onContextMenu={onContextMenu}
        searchQuery={searchQuery}
        scopedHit={indexedState}
      />

      {/* Children */}
      {showChildren && (
        <div className="ml-2 border-l border-white/5">
          {visibleChildren.map(child => (
            <YAMLTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              parentType={node.type}
              requestNumbers={numbers}
              isSelected={selectedIdSet.has(child.id)}
              selectedNodeIds={selectedNodeIds}
              issueMarkers={issueMarkers}
              redirectedRequestMap={redirectedRequestMap}
              baseHost={baseHost}
              onNodeSelect={onNodeSelect}
              onNodeToggle={onNodeToggle}
              onContextMenu={onContextMenu}
              onNodeMove={onNodeMove}
              searchQuery={searchQuery}
              searchIndex={searchIndex}
              ancestorMatchesSearch={passAncestor}
              activeReplaceMatchNodeId={activeReplaceMatchNodeId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface YAMLTreeNodeRowProps {
  requestNumber?: number;
  node: YAMLNode;
  depth: number;
  isSelected: boolean;
  dragOver: 'before' | 'after' | 'inside' | null;
  issueMarkers: Record<string, IssueMarker>;
  redirectedRequestMap: Record<string, RedirectedRequestInfo>;
  activeReplaceMatchNodeId?: string | null;
  onDragStart: (event: React.DragEvent) => void;
  onDragEnd: () => void;
  onDragOver: (event: React.DragEvent) => void;
  onDragLeave: (event: React.DragEvent) => void;
  onDrop: (event: React.DragEvent) => void;
  onNodeSelect: (node: YAMLNode, event: React.MouseEvent) => void;
  onNodeToggle: (nodeId: string) => void;
  onContextMenu: (event: React.MouseEvent, node: YAMLNode) => void;
  searchQuery: string;
  scopedHit?: SearchNodeState;
}

function YAMLTreeNodeRow({
  requestNumber,
  node,
  depth,
  isSelected,
  dragOver,
  issueMarkers,
  redirectedRequestMap,
  activeReplaceMatchNodeId = null,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  onNodeSelect,
  onNodeToggle,
  onContextMenu,
  searchQuery,
  scopedHit,
}: YAMLTreeNodeRowProps) {
  const { match: navigationMatch } = useSearchNavigation();
  const { t } = useLanguage();
  const hasChildren = Boolean(node.children?.length);
  const isExpanded = node.expanded ?? true;
  const isRedirectedFollowUp = Boolean(redirectedRequestMap[node.id]);
  const issueMarker = issueMarkers[node.id];
  const hasValidationError = issueMarker?.severity === 'error';
  const issueDescription = describeIssueMarker(issueMarker, hasChildren && !isExpanded, {
    error: t('yamlEditor.shell.tree.containsErrors'),
    info: t('yamlEditor.shell.tree.containsUnrecognized'),
  });
  const redirectedLabel = t('yamlEditor.shell.tree.redirected');
  const IconComponent = getNodeIcon(node.type);
  const color = getNodeColor(node.type, node);
  const searchHitFlags = getNodeSearchHitFlags(node, searchQuery);
  const hasRequestHit = scopedHit?.requestMatch ?? searchHitFlags.request;
  const hasResponseHit = scopedHit?.responseMatch ?? searchHitFlags.response;
  const isActiveReplaceMatch = activeReplaceMatchNodeId === node.id;

  const selectionClass =
    'bg-yellow-300/12 border border-yellow-300/35 ring-1 ring-yellow-300/25 shadow-[0_0_0_1px_rgba(250,204,21,0.14)]';
  const activeReplaceClass =
    'bg-green-300/15 border-2 border-green-300/80 ring-2 ring-green-300/60 shadow-[0_0_0_2px_rgba(134,239,172,0.3)]';
  const redirectedClass = 'bg-zinc-400/12 border border-zinc-300/30 hover:bg-zinc-400/16 ring-1 ring-zinc-300/15';
  const defaultVisual = isActiveReplaceMatch
    ? activeReplaceClass
    : isSelected
      ? selectionClass
      : isRedirectedFollowUp
        ? redirectedClass
        : 'hover:bg-white/5 border border-transparent';
  const requestVisual = isActiveReplaceMatch
    ? activeReplaceClass
    : isSelected
      ? selectionClass
      : 'hover:bg-transparent border border-transparent';

  return (
    <div
      role="treeitem"
      aria-selected={isSelected}
      aria-current={isActiveReplaceMatch ? 'true' : undefined}
      aria-invalid={hasValidationError}
      aria-description={issueDescription || undefined}
      aria-expanded={hasChildren ? isExpanded : undefined}
      aria-level={depth + 1}
      tabIndex={0}
      draggable
      data-node-id={node.id}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={event => onNodeSelect(node, event)}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') onNodeSelect(node, event as any);
        if (event.key === 'ArrowRight' && hasChildren && !isExpanded) {
          event.preventDefault();
          onNodeToggle(node.id);
        }
        if (event.key === 'ArrowLeft' && hasChildren && isExpanded) {
          event.preventDefault();
          onNodeToggle(node.id);
        }
      }}
      onContextMenu={event => onContextMenu(event, node)}
      className={
        `relative group flex items-center gap-2 px-2 py-1.5 pr-3 rounded cursor-pointer transition-colors overflow-visible ` +
        `${node.type === 'request' || node.type === 'grpc' ? requestVisual : defaultVisual} ` +
        `${dragOver === 'before' ? 'border-t-2 border-t-yellow-400' : ''} ` +
        `${dragOver === 'after' ? 'border-b-2 border-b-yellow-400' : ''} ` +
        `${dragOver === 'inside' ? 'bg-yellow-400/5 border-yellow-400/30' : ''} ` +
        `${hasValidationError ? 'border-red-400/60 bg-red-400/5' : ''} ` +
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70'
      }
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
    >
      {/* Left indicator removed to avoid visible corner artifact */}
      {/* Expand/Collapse */}
      {hasChildren && (
        <button
          type="button"
          onClick={event => {
            event.stopPropagation();
            onNodeToggle(node.id);
          }}
          aria-label={isExpanded ? t('yamlEditor.shell.tree.collapse') : t('yamlEditor.shell.tree.expand')}
          className="shrink-0 w-4 h-4 flex items-center justify-center text-zinc-500 hover:text-zinc-300"
        >
          {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>
      )}

      {!hasChildren && <div className="w-4" />}

      {/* Icon */}
      <div data-node-icon={node.type} className={`shrink-0 ${color}`}>
        <IconComponent className="w-4 h-4" />
      </div>

      {/* Name */}
      <span
        className={`text-sm truncate flex-1 ${
          node.data?.enabled === false ? 'text-zinc-400' : isRedirectedFollowUp ? 'text-zinc-100' : 'text-zinc-300'
        }`}
      >
        {requestNumber !== undefined && <span>[{requestNumber}] </span>}
        <HighlightText
          text={
            requestNumber === undefined
              ? getNodeDisplayName(node, t)
              : getNodeDisplayName(node, t).replace(/^\[\d+\]\s*/, '')
          }
          activeIndex={
            navigationMatch?.nodeId === node.id && navigationMatch.path[0] === 'name'
              ? navigationMatch.fieldIndex
              : undefined
          }
          query={scopedHit?.scope === 'responses' ? '' : searchQuery}
        />
      </span>

      {/* Badge with extra info */}
      {isRedirectedFollowUp && (
        <span className="inline-flex h-5 items-center shrink-0 text-xs leading-none px-1.5 py-0.5 rounded bg-zinc-400/15 text-zinc-300 font-mono font-medium border border-zinc-400/30 uppercase">
          {redirectedLabel}
        </span>
      )}
      {CONTROLLER_LABELS[node.type] && !node.data?.__assertionsWrapper && (
        <span className="inline-flex h-5 items-center shrink-0 text-xs px-1.5 py-0.5 rounded bg-sky-400/15 text-sky-300 font-mono font-medium border border-sky-400/30">
          {CONTROLLER_LABELS[node.type]}
        </span>
      )}
      {getNodeBadge(node, t, { mutedMethod: isRedirectedFollowUp && node.data?.enabled === false })}
      <IssueBadge marker={issueMarker} />
      {hasChildren && !isExpanded && issueMarker?.descendantSeverity && (
        <DescendantIssueDot severity={issueMarker.descendantSeverity} />
      )}
      {hasRequestHit && (
        <span className="inline-flex h-5 items-center shrink-0 text-xs leading-none px-1.5 py-0.5 rounded bg-yellow-400/15 text-yellow-400 font-mono font-medium border border-yellow-400/30 uppercase">
          {t('yamlEditor.shell.tree.hitRequest')}
        </span>
      )}
      {hasResponseHit && (
        <span className="inline-flex h-5 items-center shrink-0 text-xs leading-none px-1.5 py-0.5 rounded bg-yellow-400/15 text-yellow-400 font-mono font-medium border border-yellow-400/30 uppercase">
          {t('yamlEditor.shell.tree.hitResponse')}
        </span>
      )}
    </div>
  );
}

function getNodeIcon(type: YAMLNodeType): LucideIcon {
  const iconMap: Partial<Record<YAMLNodeType, LucideIcon>> = {
    root: FileText,
    test: FileText,
    variables: Braces,
    data_source: Database,
    http_defaults: Settings,
    grpc_defaults: Settings,
    sql_defaults: Database,
    scenarios: List,
    scenario: Zap,
    metrics: BarChart3,
    load: Gauge,
    steps: Package,
    step: Code,
    request: Globe,
    sql: ServerCog,
    grpc: ArrowRightLeft,
    websocket: PlugZap,
    get: Globe,
    post: Globe,
    put: Globe,
    delete: Globe,
    patch: Globe,
    head: Globe,
    options: Globe,
    group: Layers,
    transaction: BetweenHorizontalStart,
    parallel: Waves,
    balanced: Scale,
    simple: FolderOpen,
    if: GitBranch,
    loop: Repeat,
    retry: RotateCcw,
    one_time: Play,
    on_error: AlertTriangle,
    think_time: Clock,
    extract: Filter,
    extractor: Filter,
    assert: CheckCircle,
    assertion: CheckCircle,
    cookies: Cookie,
    cache_manager: HardDrive,
    error_policy: AlertTriangle,
    spark: CodeXml,
    spark_before: CodeXml,
    spark_after: CodeXml,
    file: Paperclip,
    header: Tag,
    headers: Tag,
  };
  return iconMap[type] || FileText;
}

function getNodeColor(type: YAMLNodeType, node?: YAMLNode): string {
  const isDisabled = node?.data?.enabled === false;

  if (isDisabled) {
    return 'text-zinc-400';
  }

  // Use explicit switch to ensure Tailwind detects all classes
  switch (type) {
    case 'root':
    case 'test':
      return 'text-orange-400';
    case 'variables':
      return 'text-pink-400';
    case 'data_source':
      return 'text-cyan-400';
    case 'http_defaults':
      return 'text-sky-400';
    case 'scenarios':
      return 'text-violet-400';
    case 'scenario':
      return 'text-yellow-400';
    case 'metrics':
      return 'text-indigo-400';
    case 'load':
      return 'text-red-500';
    case 'steps':
    case 'step':
      return 'text-amber-400';
    case 'request':
    case 'get':
    case 'post':
    case 'put':
    case 'delete':
    case 'patch':
    case 'head':
    case 'options':
      return 'text-emerald-400';
    case 'websocket':
      return 'text-violet-400';
    case 'grpc':
    case 'grpc_defaults':
      return 'text-cyan-400';
    case 'sql':
      return 'text-pink-400';
    case 'sql_defaults':
      return 'text-teal-400';
    case 'group':
    case 'simple':
      return 'text-blue-400';
    case 'transaction':
      return 'text-white';
    case 'parallel':
    case 'balanced':
      return 'text-cyan-400';
    case 'if':
      return 'text-pink-500';
    case 'loop':
      return 'text-purple-400';
    case 'retry':
      return 'text-red-400';
    case 'one_time':
      return 'text-white';
    case 'on_error':
    case 'error_policy':
      return 'text-orange-500';
    case 'think_time':
      return 'text-orange-400';
    case 'extract':
    case 'extractor':
      return 'text-blue-400';
    case 'assert':
    case 'assertion':
      return 'text-green-400';
    case 'cookies':
      return 'text-pink-400';
    case 'cache_manager':
      return 'text-slate-400';
    case 'spark':
      return 'text-purple-500';
    case 'spark_before':
      return 'text-purple-500';
    case 'spark_after':
      return 'text-violet-500';
    case 'file':
      return 'text-amber-400';
    case 'header':
      return 'text-red-400';
    case 'headers':
      return 'text-red-500';
    default:
      return 'text-zinc-400';
  }
}

function getNodeBadge(
  node: YAMLNode,
  t: (key: string) => string,
  options: { mutedMethod?: boolean } = {},
): React.ReactNode {
  const { mutedMethod = false } = options;
  const httpMethods = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'];

  if (node.data?.enabled === false) {
    return (
      <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-700/30 text-zinc-400 font-mono font-medium border border-zinc-600/30 uppercase">
        {t('yamlEditor.shell.tree.badgeDisabled')}
      </span>
    );
  }

  if (node.type === 'websocket') {
    return (
      <span className="inline-flex h-5 items-center text-xs px-1.5 py-0.5 rounded bg-violet-400/15 text-violet-300 font-mono border border-violet-400/30">
        WS
      </span>
    );
  }

  if (node.type === 'grpc') {
    return (
      <span className="inline-flex h-5 items-center text-xs px-1.5 py-0.5 rounded bg-cyan-400/15 text-cyan-300 font-mono border border-cyan-400/30">
        gRPC
      </span>
    );
  }

  if (httpMethods.includes(node.type)) {
    return (
      <span
        className={`inline-flex h-5 items-center text-xs leading-none px-1.5 py-0.5 rounded font-mono font-medium border uppercase ${
          mutedMethod
            ? 'bg-zinc-400/15 text-zinc-300 border-zinc-400/30'
            : 'bg-blue-400/15 text-blue-400 border-blue-400/30'
        }`}
      >
        {node.type}
      </span>
    );
  }

  if (node.type === 'request' && node.data?.method) {
    return (
      <span
        className={`inline-flex h-5 items-center text-xs leading-none px-1.5 py-0.5 rounded font-mono font-medium border uppercase ${
          mutedMethod
            ? 'bg-zinc-400/15 text-zinc-300 border-zinc-400/30'
            : 'bg-blue-400/15 text-blue-400 border-blue-400/30'
        }`}
      >
        {node.data.method}
      </span>
    );
  }

  if (node.type === 'sql') {
    const dialect = typeof node.data?.dialect === 'string' ? node.data.dialect.toLowerCase() : 'sql';
    const dialectLabel = dialect === 'postgres' ? 'Postgres' : dialect === 'mysql' ? 'MySQL' : 'SQL';
    return (
      <span className="inline-flex h-5 items-center text-xs leading-none px-1.5 py-0.5 rounded font-mono font-medium border uppercase bg-teal-400/15 text-teal-400 border-teal-400/30">
        {dialectLabel}
      </span>
    );
  }

  if (node.type === 'loop' && node.data?.count) {
    return (
      <span className="text-xs px-1.5 py-0.5 rounded bg-purple-400/15 text-purple-400 font-mono font-medium border border-purple-400/30">
        ×{node.data.count}
      </span>
    );
  }

  if (node.type === 'think_time') {
    const durationLabel =
      node.data?.duration || (node.data?.min && node.data?.max ? `${node.data.min}-${node.data.max}` : node.data?.mean);
    if (!durationLabel) return null;
    return (
      <span className="text-xs px-1.5 py-0.5 rounded bg-orange-400/15 text-orange-400 font-mono font-medium border border-orange-400/30">
        {durationLabel}
      </span>
    );
  }

  if (node.type === 'spark_before') {
    return (
      <span className="text-xs px-1.5 py-0.5 rounded bg-purple-400/15 text-purple-400 font-mono font-medium border border-purple-400/30">
        {t('yamlEditor.shell.tree.badgeBefore')}
      </span>
    );
  }

  if (node.type === 'spark_after') {
    return (
      <span className="text-xs px-1.5 py-0.5 rounded bg-violet-400/15 text-violet-400 font-mono font-medium border border-violet-400/30">
        {t('yamlEditor.shell.tree.badgeAfter')}
      </span>
    );
  }

  if (node.type === 'assertion' && node.data?.type) {
    return (
      <span className="text-xs px-1.5 py-0.5 rounded bg-green-400/15 text-green-400 font-mono font-medium border border-green-400/30">
        {node.data.type}
      </span>
    );
  }

  if (node.type === 'extractor' && node.data?.type) {
    return (
      <span className="text-xs px-1.5 py-0.5 rounded bg-blue-400/15 text-blue-400 font-mono font-medium border border-blue-400/30">
        {node.data.type}
      </span>
    );
  }

  if (node.type === 'file') {
    const path = node.data?.path || '';
    const extension = path.split('.').pop()?.toUpperCase();
    const displayText = extension || node.data?.mime_type?.split('/').pop()?.toUpperCase() || 'FILE';

    return (
      <span className="text-xs px-1.5 py-0.5 rounded bg-amber-400/15 text-amber-400 font-mono font-medium border border-amber-400/30">
        {displayText}
      </span>
    );
  }

  if (node.type === 'header' && node.data?.name) {
    return (
      <span className="text-xs px-1.5 py-0.5 rounded bg-red-400/15 text-red-400 font-mono font-medium border border-red-400/30">
        {node.data.name}
      </span>
    );
  }

  if (node.type === 'headers' && node.data) {
    return null;
  }

  return null;
}
