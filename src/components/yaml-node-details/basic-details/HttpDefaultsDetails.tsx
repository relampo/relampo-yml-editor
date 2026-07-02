import { Lock } from 'lucide-react';
import type { StringMap } from '../../../types/shared';
import type { AuthConfig, HttpDefaults } from '../../../types/yaml';
import { EditableList } from '../../EditableList';
import { AuthConfigEditor } from '../SharedFields';
import { createNodeDataUpdater } from '../nodeDetailHelpers';
import type { NodeDetailProps } from '../types';

// All base_url hosts are shown scheme-stripped so the primary and the secondary
// hosts read uniformly — no host outranks the others just because it kept its
// `https://`. See RLP-365.
const URL_SCHEME = /^https?:\/\//i;
const stripScheme = (value: string) => value.replace(URL_SCHEME, '');

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

  // The primary base_url is the only host stored in http_defaults; show it
  // without its scheme so it matches the secondary hosts, but remember the
  // scheme to re-attach on save so the serialized YAML stays a valid URL.
  const storedBaseUrl = storedStringFields.base_url ?? '';
  const baseUrlScheme = storedBaseUrl.match(URL_SCHEME)?.[0] ?? '';

  // Derived secondary hosts — they live in the absolute URLs of the requests
  // that target them, not in http_defaults. Keep them out of allFields so
  // handleMainFieldsUpdate never serializes base_urlN back into the YAML. They
  // sit in the same Configuration list as base_url, with the same scheme-less
  // treatment, but stay read-only (each host is edited on its request, RLP-414).
  const secondaryHostEntries: [string, string][] = hosts
    .slice(1)
    .map((host, i) => [`base_url${i + 1}`, stripScheme(host)]);

  const allFields: StringMap = {};
  if (storedStringFields.base_url) {
    allFields.base_url = stripScheme(storedBaseUrl);
  }
  for (const [key, value] of Object.entries(storedStringFields)) {
    if (key !== 'base_url' && !/^base_url\d+$/.test(key)) {
      allFields[key] = value;
    }
  }

  const handleMainFieldsUpdate = (fields: StringMap) => {
    const nextFields = { ...fields };
    // Re-attach the scheme stripped for display so the stored base_url stays an
    // absolute URL. If the user typed their own scheme, respect it. See RLP-365.
    if (typeof nextFields.base_url === 'string' && nextFields.base_url && !URL_SCHEME.test(nextFields.base_url)) {
      nextFields.base_url = `${baseUrlScheme}${nextFields.base_url}`;
    }
    updateData({
      ...preservedDefaults,
      ...nextFields,
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
        />
        {secondaryHostEntries.length > 0 && (
          <div className="divide-y divide-white/5 border-t border-white/5">
            {secondaryHostEntries.map(([key, value]) => (
              <div
                key={key}
                className="flex items-center gap-3 py-3 px-1"
              >
                <div className="flex items-center gap-2 shrink-0 w-[250px]">
                  <div className="flex-1 rounded border border-yellow-400/20 bg-yellow-400/5 px-2 py-1 text-xs font-mono text-yellow-400">
                    {key}
                  </div>
                  <span className="shrink-0 font-bold text-zinc-500">=</span>
                </div>
                <div className="w-0 flex-1 min-w-0 overflow-x-auto scrollbar-none">
                  <div className="w-full rounded border border-white/10 bg-white/5 px-2 py-1 text-sm font-mono text-zinc-300">
                    {value}
                  </div>
                </div>
                <Lock className="w-4 h-4 shrink-0 text-zinc-600" aria-label="Edited on its request" />
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
