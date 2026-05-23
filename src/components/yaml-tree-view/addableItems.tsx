import {
  AlertTriangle,
  BarChart3,
  Braces,
  CheckCircle,
  Clock,
  CodeXml,
  Cookie,
  Database,
  Filter,
  Folder,
  Gauge,
  Globe,
  HardDrive,
  Paperclip,
  Settings,
  Tag,
  Zap,
} from 'lucide-react';
import type { ReactNode } from 'react';
import type { YAMLNodeType } from '../../types/yaml';
import { canContain } from '../../utils/yamlDragDropRules';

export type YAMLAddableNodeType =
  | 'scenarios'
  | 'scenario'
  | 'request'
  | 'sql'
  | 'group'
  | 'transaction'
  | 'parallel'
  | 'balanced'
  | 'if'
  | 'loop'
  | 'retry'
  | 'one_time'
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
  | 'load'
  | 'get'
  | 'post'
  | 'put'
  | 'delete'
  | 'patch'
  | 'head'
  | 'options';

export interface AddableItem {
  type: YAMLAddableNodeType;
  label: string;
  description?: string;
  icon: ReactNode;
  color: string;
}

function filterAddableItemsByContainment(parentType: YAMLNodeType, items: AddableItem[]): AddableItem[] {
  return items.filter(item => canContain(parentType, item.type as YAMLNodeType));
}

export function getAddableItems(parentType: YAMLNodeType, t: (key: string) => string): AddableItem[] {
  const iconClass = 'w-4 h-4';

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
      {
        type: 'error_policy',
        label: 'Error Policy',
        description: 'Global error policy',
        icon: <AlertTriangle className={iconClass} />,
        color: 'text-orange-500',
      },
    ];
  }

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
        icon: <AlertTriangle className={iconClass} />,
        color: 'text-orange-500',
      },
    ];
  }

  const httpMethods = ['request', 'get', 'post', 'put', 'delete', 'patch', 'head', 'options'];
  if (httpMethods.includes(parentType)) {
    return [
      {
        type: 'spark_before',
        label: 'Spark Before',
        description: 'Script before the request',
        icon: <CodeXml className={iconClass} />,
        color: 'text-purple-500',
      },
      {
        type: 'spark_after',
        label: 'Spark After',
        description: 'Script after the request',
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
        description: 'Pause after the request',
        icon: <Clock className={iconClass} />,
        color: 'text-orange-400',
      },
      {
        type: 'error_policy',
        label: 'Error Policy',
        description: 'Error policy for this request',
        icon: <AlertTriangle className={iconClass} />,
        color: 'text-orange-500',
      },
      {
        type: 'data_source',
        label: 'Data Source',
        description: 'Local data source',
        icon: <Database className={iconClass} />,
        color: 'text-cyan-400',
      },
    ];
  }

  const controllers = ['group', 'simple', 'transaction', 'parallel', 'if', 'loop', 'retry', 'one_time', 'steps'];
  if (controllers.includes(parentType)) {
    return filterAddableItemsByContainment(parentType, [
      {
        type: 'request',
        label: 'HTTP Request',
        description: 'Request HTTP',
        icon: <Globe className={iconClass} />,
        color: 'text-emerald-400',
      },
      {
        type: 'sql',
        label: 'SQL Request',
        description: 'Database request for PostgreSQL or MySQL',
        icon: <Database className={iconClass} />,
        color: 'text-teal-400',
      },
      {
        type: 'group',
        label: 'Group',
        description: 'Group steps',
        icon: <Folder className={iconClass} />,
        color: 'text-blue-400',
      },
      {
        type: 'parallel',
        label: 'Parallel Controller',
        description: 'Run child steps concurrently',
        icon: <Folder className={iconClass} />,
        color: 'text-cyan-400',
      },
      {
        type: 'balanced',
        label: t('yamlEditor.balanced.name'),
        description: t('yamlEditor.balanced.contextDescription'),
        icon: <Folder className={iconClass} />,
        color: 'text-cyan-400',
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
        type: 'one_time',
        label: 'One Time Controller',
        description: 'Initialize shared state once',
        icon: <Folder className={iconClass} />,
        color: 'text-white',
      },
      {
        type: 'think_time',
        label: 'Think Time',
        description: 'Pause between requests',
        icon: <Clock className={iconClass} />,
        color: 'text-orange-400',
      },
      {
        type: 'data_source',
        label: 'Data Source',
        description: 'Local data source',
        icon: <Database className={iconClass} />,
        color: 'text-cyan-400',
      },
    ]);
  }

  if (parentType === 'balanced') {
    return filterAddableItemsByContainment(parentType, [
      {
        type: 'request',
        label: 'HTTP Request',
        description: 'Request HTTP',
        icon: <Globe className={iconClass} />,
        color: 'text-emerald-400',
      },
      {
        type: 'sql',
        label: 'SQL Request',
        description: 'Database request for PostgreSQL or MySQL',
        icon: <Database className={iconClass} />,
        color: 'text-teal-400',
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
    ]);
  }

  return [];
}
