import React from 'react';
import { KeyValList } from '../../ui/details/KeyValList';
import { Button } from '../../ui/button';
import { Plus } from 'lucide-react';

interface RequestHeadersProps {
  headers: Record<string, string>;
  onUpdate: (headers: Record<string, string>) => void;
}

export function RequestHeaders({ headers, onUpdate }: RequestHeadersProps) {
  const addHeader = (key: string, value: string) => {
    onUpdate({ ...headers, [key]: value });
  };

  return (
    <div className="space-y-3">
      <KeyValList
        items={headers}
        onUpdate={onUpdate}
        keyPlaceholder="Header-Name"
        valuePlaceholder="value"
      />

      <div className="flex flex-wrap gap-2 pt-1 border-t border-white/5 mt-2">
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider py-1">Quick Add:</span>
        <Button
          variant="outline"
          size="sm"
          className="h-6 text-[10px] px-2 bg-white/5 border-white/10 hover:bg-white/10 text-zinc-400"
          onClick={() => addHeader('Content-Type', 'application/json')}
        >
          <Plus className="w-3 h-3 mr-1" /> JSON
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-6 text-[10px] px-2 bg-white/5 border-white/10 hover:bg-white/10 text-zinc-400"
          onClick={() => addHeader('Authorization', 'Bearer ${token}')}
        >
          <Plus className="w-3 h-3 mr-1" /> Auth
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-6 text-[10px] px-2 bg-white/5 border-white/10 hover:bg-white/10 text-zinc-400"
          onClick={() => addHeader('Accept', 'application/json')}
        >
          <Plus className="w-3 h-3 mr-1" /> Accept
        </Button>
      </div>
    </div>
  );
}
