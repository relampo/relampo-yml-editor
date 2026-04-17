import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { RedirectSourceInfo, YAMLNode } from '../types/yaml';
import { BodyTypeSelector } from './fields/BodyTypeSelector';
import { MethodDropdown } from './fields/MethodDropdown';
import { QueryParamsEditor } from './fields/QueryParamsEditor';
import { buildRequestUrl, parseRequestUrl } from './fields/requestUrl';
import { Input } from './ui/input';
import { YAMLResponseDetails } from './YAMLResponseDetails';

interface YAMLRequestDetailsProps {
  node: YAMLNode;
  redirectSourceInfo?: RedirectSourceInfo | null;
  onNodeUpdate?: (nodeId: string, updatedData: any) => void;
}

type Tab = 'request' | 'response';
type SearchMode = 'text' | 'regex';

export function YAMLRequestDetails({ node, redirectSourceInfo = null, onNodeUpdate }: YAMLRequestDetailsProps) {
  const data = node.data || {};
  const [formData, setFormData] = useState(data);
  const [activeTab, setActiveTab] = useState<Tab>('request');
  const [requestSearch, setRequestSearch] = useState('');
  const [responseSearch, setResponseSearch] = useState('');
  const [requestSearchMode, setRequestSearchMode] = useState<SearchMode>('text');
  const [responseSearchMode, setResponseSearchMode] = useState<SearchMode>('text');
  const [requestReplace, setRequestReplace] = useState('');
  const [responseReplace, setResponseReplace] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const hasRecordedRedirectFollowUp = Boolean(redirectSourceInfo);
  const effectiveRedirectAutomatically = hasRecordedRedirectFollowUp ? false : !!formData.redirect_automatically;
  const effectiveFollowRedirects = hasRecordedRedirectFollowUp ? true : formData.follow_redirects !== false;

  useEffect(() => {
    setFormData(node.data || {});
  }, [node.id, node.data]);

  const handleFieldChange = (field: string, value: any) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    if (onNodeUpdate) {
      onNodeUpdate(node.id, newData);
    }
  };

  const handleBodyChange = (value: string) => {
    try {
      const parsed = JSON.parse(value);
      handleFieldChange('body', parsed);
    } catch {
      handleFieldChange('body', value);
    }
  };

  const searchText = activeTab === 'request' ? requestSearch : responseSearch;
  const searchMode = activeTab === 'request' ? requestSearchMode : responseSearchMode;
  const replaceValue = activeTab === 'request' ? requestReplace : responseReplace;

  const handleSearchChange = (value: string) => {
    if (activeTab === 'request') {
      setRequestSearch(value);
    } else {
      setResponseSearch(value);
    }
    setCurrentMatchIndex(0);
  };
  const handleSearchModeChange = (mode: SearchMode) => {
    if (activeTab === 'request') setRequestSearchMode(mode);
    else setResponseSearchMode(mode);
    setCurrentMatchIndex(0);
  };
  const handleReplaceChange = (value: string) => {
    if (activeTab === 'request') setRequestReplace(value);
    else setResponseReplace(value);
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setCurrentMatchIndex(0);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center border-b border-white/5 bg-[#111111] shrink-0">
        <button
          onClick={() => handleTabChange('request')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'request'
              ? 'text-yellow-400 bg-yellow-400/10 border-b-2 border-yellow-400'
              : 'text-zinc-400 hover:text-zinc-300 hover:bg-white/5'
          }`}
        >
          Request
        </button>
        {formData.response && (
          <button
            onClick={() => handleTabChange('response')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === 'response'
                ? 'text-cyan-400 bg-cyan-400/10 border-b-2 border-cyan-400'
                : 'text-zinc-400 hover:text-zinc-300 hover:bg-white/5'
            }`}
          >
            Response
          </button>
        )}
      </div>

      <div
        ref={contentRef}
        className="flex-1 overflow-y-auto p-6"
      >
        {activeTab === 'request' ? (
          <RequestContent
            formData={formData}
            hasRecordedRedirectFollowUp={hasRecordedRedirectFollowUp}
            effectiveRedirectAutomatically={effectiveRedirectAutomatically}
            effectiveFollowRedirects={effectiveFollowRedirects}
            onFieldChange={handleFieldChange}
            onBodyChange={handleBodyChange}
            searchText={searchText}
            searchMode={searchMode}
            replaceValue={replaceValue}
            currentMatchIndex={currentMatchIndex}
            onSearchChange={handleSearchChange}
            onSearchModeChange={handleSearchModeChange}
            onReplaceValueChange={handleReplaceChange}
            onNavigate={setCurrentMatchIndex}
          />
        ) : (
          <YAMLResponseDetails
            response={formData.response}
            onResponseUpdate={updatedResponse => handleFieldChange('response', updatedResponse)}
            searchText={searchText}
            searchMode={searchMode}
            replaceValue={replaceValue}
            currentMatchIndex={currentMatchIndex}
            onSearchChange={handleSearchChange}
            onSearchModeChange={handleSearchModeChange}
            onReplaceValueChange={handleReplaceChange}
            onNavigate={setCurrentMatchIndex}
          />
        )}
      </div>
    </div>
  );
}

