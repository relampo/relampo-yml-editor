import { useLanguage } from '../contexts/LanguageContext';

export type RequestDetailsTab = 'request' | 'response';

/** Shared request/response navigation for protocol editors. */
export function RequestDetailsTabs({
  activeTab,
  onChange,
  showResponse = true,
}: {
  activeTab: RequestDetailsTab;
  onChange: (tab: RequestDetailsTab) => void;
  showResponse?: boolean;
}) {
  const { t } = useLanguage();
  return (
    <div className="flex items-center border-b border-white/5 bg-[#111111] shrink-0">
      {(['request', 'response'] as const)
        .filter(tab => tab !== 'response' || showResponse)
        .map(tab => (
          <button
            key={tab}
            type="button"
            aria-pressed={activeTab === tab}
            onClick={() => onChange(tab)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'text-yellow-400 bg-yellow-400/10 border-b-2 border-yellow-400'
                : 'text-zinc-400 hover:text-zinc-300 hover:bg-white/5'
            }`}
          >
            {t(tab === 'request' ? 'yamlEditor.requestDetails.tabRequest' : 'yamlEditor.requestDetails.tabResponse')}
          </button>
        ))}
    </div>
  );
}
