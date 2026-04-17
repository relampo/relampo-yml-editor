import type { AuthConfig } from '../../../types/yaml';
import { EditableList } from '../../EditableList';
import { AuthConfigEditor } from '../SharedFields';
import type { NodeDetailProps } from '../types';

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
