import type { StringMap } from '../../../types/shared';
import type { AuthConfig, HttpDefaults } from '../../../types/yaml';
import { EditableList } from '../../EditableList';
import { Input } from '../../ui/input';
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

  const secondaryHostEntries = hosts.slice(1).map((host, index) => [`base_url${index + 1}`, host] as const);

  const otherFields: StringMap = {};
  for (const [key, value] of Object.entries(storedStringFields)) {
    if (key !== 'base_url' && !/^base_url\d+$/.test(key)) {
      otherFields[key] = value;
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

  const handleBaseUrlChange = (value: string) => {
    const next = { ...defaults } as Record<string, unknown>;
    // Drop any stale base_urlN fields when base_url changes
    Object.keys(next).forEach(key => {
      if (/^base_url\d+$/.test(key)) {
        delete next[key];
      }
    });
    if (value.trim()) {
      next.base_url = value;
    } else {
      delete next.base_url;
    }
    updateData(next);
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

  const baseUrl = storedStringFields.base_url || '';

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-3">Configuration</p>

        <div className="divide-y divide-white/5 border-t border-white/5">
          {/* base_url — editable */}
          <div className="py-3 px-1 border-b border-white/5 transition-all flex items-center gap-3 group hover:bg-white/2">
            <div className="flex-1 flex items-center gap-3 min-w-0">
              <div className="flex items-center gap-2 shrink-0 w-[250px]">
                <div className="flex-1 rounded border border-yellow-400/20 bg-yellow-400/5 px-2 py-1 text-xs font-mono text-yellow-400 h-9 flex items-center">
                  base_url
                </div>
                <span className="text-zinc-500 font-bold shrink-0">=</span>
              </div>
              <div className="w-0 flex-1 min-w-0 overflow-x-auto scrollbar-none">
                <Input
                  value={baseUrl}
                  onChange={e => handleBaseUrlChange(e.target.value)}
                  placeholder="https://api.example.com"
                  className="w-full px-2 py-1 text-sm font-mono text-zinc-300 bg-white/5 border-white/10 focus:border-white/30"
                />
              </div>
            </div>
          </div>

          {/* Secondary hosts — read only */}
          {secondaryHostEntries.length > 0 &&
            secondaryHostEntries.map(([key, value]) => (
              <div
                key={key}
                className="py-3 px-1 border-b border-white/5 transition-all flex items-center gap-3 group hover:bg-white/2"
              >
                <div className="flex-1 flex items-center gap-3 min-w-0">
                  <div className="flex items-center gap-2 shrink-0 w-[250px]">
                    <div className="flex-1 rounded border border-yellow-400/20 bg-yellow-400/5 px-2 py-1 text-xs font-mono text-yellow-400 h-9 flex items-center">
                      {key}
                    </div>
                    <span className="text-zinc-500 font-bold shrink-0">=</span>
                  </div>
                  <div className="w-0 flex-1 min-w-0 overflow-x-auto scrollbar-none">
                    <div className="w-full rounded border border-white/10 bg-white/5 px-2 py-1 text-sm font-mono text-zinc-400 h-9 flex items-center">
                      {value}
                    </div>
                  </div>
                  <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                    Read only
                  </span>
                </div>
              </div>
            ))}
        </div>

        <EditableList
          title="Fields"
          items={otherFields}
          onUpdate={handleMainFieldsUpdate}
          keyPlaceholder="field_name"
          valuePlaceholder="value"
          enableCheckboxes={false}
          enableBulkActions={false}
          variant="minimal"
          addButtonVariant="pill"
        />

        {secondaryHostEntries.length > 0 && (
          <p className="mt-3 text-xs text-zinc-500">
            Secondary hosts come from absolute request URLs. Edit those request URLs directly to change them.
          </p>
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
