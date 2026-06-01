import type { StringMap } from '../../../types/shared';
import type { AuthConfig, HttpDefaults } from '../../../types/yaml';
import { EditableList } from '../../EditableList';
import { AuthConfigEditor } from '../SharedFields';
import { createNodeDataUpdater } from '../nodeDetailHelpers';
import type { NodeDetailProps } from '../types';

export function HttpDefaultsDetails({ node, onNodeUpdate, hosts = [] }: NodeDetailProps & { hosts?: string[] }) {
  const { data, updateData } = createNodeDataUpdater(node, onNodeUpdate);
  const defaults = data as Partial<HttpDefaults>;
  const headers = (defaults.headers || {}) as StringMap;
  const preservedDefaults = Object.fromEntries(
    Object.entries(defaults).filter(([key, value]) => key !== 'headers' && key !== 'auth' && typeof value !== 'string'),
  ) as Partial<HttpDefaults>;
  const mainFields = Object.fromEntries(
    Object.entries(defaults)
      .filter(([key, value]) => key !== 'headers' && key !== 'auth' && typeof value === 'string')
      .map(([key, value]) => [key, value]),
  ) as StringMap;

  const handleMainFieldsUpdate = (fields: StringMap) => {
    updateData({
      ...preservedDefaults,
      ...fields,
      headers: defaults.headers || {},
      ...(defaults.auth ? { auth: defaults.auth } : {}),
    });
  };

  const handleHeadersUpdate = (updatedHeaders: StringMap) => {
    updateData({ ...defaults, headers: updatedHeaders });
  };

  const handleAuthUpdate = (auth?: AuthConfig) => {
    if (!auth) {
      const { auth: _, ...rest } = defaults;
      updateData(rest);
      return;
    }
    updateData({ ...defaults, auth });
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

      {hosts.length > 1 && (
        <>
          <div className="h-px bg-white/10" />
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1">Detected hosts</p>
            <p className="text-xs text-zinc-500 mb-3">
              Every host this recording reaches. Secondary hosts are edited on each request.
            </p>
            <div className="space-y-2">
              {hosts.map((host, index) => (
                <div
                  key={host}
                  className="flex items-center justify-between gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded"
                >
                  <span className="font-mono text-sm text-amber-400 truncate" title={host}>
                    {host}
                  </span>
                  {index === 0 && (
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500 shrink-0">primary</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

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
