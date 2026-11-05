import { useLanguage } from '../../../contexts/LanguageContext';
import { SparkCodeEditor } from '../../SparkCodeEditor';
import type { NodeDetailProps } from '../types';

export function SparkDetails({ node, onNodeUpdate }: NodeDetailProps) {
  const { t } = useLanguage();
  const data = node.data || {};

  return (
    <div className="mb-4">
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
        {'</>'} {t('yamlEditor.requestDetails.sparkScriptTitle')}
      </p>
      <SparkCodeEditor
        value={data.script || ''}
        onChange={newScript => onNodeUpdate?.(node.id, { ...data, script: newScript })}
        placeholder="// Write your JavaScript code here..."
        minHeight="280px"
      />
    </div>
  );
}
