import { useState, useMemo, useEffect, useRef } from 'react';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Search, ChevronUp, ChevronDown } from 'lucide-react';
import type { YAMLNode } from '../types/yaml';
import { MethodDropdown } from './fields/MethodDropdown';
import { QueryParamsEditor } from './fields/QueryParamsEditor';
import { BodyTypeSelector } from './fields/BodyTypeSelector';
import { HeaderCommonDropdown } from './fields/HeaderCommonDropdown';
import { EditableList } from './EditableList';
import { YAMLResponseDetails } from './YAMLResponseDetails';

interface YAMLRequestDetailsProps {
  node: YAMLNode;
  onNodeUpdate?: (nodeId: string, updatedData: any) => void;
}

type Tab = 'request' | 'response';

export function YAMLRequestDetails({ node, onNodeUpdate }: YAMLRequestDetailsProps) {
  const data = node.data || {};
  const [formData, setFormData] = useState(data);
  const [activeTab, setActiveTab] = useState<Tab>('request');
  const [requestSearch, setRequestSearch] = useState('');
  const [responseSearch, setResponseSearch] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  // Update formData when node changes
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

  const handleHeaderChange = (oldKey: string, newKey: string, value: string) => {
    const headers = { ...formData.headers };
    if (oldKey !== newKey) {
      delete headers[oldKey];
    }
    headers[newKey] = value;
    handleFieldChange('headers', headers);
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

  // Reset match index when search changes or tab changes
  const handleSearchChange = (value: string) => {
    if (activeTab === 'request') {
      setRequestSearch(value);
    } else {
      setResponseSearch(value);
    }
    setCurrentMatchIndex(0);
  };

  useEffect(() => {
    setCurrentMatchIndex(0);
  }, [activeTab]);

  // Scroll to current match
  useEffect(() => {
    if (searchText && contentRef.current) {
      const marks = contentRef.current.querySelectorAll('mark[data-match-index]');
      const currentMark = Array.from(marks).find(
        (mark) => mark.getAttribute('data-match-index') === String(currentMatchIndex)
      );
      
      if (currentMark) {
        currentMark.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentMatchIndex, searchText]);

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex items-center border-b border-white/5 bg-[#111111] flex-shrink-0">
        <button
          onClick={() => setActiveTab('request')}
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
            onClick={() => setActiveTab('response')}
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

      {/* Search Bar */}
      <SearchBar
        value={searchText}
        onChange={handleSearchChange}
        currentIndex={currentMatchIndex}
        onNavigate={setCurrentMatchIndex}
        contentRef={contentRef}
        activeTab={activeTab}
        formData={formData}
      />

      {/* Content */}
      <div ref={contentRef} className="flex-1 overflow-y-auto p-6">
        {activeTab === 'request' ? (
          <RequestContent 
            formData={formData} 
            onFieldChange={handleFieldChange}
            onHeaderChange={handleHeaderChange}
            onBodyChange={handleBodyChange}
            searchText={searchText}
            currentMatchIndex={currentMatchIndex}
          />
        ) : (
          <YAMLResponseDetails
            response={formData.response}
            onResponseUpdate={(updatedResponse) => handleFieldChange('response', updatedResponse)}
            searchText={searchText}
            currentMatchIndex={currentMatchIndex}
          />
        )}
      </div>
    </div>
  );
}

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  currentIndex: number;
  onNavigate: (index: number) => void;
  contentRef: React.RefObject<HTMLDivElement>;
  activeTab: Tab;
  formData: any;
}

function SearchBar({ value, onChange, currentIndex, onNavigate, contentRef, activeTab, formData }: SearchBarProps) {
  // Count total matches
  const totalMatches = useMemo(() => {
    if (!value) return 0;
    
    let count = 0;
    const searchLower = value.toLowerCase();
    
    if (activeTab === 'request') {
      // Count in method
      if (formData.method && formData.method.toLowerCase().includes(searchLower)) count++;
      
      // Count in URL
      if (formData.url) {
        const urlMatches = formData.url.toLowerCase().split(searchLower).length - 1;
        count += urlMatches;
      }
      
      // Count in headers
      if (formData.headers) {
        Object.entries(formData.headers).forEach(([key, val]) => {
          const keyMatches = key.toLowerCase().split(searchLower).length - 1;
          const valMatches = String(val).toLowerCase().split(searchLower).length - 1;
          count += keyMatches + valMatches;
        });
      }
      
      // Count in body
      if (formData.body) {
        const bodyStr = typeof formData.body === 'string' 
          ? formData.body 
          : JSON.stringify(formData.body, null, 2);
        const bodyMatches = bodyStr.toLowerCase().split(searchLower).length - 1;
        count += bodyMatches;
      }
      
      // Count in recorded_at
      if (formData.recorded_at) {
        const recordedMatches = formData.recorded_at.toLowerCase().split(searchLower).length - 1;
        count += recordedMatches;
      }
    } else {
      // Response tab
      const response = formData.response;
      if (!response) return 0;
      
      // Count in status
      if (response.status) {
        const statusMatches = String(response.status).toLowerCase().split(searchLower).length - 1;
        count += statusMatches;
      }
      
      // Count in time_ms
      if (response.time_ms) {
        const timeMatches = String(response.time_ms).toLowerCase().split(searchLower).length - 1;
        count += timeMatches;
      }
      
      // Count in headers
      if (response.headers) {
        Object.entries(response.headers).forEach(([key, val]) => {
          const keyMatches = key.toLowerCase().split(searchLower).length - 1;
          const valMatches = String(val).toLowerCase().split(searchLower).length - 1;
          count += keyMatches + valMatches;
        });
      }
      
      // Count in body
      if (response.body) {
        const bodyStr = typeof response.body === 'string' 
          ? response.body 
          : JSON.stringify(response.body, null, 2);
        const bodyMatches = bodyStr.toLowerCase().split(searchLower).length - 1;
        count += bodyMatches;
      }
    }
    
    return count;
  }, [value, activeTab, formData]);

  const handlePrevious = () => {
    if (totalMatches === 0) return;
    const newIndex = currentIndex === 0 ? totalMatches - 1 : currentIndex - 1;
    onNavigate(newIndex);
  };

  const handleNext = () => {
    if (totalMatches === 0) return;
    const newIndex = currentIndex === totalMatches - 1 ? 0 : currentIndex + 1;
    onNavigate(newIndex);
  };

  return (
    <div className="p-3 border-b border-white/5 bg-[#0a0a0a] flex-shrink-0">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Search..."
            className="pl-9 pr-3 bg-white/5 border-white/10 text-zinc-300 text-sm"
          />
        </div>
        
        {value && (
          <div className="flex items-center gap-1">
            <span className="text-xs text-zinc-400 px-2 min-w-[60px] text-center font-mono">
              {totalMatches > 0 ? `${currentIndex + 1}/${totalMatches}` : '0/0'}
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
    </div>
  );
}

interface RequestContentProps {
  formData: any;
  onFieldChange: (field: string, value: any) => void;
  onHeaderChange: (oldKey: string, newKey: string, value: string) => void;
  onBodyChange: (value: string) => void;
  searchText: string;
  currentMatchIndex: number;
}

function RequestContent({ 
  formData, 
  onFieldChange, 
  onHeaderChange, 
  onBodyChange,
  searchText,
  currentMatchIndex,
}: RequestContentProps) {
  let matchCounter = 0;

  const highlightText = (text: string, search: string): JSX.Element | string => {
    if (!search || !text) return text;
    
    const parts = text.split(new RegExp(`(${escapeRegex(search)})`, 'gi'));
    
    return (
      <>
        {parts.map((part, i) => {
          if (part.toLowerCase() === search.toLowerCase()) {
            const thisMatchIndex = matchCounter++;
            const isActive = thisMatchIndex === currentMatchIndex;
            return (
              <mark 
                key={i} 
                data-match-index={thisMatchIndex}
                className={`${isActive ? 'bg-yellow-400/50 ring-2 ring-yellow-400' : 'bg-yellow-400/30'} text-yellow-200 transition-all`}
              >
                {part}
              </mark>
            );
          }
          return part;
        })}
      </>
    );
  };

  return (
    <div className="space-y-4">
      {/* Method */}
      <div>
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
          Method
        </label>
        <MethodDropdown
          value={formData.method || 'GET'}
          onChange={(method) => onFieldChange('method', method)}
          className="w-full"
        />
        {searchText && formData.method && formData.method.toLowerCase().includes(searchText.toLowerCase()) && (
          <div className="mt-1 text-xs text-yellow-400 flex items-center gap-1">
            <span>✓</span> Match found
          </div>
        )}
      </div>

      {/* URL with Query Parameters */}
      <QueryParamsEditor
        url={formData.url || ''}
        onUrlChange={(url) => onFieldChange('url', url)}
      />

      {/* Headers */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              HTTP Headers
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
          <HeaderCommonDropdown
            onAddHeader={(key, value) => {
              const newHeaders = { ...formData.headers, [key]: value };
              onFieldChange('headers', newHeaders);
            }}
          />
        </div>
        <EditableList
          title=""
          items={formData.headers || {}}
          onUpdate={(headers) => onFieldChange('headers', headers)}
          keyPlaceholder="Header-Name"
          valuePlaceholder="value"
          keyLabel="Header"
          valueLabel="Value"
          enableCheckboxes={false}
          enableBulkActions={false}
        />
      </div>

      {/* Body */}
      <BodyTypeSelector
        body={formData.body}
        onBodyChange={(body, type) => onFieldChange('body', body)}
      />

      {/* Recorded At */}
      {formData.recorded_at && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Recorded At
            </label>
            {searchText && formData.recorded_at.toLowerCase().includes(searchText.toLowerCase()) && (
              <span className="text-xs text-yellow-400 flex items-center gap-1">
                <span>✓</span> Match
              </span>
            )}
          </div>
          <Input
            value={formData.recorded_at}
            onChange={(e) => onFieldChange('recorded_at', e.target.value)}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded text-sm font-mono text-zinc-300"
          />
        </div>
      )}

      {/* 🔥 SPARK SCRIPTS */}
      {formData.spark && Array.isArray(formData.spark) && formData.spark.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Spark Scripts ({formData.spark.length})
            </label>
            {searchText && formData.spark.some((s: any) => 
              s.script?.toLowerCase().includes(searchText.toLowerCase())
            ) && (
              <span className="text-xs text-yellow-400 flex items-center gap-1">
                <span>✓</span> Match in scripts
              </span>
            )}
          </div>
          <div className="space-y-2">
            {formData.spark.map((spark: any, idx: number) => (
              <div key={idx} className={`p-3 rounded border ${
                spark.when === 'after' 
                  ? 'bg-amber-400/5 border-amber-400/20' 
                  : 'bg-orange-400/5 border-orange-400/20'
              }`}>
                <div className={`text-xs font-semibold mb-2 ${
                  spark.when === 'after' ? 'text-amber-400' : 'text-orange-400'
                }`}>
                  {spark.when === 'after' ? '⏵ After Request' : '⏵ Before Request'}
                </div>
                <pre className="text-xs font-mono text-zinc-400 whitespace-pre-wrap max-h-[150px] overflow-y-auto">
                  {highlightText(
                    spark.script?.substring(0, 300) + (spark.script?.length > 300 ? '...' : ''),
                    searchText
                  )}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* EXTRACTORS (Pulse format) */}
      {formData.extractors && Array.isArray(formData.extractors) && formData.extractors.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              🔍 Extractors ({formData.extractors.length})
            </label>
            {searchText && formData.extractors.some((e: any) => 
              e.var?.toLowerCase().includes(searchText.toLowerCase()) ||
              e.variable?.toLowerCase().includes(searchText.toLowerCase()) ||
              e.pattern?.toLowerCase().includes(searchText.toLowerCase())
            ) && (
              <span className="text-xs text-yellow-400 flex items-center gap-1">
                <span>✓</span> Match in extractors
              </span>
            )}
          </div>
          <div className="space-y-2">
            {formData.extractors.map((ext: any, idx: number) => (
              <div key={idx} className="p-3 bg-blue-400/5 border border-blue-400/20 rounded">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs px-1.5 py-0.5 bg-blue-400/20 text-blue-400 rounded font-mono">
                    {highlightText(ext.type || 'regex', searchText)}
                  </span>
                  <span className="text-sm font-mono text-purple-400">
                    ${'{'}${highlightText(ext.var || ext.variable, searchText)}${'}'}
                  </span>
                </div>
                {ext.pattern && (
                  <div className="text-xs font-mono text-zinc-500 truncate">
                    {highlightText(ext.pattern, searchText)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* EXTRACT (legacy format) */}
      {formData.extract && typeof formData.extract === 'object' && !Array.isArray(formData.extract) && Object.keys(formData.extract).length > 0 && (
        <div>
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
            🔍 Extract
          </label>
          <div className="space-y-2">
            {Object.entries(formData.extract).map(([key, value]) => (
              <div key={key} className="p-2 bg-blue-400/5 border border-blue-400/20 rounded text-sm">
                <span className="font-mono text-purple-400">${'{'}${highlightText(key, searchText)}${'}'}</span>
                <span className="text-zinc-500 mx-2">←</span>
                <span className="font-mono text-zinc-300 text-xs">{highlightText(String(value), searchText)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ASSERTIONS (Pulse format) */}
      {formData.assertions && Array.isArray(formData.assertions) && formData.assertions.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              ✅ Assertions ({formData.assertions.length})
            </label>
            {searchText && formData.assertions.some((a: any) => 
              a.type?.toLowerCase().includes(searchText.toLowerCase()) ||
              String(a.value || '').toLowerCase().includes(searchText.toLowerCase()) ||
              a.pattern?.toLowerCase().includes(searchText.toLowerCase())
            ) && (
              <span className="text-xs text-yellow-400 flex items-center gap-1">
                <span>✓</span> Match in assertions
              </span>
            )}
          </div>
          <div className="space-y-2">
            {formData.assertions.map((assertion: any, idx: number) => (
              <div key={idx} className="p-2 bg-green-400/5 border border-green-400/20 rounded flex items-center gap-2">
                <span className="text-xs px-1.5 py-0.5 bg-green-400/20 text-green-400 rounded font-mono">
                  {highlightText(assertion.type, searchText)}
                </span>
                <span className="text-sm font-mono text-zinc-300">
                  {highlightText(
                    assertion.value !== undefined ? String(assertion.value) : assertion.pattern || assertion.name || '',
                    searchText
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ASSERT (legacy format) */}
      {formData.assert && typeof formData.assert === 'object' && !Array.isArray(formData.assert) && Object.keys(formData.assert).length > 0 && (
        <div>
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
            ✅ Assert
          </label>
          <div className="space-y-2">
            {Object.entries(formData.assert).map(([key, value]) => (
              <div key={key} className="p-2 bg-green-400/5 border border-green-400/20 rounded flex items-center gap-2">
                <span className="text-xs px-1.5 py-0.5 bg-green-400/20 text-green-400 rounded font-mono">
                  {highlightText(key, searchText)}
                </span>
                <span className="text-sm font-mono text-zinc-300">{highlightText(String(value), searchText)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* THINK TIME inline */}
      {formData.think_time && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              ⏱ Think Time
            </label>
            {searchText && String(formData.think_time).toLowerCase().includes(searchText.toLowerCase()) && (
              <span className="text-xs text-yellow-400 flex items-center gap-1">
                <span>✓</span> Match
              </span>
            )}
          </div>
          <div className="px-3 py-2 bg-cyan-400/5 border border-cyan-400/20 rounded text-sm font-mono text-cyan-400">
            {highlightText(String(formData.think_time), searchText)}
          </div>
        </div>
      )}
    </div>
  );
}


function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}