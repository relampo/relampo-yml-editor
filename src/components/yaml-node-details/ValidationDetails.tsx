import {
  BetweenHorizontalStart,
  Binary,
  Braces,
  Brackets,
  CheckCircle2,
  Clock3,
  Search,
  SearchX,
  Tag,
  TextSearch,
} from 'lucide-react';
import { Input } from '../ui/input';
import type { NodeDetailProps } from './types';

export function AssertionDetails({ node, onNodeUpdate }: NodeDetailProps) {
  const data = node.data || {};
  const assertionType = data.type || 'status';
  const isAssertionTypeSelectionAllowed = data.__allowTypeSelection === true;
  const lockedAssertionType = typeof data.__lockedType === 'string' && data.__lockedType.trim() !== ''
    ? data.__lockedType.trim()
    : '';
  const effectiveAssertionLockedType = lockedAssertionType || assertionType;
  const isAssertionTypeLocked = !isAssertionTypeSelectionAllowed && effectiveAssertionLockedType !== '';
  const assertionTypes = [
    { value: 'status', label: 'Status', icon: CheckCircle2 },
    { value: 'status_in', label: 'Status in', icon: CheckCircle2 },
    { value: 'contains', label: 'Contains', icon: Search },
    { value: 'not_contains', label: 'Not contains', icon: SearchX },
    { value: 'regex', label: 'Regex', icon: TextSearch },
    { value: 'response_time', label: 'Response time', icon: Clock3 },
    { value: 'response_size', label: 'Response size', icon: Binary },
    { value: 'header', label: 'Header', icon: Tag },
    { value: 'json', label: 'Jsonpath', icon: Braces },
  ] as const;
  const assertionTypeButtonStyle: Record<string, React.CSSProperties> = {
    status: { backgroundColor: 'rgba(34, 197, 94, 0.20)', color: '#86efac', borderColor: 'rgba(134, 239, 172, 0.50)', boxShadow: '0 10px 22px rgba(34, 197, 94, 0.20)' },
    status_in: { backgroundColor: 'rgba(34, 197, 94, 0.20)', color: '#86efac', borderColor: 'rgba(134, 239, 172, 0.50)', boxShadow: '0 10px 22px rgba(34, 197, 94, 0.20)' },
    contains: { backgroundColor: 'rgba(56, 189, 248, 0.20)', color: '#7dd3fc', borderColor: 'rgba(125, 211, 252, 0.50)', boxShadow: '0 10px 22px rgba(56, 189, 248, 0.20)' },
    not_contains: { backgroundColor: 'rgba(245, 158, 11, 0.20)', color: '#fcd34d', borderColor: 'rgba(252, 211, 77, 0.50)', boxShadow: '0 10px 22px rgba(245, 158, 11, 0.20)' },
    regex: { backgroundColor: 'rgba(168, 85, 247, 0.20)', color: '#d8b4fe', borderColor: 'rgba(216, 180, 254, 0.50)', boxShadow: '0 10px 22px rgba(168, 85, 247, 0.20)' },
    response_time: { backgroundColor: 'rgba(249, 115, 22, 0.20)', color: '#fdba74', borderColor: 'rgba(253, 186, 116, 0.50)', boxShadow: '0 10px 22px rgba(249, 115, 22, 0.20)' },
    response_size: { backgroundColor: 'rgba(99, 102, 241, 0.20)', color: '#a5b4fc', borderColor: 'rgba(165, 180, 252, 0.50)', boxShadow: '0 10px 22px rgba(99, 102, 241, 0.20)' },
    header: { backgroundColor: 'rgba(236, 72, 153, 0.20)', color: '#f9a8d4', borderColor: 'rgba(249, 168, 212, 0.50)', boxShadow: '0 10px 22px rgba(236, 72, 153, 0.20)' },
    json: { backgroundColor: 'rgba(6, 182, 212, 0.20)', color: '#67e8f9', borderColor: 'rgba(103, 232, 249, 0.50)', boxShadow: '0 10px 22px rgba(6, 182, 212, 0.20)' },
  };

  const handleChange = (field: string, value: any) => {
    if (field === 'type' && isAssertionTypeLocked && value !== effectiveAssertionLockedType) {
      return;
    }
    onNodeUpdate?.(node.id, { ...data, [field]: value });
  };

  return (
    <>
      <div className="mb-4">
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-3">
          Assertion Type
        </label>
        <div className="flex flex-wrap items-center gap-1">
          {assertionTypes.map((type) => {
            const active = assertionType === type.value;
            const disabled = isAssertionTypeLocked && type.value !== effectiveAssertionLockedType;
            const Icon = type.icon;
            return (
              <button
                key={type.value}
                type="button"
                disabled={disabled}
                onClick={() => handleChange('type', type.value)}
                aria-pressed={active}
                className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-all duration-200 ${active ? 'border-current text-white' : 'text-zinc-400 border-transparent hover:text-zinc-100 hover:bg-white/[0.06]'}`}
                style={active ? assertionTypeButtonStyle[type.value] : undefined}
                aria-disabled={disabled}
              >
                <span className={`inline-flex items-center gap-1.5 ${disabled ? 'opacity-45 cursor-not-allowed' : ''}`}>
                  <Icon className="h-3.5 w-3.5" />
                  <span>{type.label}</span>
                </span>
              </button>
            );
          })}
        </div>
        {isAssertionTypeLocked && (
          <p className="mt-2 text-xs text-zinc-500">
            Type locked to <span className="text-zinc-300 font-mono">{effectiveAssertionLockedType}</span> after loading or saving.
          </p>
        )}
      </div>

      {(assertionType === 'status' || assertionType === 'status_in') && (
        <div className="mb-4 grid grid-cols-1 gap-3 items-end">
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
            {assertionType === 'status' ? 'Expected Status Code' : 'Expected Status Codes (comma separated)'}
          </label>
          <Input value={data.value !== undefined ? String(data.value) : ''} onChange={(event) => handleChange('value', event.target.value)} placeholder={assertionType === 'status' ? '200' : '200, 201, 204'} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono focus:border-white/30 transition-all" />
        </div>
      )}

      {(assertionType === 'contains' || assertionType === 'not_contains') && (
        <div className="mb-4 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] gap-3 items-end">
          <div>
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              Text to {assertionType === 'contains' ? 'Find' : 'Not Find'}
            </label>
            <Input value={data.value !== undefined ? String(data.value) : ''} onChange={(event) => handleChange('value', event.target.value)} placeholder="Expected text in response..." className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono focus:border-white/30 transition-all" />
          </div>
          <div className="h-[38px] flex items-center">
            <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
              <input type="checkbox" checked={data.ignore_case || false} onChange={(event) => handleChange('ignore_case', event.target.checked)} className="w-4 h-4 rounded border-white/10 bg-white/5 text-green-500" />
              <span className="text-sm text-zinc-300">Ignore case</span>
            </label>
          </div>
        </div>
      )}

      {assertionType === 'regex' && (
        <div className="mb-4 flex items-end gap-3">
          <div className="flex-1 min-w-0">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Regular Expression Pattern</label>
            <Input value={data.pattern || ''} onChange={(event) => handleChange('pattern', event.target.value)} placeholder="token=([a-f0-9]+)" className="bg-white/5 border-white/10 text-zinc-300 text-sm font-mono" />
          </div>
          <div className="w-[150px] shrink-0">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Match Number</label>
            <Input
              type="number"
              value={data.match_no !== undefined && data.match_no !== null ? data.match_no : ''}
              onChange={(event) => {
                const raw = event.target.value;
                if (raw === '') {
                  handleChange('match_no', '');
                  return;
                }
                const parsed = parseInt(raw, 10);
                handleChange('match_no', Number.isNaN(parsed) ? '' : parsed);
              }}
              placeholder="1"
              className="bg-white/5 border-white/10 text-zinc-300 text-sm font-mono"
            />
          </div>
        </div>
      )}

      {assertionType === 'response_time' && (
        <SimpleNumberField label="Max Response Time (ms)" value={data.max_ms !== undefined ? data.max_ms : ''} placeholder="2000" onChange={(value) => handleChange('max_ms', parseInt(value, 10) || 0)} />
      )}

      {assertionType === 'response_size' && (
        <SimpleNumberField label="Expected Size (bytes)" value={data.size !== undefined ? data.size : ''} placeholder="1024" onChange={(value) => handleChange('size', parseInt(value, 10) || 0)} />
      )}

      {assertionType === 'header' && (
        <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
          <TextField label="Header Name" value={data.name || ''} placeholder="Content-Type, Authorization..." onChange={(value) => handleChange('name', value)} />
          <TextField label="Expected Header Value" value={data.value !== undefined ? String(data.value) : ''} placeholder="application/json" onChange={(value) => handleChange('value', value)} />
        </div>
      )}

      {assertionType === 'json' && (
        <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
          <TextField label="JSONPath Expression" value={data.path || ''} placeholder="$.data.id" onChange={(value) => handleChange('path', value)} />
          <TextField label="Expected Value" value={data.value !== undefined ? String(data.value) : ''} placeholder="123" onChange={(value) => handleChange('value', value)} />
        </div>
      )}
    </>
  );
}

export function ExtractorDetails({ node, onNodeUpdate }: NodeDetailProps) {
  const data = node.data || {};
  const extractorType = data.type || 'regex';
  const isExtractorTypeSelectionAllowed = data.__allowTypeSelection === true;
  const lockedExtractorType = typeof data.__lockedType === 'string' && data.__lockedType.trim() !== '' ? data.__lockedType.trim() : '';
  const effectiveExtractorLockedType = lockedExtractorType || extractorType;
  const isExtractorTypeLocked = !isExtractorTypeSelectionAllowed && effectiveExtractorLockedType !== '';
  const extractorVariableName = data.var ?? data.variable ?? '';
  const extractorSource = data.from || 'body';
  const extractorTypes = [
    { value: 'regex', label: 'Regex', icon: TextSearch },
    { value: 'jsonpath', label: 'Jsonpath', icon: Braces },
    { value: 'xpath', label: 'Xpath', icon: Brackets },
    { value: 'boundary', label: 'Boundary', icon: BetweenHorizontalStart },
  ] as const;
  const extractorTypeButtonStyle: Record<string, React.CSSProperties> = {
    regex: { backgroundColor: 'rgba(168, 85, 247, 0.20)', color: '#d8b4fe', borderColor: 'rgba(216, 180, 254, 0.50)', boxShadow: '0 10px 22px rgba(168, 85, 247, 0.20)' },
    jsonpath: { backgroundColor: 'rgba(6, 182, 212, 0.20)', color: '#67e8f9', borderColor: 'rgba(103, 232, 249, 0.50)', boxShadow: '0 10px 22px rgba(6, 182, 212, 0.20)' },
    xpath: { backgroundColor: 'rgba(236, 72, 153, 0.20)', color: '#f9a8d4', borderColor: 'rgba(249, 168, 212, 0.50)', boxShadow: '0 10px 22px rgba(236, 72, 153, 0.20)' },
    boundary: { backgroundColor: 'rgba(249, 115, 22, 0.20)', color: '#fdba74', borderColor: 'rgba(253, 186, 116, 0.50)', boxShadow: '0 10px 22px rgba(249, 115, 22, 0.20)' },
  };

  const getExtractorDefaults = (type: string) => {
    if (type === 'regex') {
      return {
        type: 'regex',
        from: 'body',
        pattern: data.pattern || '',
        capture_mode: data.capture_mode || 'first',
        capture_index: data.capture_index || '2',
        group: data.group ?? 1,
        default: data.default || '',
      };
    }
    if (type === 'jsonpath') {
      return { type: 'jsonpath', from: data.from || 'body', expression: data.expression || data.pattern || '$.data.id', default: data.default || '' };
    }
    if (type === 'xpath') {
      return { type: 'xpath', from: data.from || 'body', expression: data.expression || data.pattern || '//title/text()', namespace: data.namespace || '', default: data.default || '' };
    }
    return { type: 'boundary', from: data.from || 'body', left_boundary: data.left_boundary || '<title>', right_boundary: data.right_boundary || '</title>', default: data.default || '' };
  };

  const handleChange = (field: string, value: any) => {
    if (field === 'var') {
      onNodeUpdate?.(node.id, { ...data, var: value, variable: value });
      return;
    }
    if (field === 'type') {
      if (isExtractorTypeLocked && value !== effectiveExtractorLockedType) {
        return;
      }
      onNodeUpdate?.(node.id, { ...data, ...getExtractorDefaults(value), var: extractorVariableName, variable: extractorVariableName });
      return;
    }
    onNodeUpdate?.(node.id, { ...data, [field]: value });
  };

  return (
    <>
      <div className="mb-4">
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-3">
          Extractor Type
        </label>
        <div className="flex flex-wrap items-center gap-1">
          {extractorTypes.map((type) => {
            const active = extractorType === type.value;
            const disabled = isExtractorTypeLocked && type.value !== effectiveExtractorLockedType;
            const Icon = type.icon;
            return (
              <button key={type.value} type="button" disabled={disabled} onClick={() => handleChange('type', type.value)} aria-pressed={active} className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-all duration-200 ${active ? 'border-current text-white' : 'text-zinc-400 border-transparent hover:text-zinc-100 hover:bg-white/[0.06]'}`} style={active ? extractorTypeButtonStyle[type.value] : undefined} aria-disabled={disabled}>
                <span className={`inline-flex items-center gap-1.5 ${disabled ? 'opacity-45 cursor-not-allowed' : ''}`}>
                  <Icon className="h-3.5 w-3.5" />
                  <span>{type.label}</span>
                </span>
              </button>
            );
          })}
        </div>
        {isExtractorTypeLocked && (
          <p className="mt-2 text-xs text-zinc-500">
            Type locked to <span className="text-zinc-300 font-mono">{effectiveExtractorLockedType}</span> after loading or saving.
          </p>
        )}
      </div>

      <div className="mb-4">
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Variable Name *</label>
        <Input value={extractorVariableName} onChange={(event) => handleChange('var', event.target.value)} placeholder="extracted_value" maxLength={50} className="w-full max-w-[360px] px-3 py-2 bg-purple-400/5 border border-purple-400/20 text-purple-400 text-sm font-mono font-bold focus:border-purple-400/40" />
      </div>

      {extractorType === 'regex' && (
        <>
          <ExtractorSourceAndPattern source={extractorSource} label="Regular Expression Pattern *" value={data.pattern || ''} placeholder="token=([a-zA-Z0-9_-]+)" onSourceChange={(value) => handleChange('from', value)} onValueChange={(value) => handleChange('pattern', value)} />
          <div className="mb-4 mt-[-4px] text-xs text-zinc-500">Variable: {'{{'}{extractorVariableName || 'VAR'}{'}'} | Use capture groups () in pattern</div>
          <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Capture Mode</label>
              <select value={data.capture_mode || 'first'} onChange={(event) => handleChange('capture_mode', event.target.value)} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono">
                <option value="first" className="bg-zinc-900">first match</option>
                <option value="all" className="bg-zinc-900">all matches</option>
                <option value="index" className="bg-zinc-900">specific match index</option>
                <option value="random" className="bg-zinc-900">random match</option>
              </select>
            </div>
            <SimpleNumberField label="Capture Group" value={data.group !== undefined ? data.group : 1} placeholder="1" onChange={(value) => handleChange('group', parseInt(value, 10) || 1)} min={1} />
            <TextField label="Default Value (if not found)" value={data.default || ''} placeholder="NOT_FOUND" onChange={(value) => handleChange('default', value)} />
          </div>
          {String(data.capture_mode || 'first') === 'index' && (
            <SimpleNumberField label="Match Index" value={data.capture_index !== undefined ? data.capture_index : '2'} placeholder="2" onChange={(value) => handleChange('capture_index', value)} min={1} />
          )}
          <div className="mb-4 mt-1 text-xs text-zinc-500">Group 1 = first (...) in your regex</div>
        </>
      )}

      {extractorType === 'jsonpath' && (
        <>
          <ExtractorSourceAndPattern source={extractorSource} label="JSONPath Expression *" value={data.expression || data.pattern || ''} placeholder="$.data.id" onSourceChange={(value) => handleChange('from', value)} onValueChange={(value) => handleChange('expression', value)} />
          <div className="mb-4 mt-[-4px] text-xs text-zinc-500">Examples: $.users[0].name, $.data[*].id, $..price</div>
        </>
      )}

      {extractorType === 'xpath' && (
        <>
          <ExtractorSourceAndPattern source={extractorSource} label="XPath Expression *" value={data.expression || data.pattern || ''} placeholder="//div[@class='title']/text()" onSourceChange={(value) => handleChange('from', value)} onValueChange={(value) => handleChange('expression', value)} />
          <div className="mb-4 mt-[-4px] text-xs text-zinc-500">Extract data from XML/HTML using XPath</div>
          <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
            <TextField label="Namespace (optional)" value={data.namespace || ''} placeholder="xmlns:ns=http://example.com" onChange={(value) => handleChange('namespace', value)} />
            <TextField label="Default Value (if not found)" value={data.default || ''} placeholder="NOT_FOUND" onChange={(value) => handleChange('default', value)} />
          </div>
        </>
      )}

      {extractorType === 'boundary' && (
        <div className="mb-4 flex items-end gap-3">
          <ExtractorSourceSelect value={extractorSource} onChange={(value) => handleChange('from', value)} />
          <div className="min-w-0 flex-1">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Left Boundary *</label>
            <Input value={data.left_boundary || ''} onChange={(event) => handleChange('left_boundary', event.target.value)} placeholder="&lt;title&gt;" className="bg-white/5 border-white/10 text-zinc-300 text-sm font-mono" />
          </div>
          <div className="min-w-0 flex-1">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Right Boundary *</label>
            <Input value={data.right_boundary || ''} onChange={(event) => handleChange('right_boundary', event.target.value)} placeholder="&lt;/title&gt;" className="bg-white/5 border-white/10 text-zinc-300 text-sm font-mono" />
          </div>
        </div>
      )}

      {extractorType !== 'regex' && extractorType !== 'xpath' && (
        <TextField label="Default Value (if not found)" value={data.default || ''} placeholder="NOT_FOUND" onChange={(value) => handleChange('default', value)} />
      )}
    </>
  );
}

