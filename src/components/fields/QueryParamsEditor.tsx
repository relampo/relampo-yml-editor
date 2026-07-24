import { AlertCircle, Info, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { HighlightedInput } from '../ui/HighlightedInput';
import { Input } from '../ui/input';
import { buildRequestUrlWithQuery, parseRequestQueryParams, parseRequestUrl } from './requestUrl';

interface QueryParam {
  id: string;
  key: string;
  value: string;
}

function createQueryParam(overrides: Partial<Omit<QueryParam, 'id'>> = {}): QueryParam {
  return { id: crypto.randomUUID(), key: '', value: '', ...overrides };
}

interface QueryParamsEditorProps {
  url: string;
  onUrlChange: (url: string) => void;
  className?: string;
  showBaseUrl?: boolean;
  searchText?: string;
}

export function QueryParamsEditor({ url, onUrlChange, className = '', showBaseUrl = true, searchText = '' }: QueryParamsEditorProps) {
  const [params, setParams] = useState<QueryParam[]>([]);
  const [baseUrl, setBaseUrl] = useState('');
  const [urlHint, setUrlHint] = useState<{
    type: 'error' | 'warning' | 'info' | null;
    message: string;
  }>({ type: null, message: '' });
  const [trackedUrl, setTrackedUrl] = useState<string | undefined>(undefined);

  // Re-derives baseUrl/params whenever `url` changes identity: switching to
  // a different request, or `url` round-tripping back through onUrlChange
  // after an edit below. Uses the store-previous-prop-and-compare-during
  // -render pattern instead of an effect so the parse lands in the same
  // render as the prop change (including the first render) rather than one
  // render later.
  if (url !== trackedUrl) {
    setTrackedUrl(url);
    if (!url) {
      setBaseUrl('');
      setParams([]);
    } else {
      const parts = parseRequestUrl(url);
      const base = parts.isAbsolute ? `${parts.protocol}://${parts.baseUrl}${parts.path}` : parts.path;

      setBaseUrl(base);

      const parsedParams = parseRequestQueryParams(url).map(p => createQueryParam(p));
      setParams(parsedParams.length > 0 ? parsedParams : [createQueryParam()]);
    }
  }

  const handleBaseUrlChange = (newBase: string) => {
    setBaseUrl(newBase);
    onUrlChange(buildRequestUrlWithQuery(newBase, params));
    validateUrl(newBase);
  };

  const validateUrl = (urlToValidate: string) => {
    if (!urlToValidate || urlToValidate.trim() === '') {
      setUrlHint({ type: null, message: '' });
      return;
    }

    if (urlToValidate.includes('${')) {
      setUrlHint({
        type: 'info',
        message: 'Contains variables - will be resolved at runtime',
      });
      return;
    }

    try {
      const testUrl = urlToValidate.startsWith('http') ? urlToValidate : `http://${urlToValidate}`;
      new URL(testUrl);
      setUrlHint({ type: null, message: '' });
    } catch {
      if (urlToValidate.startsWith('htp://') || urlToValidate.startsWith('htps://')) {
        setUrlHint({
          type: 'error',
          message: 'Protocol typo? Use "http://" or "https://"',
        });
      } else if (urlToValidate.includes(' ')) {
        setUrlHint({ type: 'warning', message: 'URL contains spaces' });
      } else if (!urlToValidate.includes('/') && !urlToValidate.includes('.')) {
        setUrlHint({
          type: 'warning',
          message: "This doesn't look like a valid URL",
        });
      } else {
        setUrlHint({ type: 'warning', message: 'URL format may be incorrect' });
      }
    }
  };

  const handleParamChange = (index: number, field: 'key' | 'value', value: string) => {
    const newParams = [...params];
    newParams[index] = { ...newParams[index], [field]: value };
    setParams(newParams);
    onUrlChange(buildRequestUrlWithQuery(baseUrl, newParams));
  };

  const handleAddParam = () => {
    setParams([...params, createQueryParam()]);
  };

  const handleRemoveParam = (index: number) => {
    const newParams = params.filter((_, i) => i !== index);
    setParams(newParams.length > 0 ? newParams : [createQueryParam()]);
    onUrlChange(buildRequestUrlWithQuery(baseUrl, newParams.length > 0 ? newParams : []));
  };

  return (
    <div className={className}>
      {showBaseUrl && (
        <div className="mb-4">
          <label htmlFor="queryparams-base-url" className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Base URL</label>
          <Input
            id="queryparams-base-url"
            value={baseUrl}
            onChange={e => handleBaseUrlChange(e.target.value)}
            placeholder="https://api.example.com/endpoint"
            className={`w-full bg-white/5 text-zinc-300 text-sm font-mono ${
              urlHint.type === 'error'
                ? 'border-red-400/40'
                : urlHint.type === 'warning'
                  ? 'border-yellow-400/40'
                  : urlHint.type === 'info'
                    ? 'border-blue-400/40'
                    : 'border-white/10'
            }`}
          />
          {urlHint.type && (
            <div
              className={`flex items-start gap-1.5 mt-1.5 text-xs ${
                urlHint.type === 'error'
                  ? 'text-red-400'
                  : urlHint.type === 'warning'
                    ? 'text-yellow-400'
                    : 'text-blue-400'
              }`}
            >
              {urlHint.type === 'error' ? (
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              ) : (
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              )}
              <span>{urlHint.message}</span>
            </div>
          )}
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Query Parameters</span>
          <button type="button"
            onClick={handleAddParam}
            className="flex items-center gap-1 px-2 py-1 text-xs text-amber-500 hover:text-amber-400 border border-yellow-400/20 bg-yellow-400/5 hover:bg-yellow-400/10 hover:border-yellow-400/35 rounded transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add
          </button>
        </div>

        <div className="space-y-0 border-t border-white/5">
          {params.map((param, index) => (
            <div
              key={param.id}
              className="py-2 px-1 border-b border-white/5 flex items-center gap-3 w-full min-w-0 hover:bg-white/2 transition-colors group"
            >
              <div className="flex-1 flex items-center gap-3 min-w-0">
                <div className="flex items-center gap-2 shrink-0 w-[250px]">
                  <HighlightedInput
                    value={param.key}
                    onChange={e => handleParamChange(index, 'key', e.target.value)}
                    placeholder="name"
                    containerClass="flex-1 min-w-0"
                    className="w-full px-2 py-1 text-xs font-mono text-yellow-400 bg-yellow-400/5 border-yellow-400/20"
                    searchText={searchText}
                    overlayClass="px-2 text-xs font-mono text-yellow-400"
                  />
                  <span className="text-zinc-500 font-bold shrink-0">=</span>
                </div>
                <div className="w-0 flex-1 min-w-0 overflow-x-auto scrollbar-none">
                  <HighlightedInput
                    value={param.value}
                    onChange={e => handleParamChange(index, 'value', e.target.value)}
                    placeholder="value"
                    className="w-full px-2 py-1 text-sm font-mono text-zinc-300 bg-white/5 border-white/10"
                    searchText={searchText}
                    overlayClass="px-2 text-sm font-mono text-zinc-300"
                  />
                </div>
              </div>
              <button type="button"
                onClick={() => handleRemoveParam(index)}
                className="p-2 h-9 text-zinc-500 hover:text-red-400 bg-white/5 hover:bg-white/10 rounded shrink-0 transition-colors"
                title="Remove parameter"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
