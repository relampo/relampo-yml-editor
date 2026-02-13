import { useEffect, useRef, useState } from 'react';
import {
  Plus,
  Trash2,
  Globe,
  Folder,
  GitBranch,
  Repeat,
  RefreshCw,
  FolderOpen,
  Clock,
  Zap,
  CheckCircle,
  Filter,
  Code,
  Braces,
  Database,
  Settings,
  Cookie,
  HardDrive,
  FileCode,
  BarChart3,
  Gauge,
  Eye,
  EyeOff,
  CodeXml,
  AlertTriangle,
  Paperclip,
  Tag,
  List,
} from 'lucide-react';
import type { YAMLNode, YAMLNodeType } from '../types/yaml';
import { useLanguage } from '../contexts/LanguageContext';

export type YAMLAddableNodeType =
  | 'scenario'
  | 'request'
  | 'group'
  | 'if'
  | 'loop'
  | 'retry'
  | 'on_error'
  | 'think_time'
  | 'assertion'
  | 'extractor'
  | 'spark_before'
  | 'spark_after'
  | 'file'
  | 'header'
  | 'headers'
  | 'variables'
  | 'data_source'
  | 'http_defaults'
  | 'cookies'
  | 'cache_manager'
  | 'error_policy'
  | 'metrics'
  | 'load';

interface YAMLContextMenuProps {
  x: number;
  y: number;
  node: YAMLNode;
  onClose: () => void;
  onAddNode: (nodeType: YAMLAddableNodeType) => void;
  onRemove: () => void;
  onToggleEnabled?: (nodeId: string, enabled: boolean) => void;
}

export function YAMLContextMenu({
  x,
  y,
  node,
  onClose,
  onAddNode,
  onRemove,
  onToggleEnabled,
}: YAMLContextMenuProps) {
  const { t } = useLanguage();
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x, y });

  useEffect(() => {
    const handleClick = () => onClose();
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Adjust position so it doesn't get cut off
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      let newX = x;
      let newY = y;
      
      // Adjust if it goes out on the right
      if (x + rect.width > viewportWidth - 10) {
        newX = viewportWidth - rect.width - 10;
      }
      
      // Adjust if it goes out at the bottom
      if (y + rect.height > viewportHeight - 10) {
        newY = viewportHeight - rect.height - 10;
      }
      
      // Ensure it's not negative
      newX = Math.max(10, newX);
      newY = Math.max(10, newY);
      
      if (newX !== x || newY !== y) {
        setPosition({ x: newX, y: newY });
      }
    }
  }, [x, y]);

  const addableItems = getAddableItems(node.type);
  const canAddChildren = addableItems.length > 0;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[220px] max-h-[80vh] overflow-y-auto bg-[#111111] border border-white/10 rounded-lg shadow-2xl shadow-black/50 py-1"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {canAddChildren && (
        <>
          <div className="px-3 py-1.5 sticky top-0 bg-[#111111] z-10">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              <Plus className="w-3 h-3" />
              {t('yamlEditor.common.add')}
            </div>
          </div>

          {addableItems.map((item) => (
            <button
              key={item.type}
              onClick={() => onAddNode(item.type)}
              className="w-full px-3 py-2 flex items-center gap-3 hover:bg-white/5 text-left transition-colors"
            >
              <div className={item.color}>
                {item.icon}
              </div>
              <div className="flex-1">
                <div className="text-sm text-zinc-200">{item.label}</div>
                {item.description && (
                  <div className="text-xs text-zinc-500">{item.description}</div>
                )}
              </div>
            </button>
          ))}

          <div className="h-px bg-white/5 my-1" />
        </>
      )}

      {/* Enable/Disable option */}
      {node.type !== 'root' && node.type !== 'test' && node.type !== 'scenarios' && node.type !== 'steps' && onToggleEnabled && (
        <button
          onClick={() => {
            const isCurrentlyEnabled = node.data?.enabled !== false;
            onToggleEnabled(node.id, !isCurrentlyEnabled);
            onClose();
          }}
          className="w-full px-3 py-2 flex items-center gap-3 hover:bg-white/5 text-left transition-colors text-zinc-300"
        >
          {node.data?.enabled === false ? (
            <>
              <Eye className="w-4 h-4" />
              <span className="text-sm">{t('yamlEditor.common.enable')}</span>
            </>
          ) : (
            <>
              <EyeOff className="w-4 h-4" />
              <span className="text-sm">{t('yamlEditor.common.disable')}</span>
            </>
          )}
        </button>
      )}
      
      {node.type !== 'root' && node.type !== 'test' && node.type !== 'scenarios' && node.type !== 'steps' && (
        <>
          <div className="h-px bg-white/5 my-1" />
          <button
            onClick={onRemove}
            className="w-full px-3 py-2 flex items-center gap-3 hover:bg-red-500/10 text-left transition-colors text-red-400"
          >
            <Trash2 className="w-4 h-4" />
            <span className="text-sm">{t('yamlEditor.common.delete')}</span>
          </button>
        </>
      )}
    </div>
  );
}

interface AddableItem {
  type: YAMLAddableNodeType;
  label: string;
  description?: string;
  icon: JSX.Element;
  color: string;
}

