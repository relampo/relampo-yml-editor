import { useState, useEffect } from 'react';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { EditableList } from './EditableList';
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react';

interface YAMLResponseDetailsProps {
  response: any;
  onResponseUpdate: (updatedResponse: any) => void;
  searchText?: string;
  currentMatchIndex?: number; // Kept for API compatibility
}

export function YAMLResponseDetails({ 
  response, 
  onResponseUpdate,
  searchText = '',
}: YAMLResponseDetailsProps) {
  const [formData, setFormData] = useState(response || {});

  useEffect(() => {
    setFormData(response || {});
  }, [response]);

  const handleFieldChange = (field: string, value: any) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    onResponseUpdate(newData);
  };

  if (!response) {
    return (
      <div className="text-sm text-zinc-500 italic">
        No response data recorded
      </div>
    );
  }

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'text-green-400 bg-green-400/10 border-green-400/20';
    if (status >= 300 && status < 400) return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
    if (status >= 400 && status < 500) return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
    if (status >= 500) return 'text-red-400 bg-red-400/10 border-red-400/20';
    return 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20';
  };

  const getStatusIcon = (status: number) => {
    if (status >= 200 && status < 300) return <CheckCircle2 className="w-4 h-4" />;
    if (status >= 400) return <AlertCircle className="w-4 h-4" />;
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Status Code */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Status Code
          </label>
          {searchText && formData.status && String(formData.status).includes(searchText) && (
            <span className="text-xs text-yellow-400 flex items-center gap-1">
              <span>✓</span> Match
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Input
            type="number"
            value={formData.status || ''}
            onChange={(e) => handleFieldChange('status', parseInt(e.target.value) || 0)}
            className="w-32 px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
            placeholder="200"
          />
          <div className={`flex items-center gap-2 px-3 py-2 rounded border ${getStatusColor(formData.status)}`}>
            {getStatusIcon(formData.status)}
            <span className="text-sm font-semibold">
              {formData.status >= 200 && formData.status < 300 && 'Success'}
              {formData.status >= 300 && formData.status < 400 && 'Redirect'}
              {formData.status >= 400 && formData.status < 500 && 'Client Error'}
              {formData.status >= 500 && 'Server Error'}
            </span>
          </div>
        </div>
      </div>

      {/* Response Time */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Response Time (ms)
          </label>
          {searchText && formData.time_ms && String(formData.time_ms).includes(searchText) && (
            <span className="text-xs text-yellow-400 flex items-center gap-1">
              <span>✓</span> Match
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Input
            type="number"
            value={formData.time_ms || ''}
            onChange={(e) => handleFieldChange('time_ms', parseInt(e.target.value) || 0)}
            className="w-32 px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono"
            placeholder="150"
          />
          <div className="flex items-center gap-2 text-cyan-400">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-mono">
              {formData.time_ms ? `${formData.time_ms}ms` : 'Not set'}
            </span>
          </div>
        </div>
      </div>

      {/* Response Headers */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Response Headers
          </label>
          {searchText && formData.headers && Object.entries(formData.headers).some(([k, v]) => 
            k.toLowerCase().includes(searchText.toLowerCase()) || 
            String(v).toLowerCase().includes(searchText.toLowerCase())
          ) && (
            <span className="text-xs text-yellow-400 flex items-center gap-1">
              <span>✓</span> {Object.entries(formData.headers).filter(([k, v]) => 
                k.toLowerCase().includes(searchText.toLowerCase()) || 
                String(v).toLowerCase().includes(searchText.toLowerCase())
              ).length} match(es)
            </span>
          )}
        </div>
        <EditableList
          title=""
          items={formData.headers || {}}
          onUpdate={(headers) => handleFieldChange('headers', headers)}
          keyPlaceholder="Header-Name"
          valuePlaceholder="value"
          keyLabel="Header"
          valueLabel="Value"
          enableCheckboxes={false}
          enableBulkActions={false}
        />
      </div>

      {/* Response Body */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Response Body
          </label>
          {searchText && formData.body && (() => {
            const bodyStr = typeof formData.body === 'string' ? formData.body : JSON.stringify(formData.body, null, 2);
            const matchCount = bodyStr.toLowerCase().split(searchText.toLowerCase()).length - 1;
            return matchCount > 0 ? (
              <span className="text-xs text-yellow-400 flex items-center gap-1">
                <span>✓</span> {matchCount} match(es)
              </span>
            ) : null;
          })()}
        </div>
        <div className="space-y-2">
          {/* Body Type Indicator */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">Format:</span>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  try {
                    const parsed = JSON.parse(
                      typeof formData.body === 'string' 
                        ? formData.body 
                        : JSON.stringify(formData.body)
                    );
                    handleFieldChange('body', parsed);
                  } catch {
                    // Keep as is
                  }
                }}
                className="px-2 py-1 text-xs bg-blue-400/10 border border-blue-400/20 text-blue-400 rounded hover:bg-blue-400/20 transition-colors"
              >
                JSON
              </button>
              <button
                onClick={() => {
                  const text = typeof formData.body === 'string' 
                    ? formData.body 
                    : JSON.stringify(formData.body);
                  handleFieldChange('body', text);
                }}
                className="px-2 py-1 text-xs bg-zinc-400/10 border border-zinc-400/20 text-zinc-400 rounded hover:bg-zinc-400/20 transition-colors"
              >
                Text
              </button>
            </div>
          </div>

          <Textarea
            value={
              typeof formData.body === 'string' 
                ? formData.body 
                : JSON.stringify(formData.body, null, 2)
            }
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                handleFieldChange('body', parsed);
              } catch {
                handleFieldChange('body', e.target.value);
              }
            }}
            placeholder="Response body..."
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-xs text-zinc-300 font-mono min-h-[200px] max-h-[400px]"
          />
          
          {/* JSON Validation */}
          {formData.body && (() => {
            try {
              JSON.parse(
                typeof formData.body === 'string' 
                  ? formData.body 
                  : JSON.stringify(formData.body)
              );
              return (
                <div className="flex items-center gap-2 text-xs text-green-400">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Valid JSON</span>
                </div>
              );
            } catch (err) {
              return (
                <div className="flex items-center gap-2 text-xs text-orange-400">
                  <AlertCircle className="w-3 h-3" />
                  <span>Plain text (not JSON)</span>
                </div>
              );
            }
          })()}
        </div>
      </div>
    </div>
  );
}