interface RequestContentProps {
  formData: any;
  hasRecordedRedirectFollowUp: boolean;
  effectiveRedirectAutomatically: boolean;
  effectiveFollowRedirects: boolean;
  onFieldChange: (field: string, value: any) => void;
  onBodyChange: (value: string) => void;
  searchText: string;
  searchMode: SearchMode;
  replaceValue: string;
  currentMatchIndex: number;
  onSearchChange: (value: string) => void;
  onSearchModeChange: (mode: SearchMode) => void;
  onReplaceValueChange: (value: string) => void;
  onNavigate: (index: number) => void;
}

function RequestContent({
  formData,
  hasRecordedRedirectFollowUp,
  effectiveRedirectAutomatically,
  effectiveFollowRedirects,
  onFieldChange,
  onBodyChange: _,
  searchText,
  searchMode,
  replaceValue,
  currentMatchIndex,
  onSearchChange,
  onSearchModeChange,
  onReplaceValueChange,
  onNavigate,
}: RequestContentProps) {
  const compactInputClass =
    'w-[14ch] max-w-full h-9.5 px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono';

  const urlParts = parseRequestUrl(formData.url || '');
  const requestBodyText = formData.body
    ? typeof formData.body === 'string'
      ? formData.body
      : JSON.stringify(formData.body, null, 2)
    : '';

  const buildSearchRegex = () => {
    if (!searchText || searchMode !== 'regex') return null;
    try {
      return new RegExp(searchText, 'gi');
    } catch {
      return null;
    }
  };
  const collectMatches = (text: string) => {
    if (!text || !searchText) return [] as Array<{ start: number; end: number }>;
    const out: Array<{ start: number; end: number }> = [];
    if (searchMode === 'text') {
      const hay = text.toLowerCase();
      const needle = searchText.toLowerCase();
      let pos = 0;
      while (pos <= hay.length - needle.length) {
        const idx = hay.indexOf(needle, pos);
        if (idx === -1) break;
        out.push({ start: idx, end: idx + needle.length });
        pos = idx + Math.max(needle.length, 1);
      }
      return out;
    }
    const re = buildSearchRegex();
    if (!re) return out;
    for (const m of text.matchAll(re)) {
      const start = m.index ?? -1;
      if (start < 0) continue;
      const full = m[0] ?? '';
      const g1 = m.length > 1 ? (m[1] ?? '') : '';
      let s = start;
      let e = start + full.length;
      if (g1) {
        const rel = full.indexOf(g1);
        if (rel >= 0) {
          s = start + rel;
          e = s + g1.length;
        }
      }
      out.push({ start: s, end: e });
      if (full.length === 0) break;
    }
    return out;
  };
  const matches = collectMatches(requestBodyText);
  const totalMatches = matches.length;
  const regexInvalid = !!searchText && searchMode === 'regex' && !buildSearchRegex();

  const applyBodyText = (nextText: string) => {
    try {
      onFieldChange('body', JSON.parse(nextText));
    } catch {
      onFieldChange('body', nextText);
    }
  };

  const handleReplaceCurrent = () => {
    if (!searchText || totalMatches === 0) return;
    const target = matches[currentMatchIndex];
    if (!target) return;
    const next = requestBodyText.slice(0, target.start) + replaceValue + requestBodyText.slice(target.end);
    applyBodyText(next);
  };

  const handleReplaceAll = () => {
    if (!searchText || totalMatches === 0) return;
    const ranges = collectMatches(requestBodyText);
    if (ranges.length === 0) return;
    let next = requestBodyText;
    for (let i = ranges.length - 1; i >= 0; i -= 1) {
      const r = ranges[i];
      next = next.slice(0, r.start) + replaceValue + next.slice(r.end);
    }
    applyBodyText(next);
  };
  const handlePrevious = () => {
    if (totalMatches === 0) return;
    const newIndex = currentMatchIndex === 0 ? totalMatches - 1 : currentMatchIndex - 1;
    onNavigate(newIndex);
  };
  const handleNext = () => {
    if (totalMatches === 0) return;
    const newIndex = currentMatchIndex === totalMatches - 1 ? 0 : currentMatchIndex + 1;
    onNavigate(newIndex);
  };

  return (
    <div className="space-y-4">
      {/* Method / Protocol / Base URL / Path */}
      <div>
        <div className="grid grid-cols-12 gap-3 items-end">
          <div className="col-span-2">
            <label
              htmlFor="req-method"
              className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2"
            >
              Method
            </label>
            <MethodDropdown
              id="req-method"
              value={formData.method || 'GET'}
              onChange={method => onFieldChange('method', method)}
              className="w-full"
            />
          </div>
          <div className="col-span-2">
            <label
              htmlFor="req-protocol"
              className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2"
            >
              Protocol
            </label>
            <select
              id="req-protocol"
              value={urlParts.protocol}
              onChange={e => onFieldChange('url', buildRequestUrl(formData.url || '', { protocol: e.target.value }))}
              className={`${compactInputClass} w-full`}
            >
              <option value="https">https</option>
              <option value="http">http</option>
            </select>
          </div>
          <div className="col-span-4">
            <label
              htmlFor="req-base-url"
              className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2"
            >
              Base URL
            </label>
            <Input
              id="req-base-url"
              value={urlParts.baseUrl}
              onChange={e => onFieldChange('url', buildRequestUrl(formData.url || '', { baseUrl: e.target.value }))}
              placeholder="api.example.com"
              className="w-full h-9.5 bg-white/5 border border-white/10 text-zinc-300 text-sm font-mono"
            />
          </div>
          <div className="col-span-4">
            <label
              htmlFor="req-path"
              className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2"
            >
              Path
            </label>
            <Input
              id="req-path"
              value={urlParts.path}
              onChange={e => onFieldChange('url', buildRequestUrl(formData.url || '', { path: e.target.value }))}
              placeholder="/endpoint"
              className="w-full h-9.5 bg-white/5 border border-white/10 text-zinc-300 text-sm font-mono"
            />
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-6 flex-wrap">
          <label className="inline-flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-white/10 bg-white/5 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
              checked={!!formData.retrieve_embedded_resources}
              onChange={e => onFieldChange('retrieve_embedded_resources', e.target.checked)}
            />
            <span>Retrieve all Embedded Resources</span>
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-white/10 bg-white/5 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
              checked={effectiveRedirectAutomatically}
              disabled={hasRecordedRedirectFollowUp}
              onChange={e => onFieldChange('redirect_automatically', e.target.checked)}
            />
            <span>Redirect Automatically</span>
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-white/10 bg-white/5 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
              checked={effectiveFollowRedirects}
              disabled={hasRecordedRedirectFollowUp}
              onChange={e => onFieldChange('follow_redirects', e.target.checked)}
            />
            <span>Follow Redirects</span>
          </label>
        </div>
        {hasRecordedRedirectFollowUp && (
          <div className="mt-2 text-xs text-zinc-500">
            This request leads to the next recorded step, so redirect behavior is derived from the recording.
          </div>
        )}
      </div>

      <QueryParamsEditor
        url={formData.url || ''}
        onUrlChange={url => onFieldChange('url', url)}
        showBaseUrl={false}
      />

      <div>
        <div className="flex items-center gap-2 mb-2">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Request Body</p>
        </div>
        <div className="p-3 border border-white/10 rounded bg-[#0a0a0a]">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                value={searchText}
                onChange={e => onSearchChange(e.target.value)}
                placeholder="Search in request body..."
                className="pl-9 pr-3 bg-white/5 border-white/10 text-zinc-300 text-sm focus-visible:border-yellow-400/60 focus-visible:ring-yellow-400/30"
              />
            </div>
            <div className="flex items-center rounded-md border border-white/10 bg-white/5 p-0.5">
              <button
                onClick={() => onSearchModeChange('text')}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  searchMode === 'text'
                    ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/40'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Text
              </button>
              <button
                onClick={() => onSearchModeChange('regex')}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  searchMode === 'regex'
                    ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/40'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Regex
              </button>
            </div>
            <Input
              value={replaceValue}
              onChange={e => onReplaceValueChange(e.target.value)}
              placeholder="Replace"
              className="w-[18ch] bg-white/5 border-white/10 text-zinc-300 text-sm"
            />
            <button
              onClick={handleReplaceCurrent}
              disabled={totalMatches === 0}
              className="px-2 py-1.5 text-xs rounded border border-white/10 text-zinc-300 disabled:opacity-40"
            >
              Replace
            </button>
            <button
              onClick={handleReplaceAll}
              disabled={totalMatches === 0}
              className="px-2 py-1.5 text-xs rounded border border-white/10 text-zinc-300 disabled:opacity-40"
            >
              Replace All
            </button>
            {searchText && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-zinc-400 px-2 min-w-15 text-center font-mono">
                  {totalMatches > 0 ? `${currentMatchIndex + 1}/${totalMatches}` : '0/0'}
                </span>
                <button
                  onClick={handlePrevious}
                  disabled={totalMatches === 0}
                  className="p-1.5 hover:bg-white/10 rounded border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Previous match"
                >
                  <ChevronUp className="w-4 h-4 text-zinc-400" />
                </button>
                <button
                  onClick={handleNext}
                  disabled={totalMatches === 0}
                  className="p-1.5 hover:bg-white/10 rounded border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Next match"
                >
                  <ChevronDown className="w-4 h-4 text-zinc-400" />
                </button>
              </div>
            )}
          </div>
          {regexInvalid && <div className="mt-2 text-xs text-red-400">Invalid regex pattern</div>}
        </div>
      </div>
      <div className="flex items-center gap-2 mb-2 mt-3">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Format / Body Type</p>
      </div>
      <BodyTypeSelector
        body={formData.body}
        onBodyChange={body => onFieldChange('body', body)}
        searchText={searchText}
        searchMode={searchMode}
        currentMatchIndex={currentMatchIndex}
        hideTypeLabel
      />

      {formData.think_time && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">⏱ Think Time</p>
          </div>
          <div className="px-3 py-2 bg-cyan-400/5 border border-cyan-400/20 rounded text-sm font-mono text-cyan-400">
            {String(formData.think_time)}
          </div>
        </div>
      )}

      <div>
        <div className="grid grid-cols-5 gap-3 items-start w-full">
          <div className="min-w-0">
            <label
              htmlFor="req-timeout"
              className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2"
            >
              Timeout
            </label>
            <Input
              id="req-timeout"
              value={formData.timeout === '30s' ? '' : formData.timeout || ''}
              onChange={e => onFieldChange('timeout', e.target.value)}
              placeholder=""
              className="w-full h-9.5 bg-white/5 border border-white/10 text-zinc-300 text-sm font-mono"
            />
          </div>
          <div className="min-w-0">
            <label
              htmlFor="req-cookie-override"
              className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2"
            >
              Cookie Override
            </label>
            <select
              id="req-cookie-override"
              value={formData.cookie_override || 'inherit'}
              onChange={e => onFieldChange('cookie_override', e.target.value)}
              className="block w-full h-9.5 px-3 py-2 bg-[#1a1a1a] border border-white/10 rounded text-sm text-zinc-300 font-mono"
            >
              <option value="inherit">inherit</option>
              <option value="enabled">enabled</option>
              <option value="disabled">disabled</option>
            </select>
          </div>
          <div className="min-w-0">
            <label
              htmlFor="req-cache-override"
              className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2"
            >
              Cache Override
            </label>
            <select
              id="req-cache-override"
              value={formData.cache_override || 'inherit'}
              onChange={e => onFieldChange('cache_override', e.target.value)}
              className="block w-full h-9.5 px-3 py-2 bg-[#1a1a1a] border border-white/10 rounded text-sm text-zinc-300 font-mono"
            >
              <option value="inherit">inherit</option>
              <option value="enabled">enabled</option>
              <option value="disabled">disabled</option>
            </select>
          </div>
          <div className="min-w-0">
            <label
              htmlFor="req-throughput"
              className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2"
            >
              Throughput (Request)
            </label>
            <select
              id="req-throughput"
              value={formData.throughput?.enabled ? 'enabled' : 'disabled'}
              onChange={e => {
                if (e.target.value === 'enabled') {
                  const next = {
                    enabled: true,
                    target_rps: formData.throughput?.target_rps || 1,
                  };
                  onFieldChange('throughput', next);
                } else {
                  onFieldChange('throughput', undefined);
                }
              }}
              className="block w-full h-9.5 px-3 py-2 bg-[#1a1a1a] border border-white/10 rounded text-sm text-zinc-300 font-mono"
            >
              <option value="enabled">enabled</option>
              <option value="disabled">disabled</option>
            </select>
          </div>
          <div className={`min-w-0 ${formData.throughput?.enabled ? '' : 'opacity-55'}`}>
            <label
              htmlFor="req-target-rps"
              className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2"
            >
              Target RPS
            </label>
            <Input
              id="req-target-rps"
              type="number"
              min="0.1"
              step="0.1"
              value={formData.throughput?.target_rps ?? ''}
              disabled={!formData.throughput?.enabled}
              onChange={e => {
                const raw = e.target.value;
                const next = raw === '' ? undefined : Number(raw);
                onFieldChange('throughput', {
                  ...formData.throughput,
                  enabled: true,
                  target_rps: next,
                });
              }}
              className="w-full h-9.5 bg-white/5 border border-white/10 text-zinc-300 text-sm font-mono"
            />
            <div className="mt-1 text-xs text-zinc-500">
              Approx: {((Number(formData.throughput?.target_rps) || 0) * 60).toFixed(0)} req/min
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
