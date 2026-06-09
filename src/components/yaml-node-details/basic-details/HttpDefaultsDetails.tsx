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
  const storedStringFields = Object.fromEntries(
    Object.entries(defaults)
      .filter(([key, value]) => key !== 'headers' && key !== 'auth' && typeof value === 'string')
      .map(([key, value]) => [key, value]),
  ) as StringMap;

  // Derived secondary hosts — they live in the absolute URLs of the requests
  // that target them, not in http_defaults. Keep them out of allFields so
  // handleMainFieldsUpdate never serializes base_urlN back into the YAML.
  const secondaryHostEntries: [string, string][] = hosts.slice(1).map((host, i) => [`base_url${i + 1}`, host]);

  const allFields: StringMap = {};
  if (storedStringFields.base_url) {
    allFields.base_url = storedStringFields.base_url;
  }
  for (const [key, value] of Object.entries(storedStringFields)) {
    if (key !== 'base_url' && !/^base_url\d+$/.test(key)) {
      allFields[key] = value;
    }
  }

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
          items={allFields}
          onUpdate={handleMainFieldsUpdate}
          keyPlaceholder="field_name"
          valuePlaceholder="value"
          enableCheckboxes={false}
          enableBulkActions={false}
          variant="minimal"
          addButtonVariant="pill"
        />
        {secondaryHostEntries.length > 0 && (
          <div className="mt-3 divide-y divide-white/5 rounded-lg border border-white/5 bg-white/[0.02] px-3">
            {secondaryHostEntries.map(([key, value]) => (
              <div
                key={key}
                className="flex items-center gap-3 py-3"
              >
                <div className="flex items-center gap-2 shrink-0 w-[250px]">
                  <div className="flex-1 rounded border border-yellow-400/20 bg-yellow-400/5 px-2 py-1 text-xs font-mono text-yellow-400">
                    {key}
                  </div>
                  <span className="shrink-0 font-bold text-zinc-500">=</span>
                </div>
                <div className="w-0 flex-1 min-w-0 overflow-x-auto scrollbar-none">
                  <div className="w-full rounded border border-white/10 bg-white/5 px-2 py-1 text-sm font-mono text-zinc-400">
                    {value}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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
