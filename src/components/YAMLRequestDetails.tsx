import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { RedirectSourceInfo, YAMLNode, YAMLNodeData, YAMLValue } from '../types/yaml';
import { BodyTypeSelector, type BodyType } from './fields/BodyTypeSelector';
import { MethodDropdown } from './fields/MethodDropdown';
import { QueryParamsEditor } from './fields/QueryParamsEditor';
import { buildRequestUrl, parseRequestUrl } from './fields/requestUrl';
import { getRequestNodeHost } from '../utils/requestNodeDisplay';
import { HighlightedInput } from './ui/HighlightedInput';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { YAMLResponseDetails } from './YAMLResponseDetails';
import type { SearchMode } from './debugSearch';

const FALLBACK_BASE_URL_PLACEHOLDER = 'api.example.com';
type YAMLRecord = { [key: string]: YAMLValue | undefined };

interface YAMLRequestDetailsProps {
  node: YAMLNode;
  baseUrl?: string;
  redirectSourceInfo?: RedirectSourceInfo | null;
  onNodeUpdate?: (nodeId: string, updatedData: YAMLNodeData) => void;
  searchQuery?: string;
}

type Tab = 'request' | 'response';
const HTTP_METHOD_NODE_TYPES = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'];

function getNodeMethodFallback(node: YAMLNode): string {
  return HTTP_METHOD_NODE_TYPES.includes(node.type) ? node.type.toUpperCase() : 'GET';
}

function getStringValue(value: YAMLValue, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function getNumberValue(value: YAMLValue): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

function getRecordValue(value: YAMLValue): YAMLRecord | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : undefined;
}

function getHeaderValue(headers: YAMLRecord | undefined, name: string): string {
  if (!headers) return '';

  const target = name.toLowerCase();
  const match = Object.entries(headers).find(([key]) => key.toLowerCase() === target);
  const value = match?.[1];
  return value == null || typeof value === 'object' ? '' : String(value);
}

function getBodyText(value: YAMLValue): string {
  if (!value) return '';
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}

export function YAMLRequestDetails({
  node,
  baseUrl = '',
  redirectSourceInfo = null,
  onNodeUpdate,
  searchQuery = '',
}: YAMLRequestDetailsProps) {
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
  // When the recorded follow-up (redirect target) is disabled, the redirect
  // linkage no longer applies, so the source request's redirect options behave
  // like normal editable checkboxes again.
  const hasRecordedRedirectFollowUp = Boolean(redirectSourceInfo) && redirectSourceInfo?.targetDisabled !== true;
  // The selected request itself is disabled: keep all fields visible but
  // non-editable so users can inspect without accidentally editing dead data.
  const isRequestDisabled = node.data?.enabled === false;
  const requestMethod = getStringValue(formData.method, getNodeMethodFallback(node));
  const effectiveRedirectAutomatically = formData.redirect_automatically === true;
  const effectiveFollowRedirects = formData.follow_redirects === true;

  useEffect(() => {
    setFormData(node.data || {});
  }, [node.id, node.data]);

  const commitFormData = (newData: YAMLNodeData) => {
    setFormData(newData);
    if (onNodeUpdate) {
      onNodeUpdate(node.id, newData);
    }
  };

  const handleFieldChange = (field: string, value: YAMLValue) => {
    const newData = { ...formData, [field]: value };
    // The two redirect modes are mutually exclusive.
    // Toggling one always clears the other so the YAML never carries both flags.
    if (field === 'redirect_automatically') {
      delete newData.follow_redirects;
    } else if (field === 'follow_redirects') {
      delete newData.redirect_automatically;
    }
    commitFormData(newData);
  };

  const handleBodyChange = (body: YAMLValue, type: BodyType) => {
    const newData = { ...formData };

    if (type === 'none') {
      delete newData.body;
      delete newData.body_raw;
    } else if (type === 'raw' && typeof formData.body_raw === 'string') {
      newData.body_raw = typeof body === 'string' ? body : getBodyText(body);
      delete newData.body;
    } else {
      newData.body = body;
      if (type === 'json' || type === 'form') {
        delete newData.body_raw;
      }
    }

    commitFormData(newData);
  };

  const manualSearch = activeTab === 'request' ? requestSearch : responseSearch;
  // A search typed directly in the details panel always wins over the tree
  // search, so users can still search the selected body while a tree filter
  // is active.
  const searchText = manualSearch.trim() ? manualSearch : searchQuery.trim();

  // The tree search can change searchText without going through
  // handleSearchChange; keep the match cursor in range when that happens.
  useEffect(() => {
    setCurrentMatchIndex(0);
  }, [searchText]);
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
                ? 'text-yellow-400 bg-yellow-400/10 border-b-2 border-yellow-400'
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
        <fieldset
          disabled={isRequestDisabled}
          className={`min-w-0 border-0 p-0 m-0 ${isRequestDisabled ? 'opacity-60' : ''}`}
        >
        {activeTab === 'request' ? (
          <RequestContent
            formData={formData}
            baseUrl={baseUrl}
            hasRecordedRedirectFollowUp={hasRecordedRedirectFollowUp}
            effectiveRedirectAutomatically={effectiveRedirectAutomatically}
            effectiveFollowRedirects={effectiveFollowRedirects}
            requestMethod={requestMethod}
            onFieldChange={handleFieldChange}
            onBodyChange={handleBodyChange}
            searchText={searchText}
            searchInputValue={requestSearch}
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
            searchInputValue={responseSearch}
            searchMode={searchMode}
            replaceValue={replaceValue}
            currentMatchIndex={currentMatchIndex}
            onSearchChange={handleSearchChange}
            onSearchModeChange={handleSearchModeChange}
            onReplaceValueChange={handleReplaceChange}
            onNavigate={setCurrentMatchIndex}
          />
        )}
        </fieldset>
      </div>
    </div>
  );
}

