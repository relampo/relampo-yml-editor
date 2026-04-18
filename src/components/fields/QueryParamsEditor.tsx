import { AlertCircle, Info, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Input } from '../ui/input';
import { buildRequestUrlWithQuery, parseRequestQueryParams, parseRequestUrl } from './requestUrl';

interface QueryParam {
  key: string;
  value: string;
}

interface QueryParamsEditorProps {
  url: string;
  onUrlChange: (url: string) => void;
  className?: string;
  showBaseUrl?: boolean;
}

export function QueryParamsEditor({ url, onUrlChange, className = '', showBaseUrl = true }: QueryParamsEditorProps) {
  const [params, setParams] = useState<QueryParam[]>([]);
  const [baseUrl, setBaseUrl] = useState('');
  const [urlHint, setUrlHint] = useState<{
    type: 'error' | 'warning' | 'info' | null;
    message: string;
  }>({ type: null, message: '' });

  useEffect(() => {
    if (!url) {
      setBaseUrl('');
      setParams([]);
      return;
    }

    const parts = parseRequestUrl(url);
    const base = parts.isAbsolute ? `${parts.protocol}://${parts.baseUrl}${parts.path}` : parts.path;

    setBaseUrl(base);

    const parsedParams = parseRequestQueryParams(url);
    setParams(parsedParams.length > 0 ? parsedParams : [{ key: '', value: '' }]);
  }, [url]);

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
    setParams([...params, { key: '', value: '' }]);
  };

  const handleRemoveParam = (index: number) => {
    const newParams = params.filter((_, i) => i !== index);
    setParams(newParams.length > 0 ? newParams : [{ key: '', value: '' }]);
    onUrlChange(buildRequestUrlWithQuery(baseUrl, newParams.length > 0 ? newParams : []));
  };

  return (
    <div className={className}>
      {showBaseUrl && (
        <div className="mb-4">
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Base URL</label>
          <Input
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
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Query Parameters</label>
          <button
            onClick={handleAddParam}
            className="flex items-center gap-1 px-2 py-1 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10 rounded transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add
          </button>
        </div>

        <div className="space-y-0 border-t border-white/5">
          {params.map((param, index) => (
            <div
              key={index}
              className="py-2 px-1 border-b border-white/5 flex items-center gap-3 w-full min-w-0 hover:bg-white/2 transition-colors group"
            >
              <div className="flex-1 flex items-center gap-3 min-w-0">
                <div className="flex items-center gap-2 shrink-0 w-17.5">
                  <Input
                    value={param.key}
                    onChange={e => handleParamChange(index, 'key', e.target.value)}
                    placeholder="name"
                    className="flex-1 px-2 py-1 text-xs font-mono text-purple-400 bg-purple-400/5 border-purple-400/20"
                  />
                  <span className="text-zinc-500 font-bold shrink-0">=</span>
                </div>
                <div className="w-0 flex-1 min-w-0 overflow-x-auto scrollbar-none">
                  <Input
                    value={param.value}
                    onChange={e => handleParamChange(index, 'value', e.target.value)}
                    placeholder="value"
                    className="w-full px-2 py-1 text-sm font-mono text-zinc-300 bg-white/5 border-white/10"
                  />
                </div>
              </div>
              <button
                onClick={() => handleRemoveParam(index)}
                className="p-1 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all shrink-0"
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
