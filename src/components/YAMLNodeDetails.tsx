import { useState, useEffect } from 'react';
import { FileText, Plus, Trash2 } from 'lucide-react';
import type { YAMLNode } from '../types/yaml';
import { useLanguage } from '../contexts/LanguageContext';
import { YAMLRequestDetails } from './YAMLRequestDetails';
import { SparkCodeEditor } from './SparkCodeEditor';
import { EditableList } from './EditableList';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';

interface EditableFieldProps {
  label: string;
  value: string | number;
  field: string;
  onChange: (field: string, value: string) => void;
  type?: 'text' | 'number';
}

// Componente con estado local para evitar pérdida de foco
function EditableField({ label, value, field, onChange, type = 'text' }: EditableFieldProps) {
  const [localValue, setLocalValue] = useState(String(value || ''));
  
  // Sincronizar cuando el valor externo cambia (por ejemplo, al seleccionar otro nodo)
  useEffect(() => {
    setLocalValue(String(value || ''));
  }, [value]);
  
  const handleBlur = () => {
    onChange(field, localValue);
  };
  
  return (
    <div className="mb-4">
      <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
        {label}
      </label>
      <Input
        type={type}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
      />
    </div>
  );
}

interface YAMLNodeDetailsProps {
  node: YAMLNode | null;
  onNodeUpdate?: (nodeId: string, updatedData: any) => void;
}