interface RequestContentProps {
  formData: YAMLNodeData;
  baseUrl: string;
  hasRecordedRedirectFollowUp: boolean;
  effectiveRedirectAutomatically: boolean;
  effectiveFollowRedirects: boolean;
  requestMethod: string;
  onFieldChange: (field: string, value: YAMLValue) => void;
  onBodyChange: (body: YAMLValue, type: BodyType) => void;
  searchText: string;
  searchInputValue: string;
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
  baseUrl,
  hasRecordedRedirectFollowUp,
  effectiveRedirectAutomatically,
  effectiveFollowRedirects,
  requestMethod,
  onFieldChange,
  onBodyChange,
  searchText,
  searchInputValue,
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

  const requestUrl = getStringValue(formData.url);
  const timeoutValue = getStringValue(formData.timeout);
  const cookieOverride = getStringValue(formData.cookie_override, 'inherit');
  const cacheOverride = getStringValue(formData.cache_override, 'inherit');
  const throughput = getRecordValue(formData.throughput);
  const throughputEnabled = throughput?.enabled === true;
  const targetRps = getNumberValue(throughput?.target_rps);
  const contentType = getHeaderValue(getRecordValue(formData.headers), 'Content-Type');
  const urlParts = parseRequestUrl(requestUrl);
  // Host inherited from http_defaults.base_url. Base-host (relative) requests now
  // surface it as the field value too — not just as a placeholder — so every
  // request shows its host uniformly and editably, matching the secondary-host
  // (absolute) requests instead of looking empty/non-editable. See RLP-414.
  const inheritedHost = getRequestNodeHost(baseUrl) || baseUrl.trim();
  const baseUrlPlaceholder = inheritedHost || FALLBACK_BASE_URL_PLACEHOLDER;
  const displayBaseUrl = urlParts.baseUrl || inheritedHost;
  const rawUrl = requestUrl.trim();
  const pathInputValue = rawUrl === '' ? '' : urlParts.path;
  const requestBodyText = getBodyText(formData.body);

  const handlePathChange = (value: string) => {
    if (value.trim() === '') {
      if (!urlParts.isAbsolute && !urlParts.baseUrl && !urlParts.query) {
        onFieldChange('url', '');
        return;
      }

      onFieldChange('url', buildRequestUrl(requestUrl, { path: '' }));
      return;
    }

    onFieldChange('url', buildRequestUrl(requestUrl, { path: value }));
  };

