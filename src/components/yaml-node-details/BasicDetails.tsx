import type { AuthConfig } from '../../types/yaml';
import { EditableList } from '../EditableList';
import { SparkCodeEditor } from '../SparkCodeEditor';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { AuthConfigEditor, DetailField, EditableField, FileField, SelectField } from './SharedFields';
import type { NamedNodeDetailProps, NodeDetailProps } from './types';

export function TestDetails({ node, onNodeUpdate }: NamedNodeDetailProps) {
  const data = node.data || {};

  const handleChange = (field: string, value: string) => {
    onNodeUpdate?.(node.id, { ...data, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <div className="flex-1 min-w-0">
          <label
            htmlFor="test-detail-name"
            className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2"
          >
            Name
          </label>
          <Input
            id="test-detail-name"
            value={data.name || node.name || ''}
            maxLength={50}
            onChange={event => handleChange('name', event.target.value.slice(0, 50))}
            placeholder="Test Plan Name"
            className="w-[70px] shrink-0 px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-semibold"
          />
        </div>
        <div className="w-24 shrink-0">
          <label
            htmlFor="test-detail-version"
            className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2"
          >
            Version
          </label>
          <Input
            id="test-detail-version"
            value={data.version || ''}
            maxLength={5}
            onChange={event => handleChange('version', event.target.value.slice(0, 5))}
            placeholder="1.0"
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono text-center"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="test-detail-description"
          className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2"
        >
          Description
        </label>
        <Textarea
          id="test-detail-description"
          value={data.description || ''}
          maxLength={250}
          onChange={event => handleChange('description', event.target.value.slice(0, 250))}
          placeholder="Test description..."
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 min-h-[100px] resize-none"
        />
      </div>
    </div>
  );
}

export function VariablesDetails({ node, onNodeUpdate }: NodeDetailProps) {
  const data = node.data || {};
  const items = Array.isArray(data.variables)
    ? data.variables.reduce((acc: any, curr: any) => ({ ...acc, [curr.name]: curr.value }), {})
    : data;

  const handleUpdate = (updatedItems: Record<string, string>) => {
    if (!onNodeUpdate) {
      return;
    }
    if (Array.isArray(data.variables)) {
      onNodeUpdate(node.id, {
        ...data,
        variables: Object.entries(updatedItems).map(([name, value]) => ({
          name,
          value,
        })),
      });
      return;
    }
    onNodeUpdate(node.id, updatedItems);
  };

  return (
    <EditableList
      title="Variables"
      items={items}
      onUpdate={handleUpdate}
      keyPlaceholder="variable_name"
      valuePlaceholder="value"
      keyLabel="Variable Name"
      valueLabel="Value"
      enableCheckboxes={false}
      enableBulkActions={false}
      variant="minimal"
    />
  );
}

export function DataSourceDetails({ node, onNodeUpdate, nodeName, setNodeName }: NamedNodeDetailProps) {
  const data = node.data || {};
  const bind = data.bind || {};
  const showDiagnosis = false;

  const handleChange = (field: string, value: any) => {
    if (!onNodeUpdate) {
      return;
    }
    const updatedData = { ...data, [field]: value };
    if (field === 'file') {
      updatedData.path = value;
      delete updatedData.file;
    }
    onNodeUpdate(node.id, updatedData);
  };

  const handleBindUpdate = (updatedBind: Record<string, string>) => {
    onNodeUpdate?.(node.id, { ...data, bind: updatedBind });
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="w-full">
          <label
            htmlFor="ds-basic-name"
            className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2"
          >
            Name
          </label>
          <Input
            id="ds-basic-name"
            value={nodeName || ''}
            onChange={event => setNodeName?.(event.target.value)}
            maxLength={50}
            onBlur={() => {
              if (onNodeUpdate && nodeName !== node.name) {
                onNodeUpdate(node.id, { ...node.data, __name: nodeName });
              }
            }}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-semibold h-[38px]"
            placeholder="Name"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[120px_1fr] md:items-start">
        <div>
          <SelectField
            label="Type"
            value={data.type || 'csv'}
            field="type"
            options={[
              { label: 'CSV', value: 'csv' },
              { label: 'TXT', value: 'txt' },
            ]}
            onChange={handleChange}
            noMargin
          />
        </div>

        <div>
          <FileField
            label="File"
            value={data.file || data.path || ''}
            field="file"
            onChange={handleChange}
            noMargin
            showPathHint
          />
        </div>
      </div>

      <div className="w-full">
        <label
          htmlFor="ds-basic-var-names"
          className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2"
        >
          Variable Names (comma-separated)
        </label>
        <Input
          id="ds-basic-var-names"
          value={data.variable_names || ''}
          onChange={event => handleChange('variable_names', event.target.value)}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono focus:border-white/30 transition-all h-[38px]"
          placeholder="var1, var2, var3"
        />
        <p className="text-[10px] text-zinc-500 mt-1 italic">Define variable names separated by commas manually.</p>
      </div>

      <div className="flex gap-4">
        <div className="w-[120px] flex-shrink-0">
          <SelectField
            label="Mode"
            value={data.mode || 'per_vu'}
            field="mode"
            options={[
              { label: 'Per VU', value: 'per_vu' },
              { label: 'Shared', value: 'shared' },
              { label: 'Per Worker', value: 'per_worker' },
            ]}
            onChange={handleChange}
            noMargin
          />
          <p className="text-[10px] text-zinc-400 mt-1 italic">
            {data.mode === 'shared' && 'Un cursor global; filas consumidas una sola vez.'}
            {data.mode === 'per_worker' && 'Mapeo fijo 1:1: VU i → fila (i-1) % total. Misma fila, sin avance.'}
            {(!data.mode || data.mode === 'per_vu') && 'Cada VU cicla sobre la lista desde el inicio.'}
          </p>
        </div>

        <div className="w-[120px] flex-shrink-0">
          {data.mode !== 'per_worker' && (
            <SelectField
              label="On Exhausted"
              value={data.on_exhausted || 'recycle'}
              field="on_exhausted"
              options={[
                { label: 'Recycle', value: 'recycle' },
                { label: 'Stop', value: 'stop' },
              ]}
              onChange={handleChange}
              noMargin
            />
          )}
        </div>
      </div>

      {data.type !== 'txt' && Object.keys(bind).length > 0 && (
        <>
          <div className="h-px bg-white/10 my-4" />
          <div className="mb-4">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-3">Column Bindings</p>
            <EditableList
              title="Bind"
              items={bind}
              onUpdate={handleBindUpdate}
              keyPlaceholder="csv_column"
              valuePlaceholder="variable_name"
              enableCheckboxes={false}
              enableBulkActions={false}
              variant="minimal"
            />
          </div>
        </>
      )}

      {showDiagnosis && (
        <div className="mt-8 pt-4 border-t border-white/5">
          <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest block mb-1">
            Debug: Node Data (Type: {node.type})
          </p>
          <pre className="p-3 bg-black/40 rounded border border-white/5 text-[10px] font-mono text-zinc-500 overflow-auto max-h-[150px]">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export function HttpDefaultsDetails({ node, onNodeUpdate }: NodeDetailProps) {
  const data = node.data || {};
  const headers = data.headers || {};
  const mainFields = { ...data };
  delete mainFields.headers;
  delete mainFields.auth;

  const handleMainFieldsUpdate = (fields: Record<string, string>) => {
    onNodeUpdate?.(node.id, {
      ...fields,
      headers: data.headers || {},
      ...(data.auth ? { auth: data.auth } : {}),
    });
  };

  const handleHeadersUpdate = (updatedHeaders: Record<string, string>) => {
    onNodeUpdate?.(node.id, { ...data, headers: updatedHeaders });
  };

  const handleAuthUpdate = (auth?: AuthConfig) => {
    if (!onNodeUpdate) {
      return;
    }
    if (!auth) {
      const { auth: _, ...rest } = data;
      onNodeUpdate(node.id, rest);
      return;
    }
    onNodeUpdate(node.id, { ...data, auth });
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-3">Configuration</p>
        <EditableList
          title="Fields"
          items={mainFields}
          onUpdate={handleMainFieldsUpdate}
          keyPlaceholder="field_name"
          valuePlaceholder="value"
          enableCheckboxes={false}
          enableBulkActions={false}
          variant="minimal"
          addButtonVariant="pill"
        />
      </div>

      <div className="h-px bg-white/10" />

      <div>
        <EditableList
          title="HTTP Headers"
          items={headers}
          onUpdate={handleHeadersUpdate}
          keyPlaceholder="Header-Name"
          valuePlaceholder="value"
          enableCheckboxes={false}
          enableBulkActions={false}
          variant="minimal"
          addButtonVariant="pill"
        />
      </div>

      <div className="h-px bg-white/10" />

      <AuthConfigEditor
        auth={data.auth}
        onChange={handleAuthUpdate}
        scopeLabel="Global"
      />
    </div>
  );
}

export function ScenariosContainerDetails({ node, onNodeUpdate }: NodeDetailProps) {
  const data = node.data || {};
  const scenarios = node.children || [];

  const handleChange = (field: string, value: any) => {
    onNodeUpdate?.(node.id, { ...data, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="scenarios-container-description"
          className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2"
        >
          Description / Comments
        </label>
        <Textarea
          id="scenarios-container-description"
          value={data.description || ''}
          onChange={event => handleChange('description', event.target.value)}
          placeholder="Add notes or description about your scenarios..."
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 min-h-[100px]"
        />
      </div>

      <div className="h-px bg-white/10" />

      <div>
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-3">
          Scenarios in this test
        </p>
        {scenarios.length === 0 ? (
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
                    <div className="text-sm font-semibold text-zinc-200">{scenario.name}</div>
                    {scenario.data?.name && <div className="text-xs text-zinc-500 mt-0.5">{scenario.data.name}</div>}
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

export function ScenarioDetails({ node, onNodeUpdate }: NamedNodeDetailProps) {
  const data = node.data || {};

  const handleChange = (field: string, value: any) => {
    onNodeUpdate?.(node.id, { ...data, [field]: value });
  };

  return (
    <div className="mb-4">
      <label
        htmlFor="scenario-comments"
        className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2"
      >
        Comments / Description
      </label>
      <Textarea
        id="scenario-comments"
        value={data.comments || ''}
        onChange={event => handleChange('comments', event.target.value.slice(0, 250))}
        maxLength={250}
        placeholder="Add notes or comments about this scenario..."
        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 min-h-[80px]"
      />
    </div>
  );
}

export function MetricsDetails({ node, onNodeUpdate }: NodeDetailProps) {
  const data = node.data || {};

  const handleChange = (field: string, value: any) => {
    onNodeUpdate?.(node.id, { ...data, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div>
        <label
          htmlFor="metrics-enabled"
          className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2"
        >
          Enabled
        </label>
        <select
          id="metrics-enabled"
          value={data.enabled ? 'true' : 'false'}
          onChange={event => handleChange('enabled', event.target.value === 'true')}
          className="w-full h-[38px] px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
        >
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      </div>
      <EditableField
        label="Collect Interval"
        value={data.collect_interval || ''}
        field="collect_interval"
        onChange={handleChange}
      />
    </div>
  );
}

export function SparkDetails({ node, onNodeUpdate }: NodeDetailProps) {
  const data = node.data || {};

  return (
    <div className="mb-4">
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
        {'</>'} Spark Script (JavaScript)
      </p>
      <SparkCodeEditor
        value={data.script || ''}
        onChange={newScript => onNodeUpdate?.(node.id, { ...data, script: newScript })}
        placeholder="// Write your JavaScript code here..."
        minHeight="280px"
      />
    </div>
  );
}

export function HeaderDetails({ node, onNodeUpdate }: NodeDetailProps) {
  const data = node.data || {};
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

  const handleChange = (field: string, value: any) => {
    onNodeUpdate?.(node.id, { ...data, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div className="py-3 px-1 border-b border-white/5 flex items-center gap-3 w-full min-w-0 hover:bg-white/[0.02] transition-colors group">
        <div className="flex-1 flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 shrink-0 w-[70px]">
            <Input
              value={data.name || ''}
              onChange={event => handleChange('name', event.target.value)}
              placeholder="Content-Type"
              list="header-names-list"
              className="flex-1 px-2 py-1 text-xs font-mono text-purple-400 font-bold bg-purple-400/5 border-purple-400/20 focus:border-purple-400/40"
            />
            <span className="text-zinc-500 font-bold shrink-0">=</span>
          </div>
          <div className="w-0 flex-1 min-w-0">
            <Input
              value={data.value || ''}
              onChange={event => handleChange('value', event.target.value)}
              placeholder="application/json"
              className="w-full px-2 py-1 text-sm font-mono text-zinc-300 bg-white/5 border-white/10 focus:border-white/30"
            />
          </div>
        </div>
        <datalist id="header-names-list">
          {commonHeaders.map(header => (
            <option
              key={header}
              value={header}
            />
          ))}
        </datalist>
      </div>

      <div className="p-3 bg-slate-400/5 border border-slate-400/20 rounded text-xs text-zinc-400">
        🏷️ This header will be sent with the HTTP request
      </div>
    </div>
  );
}

export function HeadersDetails({ node, onNodeUpdate }: NodeDetailProps) {
  const data = node.data || {};

  return (
    <>
      <EditableList
        title="HTTP Headers"
        items={data}
        onUpdate={items => onNodeUpdate?.(node.id, items)}
        keyPlaceholder="Header-Name"
        valuePlaceholder="Header value"
        keyLabel="Header Name"
        valueLabel="Value"
        enableCheckboxes={false}
        enableBulkActions={false}
        variant="minimal"
      />

      <div className="mt-4 p-3 bg-red-400/5 border border-red-400/20 rounded text-xs text-zinc-400">
        🏷️ These headers will be sent with the HTTP request
      </div>
    </>
  );
}

export function FileDetails({ node, onNodeUpdate }: NodeDetailProps) {
  const data = node.data || {};
  const pathValue = String(data.path || '').trim();
  const mimeValue = String(data.mime || data.mime_type || '').trim();
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

  const handleChange = (field: string, value: any) => {
    if (!onNodeUpdate) {
      return;
    }
    const raw = String(value ?? '');

    if (field === 'path') {
      const nextData: Record<string, any> = { ...data, path: raw };
      if (!String(nextData.field || '').trim() && raw.trim()) {
        nextData.field = 'file';
      }
      onNodeUpdate(node.id, nextData);
      return;
    }

    if (field === 'mime' || field === 'mime_type') {
      const { mime_type: _, ...rest } = data;
      onNodeUpdate(node.id, { ...rest, mime: raw });
      return;
    }

    onNodeUpdate(node.id, { ...data, [field]: raw });
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="min-w-0">
          <FileField
            label="File Path"
            value={data.path || ''}
            field="path"
            onChange={handleChange}
            noMargin
          />
        </div>

        <div className="min-w-0">
          <label
            htmlFor="file-detail-mime"
            className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2"
          >
            MIME Type
          </label>
          <select
            id="file-detail-mime"
            value={mimeValue}
            onChange={event => handleChange('mime', event.target.value)}
            className="w-full px-3 py-2 bg-[#1a1a1a] border border-white/10 rounded text-sm text-zinc-300 font-mono h-[38px] outline-none"
          >
            <option
              value=""
              className="bg-[#1a1a1a]"
            >
              application/octet-stream
            </option>
            {commonMimeTypes.map(mime => (
              <option
                key={mime}
                value={mime}
                className="bg-[#1a1a1a]"
              >
                {mime}
              </option>
            ))}
            {mimeValue && !commonMimeTypes.includes(mimeValue) && (
              <option
                value={mimeValue}
                className="bg-[#1a1a1a]"
              >
                {mimeValue}
              </option>
            )}
          </select>
          <div className="mt-1 text-xs text-zinc-500">Common: application/pdf, image/jpeg, text/csv</div>
        </div>
      </div>

      {!pathValue && (
        <div className="mb-4 p-3 bg-red-400/8 border border-red-400/25 rounded text-xs text-red-300">
          Required: path
        </div>
      )}

      <div className="p-3 bg-amber-400/5 border border-amber-400/20 rounded text-xs text-zinc-400">
        📎 This file will be uploaded as multipart/form-data
      </div>
    </>
  );
}

export function GenericDetails({ node }: NodeDetailProps) {
  if (!node.data || Object.keys(node.data).length === 0) {
    return <div className="text-sm text-zinc-500 italic">No additional properties</div>;
  }

  return (
    <div>
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Properties</p>
      <pre className="p-3 bg-white/5 border border-white/10 rounded text-xs font-mono text-zinc-300 overflow-x-auto">
        {JSON.stringify(node.data, null, 2)}
      </pre>
    </div>
  );
}

export function GroupDetails({ node, onNodeUpdate }: NamedNodeDetailProps) {
  const data = node.data || {};

  const handleChange = (field: string, value: any) => {
    onNodeUpdate?.(node.id, { ...data, [field]: value });
  };

  const handleAuthUpdate = (auth?: AuthConfig) => {
    if (!onNodeUpdate) {
      return;
    }
    if (!auth) {
      const { auth: _, ...rest } = data;
      onNodeUpdate(node.id, rest);
      return;
    }
    onNodeUpdate(node.id, { ...data, auth });
  };

  return (
    <div className="space-y-6">
      <EditableField
        label="Group Name"
        value={data.name || ''}
        field="name"
        onChange={handleChange}
        maxLength={50}
      />
      <DetailField
        label="Steps Count"
        value={node.children?.length || 0}
        mono
      />
      <div className="h-px bg-white/10" />
      <AuthConfigEditor
        auth={data.auth}
        onChange={handleAuthUpdate}
        scopeLabel="Group"
      />
    </div>
  );
}
