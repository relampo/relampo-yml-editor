import { FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import type { RedirectSourceInfo, RedirectedRequestInfo, YAMLNode } from '../types/yaml';
import { YAMLRequestDetails } from './YAMLRequestDetails';
import { YAMLSQLDetails } from './YAMLSQLDetails';
import { Input } from './ui/input';
import { BalancedDetails } from './yaml-node-details/BalancedDetails';
import {
  DataSourceDetails,
  FileDetails,
  GenericDetails,
  GroupDetails,
  HeaderDetails,
  HeadersDetails,
  HttpDefaultsDetails,
  MetricsDetails,
  ScenarioDetails,
  ScenariosContainerDetails,
  SparkDetails,
  TestDetails,
  TransactionDetails,
  VariablesDetails,
} from './yaml-node-details/BasicDetails';
import {
  IfDetails,
  LoopDetails,
  OneTimeDetails,
  ParallelDetails,
  RetryDetails,
  ThinkTimeDetails,
} from './yaml-node-details/FlowDetails';
import { LoadDetails } from './yaml-node-details/LoadDetails';
import { CacheManagerDetails, CookiesDetails, ErrorPolicyDetails } from './yaml-node-details/OpsDetails';
import { AssertionDetails, ExtractorDetails } from './yaml-node-details/ValidationDetails';

interface YAMLNodeDetailsProps {
  node: YAMLNode | null;
  redirectedInfo?: RedirectedRequestInfo | null;
  redirectSourceInfo?: RedirectSourceInfo | null;
  onNodeUpdate?: (nodeId: string, updatedData: any) => void;
}

const REQUEST_NODE_TYPES = ['request', 'sql', 'get', 'post', 'put', 'delete', 'patch', 'head', 'options'];

export function YAMLNodeDetails({ node, redirectSourceInfo = null, onNodeUpdate }: YAMLNodeDetailsProps) {
  const { t } = useLanguage();
  const [nodeName, setNodeName] = useState(node?.name || '');
  const isRequestNode = REQUEST_NODE_TYPES.includes(node?.type || '');
  const isCompactDetailsNode = node?.type === 'balanced';

  useEffect(() => {
    setNodeName(node?.name || '');
  }, [node?.id, node?.name]);

  if (!node) {
    return (
      <div className="h-full bg-[#0a0a0a] flex flex-col">
        <div className="px-6 py-3 border-b border-white/5 bg-[#111111]">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-zinc-400 rounded-full" />
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{t('yamlEditor.details')}</h3>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <FileText className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
            <p className="text-sm text-zinc-500">{t('yamlEditor.selectNode')}</p>
            <p className="text-xs text-zinc-600 mt-1">{t('yamlEditor.viewDetails')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-[#0a0a0a] flex flex-col overflow-hidden">
      <div className="px-6 py-3 border-b border-white/5 bg-[#111111] shrink-0">
        <div className={`flex gap-2 ${isRequestNode ? 'items-start' : 'items-center'}`}>
          <div className={`w-1 rounded-full bg-yellow-400 ${isRequestNode ? 'h-6 mt-0.5' : 'h-4'}`} />
          <h3
            className={`flex-1 ${isRequestNode ? 'text-base italic font-medium text-zinc-200 normal-case tracking-normal leading-snug whitespace-normal wrap-break-word' : 'text-xs font-semibold text-zinc-400 uppercase tracking-wider'}`}
          >
            {isRequestNode ? node.name : t('yamlEditor.details')}
          </h3>
        </div>
      </div>

      <div className={`flex-1 overflow-y-auto ${isCompactDetailsNode ? 'p-4' : 'p-6'}`}>
        {node.type !== 'test' && node.type !== 'data_source' && (
          <div className={isCompactDetailsNode ? 'mb-4' : 'mb-6'}>
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              {t('yamlEditor.common.name')}
            </label>
            <Input
              value={nodeName}
              onChange={event => {
                const nextName = event.target.value;
                setNodeName(nextName);
                onNodeUpdate?.(node.id, { ...node.data, __name: nextName });
              }}
              maxLength={50}
              style={{
                width: `${Math.min(Math.max((nodeName || '').length + 2, 12), 48)}ch`,
              }}
              className="max-w-full shrink-0 px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-semibold"
              placeholder="Node name"
            />
          </div>
        )}

        <NodeDetailsContent
          node={node}
          nodeName={nodeName}
          setNodeName={setNodeName}
          redirectSourceInfo={redirectSourceInfo}
          onNodeUpdate={onNodeUpdate}
        />
      </div>
    </div>
  );
}

function NodeDetailsContent({
  node,
  nodeName,
  setNodeName,
  redirectSourceInfo,
  onNodeUpdate,
}: {
  node: YAMLNode;
  nodeName: string;
  setNodeName: (name: string) => void;
  redirectSourceInfo: RedirectSourceInfo | null;
  onNodeUpdate?: (nodeId: string, updatedData: any) => void;
}) {
  switch (node.type) {
    case 'test':
      return (
        <TestDetails
          node={node}
          onNodeUpdate={onNodeUpdate}
          nodeName={nodeName}
          setNodeName={setNodeName}
        />
      );
    case 'variables':
      return (
        <VariablesDetails
          node={node}
          onNodeUpdate={onNodeUpdate}
        />
      );
    case 'data_source':
      return (
        <DataSourceDetails
          node={node}
          onNodeUpdate={onNodeUpdate}
          nodeName={nodeName}
          setNodeName={setNodeName}
        />
      );
    case 'http_defaults':
      return (
        <HttpDefaultsDetails
          node={node}
          onNodeUpdate={onNodeUpdate}
        />
      );
    case 'scenarios':
      return (
        <ScenariosContainerDetails
          node={node}
          onNodeUpdate={onNodeUpdate}
        />
      );
    case 'scenario':
      return (
        <ScenarioDetails
          node={node}
          onNodeUpdate={onNodeUpdate}
          nodeName={nodeName}
          setNodeName={setNodeName}
        />
      );
    case 'load':
      return (
        <LoadDetails
          node={node}
          onNodeUpdate={onNodeUpdate}
        />
      );
    case 'request':
    case 'sql':
    case 'get':
    case 'post':
    case 'put':
    case 'delete':
    case 'patch':
    case 'head':
    case 'options':
      if (node.type === 'sql') {
        return (
          <YAMLSQLDetails
            node={node}
            onNodeUpdate={onNodeUpdate}
          />
        );
      }
      return (
        <YAMLRequestDetails
          node={node}
          redirectSourceInfo={redirectSourceInfo}
          onNodeUpdate={onNodeUpdate}
        />
      );
    case 'group':
      return (
        <GroupDetails
          node={node}
          onNodeUpdate={onNodeUpdate}
          nodeName={nodeName}
          setNodeName={setNodeName}
        />
      );
    case 'transaction':
      return (
        <TransactionDetails
          node={node}
          onNodeUpdate={onNodeUpdate}
          nodeName={nodeName}
          setNodeName={setNodeName}
        />
      );
    case 'parallel':
      return (
        <ParallelDetails
          node={node}
          onNodeUpdate={onNodeUpdate}
        />
      );
    case 'balanced':
      return (
        <BalancedDetails
          node={node}
          onNodeUpdate={onNodeUpdate}
        />
      );
    case 'if':
      return (
        <IfDetails
          node={node}
          onNodeUpdate={onNodeUpdate}
        />
      );
    case 'loop':
      return (
        <LoopDetails
          node={node}
          onNodeUpdate={onNodeUpdate}
        />
      );
    case 'retry':
      return (
        <RetryDetails
          node={node}
          onNodeUpdate={onNodeUpdate}
        />
      );
    case 'one_time':
      return (
        <OneTimeDetails
          node={node}
          onNodeUpdate={onNodeUpdate}
        />
      );
    case 'think_time':
      return (
        <ThinkTimeDetails
          node={node}
          onNodeUpdate={onNodeUpdate}
        />
      );
    case 'cookies':
      return (
        <CookiesDetails
          node={node}
          onNodeUpdate={onNodeUpdate}
        />
      );
    case 'cache_manager':
      return (
        <CacheManagerDetails
          node={node}
          onNodeUpdate={onNodeUpdate}
        />
      );
    case 'error_policy':
      return (
        <ErrorPolicyDetails
          node={node}
          onNodeUpdate={onNodeUpdate}
        />
      );
    case 'metrics':
      return (
        <MetricsDetails
          node={node}
          onNodeUpdate={onNodeUpdate}
        />
      );
    case 'spark_before':
    case 'spark_after':
      return (
        <SparkDetails
          node={node}
          onNodeUpdate={onNodeUpdate}
        />
      );
    case 'assertion':
      return (
        <AssertionDetails
          node={node}
          onNodeUpdate={onNodeUpdate}
        />
      );
    case 'extractor':
      return (
        <ExtractorDetails
          node={node}
          onNodeUpdate={onNodeUpdate}
        />
      );
    case 'file':
      return (
        <FileDetails
          node={node}
          onNodeUpdate={onNodeUpdate}
        />
      );
    case 'header':
      return (
        <HeaderDetails
          node={node}
          onNodeUpdate={onNodeUpdate}
        />
      );
    case 'headers':
      return (
        <HeadersDetails
          node={node}
          onNodeUpdate={onNodeUpdate}
        />
      );
    default:
      return (
        <GenericDetails
          node={node}
          onNodeUpdate={onNodeUpdate}
        />
      );
  }
}