  const handleBaseUrlChange = (value: string) => {
    const trimmed = value.trim();
    // Leaving the field at the inherited host keeps the URL relative so a base-host
    // request inherits from http_defaults instead of being pinned to an absolute
    // URL. A different (or empty) host writes it explicitly.
    const nextBaseUrl = trimmed === inheritedHost ? '' : trimmed;
    onFieldChange('url', buildRequestUrl(requestUrl, { baseUrl: nextBaseUrl }));
  };

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
              value={requestMethod}
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
            <Select
              value={urlParts.protocol}
              onValueChange={value => onFieldChange('url', buildRequestUrl(requestUrl, { protocol: value }))}
            >
              <SelectTrigger id="req-protocol" className={`${compactInputClass} w-full`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-white/10 use-accent-yellow">
                <SelectItem value="https" className="font-mono">https</SelectItem>
                <SelectItem value="http" className="font-mono">http</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-4">
            <label
              htmlFor="req-base-url"
              className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2"
            >
              Base URL
            </label>
            <HighlightedInput
              id="req-base-url"
              value={displayBaseUrl}
              onChange={e => handleBaseUrlChange(e.target.value)}
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
              Path
            </label>
            <HighlightedInput
              id="req-path"
              value={pathInputValue}
              onChange={e => handlePathChange(e.target.value)}
              placeholder="/api/endpoint"
              className="w-full h-9.5 bg-white/5 border border-white/10 text-zinc-300 text-sm font-mono"
              searchText={searchText}
              overlayClass="px-3 text-sm text-zinc-300 font-mono"
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
              checked={formData.retrieve_embedded_resources === true}
              onChange={e => onFieldChange('retrieve_embedded_resources', e.target.checked)}
            />
            <span>Retrieve all Embedded Resources</span>
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-white/10 bg-white/5 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
              checked={effectiveRedirectAutomatically}
              onChange={e => onFieldChange('redirect_automatically', e.target.checked)}
            />
            <span>Redirect Automatically</span>
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-white/10 bg-white/5 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
              checked={effectiveFollowRedirects}
              onChange={e => onFieldChange('follow_redirects', e.target.checked)}
            />
            <span>Follow Redirects</span>
          </label>
        </div>
        {hasRecordedRedirectFollowUp && (
          <div className="mt-2 text-xs text-zinc-500">
            This request is part of a recorded redirect chain.
          </div>
        )}
      </div>

      <QueryParamsEditor
        url={requestUrl}
        onUrlChange={url => onFieldChange('url', url)}
        showBaseUrl={false}
        searchText={searchText}
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
                value={searchInputValue}
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
        bodyRaw={formData.body_raw}
        contentType={contentType}
        onBodyChange={onBodyChange}
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
              value={timeoutValue === '30s' ? '' : timeoutValue}
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
            <Select
              value={cookieOverride}
              onValueChange={value => onFieldChange('cookie_override', value)}
            >
              <SelectTrigger id="req-cookie-override" className={`${compactInputClass} w-full`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-white/10 use-accent-yellow">
                <SelectItem value="inherit">inherit</SelectItem>
                <SelectItem value="enabled">enabled</SelectItem>
                <SelectItem value="disabled">disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-0">
            <label
              htmlFor="req-cache-override"
              className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2"
            >
              Cache Override
            </label>
            <Select
              value={cacheOverride}
              onValueChange={value => onFieldChange('cache_override', value)}
            >
              <SelectTrigger id="req-cache-override" className={`${compactInputClass} w-full`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-white/10 use-accent-yellow">
                <SelectItem value="inherit">inherit</SelectItem>
                <SelectItem value="enabled">enabled</SelectItem>
                <SelectItem value="disabled">disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-0">
            <label
              htmlFor="req-throughput"
              className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2"
            >
              Throughput (Request)
            </label>
            <Select
              value={throughputEnabled ? 'enabled' : 'disabled'}
              onValueChange={value => {
                if (value === 'enabled') {
                  const next = {
                    enabled: true,
                    target_rps: targetRps ?? 1,
                  };
                  onFieldChange('throughput', next);
                } else {
                  onFieldChange('throughput', undefined);
                }
              }}
            >
              <SelectTrigger id="req-throughput" className={`${compactInputClass} w-full`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-white/10">
                <SelectItem value="enabled">enabled</SelectItem>
                <SelectItem value="disabled">disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className={`min-w-0 ${throughputEnabled ? '' : 'opacity-55'}`}>
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
              value={targetRps ?? ''}
              disabled={!throughputEnabled}
              onChange={e => {
                const raw = e.target.value;
                const next = raw === '' ? undefined : Number(raw);
                onFieldChange('throughput', {
                  ...throughput,
                  enabled: true,
                  target_rps: next,
                });
              }}
              className="w-full h-9.5 bg-white/5 border border-white/10 text-zinc-300 text-sm font-mono"
            />
            <div className="mt-1 text-xs text-zinc-500">
              Approx: {((targetRps || 0) * 60).toFixed(0)} req/min
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
