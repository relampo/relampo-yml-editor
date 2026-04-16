import { useState, useRef, useEffect } from 'react';
import {
  FileText,
  Folder,
  FolderOpen,
  GitBranch,
  Code,
  Cookie,
  Clock,
  CheckCircle,
  Filter,
  Globe,
  ChevronRight,
  ChevronDown,
  Package,
  Settings,
  BarChart3,
  Gauge,
  Database,
  HardDrive,
  Zap,
  Braces,
  AlertTriangle,
  CodeXml,
  Paperclip,
  Tag,
  List,
} from 'lucide-react';
import type { YAMLNode, YAMLNodeType, RedirectedRequestInfo } from '../types/yaml';
import { canDrop, canContain } from '../utils/yamlDragDropRules';

// Estado global para drag & drop (dataTransfer.getData no funciona en dragOver)
let currentDraggedNode: { id: string; type: YAMLNodeType } | null = null;
const DND_CLEAR_EVENT = 'yaml-tree-dnd-clear-indicators';

export function setDraggedNode(node: { id: string; type: YAMLNodeType } | null) {
  currentDraggedNode = node;
}

export function getDraggedNode() {
  return currentDraggedNode;
}

function clearDragIndicatorsGlobally() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(DND_CLEAR_EVENT));
}

interface YAMLTreeNodeProps {
  node: YAMLNode;
  depth: number;
  isSelected: boolean;
  selectedNodeIds: string[];
  redirectedRequestMap: Record<string, RedirectedRequestInfo>;
  onNodeSelect: (node: YAMLNode, event: React.MouseEvent) => void;
  onNodeToggle: (nodeId: string) => void;
  onContextMenu: (event: React.MouseEvent, node: YAMLNode) => void;
  onNodeMove: (draggedId: string, targetId: string, position: 'before' | 'after' | 'inside') => void;
  searchQuery?: string;
}

