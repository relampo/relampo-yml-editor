import { Info } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import type { AuthConfig } from '../../../types/yaml';
import { AuthConfigEditor, DetailField, EditableField } from '../SharedFields';
import { createNodeDataUpdater } from '../nodeDetailHelpers';
import type { NamedNodeDetailProps } from '../types';

export function GroupDetails({ node, onNodeUpdate, nodeName, setNodeName }: NamedNodeDetailProps) {
  const { t } = useLanguage();
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
        label={t('yamlEditor.nodeDetails.controller.groupName')}
        value={nodeName || data.name || node.name || ''}
        field="name"
        onChange={(_, value) => handleNameChange(value)}
        maxLength={50}
        commitMode="change"
      />
      <DetailField
        label={t('yamlEditor.nodeDetails.controller.stepsCount')}
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
  const { t } = useLanguage();
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
      <div className="alert-info rounded-md p-3 text-sm flex items-start gap-2.5">
        <Info className="alert-info-icon w-4 h-4 mt-0.5 shrink-0" />
        <span>{t('yamlEditor.nodeDetails.controller.transactionInfo')}</span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(200px,1fr)_minmax(160px,0.7fr)]">
        <DetailField
          label={t('yamlEditor.common.name')}
          value={nodeName || data.name || node.name || ''}
          editable={false}
          noMargin
        />

        <DetailField
          label={t('yamlEditor.nodeDetails.controller.transactionUnit')}
          value={t('yamlEditor.nodeDetails.controller.transactionUnitValue')}
          editable={false}
          noMargin
        />

        <DetailField
          label={t('yamlEditor.nodeDetails.controller.stepsCount')}
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
