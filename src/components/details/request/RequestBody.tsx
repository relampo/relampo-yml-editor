import React, { useState } from 'react';
import { KeyValList } from '../../ui/details/KeyValList';
import { SparkCodeEditor } from '../../SparkCodeEditor';
import { Textarea } from '../../ui/textarea';
import { cn } from '../../../lib/utils';

// Helper for type detection
function detectType(body: any): 'none' | 'json' | 'form' | 'raw' {
  if (!body) return 'none';
  if (typeof body === 'object') {
    // If it looks like form data (simple key-val), treat as form?
    // Or just default to JSON for objects unless explicitly form.
    // For this editor, objects are usually JSON bodies.
    return 'json';
  }
  return 'raw';
}

interface RequestBodyProps {
  body: any;
  onUpdate: (body: any) => void;
}

export function RequestBody({ body, onUpdate }: RequestBodyProps) {
  const [activeType, setActiveType] = useState<'none' | 'json' | 'form' | 'raw'>(detectType(body));

  // Local state for raw text to avoid parsing errors blocking input
  const [rawText, setRawText] = useState(typeof body === 'string' ? body : JSON.stringify(body, null, 2));

  const handleTypeChange = (type: 'none' | 'json' | 'form' | 'raw') => {
    setActiveType(type);
    if (type === 'none') {
      onUpdate(undefined);
    } else if (type === 'json') {
      if (!body) onUpdate({});
    } else if (type === 'form') {
      if (!body || typeof body !== 'object') onUpdate({});
    } else {
      if (!body) onUpdate('');
    }
  };

  const updateBody = (val: any) => {
    onUpdate(val);
    if (typeof val === 'string') setRawText(val);
  };

  return (
    <div className="space-y-3">
      {/* Type Selector Tabs */}
      <div className="flex items-center gap-1 p-1 bg-black/20 rounded border border-white/5">
        {(['none', 'json', 'form', 'raw'] as const).map(type => (
          <button
            key={type}
            onClick={() => handleTypeChange(type)}
            className={cn(
              'flex-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded transition-all',
              activeType === type
                ? 'bg-yellow-500/20 text-yellow-400 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5',
            )}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="min-h-[150px]">
        {activeType === 'none' && (
          <div className="flex items-center justify-center h-[100px] text-xs text-zinc-600 italic border border-dashed border-white/5 rounded">
            No body content
          </div>
        )}

        {activeType === 'json' && (
          <div className="border border-white/10 rounded overflow-hidden">
            {/* Using SparkCodeEditor for JSON syntax highlighting */}
            <SparkCodeEditor
              value={typeof body === 'object' ? JSON.stringify(body, null, 2) : rawText}
              onChange={val => {
                setRawText(val);
                try {
                  const parsed = JSON.parse(val);
                  onUpdate(parsed);
                } catch {
                  // Allow invalid JSON while typing, but don't update upstream node data?
                  // Actually for saving, we might want to save string if invalid.
                  // But Relampo expects object for JSON body.
                  // We'll just update rawText and maybe show error.
                }
              }}
              language="json"
              height="200px" // Compact height
            />
          </div>
        )}

        {activeType === 'form' && (
          <KeyValList
            items={typeof body === 'object' ? body : {}}
            onUpdate={newItems => onUpdate(newItems)}
            keyPlaceholder="field_name"
            valuePlaceholder="value"
          />
        )}

        {activeType === 'raw' && (
          <Textarea
            value={rawText}
            onChange={e => updateBody(e.target.value)}
            className="font-mono text-xs h-[200px] resize-none"
            placeholder="Raw text content..."
          />
        )}
      </div>
    </div>
  );
}
