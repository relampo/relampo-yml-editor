import { useState, useEffect } from 'react';
import { Plus, Trash2, AlertCircle, Info } from 'lucide-react';
import { Input } from '../ui/input';

interface QueryParam {
  key: string;
  value: string;
  enabled: boolean;
}

interface QueryParamsEditorProps {
  url: string;
  onUrlChange: (url: string) => void;
  className?: string;
}

export function QueryParamsEditor({ url, onUrlChange, className = '' }: QueryParamsEditorProps) {
  const [params, setParams] = useState<QueryParam[]>([]);
  const [baseUrl, setBaseUrl] = useState('');
  const [urlHint, setUrlHint] = useState<{ type: 'error' | 'warning' | 'info' | null; message: string }>({ type: null, message: '' });

  // Parse URL to extract base and params
  useEffect(() => {
    try {
      if (!url) {
        setBaseUrl('');
        setParams([]);
        return;
      }

      const urlObj = new URL(url.startsWith('http') ? url : `http://placeholder${url}`);
      const base = url.startsWith('http') 
        ? `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`
        : urlObj.pathname;
      
      setBaseUrl(base);

      const parsedParams: QueryParam[] = [];
      urlObj.searchParams.forEach((value, key) => {
        parsedParams.push({ key, value, enabled: true });
      });
      setParams(parsedParams.length > 0 ? parsedParams : [{ key: '', value: '', enabled: true }]);
    } catch {
      // If URL is invalid, just set it as base
      setBaseUrl(url);
      setParams([{ key: '', value: '', enabled: true }]);
    }
  }, [url]);

  // Build URL from base and params
  const buildUrl = (newBase: string, newParams: QueryParam[]) => {
    const enabledParams = newParams.filter(p => p.enabled && p.key.trim());
    
    if (enabledParams.length === 0) {
      return newBase;
    }

    const queryString = enabledParams
      .map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
      .join('&');
    
    return `${newBase}${newBase.includes('?') ? '&' : '?'}${queryString}`;
  };

  const handleBaseUrlChange = (newBase: string) => {
    setBaseUrl(newBase);
    onUrlChange(buildUrl(newBase, params));
    validateUrl(newBase);
  };

  // Soft validation - doesn't block, just provides hints
  const validateUrl = (urlToValidate: string) => {
    if (!urlToValidate || urlToValidate.trim() === '') {
      setUrlHint({ type: null, message: '' });
      return;
    }

    // Check if contains variables - always valid
    if (urlToValidate.includes('${')) {
      setUrlHint({ type: 'info', message: 'Contains variables - will be resolved at runtime' });
      return;
    }

    // Try to parse as URL
    try {
      // Add protocol if missing for validation
      const testUrl = urlToValidate.startsWith('http') ? urlToValidate : `http://${urlToValidate}`;
      new URL(testUrl);
      setUrlHint({ type: null, message: '' }); // Valid!
    } catch {
      // Check common mistakes
      if (urlToValidate.startsWith('htp://') || urlToValidate.startsWith('htps://')) {
        setUrlHint({ type: 'error', message: 'Protocol typo? Use "http://" or "https://"' });
      } else if (urlToValidate.includes(' ')) {
        setUrlHint({ type: 'warning', message: 'URL contains spaces' });
      } else if (!urlToValidate.includes('/') && !urlToValidate.includes('.')) {
        setUrlHint({ type: 'warning', message: 'This doesn\'t look like a valid URL' });
      } else {
        setUrlHint({ type: 'warning', message: 'URL format may be incorrect' });
      }
    }
  };

  const handleParamChange = (index: number, field: 'key' | 'value' | 'enabled', value: string | boolean) => {
    const newParams = [...params];
    newParams[index] = { ...newParams[index], [field]: value };
    setParams(newParams);
    onUrlChange(buildUrl(baseUrl, newParams));
  };

  const handleAddParam = () => {
    setParams([...params, { key: '', value: '', enabled: true }]);
  };

  const handleRemoveParam = (index: number) => {
    const newParams = params.filter((_, i) => i !== index);
    setParams(newParams.length > 0 ? newParams : [{ key: '', value: '', enabled: true }]);
    onUrlChange(buildUrl(baseUrl, newParams.length > 0 ? newParams : []));
  };

  return (
    <div className={className}>
      {/* Base URL */}
      <div className="mb-4">
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
          Base URL
        </label>
        <Input
          value={baseUrl}
          onChange={(e) => handleBaseUrlChange(e.target.value)}
          placeholder="https://api.example.com/endpoint"
          className={`w-full bg-white/5 text-zinc-300 text-sm font-mono ${
            urlHint.type === 'error' ? 'border-red-400/40' :
            urlHint.type === 'warning' ? 'border-yellow-400/40' :
            urlHint.type === 'info' ? 'border-blue-400/40' :
            'border-white/10'
          }`}
        />
        {urlHint.type && (
          <div className={`flex items-start gap-1.5 mt-1.5 text-xs ${
            urlHint.type === 'error' ? 'text-red-400' :
            urlHint.type === 'warning' ? 'text-yellow-400' :
            'text-blue-400'
          }`}>
            {urlHint.type === 'error' ? (
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            ) : (
              <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            )}
            <span>{urlHint.message}</span>
          </div>
        )}
      </div>

      {/* Query Parameters */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Query Parameters
          </label>
          <button
            onClick={handleAddParam}
            className="flex items-center gap-1 px-2 py-1 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10 rounded transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add
          </button>
        </div>

        <div className="space-y-2">
          {params.map((param, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={param.enabled}
                onChange={(e) => handleParamChange(index, 'enabled', e.target.checked)}
                className="w-4 h-4 rounded border-white/10 bg-white/5 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
              />
              <Input
                value={param.key}
                onChange={(e) => handleParamChange(index, 'key', e.target.value)}
                placeholder="param_name"
                className="flex-1 bg-white/5 border-white/10 text-zinc-300 text-sm font-mono"
              />
              <span className="text-zinc-600">=</span>
              <Input
                value={param.value}
                onChange={(e) => handleParamChange(index, 'value', e.target.value)}
                placeholder="value"
                className="flex-1 bg-white/5 border-white/10 text-zinc-300 text-sm font-mono"
              />
              <button
                onClick={() => handleRemoveParam(index)}
                className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
