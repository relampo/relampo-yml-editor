import { useState, useEffect } from 'react';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { Plus, Trash2, AlertCircle, CheckCircle } from 'lucide-react';

type BodyType = 'none' | 'json' | 'form' | 'raw';

interface BodyTypeSelectorProps {
  body: any;
  onBodyChange: (body: any, type: BodyType) => void;
  className?: string;
}

interface FormDataItem {
  key: string;
  value: string;
  enabled: boolean;
}

export function BodyTypeSelector({ body, onBodyChange, className = '' }: BodyTypeSelectorProps) {
  const [bodyType, setBodyType] = useState<BodyType>('none');
  const [jsonValue, setJsonValue] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [rawValue, setRawValue] = useState('');
  const [formData, setFormData] = useState<FormDataItem[]>([{ key: '', value: '', enabled: true }]);

  // Detect body type and initialize values
  useEffect(() => {
    if (!body || Object.keys(body).length === 0) {
      setBodyType('none');
      return;
    }

    // Try to detect type
    if (typeof body === 'string') {
      // Could be JSON string or raw text
      try {
        JSON.parse(body);
        setBodyType('json');
        setJsonValue(body);
      } catch {
        setBodyType('raw');
        setRawValue(body);
      }
    } else if (typeof body === 'object') {
      // Could be JSON object or form data
      const keys = Object.keys(body);
      const seemsLikeFormData = keys.every(k => typeof body[k] === 'string' || typeof body[k] === 'number');
      
      if (seemsLikeFormData && keys.length <= 20) {
        setBodyType('form');
        const items: FormDataItem[] = keys.map(k => ({
          key: k,
          value: String(body[k]),
          enabled: true
        }));
        setFormData(items.length > 0 ? items : [{ key: '', value: '', enabled: true }]);
      } else {
        setBodyType('json');
        setJsonValue(JSON.stringify(body, null, 2));
      }
    }
  }, [body]);

  const handleBodyTypeChange = (newType: BodyType) => {
    setBodyType(newType);
    
    // Clear errors
    setJsonError('');
    
    // Convert content if needed
    if (newType === 'none') {
      onBodyChange(null, newType);
    } else if (newType === 'json' && bodyType === 'form') {
      // Convert form data to JSON
      const obj: Record<string, string> = {};
      formData.filter(item => item.enabled && item.key).forEach(item => {
        obj[item.key] = item.value;
      });
      setJsonValue(JSON.stringify(obj, null, 2));
      onBodyChange(obj, newType);
    } else if (newType === 'form' && bodyType === 'json') {
      // Convert JSON to form data
      try {
        const obj = JSON.parse(jsonValue);
        const items: FormDataItem[] = Object.entries(obj).map(([k, v]) => ({
          key: k,
          value: String(v),
          enabled: true
        }));
        setFormData(items.length > 0 ? items : [{ key: '', value: '', enabled: true }]);
        onBodyChange(obj, newType);
      } catch {
        setFormData([{ key: '', value: '', enabled: true }]);
      }
    }
  };

  const handleJsonChange = (value: string) => {
    setJsonValue(value);
    
    try {
      const parsed = JSON.parse(value);
      setJsonError('');
      onBodyChange(parsed, 'json');
    } catch (e: any) {
      setJsonError(e.message);
      // Still save it as string in case user wants to use variables
      onBodyChange(value, 'json');
    }
  };

  const handleRawChange = (value: string) => {
    setRawValue(value);
    onBodyChange(value, 'raw');
  };

  const handleFormDataChange = (index: number, field: 'key' | 'value' | 'enabled', value: string | boolean) => {
    const newFormData = [...formData];
    newFormData[index] = { ...newFormData[index], [field]: value };
    setFormData(newFormData);
    
    // Convert to object
    const obj: Record<string, string> = {};
    newFormData.filter(item => item.enabled && item.key.trim()).forEach(item => {
      obj[item.key] = item.value;
    });
    onBodyChange(obj, 'form');
  };

  const handleAddFormDataItem = () => {
    setFormData([...formData, { key: '', value: '', enabled: true }]);
  };

  const handleRemoveFormDataItem = (index: number) => {
    const newFormData = formData.filter((_, i) => i !== index);
    setFormData(newFormData.length > 0 ? newFormData : [{ key: '', value: '', enabled: true }]);
    
    const obj: Record<string, string> = {};
    newFormData.filter(item => item.enabled && item.key.trim()).forEach(item => {
      obj[item.key] = item.value;
    });
    onBodyChange(obj, 'form');
  };

  return (
    <div className={className}>
      {/* Body Type Selector */}
      <div className="mb-4">
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-3">
          Body Type
        </label>
        <div className="flex gap-2">
          {[
            { type: 'none' as BodyType, label: 'None' },
            { type: 'json' as BodyType, label: 'JSON' },
            { type: 'form' as BodyType, label: 'Form Data' },
            { type: 'raw' as BodyType, label: 'Raw Text' },
          ].map(({ type, label }) => (
            <button
              key={type}
              onClick={() => handleBodyTypeChange(type)}
              className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
                bodyType === type
                  ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/30'
                  : 'bg-white/5 text-zinc-400 border border-white/10 hover:text-zinc-300 hover:bg-white/10'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Body Content Editors */}
      {bodyType === 'json' && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              JSON Body
            </label>
            {jsonError ? (
              <div className="flex items-center gap-1 text-xs text-red-400">
                <AlertCircle className="w-3 h-3" />
                Invalid JSON
              </div>
            ) : jsonValue && (
              <div className="flex items-center gap-1 text-xs text-green-400">
                <CheckCircle className="w-3 h-3" />
                Valid JSON
              </div>
            )}
          </div>
          <Textarea
            value={jsonValue}
            onChange={(e) => handleJsonChange(e.target.value)}
            placeholder='{\n  "key": "value"\n}'
            className="w-full bg-white/5 border-white/10 text-zinc-300 text-sm font-mono min-h-[200px]"
          />
          {jsonError && (
            <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400 font-mono">
              {jsonError}
            </div>
          )}
        </div>
      )}

      {bodyType === 'form' && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Form Data (application/x-www-form-urlencoded)
            </label>
            <button
              onClick={handleAddFormDataItem}
              className="flex items-center gap-1 px-2 py-1 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10 rounded transition-colors"
            >
              <Plus className="w-3 h-3" />
              Add Field
            </button>
          </div>
          <div className="space-y-2">
            {formData.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={item.enabled}
                  onChange={(e) => handleFormDataChange(index, 'enabled', e.target.checked)}
                  className="w-4 h-4 rounded border-white/10 bg-white/5 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
                />
                <Input
                  value={item.key}
                  onChange={(e) => handleFormDataChange(index, 'key', e.target.value)}
                  placeholder="field_name"
                  className="flex-1 bg-white/5 border-white/10 text-zinc-300 text-sm font-mono"
                />
                <span className="text-zinc-600">=</span>
                <Input
                  value={item.value}
                  onChange={(e) => handleFormDataChange(index, 'value', e.target.value)}
                  placeholder="value"
                  className="flex-1 bg-white/5 border-white/10 text-zinc-300 text-sm font-mono"
                />
                <button
                  onClick={() => handleRemoveFormDataItem(index)}
                  className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {bodyType === 'raw' && (
        <div>
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
            Raw Body (text/plain)
          </label>
          <Textarea
            value={rawValue}
            onChange={(e) => handleRawChange(e.target.value)}
            placeholder="Enter raw text content..."
            className="w-full bg-white/5 border-white/10 text-zinc-300 text-sm font-mono min-h-[200px]"
          />
        </div>
      )}

      {bodyType === 'none' && (
        <div className="p-6 text-center text-zinc-500 text-sm border border-dashed border-white/10 rounded">
          No body content
        </div>
      )}
    </div>
  );
}