function ExtractorSourceAndPattern({
  source,
  label,
  value,
  placeholder,
  onSourceChange,
  onValueChange,
}: {
  source: string;
  label: string;
  value: string;
  placeholder: string;
  onSourceChange: (value: string) => void;
  onValueChange: (value: string) => void;
}) {
  return (
    <div className="mb-4 flex items-end gap-3">
      <ExtractorSourceSelect value={source} onChange={onSourceChange} />
      <div className="min-w-0 flex-1">
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">{label}</label>
        <Input value={value} onChange={(event) => onValueChange(event.target.value)} placeholder={placeholder} className="w-full bg-white/5 border-white/10 text-zinc-300 text-sm font-mono" />
      </div>
    </div>
  );
}

function ExtractorSourceSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="w-[220px] shrink-0">
      <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Extractor From</label>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 font-mono">
        <option value="body" className="bg-zinc-900">body</option>
        <option value="headers" className="bg-zinc-900">headers</option>
        <option value="status_line" className="bg-zinc-900">status_line</option>
      </select>
    </div>
  );
}

function TextField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">{label}</label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="bg-white/5 border-white/10 text-zinc-300 text-sm font-mono" />
    </div>
  );
}

function SimpleNumberField({
  label,
  value,
  placeholder,
  onChange,
  min,
}: {
  label: string;
  value: string | number;
  placeholder: string;
  onChange: (value: string) => void;
  min?: number;
}) {
  return (
    <div className="mb-4">
      <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">{label}</label>
      <Input type="number" min={min} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="bg-white/5 border-white/10 text-zinc-300 text-sm font-mono" />
    </div>
  );
}
