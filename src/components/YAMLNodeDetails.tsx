import { useState, useEffect, useRef } from 'react';
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

// Componente especial para campo File con botón Browse
function FileField({ label, value, field, onChange }: EditableFieldProps) {
  const { t } = useLanguage();
  const [localValue, setLocalValue] = useState(String(value || ''));
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    setLocalValue(String(value || ''));
  }, [value]);
  
  const handleBlur = () => {
    onChange(field, localValue);
  };
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLocalValue(file.name);
      onChange(field, file.name);
    }
  };
  
  return (
    <div className="mb-4">
      <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
        {label}
      </label>
      <div className="flex gap-2">
        <Input
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          placeholder="path/to/file.csv"
          className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
        />
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            fileInputRef.current?.click();
          }}
          className="px-3 py-2 bg-yellow-400/10 border border-yellow-400/30 rounded text-yellow-400 hover:bg-yellow-400/20 text-sm font-medium transition-colors flex items-center gap-2 flex-shrink-0"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          {t('yamlEditor.common.browse')}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.txt,.json"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </div>
  );
}

interface YAMLNodeDetailsProps {
  node: YAMLNode | null;
  onNodeUpdate?: (nodeId: string, updatedData: any) => void;
}

export function YAMLNodeDetails({ node, onNodeUpdate }: YAMLNodeDetailsProps) {
  const { t } = useLanguage();
  const [nodeName, setNodeName] = useState(node?.name || '');
  
  // Sincronizar cuando cambia el nodo seleccionado
  useEffect(() => {
    setNodeName(node?.name || '');
  }, [node?.id, node?.name]);

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
      case 'file':
        return renderFileDetails(node, onNodeUpdate);
      case 'header':
        return renderHeaderDetails(node, onNodeUpdate);
      case 'headers':
        return renderHeadersDetails(node, onNodeUpdate);
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
            {t('yamlEditor.common.name')}
          </label>
          <Input
            value={nodeName}
            onChange={(e) => setNodeName(e.target.value)}
            onBlur={() => {
              if (onNodeUpdate && nodeName !== node.name) {
                // Actualizar TANTO el nombre como los datos del nodo
                const updatedData = { ...node.data, __name: nodeName };
                onNodeUpdate(node.id, updatedData);
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
  const bind = data.bind || {};
  
  const handleChange = (field: string, value: any) => {
    if (onNodeUpdate) onNodeUpdate(node.id, { ...data, [field]: value });
  };
  
  const handleBindUpdate = (updatedBind: Record<string, string>) => {
    if (onNodeUpdate) {
      onNodeUpdate(node.id, { ...data, bind: updatedBind });
    }
  };
  
  return (
    <>
      <EditableField label="Type" value={data.type || ''} field="type" onChange={handleChange} />
      <FileField label="File" value={data.file || ''} field="file" onChange={handleChange} />
      <EditableField label="Mode" value={data.mode || ''} field="mode" onChange={handleChange} />
      <EditableField label="Strategy" value={data.strategy || ''} field="strategy" onChange={handleChange} />
      <EditableField label="On Exhausted" value={data.on_exhausted || ''} field="on_exhausted" onChange={handleChange} />
      
      {/* Bind mappings */}
      {Object.keys(bind).length > 0 && (
        <>
          <div className="h-px bg-white/10 my-4" />
          <div className="mb-4">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-3">
              Column Bindings
            </label>
            <EditableList
              title="Bind"
              items={bind}
              onUpdate={handleBindUpdate}
              keyPlaceholder="csv_column"
              valuePlaceholder="variable_name"
              enableCheckboxes={false}
              enableBulkActions={false}
            />
          </div>
        </>
      )}
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
      {/* Condition */}
      <div className="mb-4">
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
          Condition Expression
        </label>
        <Textarea
          value={data.condition || ''}
          onChange={(e) => handleChange('condition', e.target.value)}
          placeholder="${'{'}status${'}'} === 200\n${'{'}user_id${'}'} != null\n${'{'}count${'}'} > 10"
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono min-h-[100px]"
        />
        <div className="mt-1 text-xs text-zinc-500">
          Steps will only execute if this condition evaluates to true
        </div>
      </div>

      {/* Steps Count */}
      <div className="p-3 bg-pink-400/10 border border-pink-400/20 rounded">
        <div className="text-xs font-semibold text-pink-400 uppercase tracking-wider mb-1">
          Conditional Steps
        </div>
        <div className="text-2xl font-bold text-pink-300 font-mono">
          {node.children?.length || 0}
        </div>
      </div>
    </>
  );
}

function renderLoopDetails(node: YAMLNode, onNodeUpdate?: (nodeId: string, data: any) => void): JSX.Element {
  const data = node.data || {};
  const handleChange = (field: string, value: any) => {
    if (onNodeUpdate) onNodeUpdate(node.id, { ...data, [field]: value });
  };
  
  const loopCount = data.count || 1;
  const stepsCount = node.children?.length || 0;
  const totalIterations = loopCount * stepsCount;
  
  return (
    <>
      {/* Loop Count */}
      <div className="mb-4">
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
          Loop Count
        </label>
        <Input
          type="number"
          value={data.count !== undefined ? data.count : 1}
          onChange={(e) => handleChange('count', parseInt(e.target.value) || 1)}
          placeholder="1"
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
        />
        <div className="mt-1 text-xs text-zinc-500">
          Number of times to repeat the steps, or use variable ${'{'}loops${'}'}
        </div>
      </div>

      {/* Break Condition */}
      <div className="mb-4">
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
          Break Condition (optional)
        </label>
        <Input
          value={data.break_on || ''}
          onChange={(e) => handleChange('break_on', e.target.value)}
          placeholder="${'{'}error${'}'} || ${'{'}stop${'}'}"
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
        />
        <div className="mt-1 text-xs text-zinc-500">
          Exit loop early if condition is true
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-purple-400/10 border border-purple-400/20 rounded">
          <div className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-1">
            Steps Inside
          </div>
          <div className="text-2xl font-bold text-purple-300 font-mono">
            {stepsCount}
          </div>
        </div>
        <div className="p-3 bg-purple-400/10 border border-purple-400/20 rounded">
          <div className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-1">
            Total Iterations
          </div>
          <div className="text-2xl font-bold text-purple-300 font-mono">
            {totalIterations}
          </div>
        </div>
      </div>
    </>
  );
}

function renderRetryDetails(node: YAMLNode, onNodeUpdate?: (nodeId: string, data: any) => void): JSX.Element {
  const data = node.data || {};
  const backoffType = data.backoff || 'constant';
  
  const handleChange = (field: string, value: any) => {
    if (onNodeUpdate) onNodeUpdate(node.id, { ...data, [field]: value });
  };
  
  return (
    <>
      {/* Attempts - Common to all */}
      <div className="mb-4">
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
          Max Attempts
        </label>
        <Input
          type="number"
          value={data.attempts !== undefined ? data.attempts : 3}
          onChange={(e) => handleChange('attempts', parseInt(e.target.value) || 3)}
          placeholder="3"
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
        />
      </div>

      {/* Backoff Type Selector */}
      <div className="mb-4">
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
          Backoff Strategy
        </label>
        <select
          value={backoffType}
          onChange={(e) => handleChange('backoff', e.target.value)}
          className="w-full px-3 py-2 bg-red-400/10 text-red-400 border border-red-400/20 rounded text-sm font-mono cursor-pointer"
        >
          <option value="constant" className="bg-zinc-900">constant (same delay)</option>
          <option value="linear" className="bg-zinc-900">linear (incremental)</option>
          <option value="exponential" className="bg-zinc-900">exponential (2x each time)</option>
        </select>
      </div>

      {/* Conditional Fields Based on Backoff Type */}
      {backoffType === 'constant' && (
        <div className="mb-4">
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
            Delay
          </label>
          <Input
            value={data.initial_delay || data.delay || ''}
            onChange={(e) => handleChange('initial_delay', e.target.value)}
            placeholder="1s"
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
          />
          <div className="mt-1 text-xs text-zinc-500">
            Same delay between all retry attempts
          </div>
        </div>
      )}

      {backoffType === 'linear' && (
        <>
          <div className="mb-4">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              Initial Delay
            </label>
            <Input
              value={data.initial_delay || ''}
              onChange={(e) => handleChange('initial_delay', e.target.value)}
              placeholder="1s"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
            />
          </div>
          <div className="mb-4">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              Increment
            </label>
            <Input
              value={data.increment || ''}
              onChange={(e) => handleChange('increment', e.target.value)}
              placeholder="1s"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
            />
            <div className="mt-1 text-xs text-zinc-500">
              Delay increases by this amount each retry (1s, 2s, 3s...)
            </div>
          </div>
        </>
      )}

      {backoffType === 'exponential' && (
        <>
          <div className="mb-4">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              Initial Delay
            </label>
            <Input
              value={data.initial_delay || ''}
              onChange={(e) => handleChange('initial_delay', e.target.value)}
              placeholder="1s"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
            />
          </div>
          <div className="mb-4">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              Multiplier
            </label>
            <Input
              type="number"
              value={data.multiplier !== undefined ? data.multiplier : 2}
              onChange={(e) => handleChange('multiplier', parseFloat(e.target.value) || 2)}
              placeholder="2"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
            />
            <div className="mt-1 text-xs text-zinc-500">
              Delay multiplied each retry (1s, 2s, 4s, 8s...)
            </div>
          </div>
          <div className="mb-4">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              Max Delay (optional)
            </label>
            <Input
              value={data.max_delay || ''}
              onChange={(e) => handleChange('max_delay', e.target.value)}
              placeholder="30s"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
            />
            <div className="mt-1 text-xs text-zinc-500">
              Cap maximum delay to prevent very long waits
            </div>
          </div>
        </>
      )}

      {/* Steps Count */}
      <div className="mt-4 p-3 bg-white/5 border border-white/10 rounded">
        <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
          Steps to Retry
        </div>
        <div className="text-2xl font-bold text-zinc-300 font-mono">
          {node.children?.length || 0}
        </div>
      </div>
    </>
  );
}

function renderThinkTimeDetails(node: YAMLNode, onNodeUpdate?: (nodeId: string, data: any) => void): JSX.Element {
  const data = node.data || {};
  
  // Determine mode: if min/max exist, it's variable; otherwise fixed
  const isVariable = data.min !== undefined || data.max !== undefined;
  const mode = isVariable ? 'variable' : 'fixed';
  
  const handleChange = (field: string, value: any) => {
    if (onNodeUpdate) onNodeUpdate(node.id, { ...data, [field]: value });
  };
  
  const handleModeChange = (newMode: string) => {
    if (newMode === 'fixed') {
      // Switch to fixed: remove min/max, keep/add duration
      const newData = { ...data };
      delete newData.min;
      delete newData.max;
      if (!newData.duration) {
        newData.duration = '1s';
      }
      if (onNodeUpdate) onNodeUpdate(node.id, newData);
    } else {
      // Switch to variable: remove duration, add min/max
      const newData = { ...data };
      delete newData.duration;
      if (!newData.min) newData.min = '1s';
      if (!newData.max) newData.max = '3s';
      if (onNodeUpdate) onNodeUpdate(node.id, newData);
    }
  };
  
  return (
    <>
      {/* Mode Selector */}
      <div className="mb-4">
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-3">
          Think Time Mode
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => handleModeChange('fixed')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded transition-colors ${
              mode === 'fixed'
                ? 'bg-orange-400/20 text-orange-400 border border-orange-400/30'
                : 'bg-white/5 text-zinc-400 border border-white/10 hover:text-zinc-300 hover:bg-white/10'
            }`}
          >
            Fixed
          </button>
          <button
            onClick={() => handleModeChange('variable')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded transition-colors ${
              mode === 'variable'
                ? 'bg-orange-400/20 text-orange-400 border border-orange-400/30'
                : 'bg-white/5 text-zinc-400 border border-white/10 hover:text-zinc-300 hover:bg-white/10'
            }`}
          >
            Variable (Random)
          </button>
        </div>
      </div>

      {/* Conditional Fields */}
      {mode === 'fixed' ? (
        <div className="mb-4">
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
            Duration
          </label>
          <Input
            value={data.duration || ''}
            onChange={(e) => handleChange('duration', e.target.value)}
            placeholder="2s"
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
          />
          <div className="mt-1 text-xs text-zinc-500">
            Examples: 1s, 500ms, 2m (seconds, milliseconds, minutes)
          </div>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              Minimum Duration
            </label>
            <Input
              value={data.min || ''}
              onChange={(e) => handleChange('min', e.target.value)}
              placeholder="1s"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
            />
          </div>
          <div className="mb-4">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              Maximum Duration
            </label>
            <Input
              value={data.max || ''}
              onChange={(e) => handleChange('max', e.target.value)}
              placeholder="3s"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
            />
          </div>
          <div className="p-3 bg-blue-400/5 border border-blue-400/20 rounded text-xs text-zinc-400">
            ℹ️ Random delay will be chosen between min and max on each execution
          </div>
        </>
      )}
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

// ASSERTION DETAILS (Pulse format - Editable with Conditional Fields)
function renderAssertionDetails(node: YAMLNode, onNodeUpdate?: (nodeId: string, data: any) => void): JSX.Element {
  const data = node.data || {};
  const assertionType = data.type || 'status';
  
  const handleChange = (field: string, value: any) => {
    if (onNodeUpdate) {
      onNodeUpdate(node.id, { ...data, [field]: value });
    }
  };
  
  return (
    <>
      {/* Assertion Type Selector */}
      <div className="mb-4">
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
          Assertion Type
        </label>
        <select
          value={assertionType}
          onChange={(e) => handleChange('type', e.target.value)}
          className="w-full px-3 py-2 bg-green-400/10 text-green-400 border border-green-400/20 rounded text-sm font-mono cursor-pointer"
        >
          <option value="status" className="bg-zinc-900">status</option>
          <option value="status_in" className="bg-zinc-900">status_in (multiple codes)</option>
          <option value="contains" className="bg-zinc-900">contains</option>
          <option value="not_contains" className="bg-zinc-900">not_contains</option>
          <option value="regex" className="bg-zinc-900">regex</option>
          <option value="response_time" className="bg-zinc-900">response_time</option>
          <option value="response_size" className="bg-zinc-900">response_size</option>
          <option value="header" className="bg-zinc-900">header</option>
          <option value="json" className="bg-zinc-900">json (jsonpath)</option>
        </select>
      </div>

      {/* Conditional Fields Based on Type */}
      {(assertionType === 'status' || assertionType === 'status_in') && (
        <div className="mb-4">
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
            {assertionType === 'status' ? 'Expected Status Code' : 'Expected Status Codes (comma separated)'}
          </label>
          <Input
            value={data.value !== undefined ? String(data.value) : ''}
            onChange={(e) => handleChange('value', e.target.value)}
            placeholder={assertionType === 'status' ? '200' : '200, 201, 204'}
            className="bg-white/5 border-white/10 text-zinc-300 text-sm font-mono"
          />
        </div>
      )}

      {(assertionType === 'contains' || assertionType === 'not_contains') && (
        <>
          <div className="mb-4">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              Text to {assertionType === 'contains' ? 'Find' : 'Not Find'}
            </label>
            <Input
              value={data.value !== undefined ? String(data.value) : ''}
              onChange={(e) => handleChange('value', e.target.value)}
              placeholder="Expected text in response..."
              className="bg-white/5 border-white/10 text-zinc-300 text-sm font-mono"
            />
          </div>
          <div className="mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={data.ignore_case || false}
                onChange={(e) => handleChange('ignore_case', e.target.checked)}
                className="w-4 h-4 rounded border-white/10 bg-white/5 text-green-500"
              />
              <span className="text-sm text-zinc-300">Ignore case</span>
            </label>
          </div>
        </>
      )}

      {assertionType === 'regex' && (
        <>
          <div className="mb-4">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              Regular Expression Pattern
            </label>
            <Textarea
              value={data.pattern || ''}
              onChange={(e) => handleChange('pattern', e.target.value)}
              placeholder="token=([a-f0-9]+)"
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
        </>
      )}

      {assertionType === 'response_time' && (
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
      )}

      {assertionType === 'response_size' && (
        <div className="mb-4">
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
            Expected Size (bytes)
          </label>
          <Input
            type="number"
            value={data.size !== undefined ? data.size : ''}
            onChange={(e) => handleChange('size', parseInt(e.target.value) || 0)}
            placeholder="1024"
            className="bg-white/5 border-white/10 text-zinc-300 text-sm font-mono"
          />
        </div>
      )}

      {assertionType === 'header' && (
        <>
          <div className="mb-4">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              Header Name
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
              Expected Header Value
            </label>
            <Input
              value={data.value !== undefined ? String(data.value) : ''}
              onChange={(e) => handleChange('value', e.target.value)}
              placeholder="application/json"
              className="bg-white/5 border-white/10 text-zinc-300 text-sm font-mono"
            />
          </div>
        </>
      )}

      {assertionType === 'json' && (
        <>
          <div className="mb-4">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              JSONPath Expression
            </label>
            <Input
              value={data.path || ''}
              onChange={(e) => handleChange('path', e.target.value)}
              placeholder="$.data.id"
              className="bg-white/5 border-white/10 text-zinc-300 text-sm font-mono"
            />
          </div>
          <div className="mb-4">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              Expected Value
            </label>
            <Input
              value={data.value !== undefined ? String(data.value) : ''}
              onChange={(e) => handleChange('value', e.target.value)}
              placeholder="123"
              className="bg-white/5 border-white/10 text-zinc-300 text-sm font-mono"
            />
          </div>
        </>
      )}
    </>
  );
}

// EXTRACTOR DETAILS (Pulse format - Editable with Conditional Fields)
function renderExtractorDetails(node: YAMLNode, onNodeUpdate?: (nodeId: string, data: any) => void): JSX.Element {
  const data = node.data || {};
  const extractorType = data.type || 'regex';
  
  const handleChange = (field: string, value: any) => {
    if (onNodeUpdate) {
      onNodeUpdate(node.id, { ...data, [field]: value });
    }
  };
  
  return (
    <>
      {/* Extractor Type Selector */}
      <div className="mb-4">
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
          Extractor Type
        </label>
        <select
          value={extractorType}
          onChange={(e) => handleChange('type', e.target.value)}
          className="w-full px-3 py-2 bg-blue-400/10 text-blue-400 border border-blue-400/20 rounded text-sm font-mono cursor-pointer"
        >
          <option value="regex" className="bg-zinc-900">regex</option>
          <option value="jsonpath" className="bg-zinc-900">jsonpath</option>
          <option value="xpath" className="bg-zinc-900">xpath</option>
          <option value="boundary" className="bg-zinc-900">boundary</option>
        </select>
      </div>

      {/* Variable Name - Common to all types */}
      <div className="mb-4">
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
          Variable Name *
        </label>
        <Input
          value={data.var || data.variable || ''}
          onChange={(e) => handleChange('var', e.target.value)}
          placeholder="MY_VARIABLE"
          className="bg-purple-400/10 border-purple-400/20 text-purple-400 text-sm font-mono"
        />
        <div className="mt-1 text-xs text-zinc-500">
          Variable will be stored as ${'${'}{data.var || data.variable || 'VAR'}${'}'}
        </div>
      </div>

      {/* Conditional Fields Based on Type */}
      {extractorType === 'regex' && (
        <>
          <div className="mb-4">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              Regular Expression Pattern *
            </label>
            <Textarea
              value={data.pattern || ''}
              onChange={(e) => handleChange('pattern', e.target.value)}
              placeholder="token=([a-f0-9]+)\nid&quot;:(\d+)\n&lt;title&gt;(.+?)&lt;/title&gt;"
              className="bg-white/5 border-white/10 text-zinc-300 text-sm font-mono min-h-[100px]"
            />
            <div className="mt-1 text-xs text-zinc-500">
              Use capture groups () to extract values
            </div>
          </div>
          <div className="mb-4">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              Template (optional)
            </label>
            <Input
              value={data.template || ''}
              onChange={(e) => handleChange('template', e.target.value)}
              placeholder="$1$" 
              className="bg-white/5 border-white/10 text-zinc-300 text-sm font-mono"
            />
            <div className="mt-1 text-xs text-zinc-500">
              Use $1$, $2$, etc. to reference capture groups
            </div>
          </div>
          <div className="mb-4">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              Match Number
            </label>
            <select
              value={data.match_no !== undefined ? String(data.match_no) : '1'}
              onChange={(e) => handleChange('match_no', parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
            >
              <option value="-1">Random</option>
              <option value="0">All matches</option>
              <option value="1">1st match</option>
              <option value="2">2nd match</option>
              <option value="3">3rd match</option>
              <option value="4">4th match</option>
              <option value="5">5th match</option>
            </select>
          </div>
        </>
      )}

      {extractorType === 'jsonpath' && (
        <>
          <div className="mb-4">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              JSONPath Expression *
            </label>
            <Input
              value={data.expression || data.pattern || ''}
              onChange={(e) => handleChange('expression', e.target.value)}
              placeholder="$.data.id"
              className="bg-white/5 border-white/10 text-zinc-300 text-sm font-mono"
            />
            <div className="mt-1 text-xs text-zinc-500">
              Examples: $.users[0].name, $.data[*].id, $..price
            </div>
          </div>
        </>
      )}

      {extractorType === 'xpath' && (
        <>
          <div className="mb-4">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              XPath Expression *
            </label>
            <Textarea
              value={data.expression || data.pattern || ''}
              onChange={(e) => handleChange('expression', e.target.value)}
              placeholder="//div[@class='title']/text()"
              className="bg-white/5 border-white/10 text-zinc-300 text-sm font-mono min-h-[80px]"
            />
            <div className="mt-1 text-xs text-zinc-500">
              Extract data from XML/HTML using XPath
            </div>
          </div>
          <div className="mb-4">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              Namespace (optional)
            </label>
            <Input
              value={data.namespace || ''}
              onChange={(e) => handleChange('namespace', e.target.value)}
              placeholder="xmlns:ns=http://example.com"
              className="bg-white/5 border-white/10 text-zinc-300 text-sm font-mono"
            />
          </div>
        </>
      )}

      {extractorType === 'boundary' && (
        <>
          <div className="mb-4">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              Left Boundary *
            </label>
            <Input
              value={data.left_boundary || ''}
              onChange={(e) => handleChange('left_boundary', e.target.value)}
              placeholder="&lt;title&gt;"
              className="bg-white/5 border-white/10 text-zinc-300 text-sm font-mono"
            />
          </div>
          <div className="mb-4">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              Right Boundary *
            </label>
            <Input
              value={data.right_boundary || ''}
              onChange={(e) => handleChange('right_boundary', e.target.value)}
              placeholder="&lt;/title&gt;"
              className="bg-white/5 border-white/10 text-zinc-300 text-sm font-mono"
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
        </>
      )}

      {/* Default Value - Common to all types */}
      <div className="mb-4">
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
          Default Value (if not found)
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

// HEADER DETAILS
function renderHeaderDetails(node: YAMLNode, onNodeUpdate?: (nodeId: string, data: any) => void): JSX.Element {
  const data = node.data || {};
  
  const handleChange = (field: string, value: any) => {
    if (onNodeUpdate) {
      onNodeUpdate(node.id, { ...data, [field]: value });
    }
  };
  
  // Sugerencias de headers comunes
  const commonHeaders = [
    'Authorization',
    'Content-Type',
    'Accept',
    'User-Agent',
    'Accept-Language',
    'Accept-Encoding',
    'Cache-Control',
    'X-Api-Key',
    'X-Requested-With',
  ];
  
  return (
    <>
      <div className="mb-4">
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
          Header Name
        </label>
        <Input
          value={data.name || ''}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="Content-Type"
          list="header-names-list"
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
        />
        <datalist id="header-names-list">
          {commonHeaders.map(header => (
            <option key={header} value={header} />
          ))}
        </datalist>
      </div>
      
      <div className="mb-4">
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
          Header Value
        </label>
        <Textarea
          value={data.value || ''}
          onChange={(e) => handleChange('value', e.target.value)}
          placeholder="application/json"
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono min-h-[80px]"
        />
        <div className="mt-1 text-xs text-zinc-500">
          Use variables: ${'{'}token${'}'}
        </div>
      </div>
      
      {/* Info box */}
      <div className="p-3 bg-slate-400/5 border border-slate-400/20 rounded text-xs text-zinc-400">
        🏷️ This header will be sent with the HTTP request
      </div>
    </>
  );
}

// HEADERS CONTAINER DETAILS
function renderHeadersDetails(node: YAMLNode, onNodeUpdate?: (nodeId: string, data: any) => void): JSX.Element {
  const data = node.data || {};
  
  const handleUpdate = (items: Record<string, string>) => {
    if (!onNodeUpdate) return;
    onNodeUpdate(node.id, items);
  };
  
  return (
    <>
      <EditableList
        title="HTTP Headers"
        items={data}
        onUpdate={handleUpdate}
        keyPlaceholder="Header-Name"
        valuePlaceholder="Header value"
        keyLabel="Header Name"
        valueLabel="Value"
        enableCheckboxes={false}
        enableBulkActions={false}
      />
      
      {/* Info box */}
      <div className="mt-4 p-3 bg-lime-400/5 border border-lime-400/20 rounded text-xs text-zinc-400">
        🏷️ These headers will be sent with the HTTP request
      </div>
    </>
  );
}

// FILE UPLOAD DETAILS
function renderFileDetails(node: YAMLNode, onNodeUpdate?: (nodeId: string, data: any) => void): JSX.Element {
  const data = node.data || {};
  
  const handleChange = (field: string, value: any) => {
    if (onNodeUpdate) {
      onNodeUpdate(node.id, { ...data, [field]: value });
    }
  };
  
  // MIME types comunes
  const commonMimeTypes = [
    'application/pdf',
    'application/json',
    'application/xml',
    'application/zip',
    'text/plain',
    'text/csv',
    'text/html',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/svg+xml',
    'video/mp4',
    'audio/mpeg',
  ];
  
  return (
    <>
      <EditableField 
        label="Field Name" 
        value={data.field || ''} 
        field="field" 
        onChange={handleChange} 
      />
      
      <FileField 
        label="File Path" 
        value={data.path || ''} 
        field="path" 
        onChange={handleChange} 
      />
      
      <div className="mb-4">
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
          MIME Type
        </label>
        <Input
          value={data.mime_type || ''}
          onChange={(e) => handleChange('mime_type', e.target.value)}
          placeholder="application/octet-stream"
          list="mime-types-list"
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
        />
        <datalist id="mime-types-list">
          {commonMimeTypes.map(mime => (
            <option key={mime} value={mime} />
          ))}
        </datalist>
        <div className="mt-1 text-xs text-zinc-500">
          Common: application/pdf, image/jpeg, text/csv
        </div>
      </div>
      
      {/* Info box */}
      <div className="p-3 bg-amber-400/5 border border-amber-400/20 rounded text-xs text-zinc-400">
        📎 This file will be uploaded as multipart/form-data
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