import {
  AlertTriangle,
  BarChart3,
  BetweenHorizontalStart,
  Braces,
  CheckCircle,
  Clock,
  CodeXml,
  Cookie,
  Database,
  Filter,
  Gauge,
  GitBranch,
  Globe,
  HardDrive,
  Layers,
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
import type { ReactNode } from 'react';
import type { YAMLNode, YAMLNodeType } from '../../types/yaml';
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

export function getAddableItems(
  parentType: YAMLNodeType,
  t: (key: string) => string,
  _parentNode?: Pick<YAMLNode, 'children'>,
): AddableItem[] {
  const iconClass = 'w-4 h-4';

  if (parentType === 'root' || parentType === 'test') {
    return [
      {
        type: 'variables',
        label: t('yamlEditor.shell.addable.variables'),
        description: t('yamlEditor.shell.addable.variablesDesc'),
        icon: <Braces className={iconClass} />,
        color: 'text-pink-400',
      },
      {
        type: 'data_source',
        label: t('yamlEditor.shell.addable.dataSource'),
        description: t('yamlEditor.shell.addable.dataSourceCsv'),
        icon: <Database className={iconClass} />,
        color: 'text-cyan-400',
      },
      {
        type: 'http_defaults',
        label: t('yamlEditor.shell.addable.httpDefaults'),
        description: t('yamlEditor.shell.addable.httpDefaultsDesc'),
        icon: <Settings className={iconClass} />,
        color: 'text-sky-400',
      },
      {
        type: 'metrics',
        label: t('yamlEditor.shell.addable.metrics'),
        description: t('yamlEditor.shell.addable.metricsDesc'),
        icon: <BarChart3 className={iconClass} />,
        color: 'text-indigo-400',
      },
      {
        type: 'error_policy',
        label: t('yamlEditor.shell.addable.errorPolicy'),
        description: t('yamlEditor.shell.addable.errorPolicyGlobal'),
        icon: <AlertTriangle className={iconClass} />,
        color: 'text-orange-500',
      },
    ];
  }

  if (parentType === 'scenarios') {
    return [
      {
        type: 'scenario',
        label: t('yamlEditor.shell.addable.scenario'),
        description: t('yamlEditor.shell.addable.scenarioDesc'),
        icon: <Zap className={iconClass} />,
        color: 'text-yellow-400',
      },
    ];
  }

  if (parentType === 'scenario') {
    return [
      {
        type: 'load',
        label: t('yamlEditor.shell.addable.loadConfig'),
        description: t('yamlEditor.shell.addable.loadConfigDesc'),
        icon: <Gauge className={iconClass} />,
        color: 'text-red-500',
      },
      {
        type: 'cookies',
        label: t('yamlEditor.shell.addable.cookies'),
        description: t('yamlEditor.shell.addable.cookiesDesc'),
        icon: <Cookie className={iconClass} />,
        color: 'text-pink-400',
      },
      {
        type: 'cache_manager',
        label: t('yamlEditor.shell.addable.cacheManager'),
        description: t('yamlEditor.shell.addable.cacheManagerDesc'),
        icon: <HardDrive className={iconClass} />,
        color: 'text-slate-400',
      },
      {
        type: 'error_policy',
        label: t('yamlEditor.shell.addable.errorPolicy'),
        description: t('yamlEditor.shell.addable.errorPolicyDesc'),
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
        label: t('yamlEditor.shell.addable.sparkBefore'),
        description: t('yamlEditor.shell.addable.sparkBeforeDesc'),
        icon: <CodeXml className={iconClass} />,
        color: 'text-purple-500',
      },
      {
        type: 'spark_after',
        label: t('yamlEditor.shell.addable.sparkAfter'),
        description: t('yamlEditor.shell.addable.sparkAfterDesc'),
        icon: <CodeXml className={iconClass} />,
        color: 'text-violet-500',
      },
      {
        type: 'assertion',
        label: t('yamlEditor.shell.addable.assertion'),
        description: t('yamlEditor.shell.addable.assertionDesc'),
        icon: <CheckCircle className={iconClass} />,
        color: 'text-green-400',
      },
      {
        type: 'extractor',
        label: t('yamlEditor.shell.addable.extractor'),
        description: t('yamlEditor.shell.addable.extractorDesc'),
        icon: <Filter className={iconClass} />,
        color: 'text-blue-400',
      },
      {
        type: 'file',
        label: t('yamlEditor.shell.addable.fileUpload'),
        description: t('yamlEditor.shell.addable.fileUploadDesc'),
        icon: <Paperclip className={iconClass} />,
        color: 'text-amber-400',
      },
      {
        type: 'headers',
        label: t('yamlEditor.shell.addable.headers'),
        description: t('yamlEditor.shell.addable.headersDesc'),
        icon: <Tag className={iconClass} />,
        color: 'text-red-500',
      },
      {
        type: 'think_time',
        label: t('yamlEditor.shell.addable.thinkTime'),
        description: t('yamlEditor.shell.addable.thinkTimeAfter'),
        icon: <Clock className={iconClass} />,
        color: 'text-orange-400',
      },
      {
        type: 'error_policy',
        label: t('yamlEditor.shell.addable.errorPolicy'),
        description: t('yamlEditor.shell.addable.errorPolicyRequest'),
        icon: <AlertTriangle className={iconClass} />,
        color: 'text-orange-500',
      },
      {
        type: 'data_source',
        label: t('yamlEditor.shell.addable.dataSource'),
        description: t('yamlEditor.shell.addable.dataSourceLocal'),
        icon: <Database className={iconClass} />,
        color: 'text-cyan-400',
      },
    ];
  }

  const controllers = ['group', 'simple', 'transaction', 'parallel', 'if', 'loop', 'retry', 'one_time', 'steps'];
  if (controllers.includes(parentType)) {
    return filterAddableItemsByContainment(parentType, [
      {
        type: 'transaction',
        label: t('yamlEditor.shell.addable.transaction'),
        description: t('yamlEditor.shell.addable.transactionDesc'),
        icon: <BetweenHorizontalStart className={iconClass} />,
        color: 'text-white',
      },
      {
        type: 'request',
        label: t('yamlEditor.shell.addable.httpRequest'),
        description: t('yamlEditor.shell.addable.httpRequestDesc'),
        icon: <Globe className={iconClass} />,
        color: 'text-emerald-400',
      },
      {
        type: 'sql',
        label: t('yamlEditor.shell.addable.sqlRequest'),
        description: t('yamlEditor.shell.addable.sqlRequestDesc'),
        icon: <Database className={iconClass} />,
        color: 'text-teal-400',
      },
      {
        type: 'group',
        label: t('yamlEditor.shell.addable.group'),
        description: t('yamlEditor.shell.addable.groupDesc'),
        icon: <Layers className={iconClass} />,
        color: 'text-blue-400',
      },
      {
        type: 'parallel',
        label: t('yamlEditor.shell.addable.parallel'),
        description: t('yamlEditor.shell.addable.parallelDesc'),
        icon: <Waves className={iconClass} />,
        color: 'text-cyan-400',
      },
      {
        type: 'balanced',
        label: t('yamlEditor.balanced.name'),
        description: t('yamlEditor.balanced.contextDescription'),
        icon: <Scale className={iconClass} />,
        color: 'text-cyan-400',
      },
      {
        type: 'if',
        label: t('yamlEditor.shell.addable.if'),
        description: t('yamlEditor.shell.addable.ifDesc'),
        icon: <GitBranch className={iconClass} />,
        color: 'text-pink-500',
      },
      {
        type: 'loop',
        label: t('yamlEditor.shell.addable.loop'),
        description: t('yamlEditor.shell.addable.loopDesc'),
        icon: <Repeat className={iconClass} />,
        color: 'text-purple-400',
      },
      {
        type: 'retry',
        label: t('yamlEditor.shell.addable.retry'),
        description: t('yamlEditor.shell.addable.retryDesc'),
        icon: <RotateCcw className={iconClass} />,
        color: 'text-red-400',
      },
      {
        type: 'one_time',
        label: t('yamlEditor.shell.addable.oneTime'),
        description: t('yamlEditor.shell.addable.oneTimeDesc'),
        icon: <Play className={iconClass} />,
        color: 'text-white',
      },
      {
        type: 'think_time',
        label: t('yamlEditor.shell.addable.thinkTime'),
        description: t('yamlEditor.shell.addable.thinkTimeBetween'),
        icon: <Clock className={iconClass} />,
        color: 'text-orange-400',
      },
      {
        type: 'data_source',
        label: t('yamlEditor.shell.addable.dataSource'),
        description: t('yamlEditor.shell.addable.dataSourceLocal'),
        icon: <Database className={iconClass} />,
        color: 'text-cyan-400',
      },
    ]);
  }

  if (parentType === 'balanced') {
    return filterAddableItemsByContainment(parentType, [
      {
        type: 'request',
        label: t('yamlEditor.shell.addable.httpRequest'),
        description: t('yamlEditor.shell.addable.httpRequestDesc'),
        icon: <Globe className={iconClass} />,
        color: 'text-emerald-400',
      },
      {
        type: 'sql',
        label: t('yamlEditor.shell.addable.sqlRequest'),
        description: t('yamlEditor.shell.addable.sqlRequestDesc'),
        icon: <Database className={iconClass} />,
        color: 'text-teal-400',
      },
      {
        type: 'group',
        label: t('yamlEditor.shell.addable.group'),
        description: t('yamlEditor.shell.addable.groupDesc'),
        icon: <Layers className={iconClass} />,
        color: 'text-blue-400',
      },
      {
        type: 'parallel',
        label: t('yamlEditor.shell.addable.parallel'),
        description: t('yamlEditor.shell.addable.parallelDesc'),
        icon: <Waves className={iconClass} />,
        color: 'text-cyan-400',
      },
      {
        type: 'if',
        label: t('yamlEditor.shell.addable.if'),
        description: t('yamlEditor.shell.addable.ifDesc'),
        icon: <GitBranch className={iconClass} />,
        color: 'text-pink-500',
      },
      {
        type: 'loop',
        label: t('yamlEditor.shell.addable.loop'),
        description: t('yamlEditor.shell.addable.loopDesc'),
        icon: <Repeat className={iconClass} />,
        color: 'text-purple-400',
      },
      {
        type: 'retry',
        label: t('yamlEditor.shell.addable.retry'),
        description: t('yamlEditor.shell.addable.retryDesc'),
        icon: <RotateCcw className={iconClass} />,
        color: 'text-red-400',
      },
    ]);
  }

  return [];
}
