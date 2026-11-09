import type { ReactNode } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { HighlightedInput } from '../ui/HighlightedInput';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { MethodDropdown } from './MethodDropdown';

interface RequestUrlRowProps {
  methodControl?: ReactNode;
  protocolOptions?: string[];
  requestMethod: string;
  onMethodChange: (method: string) => void;
  protocol: string;
  onProtocolChange: (value: string) => void;
  displayBaseUrl: string;
  baseUrlPlaceholder: string;
  onBaseUrlChange: (value: string) => void;
  pathInputValue: string;
  onPathChange: (value: string) => void;
  searchText: string;
  compactInputClass: string;
}

export function RequestUrlRow({
  methodControl,
  protocolOptions = ['https', 'http'],
  requestMethod,
  onMethodChange,
  protocol,
  onProtocolChange,
  displayBaseUrl,
  baseUrlPlaceholder,
  onBaseUrlChange,
  pathInputValue,
  onPathChange,
  searchText,
  compactInputClass,
}: RequestUrlRowProps) {
  const { t } = useLanguage();
  return (
    <div>
      <div className="grid grid-cols-12 gap-3 items-end">
        <div className="col-span-2">
          <label
            htmlFor={methodControl ? undefined : 'req-method'}
            className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2"
          >
            {methodControl ? 'Type' : t('yamlEditor.requestDetails.method')}
          </label>
          {methodControl ?? (
            <MethodDropdown
              id="req-method"
              value={requestMethod}
              onChange={onMethodChange}
              className="w-full"
            />
          )}
        </div>
        <div className="col-span-2">
          <label
            htmlFor="req-protocol"
            className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2"
          >
            {t('yamlEditor.requestDetails.protocol')}
          </label>
          <Select
            value={protocol}
            onValueChange={onProtocolChange}
          >
            <SelectTrigger
              id="req-protocol"
              className={`${compactInputClass} w-full`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-white/10 use-accent-yellow">
              {protocolOptions.map(value => (
                <SelectItem
                  key={value}
                  value={value}
                  className="font-mono"
                >
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-4">
          <label
            htmlFor="req-base-url"
            className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2"
          >
            {t('yamlEditor.requestDetails.baseUrl')}
          </label>
          <HighlightedInput
            id="req-base-url"
            value={displayBaseUrl}
            onChange={e => onBaseUrlChange(e.target.value)}
            placeholder={baseUrlPlaceholder}
            className="w-full h-9.5 bg-white/5 border border-white/10 text-zinc-300 text-sm font-mono"
            searchText={searchText}
            overlayClass="px-3 text-sm text-zinc-300 font-mono"
          />
        </div>
        <div className="col-span-4">
          <label
            htmlFor="req-path"
            className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2"
          >
            {t('yamlEditor.requestDetails.path')}
          </label>
          <HighlightedInput
            id="req-path"
            value={pathInputValue}
            onChange={e => onPathChange(e.target.value)}
            placeholder="/api/endpoint"
            className="w-full h-9.5 bg-white/5 border border-white/10 text-zinc-300 text-sm font-mono"
            searchText={searchText}
            overlayClass="px-3 text-sm text-zinc-300 font-mono"
          />
        </div>
      </div>
    </div>
  );
}