export function YAMLNodeDetails({ node, onNodeUpdate }: YAMLNodeDetailsProps) {
  const { t } = useLanguage();

  if (!node) {
    return (
      <div className="h-full bg-[#0a0a0a] flex flex-col">
        <div className="px-6 py-3 border-b border-white/5 bg-[#111111]">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-zinc-400 rounded-full" />
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              {t('yamlEditor.details')}
            </h3>
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

  const renderTypeSpecificDetails = (node: YAMLNode): JSX.Element | null => {
    switch (node.type) {
      case 'test':
        return renderTestDetails(node, onNodeUpdate);
      case 'variables':
        return renderVariablesDetails(node, onNodeUpdate);
      case 'data_source':
        return renderDataSourceDetails(node, onNodeUpdate);
      case 'http_defaults':
        return renderHttpDefaultsDetails(node, onNodeUpdate);
      case 'scenarios':
        return renderScenariosContainerDetails(node, onNodeUpdate);
      case 'scenario':
        return renderScenarioDetails(node, onNodeUpdate);
      case 'load':
        return renderLoadDetails(node, onNodeUpdate);
      case 'request':
      case 'get':
      case 'post':
      case 'put':
      case 'delete':
      case 'patch':
      case 'head':
      case 'options':
        return <YAMLRequestDetails node={node} onNodeUpdate={onNodeUpdate} />;
      case 'group':
        return renderGroupDetails(node, onNodeUpdate);
      case 'if':
        return renderIfDetails(node, onNodeUpdate);
      case 'loop':
        return renderLoopDetails(node, onNodeUpdate);
      case 'retry':
        return renderRetryDetails(node, onNodeUpdate);
      case 'think_time':
        return renderThinkTimeDetails(node, onNodeUpdate);
      case 'cookies':
        return renderCookiesDetails(node, onNodeUpdate);
      case 'cache_manager':
        return renderCacheManagerDetails(node, onNodeUpdate);
      case 'error_policy':
        return renderErrorPolicyDetails(node, onNodeUpdate);
      case 'metrics':
        return renderMetricsDetails(node, onNodeUpdate);
      case 'spark_before':
      case 'spark_after':
        return renderSparkDetails(node, onNodeUpdate);
      case 'assertion':
        return renderAssertionDetails(node, onNodeUpdate);
      case 'extractor':
        return renderExtractorDetails(node, onNodeUpdate);
      default:
        return renderGenericDetails(node);
    }
  };

  return (
    <div className="h-full bg-[#0a0a0a] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-3 border-b border-white/5 bg-[#111111] flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-yellow-400 rounded-full" />
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            {t('yamlEditor.details')}
          </h3>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Node Name - Editable */}
        <div className="mb-6">
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
            Name
          </label>
          <Input
            value={node.name}
            onChange={(e) => {
              if (onNodeUpdate) {
                // Actualizar el nombre del nodo
                const updatedNode = { ...node, name: e.target.value };
                onNodeUpdate(node.id, node.data || {});
              }
            }}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-semibold"
            placeholder="Node name"
          />
        </div>

        {/* Type-specific details */}
        {renderTypeSpecificDetails(node)}
      </div>
    </div>
  );
}

function renderTestDetails(node: YAMLNode, onNodeUpdate?: (nodeId: string, data: any) => void): JSX.Element {
  const data = node.data || {};
  
  const handleChange = (field: string, value: string) => {
    if (!onNodeUpdate) return;
    onNodeUpdate(node.id, { ...data, [field]: value });
  };
  
  return (
    <>
      <div className="mb-4">
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
          Description
        </label>
        <Textarea
          value={data.description || ''}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Test description..."
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 min-h-[80px]"
        />
      </div>
      
      <div className="mb-4">
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
          Version
        </label>
        <Input
          value={data.version || ''}
          onChange={(e) => handleChange('version', e.target.value)}
          placeholder="1.0"
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
        />
      </div>
    </>
  );
}

function renderVariablesDetails(node: YAMLNode, onNodeUpdate?: (nodeId: string, data: any) => void): JSX.Element {
  const data = node.data || {};
  
  const handleUpdate = (items: Record<string, string>) => {
    if (!onNodeUpdate) return;
    onNodeUpdate(node.id, items);
  };
  
  return (
    <EditableList
      title="Variables"
      items={data}
      onUpdate={handleUpdate}
      keyPlaceholder="variable_name"
      valuePlaceholder="value"
      keyLabel="Variable Name"
      valueLabel="Value"
      enableCheckboxes={false}
      enableBulkActions={false}
    />
  );
}

function renderDataSourceDetails(node: YAMLNode, onNodeUpdate?: (nodeId: string, data: any) => void): JSX.Element {
  const data = node.data || {};
  const handleChange = (field: string, value: any) => {
    if (onNodeUpdate) onNodeUpdate(node.id, { ...data, [field]: value });
  };
  return (
    <>
      <EditableField label="Type" value={data.type || ''} field="type" onChange={handleChange} />
      <EditableField label="File" value={data.file || ''} field="file" onChange={handleChange} />
      <EditableField label="Mode" value={data.mode || ''} field="mode" onChange={handleChange} />
      <EditableField label="Strategy" value={data.strategy || ''} field="strategy" onChange={handleChange} />
      <EditableField label="On Exhausted" value={data.on_exhausted || ''} field="on_exhausted" onChange={handleChange} />
    </>
  );
}

function renderHttpDefaultsDetails(node: YAMLNode, onNodeUpdate?: (nodeId: string, data: any) => void): JSX.Element {
  const data = node.data || {};
  const headers = data.headers || {};
  
  // Campos principales (excluyendo headers)
  const mainFields = { ...data };
  delete mainFields.headers;
  
  const handleChange = (field: string, value: any) => {
    if (onNodeUpdate) onNodeUpdate(node.id, { ...data, [field]: value });
  };
  
  const handleMainFieldsUpdate = (fields: Record<string, string>) => {
    if (onNodeUpdate) {
      onNodeUpdate(node.id, { ...fields, headers: data.headers || {} });
    }
  };
  
  const handleHeadersUpdate = (updatedHeaders: Record<string, string>) => {
    if (onNodeUpdate) {
      const newData = { ...data, headers: updatedHeaders };
      onNodeUpdate(node.id, newData);
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Main Configuration Fields */}
      <div>
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-3">
          Configuration
        </label>
        <EditableList
          title="Fields"
          items={mainFields}
          onUpdate={handleMainFieldsUpdate}
          keyPlaceholder="field_name"
          valuePlaceholder="value"
          enableCheckboxes={false}
          enableBulkActions={false}
        />
      </div>
      
      {/* Divider */}
      <div className="h-px bg-white/10" />
      
      {/* Headers Section */}
      <div>
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-3">
          Headers
        </label>
        <EditableList
          title="HTTP Headers"
          items={headers}
          onUpdate={handleHeadersUpdate}
          keyPlaceholder="Header-Name"
          valuePlaceholder="value"
          enableCheckboxes={false}
          enableBulkActions={false}
        />
      </div>
    </div>
  );
}

function renderScenariosContainerDetails(node: YAMLNode, onNodeUpdate?: (nodeId: string, data: any) => void): JSX.Element {
  const data = node.data || {};
  const scenarios = node.children || [];
  const scenarioCount = scenarios.length;
  
  const handleChange = (field: string, value: any) => {
    if (onNodeUpdate) onNodeUpdate(node.id, { ...data, [field]: value });
  };
  
  return (
    <div className="space-y-6">
      {/* Scenario Count */}
      <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-1">
              Total Scenarios
            </div>
            <div className="text-3xl font-bold text-purple-300">
              {scenarioCount}
            </div>
          </div>
          <div className="text-purple-400/50">
            <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
              <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      </div>
      
      {/* Comments/Description */}
      <div>
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
          Description / Comments
        </label>
        <Textarea
          value={data.description || ''}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Add notes or description about your scenarios..."
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 min-h-[100px]"
        />
      </div>
      
      {/* Divider */}
      <div className="h-px bg-white/10" />
      
      {/* Scenarios List */}
      <div>
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-3">
          Scenarios in this test
        </label>
        {scenarioCount === 0 ? (
          <div className="p-6 text-center text-zinc-500 text-sm border border-dashed border-white/10 rounded">
            No scenarios defined. Right-click on "scenarios" in the tree to add one.
          </div>
        ) : (
          <div className="space-y-2">
            {scenarios.map((scenario, index) => (
              <div
                key={scenario.id}
                className="p-3 bg-white/5 border-2 border-white/10 hover:border-purple-400/30 rounded-lg transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-500/20 text-purple-400 rounded-full flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-zinc-200">
                      {scenario.name}
                    </div>
                    {scenario.data?.name && (
                      <div className="text-xs text-zinc-500 mt-0.5">
                        {scenario.data.name}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function renderScenarioDetails(node: YAMLNode, onNodeUpdate?: (nodeId: string, data: any) => void): JSX.Element {
  const data = node.data || {};
  const handleChange = (field: string, value: any) => {
    if (onNodeUpdate) onNodeUpdate(node.id, { ...data, [field]: value });
  };
  return (
    <>
      <EditableField label="Scenario Name" value={data.name || ''} field="name" onChange={handleChange} />
      
      {/* Comments/Description */}
      <div className="mb-4">
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
          Comments / Description
        </label>
        <Textarea
          value={data.comments || ''}
          onChange={(e) => handleChange('comments', e.target.value)}
          placeholder="Add notes or comments about this scenario..."
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 min-h-[80px]"
        />
      </div>
    </>
  );
}

function renderLoadDetails(node: YAMLNode, onNodeUpdate?: (nodeId: string, data: any) => void): JSX.Element {
  const data = node.data || {};
  const handleChange = (field: string, value: any) => {
    if (onNodeUpdate) onNodeUpdate(node.id, { ...data, [field]: value });
  };
  return (
    <>
      <div className="mb-4">
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Type</label>
        <select
          value={data.type || 'constant'}
          onChange={(e) => handleChange('type', e.target.value)}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
        >
          <option value="constant">constant</option>
          <option value="ramp">ramp</option>
          <option value="spike">spike</option>
          <option value="step">step</option>
        </select>
      </div>
      <EditableField label="Users" value={data.users || ''} field="users" onChange={handleChange} type="number" />
      <EditableField label="Start Users" value={data.start_users || ''} field="start_users" onChange={handleChange} type="number" />
      <EditableField label="End Users" value={data.end_users || ''} field="end_users" onChange={handleChange} type="number" />
      <EditableField label="Duration" value={data.duration || ''} field="duration" onChange={handleChange} />
      <EditableField label="Ramp Up" value={data.ramp_up || ''} field="ramp_up" onChange={handleChange} />
      <EditableField label="Iterations" value={data.iterations || ''} field="iterations" onChange={handleChange} type="number" />
    </>
  );
}

function renderGroupDetails(node: YAMLNode, onNodeUpdate?: (nodeId: string, data: any) => void): JSX.Element {
  const data = node.data || {};
  const handleChange = (field: string, value: any) => {
    if (onNodeUpdate) onNodeUpdate(node.id, { ...data, [field]: value });
  };
  return (
    <>
      <EditableField label="Group Name" value={data.name || ''} field="name" onChange={handleChange} />
      <DetailField label="Steps Count" value={node.children?.length || 0} mono />
    </>
  );
}

function renderIfDetails(node: YAMLNode, onNodeUpdate?: (nodeId: string, data: any) => void): JSX.Element {
  const data = node.data || {};
  const handleChange = (field: string, value: any) => {
    if (onNodeUpdate) onNodeUpdate(node.id, { ...data, [field]: value });
  };
  return (
    <>
      <EditableField label="Condition" value={data.condition || ''} field="condition" onChange={handleChange} />
      <DetailField label="Steps Count" value={node.children?.length || 0} mono />
    </>
  );
}

function renderLoopDetails(node: YAMLNode, onNodeUpdate?: (nodeId: string, data: any) => void): JSX.Element {
  const data = node.data || {};
  const handleChange = (field: string, value: any) => {
    if (onNodeUpdate) onNodeUpdate(node.id, { ...data, [field]: value });
  };
  return (
    <>
      <EditableField label="Count" value={data.count || 1} field="count" onChange={handleChange} type="number" />
      <EditableField label="Break On" value={data.break_on || ''} field="break_on" onChange={handleChange} />
      <DetailField label="Steps Count" value={node.children?.length || 0} mono />
    </>
  );
}

function renderRetryDetails(node: YAMLNode, onNodeUpdate?: (nodeId: string, data: any) => void): JSX.Element {
  const data = node.data || {};
  const handleChange = (field: string, value: any) => {
    if (onNodeUpdate) onNodeUpdate(node.id, { ...data, [field]: value });
  };
  return (
    <>
      <EditableField label="Attempts" value={data.attempts || 3} field="attempts" onChange={handleChange} type="number" />
      <EditableField label="Backoff" value={data.backoff || ''} field="backoff" onChange={handleChange} />
      <EditableField label="Initial Delay" value={data.initial_delay || ''} field="initial_delay" onChange={handleChange} />
      <EditableField label="Max Delay" value={data.max_delay || ''} field="max_delay" onChange={handleChange} />
      <EditableField label="Multiplier" value={data.multiplier || ''} field="multiplier" onChange={handleChange} type="number" />
    </>
  );
}

function renderThinkTimeDetails(node: YAMLNode, onNodeUpdate?: (nodeId: string, data: any) => void): JSX.Element {
  const data = node.data || {};
  const handleChange = (field: string, value: any) => {
    if (onNodeUpdate) onNodeUpdate(node.id, { ...data, [field]: value });
  };
  return (
    <>
      <EditableField label="Duration" value={data.duration || ''} field="duration" onChange={handleChange} />
      <EditableField label="Min" value={data.min || ''} field="min" onChange={handleChange} />
      <EditableField label="Max" value={data.max || ''} field="max" onChange={handleChange} />
    </>
  );
}

function renderCookiesDetails(node: YAMLNode, onNodeUpdate?: (nodeId: string, data: any) => void): JSX.Element {
  const data = node.data || {};
  const handleChange = (field: string, value: any) => {
    if (onNodeUpdate) onNodeUpdate(node.id, { ...data, [field]: value });
  };
  return (
    <>
      <EditableField label="Mode" value={data.mode || ''} field="mode" onChange={handleChange} />
      <EditableField label="Jar Scope" value={data.jar_scope || ''} field="jar_scope" onChange={handleChange} />
      <div className="mb-4">
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Persist Across Iterations</label>
        <select
          value={data.persist_across_iterations ? 'true' : 'false'}
          onChange={(e) => handleChange('persist_across_iterations', e.target.value === 'true')}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
        >
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      </div>
    </>
  );
}

function renderCacheManagerDetails(node: YAMLNode, onNodeUpdate?: (nodeId: string, data: any) => void): JSX.Element {
  const data = node.data || {};
  const handleChange = (field: string, value: any) => {
    if (onNodeUpdate) onNodeUpdate(node.id, { ...data, [field]: value });
  };
  return (
    <>
      <div className="mb-4">
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Enabled</label>
        <select
          value={data.enabled ? 'true' : 'false'}
          onChange={(e) => handleChange('enabled', e.target.value === 'true')}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
        >
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      </div>
      <EditableField label="Scope" value={data.scope || ''} field="scope" onChange={handleChange} />
      <EditableField label="Max Size (MB)" value={data.max_size_mb || ''} field="max_size_mb" onChange={handleChange} type="number" />
      <EditableField label="Eviction Policy" value={data.eviction_policy || ''} field="eviction_policy" onChange={handleChange} />
    </>
  );
}

function renderErrorPolicyDetails(node: YAMLNode, onNodeUpdate?: (nodeId: string, data: any) => void): JSX.Element {
  const data = node.data || {};
  const handleChange = (field: string, value: any) => {
    if (onNodeUpdate) onNodeUpdate(node.id, { ...data, [field]: value });
  };
  return (
    <>
      <EditableField label="On 4xx" value={data.on_4xx || ''} field="on_4xx" onChange={handleChange} />
      <EditableField label="On 5xx" value={data.on_5xx || ''} field="on_5xx" onChange={handleChange} />
      <EditableField label="On Timeout" value={data.on_timeout || ''} field="on_timeout" onChange={handleChange} />
    </>
  );
}

function renderMetricsDetails(node: YAMLNode, onNodeUpdate?: (nodeId: string, data: any) => void): JSX.Element {
  const data = node.data || {};
  const handleChange = (field: string, value: any) => {
    if (onNodeUpdate) onNodeUpdate(node.id, { ...data, [field]: value });
  };
  return (
    <>
      <div className="mb-4">
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Enabled</label>
        <select
          value={data.enabled ? 'true' : 'false'}
          onChange={(e) => handleChange('enabled', e.target.value === 'true')}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
        >
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      </div>
      <EditableField label="Collect Interval" value={data.collect_interval || ''} field="collect_interval" onChange={handleChange} />
    </>
  );
}

// 🔥 SPARK SCRIPT DETAILS (Editable with Syntax Highlighting)
function renderSparkDetails(node: YAMLNode, onNodeUpdate?: (nodeId: string, data: any) => void): JSX.Element {
  const data = node.data || {};
  
  const handleScriptChange = (newScript: string) => {
    if (onNodeUpdate) {
      onNodeUpdate(node.id, { ...data, script: newScript });
    }
  };
  
  return (
    <>
      <div className="mb-4">
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
          {'</>'} Spark Script (JavaScript)
        </label>
        <SparkCodeEditor
          value={data.script || ''}
          onChange={handleScriptChange}
          placeholder="// Write your JavaScript code here..."
          minHeight="280px"
        />
      </div>
    </>
  );
}

// ASSERTION DETAILS (Pulse format - Editable)
function renderAssertionDetails(node: YAMLNode, onNodeUpdate?: (nodeId: string, data: any) => void): JSX.Element {
  const data = node.data || {};
  
  const handleChange = (field: string, value: any) => {
    if (onNodeUpdate) {
      onNodeUpdate(node.id, { ...data, [field]: value });
    }
  };
  
  return (
    <>
      <div className="mb-4">
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
          Assertion Type
        </label>
        <select
          value={data.type || 'status'}
          onChange={(e) => handleChange('type', e.target.value)}
          className="w-full px-3 py-2 bg-green-400/10 text-green-400 border border-green-400/20 rounded text-sm font-mono cursor-pointer"
        >
          <option value="status" className="bg-zinc-900">status</option>
          <option value="status_in" className="bg-zinc-900">status_in</option>
          <option value="contains" className="bg-zinc-900">contains</option>
          <option value="not_contains" className="bg-zinc-900">not_contains</option>
          <option value="regex" className="bg-zinc-900">regex</option>
          <option value="response_time" className="bg-zinc-900">response_time</option>
          <option value="response_size" className="bg-zinc-900">response_size</option>
          <option value="header" className="bg-zinc-900">header</option>
          <option value="json" className="bg-zinc-900">json</option>
        </select>
      </div>

      <div className="mb-4">
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
          Expected Value
        </label>
        <Input
          value={data.value !== undefined ? String(data.value) : ''}
          onChange={(e) => handleChange('value', e.target.value)}
          placeholder="200, true, 'expected text'..."
          className="bg-white/5 border-white/10 text-zinc-300 text-sm font-mono"
        />
      </div>

      <div className="mb-4">
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
          Pattern (for regex)
        </label>
        <Input
          value={data.pattern || ''}
          onChange={(e) => handleChange('pattern', e.target.value)}
          placeholder="regex pattern..."
          className="bg-white/5 border-white/10 text-zinc-300 text-sm font-mono"
        />
      </div>

      <div className="mb-4">
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
          Header Name (for header assertion)
        </label>
        <Input
          value={data.name || ''}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="Content-Type, Authorization..."
          className="bg-white/5 border-white/10 text-zinc-300 text-sm font-mono"
        />
      </div>

      <div className="mb-4">
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
          Max Response Time (ms)
        </label>
        <Input
          type="number"
          value={data.max_ms !== undefined ? data.max_ms : ''}
          onChange={(e) => handleChange('max_ms', parseInt(e.target.value) || 0)}
          placeholder="2000"
          className="bg-white/5 border-white/10 text-zinc-300 text-sm font-mono"
        />
      </div>
    </>
  );
}

// EXTRACTOR DETAILS (Pulse format - Editable)
function renderExtractorDetails(node: YAMLNode, onNodeUpdate?: (nodeId: string, data: any) => void): JSX.Element {
  const data = node.data || {};
  
  const handleChange = (field: string, value: any) => {
    if (onNodeUpdate) {
      onNodeUpdate(node.id, { ...data, [field]: value });
    }
  };
  
  return (
    <>
      <div className="mb-4">
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
          Extractor Type
        </label>
        <select
          value={data.type || 'regex'}
          onChange={(e) => handleChange('type', e.target.value)}
          className="w-full px-3 py-2 bg-blue-400/10 text-blue-400 border border-blue-400/20 rounded text-sm font-mono cursor-pointer"
        >
          <option value="regex" className="bg-zinc-900">regex</option>
          <option value="jsonpath" className="bg-zinc-900">jsonpath</option>
          <option value="xpath" className="bg-zinc-900">xpath</option>
          <option value="boundary" className="bg-zinc-900">boundary</option>
        </select>
      </div>

      <div className="mb-4">
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
          Variable Name
        </label>
        <Input
          value={data.var || data.variable || ''}
          onChange={(e) => handleChange('var', e.target.value)}
          placeholder="MY_VARIABLE"
          className="bg-purple-400/10 border-purple-400/20 text-purple-400 text-sm font-mono"
        />
      </div>

      <div className="mb-4">
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
          Pattern / Expression
        </label>
        <Textarea
          value={data.pattern || ''}
          onChange={(e) => handleChange('pattern', e.target.value)}
          placeholder="token=([a-f0-9]+) or $.data.id"
          className="bg-white/5 border-white/10 text-zinc-300 text-sm font-mono min-h-[80px]"
        />
      </div>

      <div className="mb-4">
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
          Match Number
        </label>
        <Input
          type="number"
          value={data.match_no !== undefined ? data.match_no : 1}
          onChange={(e) => handleChange('match_no', parseInt(e.target.value) || 1)}
          placeholder="1"
          className="bg-white/5 border-white/10 text-zinc-300 text-sm font-mono"
        />
      </div>

      <div className="mb-4">
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
          Default Value
        </label>
        <Input
          value={data.default || ''}
          onChange={(e) => handleChange('default', e.target.value)}
          placeholder="NOT_FOUND"
          className="bg-white/5 border-white/10 text-zinc-300 text-sm font-mono"
        />
      </div>
    </>
  );
}

function renderGenericDetails(node: YAMLNode): JSX.Element {
  if (!node.data || Object.keys(node.data).length === 0) {
    return (
      <div className="text-sm text-zinc-500 italic">
        No additional properties
      </div>
    );
  }

  return (
    <div>
      <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
        Properties
      </label>
      <pre className="p-3 bg-white/5 border border-white/10 rounded text-xs font-mono text-zinc-300 overflow-x-auto">
        {JSON.stringify(node.data, null, 2)}
      </pre>
    </div>
  );
}

interface DetailFieldProps {
  label: string;
  value: any;
  mono?: boolean;
  small?: boolean;
  editable?: boolean;
  onChange?: (value: any) => void;
  multiline?: boolean;
}

function DetailField({ label, value, mono, small, editable = true, onChange, multiline }: DetailFieldProps) {
  if (!editable) {
    return (
      <div className="mb-4">
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
          {label}
        </label>
        <div className={`px-3 py-2 bg-white/5 border border-white/10 rounded ${small ? 'text-xs' : 'text-sm'} text-zinc-300 ${mono ? 'font-mono' : ''}`}>
          {String(value)}
        </div>
      </div>
    );
  }

  if (multiline) {
    return (
      <div className="mb-4">
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
          {label}
        </label>
        <Textarea
          value={String(value)}
          onChange={(e) => onChange?.(e.target.value)}
          className={`bg-white/5 border-white/10 text-zinc-300 ${small ? 'text-xs' : 'text-sm'} ${mono ? 'font-mono' : ''} min-h-[80px]`}
        />
      </div>
    );
  }

  return (
    <div className="mb-4">
      <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
        {label}
      </label>
      <Input
        value={String(value)}
        onChange={(e) => onChange?.(e.target.value)}
        className={`bg-white/5 border-white/10 text-zinc-300 ${small ? 'text-xs' : 'text-sm'} ${mono ? 'font-mono' : ''}`}
      />
    </div>
  );
}