export function YAMLTreeNode({
  node,
  depth,
  isSelected,
  selectedNodeIds,
  redirectedRequestMap,
  onNodeSelect,
  onNodeToggle,
  onContextMenu,
  onNodeMove,
  searchQuery = '',
}: YAMLTreeNodeProps) {
  const [dragOver, setDragOver] = useState<'before' | 'after' | 'inside' | null>(null);
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = node.expanded ?? true;
  const hoverTimerRef = useRef<number | null>(null);
  const redirectedInfo = redirectedRequestMap[node.id];
  const isRedirectedFollowUp = Boolean(redirectedInfo);
  const redirectedLabel = 'Redirected';

  // Limpiar timer al desmontar
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
    e.dataTransfer.setData('text/plain', node.id); // Necesario para Firefox
    // Guardar en estado global (dataTransfer.getData no funciona en dragOver)
    setDraggedNode({ id: node.id, type: node.type });
  };

  const handleDragEnd = () => {
    clearDragIndicatorsGlobally();
    setDraggedNode(null);
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

    // AUTO-EXPAND: Si puede contener y NO está expandido, iniciar timer
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

    // Determinar posición basada en zonas
    let position: 'before' | 'after' | 'inside';

    if (percentage < 25) {
      position = 'before';
    } else if (percentage > 75) {
      position = 'after';
    } else {
      position = canContainResult ? 'inside' : 'after';
    }

    const canDropResult = canDrop(draggedNodeType, node.type, position);

    if (canDropResult) {
      e.dataTransfer.dropEffect = 'move';
      setDragOver(position);
    } else {
      e.dataTransfer.dropEffect = 'none';
      setDragOver(null);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Solo limpiar si realmente salimos del nodo (no de un child)
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOver(null);

      // Cancelar timer de auto-expand
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

  const icon = getNodeIcon(node.type);
  const color = getNodeColor(node.type, node, isRedirectedFollowUp);
  const IconComponent = icon;
  const searchHitFlags = getNodeSearchHitFlags(node, searchQuery);
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const hasDirectNameMatch = normalizedSearchQuery ? node.name.toLowerCase().includes(normalizedSearchQuery) : false;
  const hasRequestHit = searchHitFlags.request || hasDirectNameMatch;
  const hasResponseHit = searchHitFlags.response;

  return (
    <div className="select-none">
      <div
        role="treeitem"
        aria-selected={isSelected}
        tabIndex={0}
        draggable
        data-node-id={node.id}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={e => onNodeSelect(node, e)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') onNodeSelect(node, e as any);
        }}
        onContextMenu={e => onContextMenu(e, node)}
        className={`
          relative group flex items-center gap-2 px-2 py-1.5 pr-3 rounded cursor-pointer transition-colors overflow-visible
          ${
            isSelected
              ? 'bg-yellow-300/12 border border-yellow-300/35 ring-1 ring-yellow-300/25 shadow-[0_0_0_1px_rgba(250,204,21,0.14)]'
              : isRedirectedFollowUp
                ? 'bg-zinc-400/12 border border-zinc-300/30 hover:bg-zinc-400/16 ring-1 ring-zinc-300/15'
                : 'hover:bg-white/5 border border-transparent'
          }
          ${dragOver === 'before' ? 'border-t-2 border-t-yellow-400' : ''}
          ${dragOver === 'after' ? 'border-b-2 border-b-yellow-400' : ''}
          ${dragOver === 'inside' ? 'bg-yellow-400/5 border-yellow-400/30' : ''}
        `}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {isRedirectedFollowUp && <div className="absolute left-0 top-1 bottom-1 w-1 rounded-full bg-zinc-300/80" />}
        {/* Expand/Collapse */}
        {hasChildren && (
          <button
            onClick={e => {
              e.stopPropagation();
              onNodeToggle(node.id);
            }}
            className="flex-shrink-0 w-4 h-4 flex items-center justify-center text-zinc-500 hover:text-zinc-300"
          >
            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
        )}

        {!hasChildren && <div className="w-4" />}

        {/* Icon */}
        <div className={`flex-shrink-0 ${color}`}>
          <IconComponent className="w-4 h-4" />
        </div>

        {/* Name */}
        <span
          className={`text-sm truncate flex-1 ${
            node.data?.enabled === false ? 'text-zinc-400' : isRedirectedFollowUp ? 'text-zinc-100' : 'text-zinc-300'
          }`}
        >
          {node.name}
        </span>

        {/* Badge with extra info */}
        {isRedirectedFollowUp && (
          <span className="inline-flex h-5 items-center flex-shrink-0 text-xs leading-none px-1.5 py-0.5 rounded bg-zinc-400/15 text-zinc-300 font-mono font-medium border border-zinc-400/30 uppercase">
            {redirectedLabel}
          </span>
        )}
        {getNodeBadge(node, { mutedMethod: isRedirectedFollowUp })}
        {hasRequestHit && (
          <span className="inline-flex h-5 items-center flex-shrink-0 text-xs leading-none px-1.5 py-0.5 rounded bg-yellow-400/15 text-yellow-400 font-mono font-medium border border-yellow-400/30 uppercase">
            req
          </span>
        )}
        {hasResponseHit && (
          <span className="inline-flex h-5 items-center flex-shrink-0 text-xs leading-none px-1.5 py-0.5 rounded bg-yellow-400/15 text-yellow-400 font-mono font-medium border border-yellow-400/30 uppercase">
            res
          </span>
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="ml-2 border-l border-white/5">
          {node.children!.map(child => (
            <YAMLTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              isSelected={selectedNodeIds.includes(child.id)}
              selectedNodeIds={selectedNodeIds}
              redirectedRequestMap={redirectedRequestMap}
              onNodeSelect={onNodeSelect}
              onNodeToggle={onNodeToggle}
              onContextMenu={onContextMenu}
              onNodeMove={onNodeMove}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function getNodeIcon(type: YAMLNodeType): any {
  const iconMap: Record<string, any> = {
    root: FileText,
    test: FileText,
    variables: Braces,
    data_source: Database,
    http_defaults: Settings,
    scenarios: List,
    scenario: Zap,
    metrics: BarChart3,
    load: Gauge,
    steps: Package,
    step: Code,
    request: Globe,
    sql: Database,
    get: Globe,
    post: Globe,
    put: Globe,
    delete: Globe,
    patch: Globe,
    head: Globe,
    options: Globe,
    group: Folder,
    transaction: GitBranch,
    simple: FolderOpen,
    if: Folder,
    loop: Folder,
    retry: Folder,
    one_time: Folder,
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

function getNodeColor(type: YAMLNodeType, node?: YAMLNode, isRedirectedFollowUp = false): string {
  // Check if node is disabled (enabled: false)
  const isDisabled = node?.data?.enabled === false;

  if (isDisabled || isRedirectedFollowUp) {
    // Gris más claro para CUALQUIER elemento deshabilitado
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
    case 'sql':
      return 'text-teal-400';
    case 'group':
    case 'simple':
      return 'text-blue-400';
    case 'transaction':
      return 'text-white';
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

function getNodeBadge(node: YAMLNode, options: { mutedMethod?: boolean } = {}): React.ReactNode {
  const { mutedMethod = false } = options;
  const httpMethods = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'];

  // Badge DISABLED para requests deshabilitados
  if (
    node.data?.enabled === false &&
    (httpMethods.includes(node.type) || node.type === 'request' || node.type === 'sql')
  ) {
    return (
      <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-700/30 text-zinc-400 font-mono font-medium border border-zinc-600/30 uppercase">
        disabled
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

  if (node.type === 'one_time') {
    return (
      <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-white font-mono font-medium border border-white/15">
        once
      </span>
    );
  }

  if (node.type === 'think_time' && node.data?.duration) {
    return (
      <span className="text-xs px-1.5 py-0.5 rounded bg-orange-400/15 text-orange-400 font-mono font-medium border border-orange-400/30">
        {node.data.duration}
      </span>
    );
  }

  // Spark badges - colores brillantes para verse contra el fondo oscuro
  if (node.type === 'spark_before') {
    return (
      <span className="text-xs px-1.5 py-0.5 rounded bg-purple-400/15 text-purple-400 font-mono font-medium border border-purple-400/30">
        before
      </span>
    );
  }

  if (node.type === 'spark_after') {
    return (
      <span className="text-xs px-1.5 py-0.5 rounded bg-violet-400/15 text-violet-400 font-mono font-medium border border-violet-400/30">
        after
      </span>
    );
  }

  // Assertion badge
  if (node.type === 'assertion' && node.data?.type) {
    return (
      <span className="text-xs px-1.5 py-0.5 rounded bg-green-400/15 text-green-400 font-mono font-medium border border-green-400/30">
        {node.data.type}
      </span>
    );
  }

  // Extractor badge
  if (node.type === 'extractor' && node.data?.type) {
    return (
      <span className="text-xs px-1.5 py-0.5 rounded bg-blue-400/15 text-blue-400 font-mono font-medium border border-blue-400/30">
        {node.data.type}
      </span>
    );
  }

  // File badge - mostrar extensión del archivo o mime_type
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

  // Header badge - mostrar nombre del header
  if (node.type === 'header' && node.data?.name) {
    return (
      <span className="text-xs px-1.5 py-0.5 rounded bg-red-400/15 text-red-400 font-mono font-medium border border-red-400/30">
        {node.data.name}
      </span>
    );
  }

  // Headers container badge - removed count as per user request
  if (node.type === 'headers' && node.data) {
    return null;
  }

  return null;
}

function getNodeSearchHitFlags(node: YAMLNode, searchQuery: string): { request: boolean; response: boolean } {
  const query = searchQuery.trim().toLowerCase();
  if (!query) {
    return { request: false, response: false };
  }

  const requestPayload = serializeSearchValue(stripResponseField(node.data));
  const responsePayload = serializeSearchValue(node.data?.response);

  return {
    request: requestPayload.includes(query),
    response: responsePayload.includes(query),
  };
}

function stripResponseField(value: any): any {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return value;
  }
  const next = { ...value };
  delete next.response;
  return next;
}

function serializeSearchValue(value: any): string {
  if (value == null) return '';
  if (typeof value === 'string') return value.toLowerCase();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value).toLowerCase();
  try {
    return JSON.stringify(value).toLowerCase();
  } catch {
    return '';
  }
}
