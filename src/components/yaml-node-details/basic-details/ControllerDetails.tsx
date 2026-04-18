import type { AuthConfig } from '../../../types/yaml';
import { AuthConfigEditor, DetailField, EditableField } from '../SharedFields';
import { createNodeDataUpdater } from '../nodeDetailHelpers';
import type { NamedNodeDetailProps } from '../types';

export function GroupDetails({ node, onNodeUpdate, nodeName, setNodeName }: NamedNodeDetailProps) {
  const { data, updateData } = createNodeDataUpdater(node, onNodeUpdate);

  const handleNameChange = (value: string) => {
    setNodeName?.(value);
    updateData({ ...data, name: value, __name: value });
  };

  const handleAuthUpdate = (auth?: AuthConfig) => {
    if (!auth) {
      const { auth: _, ...rest } = data;
      updateData(rest);
      return;
    }
    updateData({ ...data, auth });
  };

  return (
    <div className="space-y-6">
      <EditableField
        label="Group Name"
        value={nodeName || data.name || node.name || ''}
        field="name"
        onChange={(_, value) => handleNameChange(value)}
        maxLength={50}
        commitMode="change"
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

export function TransactionDetails({ node, onNodeUpdate, nodeName }: NamedNodeDetailProps) {
  const { data, updateData } = createNodeDataUpdater(node, onNodeUpdate);

  const handleAuthUpdate = (auth?: AuthConfig) => {
    if (!auth) {
      const { auth: _, ...rest } = data;
      updateData(rest);
      return;
    }
    updateData({ ...data, auth });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-teal-400/20 bg-teal-400/5 p-4 text-sm text-teal-100">
        This controller measures the selected flow as one transaction while preserving the exact step order.
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(200px,1fr)_minmax(160px,0.7fr)]">
        <DetailField
          label="Name"
          value={nodeName || data.name || node.name || ''}
          editable={false}
          noMargin
        />

        <DetailField
          label="Transaction Unit"
          value="1 complete transaction"
          editable={false}
          noMargin
        />

        <DetailField
          label="Steps Count"
          value={node.children?.length || 0}
          mono
          editable={false}
          noMargin
        />
      </div>

      <AuthConfigEditor
        auth={data.auth}
        onChange={handleAuthUpdate}
        scopeLabel="Transaction"
      />
    </div>
  );
}
