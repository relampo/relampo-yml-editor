import { EditableList } from '../../EditableList';
import { Input } from '../../ui/input';
import { FileField, SelectField } from '../SharedFields';
import type { NamedNodeDetailProps } from '../types';

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
