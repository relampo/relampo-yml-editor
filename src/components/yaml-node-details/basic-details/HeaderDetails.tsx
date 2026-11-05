import { EditableList } from '../../EditableList';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Input } from '../../ui/input';
import { createNodeDataUpdater } from '../nodeDetailHelpers';
import type { NodeDetailProps } from '../types';

const commonHeaders = [
  'Authorization',
  'Content-Type',
  'Accept',
  'User-Agent',
  'Accept-Language',
  'Accept-Encoding',
  'Cache-Control',
  'X-Api-Key',
  'X-Requested-With',
];

export function HeaderDetails({ node, onNodeUpdate }: NodeDetailProps) {
  const { t } = useLanguage();
  const { data, updateField } = createNodeDataUpdater(node, onNodeUpdate);

  return (
    <div className="space-y-4">
      <div className="py-3 px-1 border-b border-white/5 flex items-center gap-3 w-full min-w-0 hover:bg-white/2 transition-colors group">
        <div className="flex-1 flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 shrink-0 w-[250px]">
            <Input
              value={data.name || ''}
              onChange={event => updateField('name', event.target.value)}
              placeholder="Content-Type"
              list="header-names-list"
              className="flex-1 px-2 py-1 text-xs font-mono text-yellow-400 bg-yellow-400/5 border-yellow-400/20"
            />
            <span className="text-zinc-500 font-bold shrink-0">=</span>
          </div>
          <div className="w-0 flex-1 min-w-0 overflow-x-auto scrollbar-none">
            <Input
              value={typeof data.value === 'string' || typeof data.value === 'number' ? data.value : ''}
              onChange={event => updateField('value', event.target.value)}
              placeholder="application/json"
              className="w-full px-2 py-1 text-sm font-mono text-zinc-300 bg-white/5 border-white/10 focus:border-white/30"
            />
          </div>
        </div>
        <datalist id="header-names-list">
          {commonHeaders.map(header => (
            <option
              key={header}
              value={header}
            />
          ))}
        </datalist>
      </div>

      <div className="p-3 bg-slate-400/5 border border-slate-400/20 rounded text-xs text-zinc-400">
        {t('yamlEditor.nodeDetails.header.single')}
      </div>
    </div>
  );
}

export function HeadersDetails({ node, onNodeUpdate, searchQuery = '' }: NodeDetailProps & { searchQuery?: string }) {
  const { t } = useLanguage();
  const data = node.data || {};
  const headers = Object.fromEntries(
    Object.entries(data).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  );

  return (
    <>
      <EditableList
        title={t('yamlEditor.nodeDetails.basic.httpHeaders')}
        items={headers}
        onUpdate={items => onNodeUpdate?.(node.id, items)}
        keyPlaceholder="Header-Name"
        valuePlaceholder={t('yamlEditor.nodeDetails.header.valuePlaceholder')}
        enableCheckboxes={false}
        enableBulkActions={false}
        variant="minimal"
        searchText={searchQuery}
      />

      <div className="mt-4 p-3 bg-red-400/5 border border-red-400/20 rounded text-xs text-zinc-400">
        {t('yamlEditor.nodeDetails.header.multiple')}
      </div>
    </>
  );
}
