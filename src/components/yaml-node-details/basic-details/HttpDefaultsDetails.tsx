import type { StringMap } from '../../../types/shared';
import type { AuthConfig, HttpDefaults } from '../../../types/yaml';
import { EditableList } from '../../EditableList';
import { AuthConfigEditor } from '../SharedFields';
import { createNodeDataUpdater } from '../nodeDetailHelpers';
import type { NodeDetailProps } from '../types';

export function HttpDefaultsDetails({ node, onNodeUpdate }: NodeDetailProps) {
  const { data, updateData } = createNodeDataUpdater(node, onNodeUpdate);
  const defaults = data as Partial<HttpDefaults>;
  const headers = (defaults.headers || {}) as StringMap;
  const mainFields = Object.fromEntries(
    Object.entries(defaults)
      .filter(([key, value]) => key !== 'headers' && key !== 'auth' && typeof value === 'string')
      .map(([key, value]) => [key, value]),
  ) as StringMap;

  const handleMainFieldsUpdate = (fields: StringMap) => {
    updateData({
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
