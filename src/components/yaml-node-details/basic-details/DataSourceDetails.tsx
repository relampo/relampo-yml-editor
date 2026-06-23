import { AlertCircle, Loader2, Table2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { StringMap } from '../../../types/shared';
import type { DataSource } from '../../../types/yaml';
import { previewStudioDataSourceFile, uploadStudioDataSourceFile } from '../../../utils/debugApi';
import { EditableList } from '../../EditableList';
import { useLanguage } from '../../../contexts/LanguageContext';
import { HighlightedInput } from '../../ui/HighlightedInput';
import { Input } from '../../ui/input';
import { FileField, SelectField } from '../SharedFields';
import { createNodeDataUpdater } from '../nodeDetailHelpers';
import type { NamedNodeDetailProps } from '../types';

type EditorDataSource = Partial<Omit<DataSource, 'type' | 'mode'>> & {
  __name?: string;
  path?: string;
  variable_names?: string;
  type?: DataSource['type'] | 'txt';
  mode?: NonNullable<DataSource['mode']> | 'per_worker';
};

function dataSourceModeDescription(mode: EditorDataSource['mode'], language: 'en' | 'es'): string {
  const descriptions = {
    en: {
      shared: 'A global cursor; rows are consumed only once.',
      per_worker: 'Fixed 1:1 mapping: VU i -> row (i-1) % total. Same row, no cursor advance.',
      per_vu: 'Each VU cycles through the list from the beginning.',
    },
    es: {
      shared: 'Un cursor global; filas consumidas una sola vez.',
      per_worker: 'Mapeo fijo 1:1: VU i -> fila (i-1) % total. Misma fila, sin avance.',
      per_vu: 'Cada VU cicla sobre la lista desde el inicio.',
    },
  };
  return descriptions[language][mode === 'shared' || mode === 'per_worker' ? mode : 'per_vu'];
}

export function DataSourceDetails({
  node,
  onNodeUpdate,
  nodeName,
  setNodeName,
  searchQuery = '',
  fileBrowseEnabled = false,
}: NamedNodeDetailProps) {
  const { data, updateData, updateField } = createNodeDataUpdater(node, onNodeUpdate);
  const sourceData = data as EditorDataSource;
  const bind = (sourceData.bind || {}) as StringMap;
  const showDiagnosis = false;
  const sourcePath = String(sourceData.file || sourceData.path || '');
  const { language } = useLanguage();
  const latestSourceData = useRef(sourceData);

  useEffect(() => {
    latestSourceData.current = sourceData;
  }, [sourceData]);

  const handleBindUpdate = (updatedBind: StringMap) => {
    updateData({ ...sourceData, bind: updatedBind });
  };

  const updateDataSourcePath = (path: string) => {
    const nextData: EditorDataSource = { ...latestSourceData.current, path };
    delete (nextData as Record<string, unknown>).file;
    updateData(nextData);
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
            onChange={event => {
              const nextName = event.target.value;
              setNodeName?.(nextName);
              onNodeUpdate?.(node.id, { ...sourceData, __name: nextName });
            }}
            maxLength={50}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-semibold h-9.5"
            placeholder="Name"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[120px_1fr] md:items-start">
        <div>
          <SelectField
            label="Type"
            value={sourceData.type || 'csv'}
            field="type"
            options={[
              { label: 'CSV', value: 'csv' },
              { label: 'TXT', value: 'txt' },
            ]}
            onChange={(field, value) => updateField(field, value)}
            noMargin
          />
        </div>

        <div>
          <FileField
            label="File"
            value={sourcePath}
            field="file"
            onChange={(_, value) => updateDataSourcePath(String(value))}
            noMargin
            showPathHint
            accept=".csv,.txt"
            browseEnabled={fileBrowseEnabled}
            uploadFile={
              fileBrowseEnabled
                ? async file => {
                    const uploaded = await uploadStudioDataSourceFile(file);
                    return uploaded.path;
                  }
                : undefined
            }
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
        <HighlightedInput
          id="ds-basic-var-names"
          value={sourceData.variable_names || ''}
          onChange={event => updateField('variable_names', event.target.value)}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono focus:border-white/30 transition-all h-9.5"
          placeholder="var1, var2, var3"
          searchText={searchQuery}
        />
        <p className="text-[10px] text-zinc-500 mt-1 italic">Define variable names separated by commas manually.</p>
      </div>

      <div className="flex gap-4">
        <div className="w-30 shrink-0">
          <SelectField
            label="Mode"
            value={sourceData.mode || 'per_vu'}
            field="mode"
            options={[
              { label: 'Per VU', value: 'per_vu' },
              { label: 'Shared', value: 'shared' },
              { label: 'Per Worker', value: 'per_worker' },
            ]}
            onChange={(field, value) => updateField(field, value)}
            noMargin
          />
          <p className="text-[10px] text-zinc-400 mt-1 italic">
            {dataSourceModeDescription(sourceData.mode, language)}
          </p>
        </div>

        <div className="w-30 shrink-0">
          {sourceData.mode !== 'per_worker' && (
            <SelectField
              label="On Exhausted"
              value={sourceData.on_exhausted || 'recycle'}
              field="on_exhausted"
              options={[
                { label: 'Recycle', value: 'recycle' },
                { label: 'Stop', value: 'stop' },
              ]}
              onChange={(field, value) => updateField(field, value)}
              noMargin
            />
          )}
        </div>
      </div>

      {sourceData.type !== 'txt' && Object.keys(bind).length > 0 && (
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

      <DataSourcePreviewPanel
        enabled={fileBrowseEnabled}
        path={sourcePath}
        type={sourceData.type || 'csv'}
        variableNames={sourceData.variable_names || ''}
      />

      {showDiagnosis && (
        <div className="mt-8 pt-4 border-t border-white/5">
          <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest block mb-1">
            Debug: Node Data (Type: {node.type})
          </p>
          <pre className="p-3 bg-black/40 rounded border border-white/5 text-[10px] font-mono text-zinc-500 overflow-auto max-h-37.5">
            {JSON.stringify(sourceData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

type PreviewState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; lines: string[]; truncated: boolean }
  | { status: 'error'; message: string };

function DataSourcePreviewPanel({
  enabled,
  path,
  type,
  variableNames,
}: {
  enabled: boolean;
  path: string;
  type: NonNullable<EditorDataSource['type']>;
  variableNames: string;
}) {
  const trimmedPath = path.trim();
  const [state, setState] = useState<PreviewState>({ status: 'idle' });
  const latestPreviewPath = useRef(trimmedPath);

  useEffect(() => {
    latestPreviewPath.current = trimmedPath;
  }, [trimmedPath]);

  useEffect(() => {
    if (!enabled || !trimmedPath) {
      setState({ status: 'idle' });
      return;
    }
    const controller = new AbortController();
    const requestedPath = trimmedPath;
    setState({ status: 'loading' });
    previewStudioDataSourceFile(trimmedPath, controller.signal)
      .then(preview => {
        if (controller.signal.aborted || latestPreviewPath.current !== requestedPath) return;
        setState({ status: 'ready', lines: preview.lines, truncated: preview.truncated });
      })
      .catch(error => {
        if (controller.signal.aborted) return;
        setState({ status: 'error', message: error instanceof Error ? error.message : 'Preview unavailable' });
      });
    return () => controller.abort();
  }, [enabled, trimmedPath]);

  const columns = useMemo(() => previewColumns(type, variableNames), [type, variableNames]);
  const rows = useMemo(() => previewRows(type, state.status === 'ready' ? state.lines : []), [state, type]);
  const displayColumns = useMemo(() => {
    const maxColumns = Math.max(columns.length, ...rows.map(row => row.length));
    return Array.from({ length: maxColumns }, (_, index) => columns[index] || `col ${index + 1}`);
  }, [columns, rows]);

  if (!trimmedPath) {
    return null;
  }

  return (
    <section className="rounded border border-white/10 bg-black/20">
      <div className="flex min-h-10 items-center justify-between gap-3 border-b border-white/10 px-3 py-2">
        <div className="flex items-center gap-2">
          <Table2 className="h-4 w-4 text-yellow-300" />
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Data Preview</p>
        </div>
        {state.status === 'ready' && (
          <p className="text-[10px] font-medium text-zinc-500">
            {rows.length} {rows.length === 1 ? 'row' : 'rows'}
            {state.truncated ? ' shown' : ''}
          </p>
        )}
      </div>

      {!enabled && (
        <div className="flex items-start gap-2 px-3 py-3 text-xs text-zinc-500">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-500" />
          <p>Preview is available when running Relampo Studio locally.</p>
        </div>
      )}

      {enabled && state.status === 'loading' && (
        <div className="flex items-center gap-2 px-3 py-3 text-xs text-zinc-400">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-yellow-300" />
          <p>Loading preview...</p>
        </div>
      )}

      {enabled && state.status === 'error' && (
        <div className="flex items-start gap-2 px-3 py-3 text-xs text-red-300">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p>{state.message}</p>
        </div>
      )}

      {enabled && state.status === 'ready' && rows.length === 0 && (
        <div className="px-3 py-3 text-xs text-zinc-500">No rows found.</div>
      )}

      {enabled && state.status === 'ready' && rows.length > 0 && (
        <div className="max-h-56 overflow-auto">
          <table className="w-full table-fixed border-collapse text-left text-xs">
            <thead className="sticky top-0 bg-zinc-950">
              <tr>
                <th className="w-12 border-b border-white/10 px-3 py-2 font-mono text-[10px] font-semibold uppercase text-zinc-500">
                  #
                </th>
                {displayColumns.map((column, index) => (
                  <th
                    key={`${column}-${index}`}
                    className="border-b border-white/10 px-3 py-2 font-mono text-[10px] font-semibold uppercase text-zinc-500"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={`${rowIndex}-${row.join('|')}`} className="border-b border-white/5 last:border-b-0">
                  <td className="px-3 py-2 align-top font-mono text-[10px] text-zinc-600">{rowIndex + 1}</td>
                  {displayColumns.map((_, columnIndex) => (
                    <td
                      key={columnIndex}
                      className="truncate px-3 py-2 align-top font-mono text-[11px] text-zinc-300"
                      title={row[columnIndex] || ''}
                    >
                      {row[columnIndex] || <span className="text-zinc-600">empty</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {state.truncated && (
            <div className="border-t border-white/10 px-3 py-2 text-[10px] text-zinc-500">
              Showing the first {rows.length} rows.
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function previewColumns(type: NonNullable<EditorDataSource['type']>, variableNames: string): string[] {
  const names = variableNames
    .split(',')
    .map(name => name.trim())
    .filter(Boolean);
  if (type === 'txt') {
    return [names[0] || 'value'];
  }
  return names.length > 0 ? names : ['col 1'];
}

function previewRows(type: NonNullable<EditorDataSource['type']>, lines: string[]): string[][] {
  if (type === 'txt') {
    return lines.map(line => [line]);
  }
  const rows = lines.map(parseCsvPreviewLine);
  const maxColumns = Math.max(1, ...rows.map(row => row.length));
  return rows.map(row => Array.from({ length: maxColumns }, (_, index) => row[index] || ''));
}

function parseCsvPreviewLine(line: string): string[] {
  const cells: string[] = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index++;
      continue;
    }
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === ',' && !quoted) {
      cells.push(cell);
      cell = '';
      continue;
    }
    cell += char;
  }
  cells.push(cell);
  return cells;
}