function getAddableItems(parentType: string): AddableItem[] {
  const iconClass = "w-4 h-4";

  // ROOT/TEST - Elementos de configuración global
  if (parentType === 'root' || parentType === 'test') {
    return [
      {
        type: 'variables',
        label: 'Variables',
        description: 'Global variables',
        icon: <Braces className={iconClass} />,
        color: 'text-pink-400',
      },
      {
        type: 'data_source',
        label: 'Data Source',
        description: 'CSV data source',
        icon: <Database className={iconClass} />,
        color: 'text-cyan-400',
      },
      {
        type: 'http_defaults',
        label: 'HTTP Defaults',
        description: 'Base HTTP configuration',
        icon: <Settings className={iconClass} />,
        color: 'text-sky-400',
      },
      {
        type: 'metrics',
        label: 'Metrics',
        description: 'Metrics configuration',
        icon: <BarChart3 className={iconClass} />,
        color: 'text-indigo-400',
      },
    ];
  }

  // SCENARIOS container
  if (parentType === 'scenarios') {
    return [
      {
        type: 'scenario',
        label: 'Scenario',
        description: 'New load scenario',
        icon: <Zap className={iconClass} />,
        color: 'text-yellow-400',
      },
    ];
  }

  // SCENARIO - Configuración del escenario
  if (parentType === 'scenario') {
    return [
      {
        type: 'load',
        label: 'Load Config',
        description: 'Load configuration',
        icon: <Gauge className={iconClass} />,
        color: 'text-red-500',
      },
      {
        type: 'cookies',
        label: 'Cookies',
        description: 'Cookie manager',
        icon: <Cookie className={iconClass} />,
        color: 'text-pink-400',
      },
      {
        type: 'cache_manager',
        label: 'Cache Manager',
        description: 'Cache manager',
        icon: <HardDrive className={iconClass} />,
        color: 'text-slate-400',
      },
      {
        type: 'error_policy',
        label: 'Error Policy',
        description: 'Error policy',
        icon: <FileCode className={iconClass} />,
        color: 'text-orange-500',
      },
    ];
  }

  // REQUESTS (get, post, put, etc.) - Pre/Post processors y assertions
  const httpMethods = ['request', 'get', 'post', 'put', 'delete', 'patch', 'head', 'options'];
  if (httpMethods.includes(parentType)) {
    return [
      {
        type: 'spark_before',
        label: 'Spark Before',
        description: 'Script before request',
        icon: <CodeXml className={iconClass} />,
        color: 'text-purple-500',
      },
      {
        type: 'spark_after',
        label: 'Spark After',
        description: 'Script after request',
        icon: <CodeXml className={iconClass} />,
        color: 'text-violet-500',
      },
      {
        type: 'assertion',
        label: 'Assertion',
        description: 'Response validation',
        icon: <CheckCircle className={iconClass} />,
        color: 'text-green-400',
      },
      {
        type: 'extractor',
        label: 'Extractor',
        description: 'Data extraction',
        icon: <Filter className={iconClass} />,
        color: 'text-blue-400',
      },
      {
        type: 'file',
        label: 'File Upload',
        description: 'Attach file',
        icon: <Paperclip className={iconClass} />,
        color: 'text-amber-400',
      },
      {
        type: 'headers',
        label: 'Headers',
        description: 'HTTP headers manager',
        icon: <Tag className={iconClass} />,
        color: 'text-red-500',
      },
      {
        type: 'think_time',
        label: 'Think Time',
        description: 'Pause after request',
        icon: <Clock className={iconClass} />,
        color: 'text-orange-400',
      },
    ];
  }

  // LOGIC CONTROLLERS (group, if, loop, retry, on_error, simple) y STEPS
  const controllers = ['group', 'simple', 'if', 'loop', 'retry', 'on_error', 'steps'];
  if (controllers.includes(parentType)) {
    return [
      {
        type: 'request',
        label: 'HTTP Request',
        description: 'Request HTTP',
        icon: <Globe className={iconClass} />,
        color: 'text-emerald-400',
      },
      {
        type: 'group',
        label: 'Group',
        description: 'Group steps',
        icon: <Folder className={iconClass} />,
        color: 'text-blue-400',
      },
      {
        type: 'if',
        label: 'If Controller',
        description: 'Conditional execution',
        icon: <Folder className={iconClass} />,
        color: 'text-pink-500',
      },
      {
        type: 'loop',
        label: 'Loop Controller',
        description: 'Repeat steps',
        icon: <Folder className={iconClass} />,
        color: 'text-purple-400',
      },
      {
        type: 'retry',
        label: 'Retry Controller',
        description: 'Retry with backoff',
        icon: <Folder className={iconClass} />,
        color: 'text-red-400',
      },
      {
        type: 'on_error',
        label: 'On Error',
        description: 'Error handling',
        icon: <AlertTriangle className={iconClass} />,
        color: 'text-orange-500',
      },
      {
        type: 'think_time',
        label: 'Think Time',
        description: 'Pause between requests',
        icon: <Clock className={iconClass} />,
        color: 'text-orange-400',
      },
    ];
  }

  return [];
}
