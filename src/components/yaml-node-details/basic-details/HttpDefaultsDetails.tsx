import { useEffect, useRef, useState } from 'react';
import type { StringMap } from '../../../types/shared';
import type { AuthConfig, HttpDefaults } from '../../../types/yaml';
import { EditableList } from '../../EditableList';
import { AuthConfigEditor } from '../SharedFields';
import { createNodeDataUpdater } from '../nodeDetailHelpers';
import type { NodeDetailProps } from '../types';

/**
 * Editable input for a secondary host (`base_url1`, `base_url2`, …).
 *
 * Secondary hosts are not stored as fields — they live in the absolute URL of
 * every request that targets them. Committing a change therefore renames the
 * host everywhere via `onRenameHost`, instead of editing a single field. The
 * input keeps a local draft so typing never re-derives the host mid-edit, and
 * commits on blur or Enter.
 */
function SecondaryHostField({
  fieldKey,
  host,
  onRename,
}: {
  fieldKey: string;
  host: string;
  onRename: (oldHost: string, newHost: string) => void;
}) {
  const [draft, setDraft] = useState(host);
  // Escape blurs the input, but React batches the draft reset so the blur
  // handler still sees the edited draft. This flag lets commit() know the edit
  // was cancelled and must not rename.
  const cancelledRef = useRef(false);

  useEffect(() => {
    setDraft(host);
  }, [host]);

  const commit = () => {
    if (cancelledRef.current) {
      cancelledRef.current = false;
      setDraft(host);
      return;
    }
    const next = draft.trim();
    if (!next || next === host) {
      setDraft(host);
      return;
    }
    onRename(host, next);
  };

  return (
    <div className="flex items-center gap-3 py-3">
      <div className="flex items-center gap-2 shrink-0 w-[250px]">
        <div className="flex-1 rounded border border-yellow-400/20 bg-yellow-400/5 px-2 py-1 text-xs font-mono text-yellow-400">
          {fieldKey}
        </div>
        <span className="shrink-0 font-bold text-zinc-500">=</span>
      </div>

      <input
        value={draft}
        onChange={event => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={event => {
          if (event.key === 'Enter') {
            event.currentTarget.blur();
          } else if (event.key === 'Escape') {
            cancelledRef.current = true;
            setDraft(host);
            event.currentTarget.blur();
          }
        }}
        spellCheck={false}
        className="w-0 flex-1 min-w-0 rounded border border-white/10 bg-white/5 px-2 py-1 text-sm font-mono text-zinc-200 focus:border-yellow-400/40 focus:outline-none"
      />
    </div>
  );
}

export function HttpDefaultsDetails({
  node,
  onNodeUpdate,
  hosts = [],
  onRenameHost,
}: NodeDetailProps & { hosts?: string[]; onRenameHost?: (oldHost: string, newHost: string) => void }) {
  const { data, updateData } = createNodeDataUpdater(node, onNodeUpdate);
  const defaults = data as Partial<HttpDefaults>;
  const headers = (defaults.headers || {}) as StringMap;
  const secondaryHostEntries = hosts.slice(1).map((host, index) => [`base_url${index + 1}`, host] as const);
  const preservedDefaults = Object.fromEntries(
    Object.entries(defaults).filter(([key, value]) => key !== 'headers' && key !== 'auth' && typeof value !== 'string'),
  ) as Partial<HttpDefaults>;
  const storedStringFields = Object.fromEntries(
    Object.entries(defaults)
      .filter(([key, value]) => key !== 'headers' && key !== 'auth' && typeof value === 'string')
      .map(([key, value]) => [key, value]),
  ) as StringMap;

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
        {secondaryHostEntries.length > 0 && (
          <div className="mb-4 space-y-2">
            <div className="divide-y divide-white/5 rounded-lg border border-white/5 bg-white/[0.02] px-3">
              {secondaryHostEntries.map(([key, value]) =>
                onRenameHost ? (
                  <SecondaryHostField
                    key={key}
                    fieldKey={key}
                    host={value}
                    onRename={onRenameHost}
                  />
                ) : (
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
                ),
              )}
            </div>

            <p className="text-xs text-zinc-500">
              Extra hosts this recording targets. Editing one renames that host on every request that uses it.
            </p>
          </div>
        )}
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
