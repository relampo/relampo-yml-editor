import React from 'react';
import { KeyValRow } from './KeyValRow';
import { Button } from '../button';
import { Plus } from 'lucide-react';

interface KeyValListProps {
    items: Record<string, string>;
    onUpdate: (items: Record<string, string>) => void;
    keyPlaceholder?: string;
    valuePlaceholder?: string;
    readOnly?: boolean;
    validateKey?: (key: string) => string | null;
}

export function KeyValList({
    items, onUpdate,
    keyPlaceholder = "Key", valuePlaceholder = "Value",
    readOnly = false,
    validateKey
}: KeyValListProps) {

    const handleAdd = () => {
        onUpdate({ ...items, "": "" });
    };

    const handleChangeKey = (oldKey: string, newKey: string) => {
        if (oldKey === newKey) return;

        // Preserve order: create new object
        const newItems: Record<string, string> = {};
        Object.entries(items).forEach(([k, v]) => {
            if (k === oldKey) {
                newItems[newKey] = v;
            } else {
                newItems[k] = v;
            }
        });
        onUpdate(newItems);
    };

    const handleChangeValue = (key: string, newValue: string) => {
        onUpdate({ ...items, [key]: newValue });
    };

    const handleDelete = (keyToDelete: string) => {
        const newItems = { ...items };
        delete newItems[keyToDelete];
        onUpdate(newItems);
    };

    const entries = Object.entries(items);

    return (
        <div className="space-y-1">
            {/* List Header Labels? Optional. User asked "Compact". Labels might take space. 
          The placeholders in the first row usually serve as labels?
          Or we can add minimal headers.
      */}
            {entries.length > 0 && (
                <div className="flex gap-2 px-2 pb-1">
                    <div className="flex-1 min-w-[30%] text-[10px] font-bold text-zinc-600 uppercase tracking-widest">{keyPlaceholder}</div>
                    <div className="flex-[2] text-[10px] font-bold text-zinc-600 uppercase tracking-widest">{valuePlaceholder}</div>
                    {!readOnly && <div className="w-6"></div>}
                </div>
            )}

            {entries.map(([k, v], idx) => (
                <KeyValRow
                    key={`${idx}`} // Ideally strict key but user might edit key
                    k={k}
                    v={v}
                    onChangeKey={(newKey) => handleChangeKey(k, newKey)}
                    onChangeValue={(newValue) => handleChangeValue(k, newValue)}
                    onDelete={() => handleDelete(k)}
                    keyPlaceholder={keyPlaceholder}
                    valuePlaceholder={valuePlaceholder}
                    readOnly={readOnly}
                    // Simple validation: unique keys?
                    validationError={
                        entries.filter(([otherK]) => otherK === k).length > 1 ? "Duplicate key" : (validateKey ? (validateKey(k) || undefined) : undefined)
                    }
                />
            ))}

            {!readOnly && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleAdd}
                    className="w-full mt-2 h-7 rounded border border-dashed border-white/10 hover:border-white/20 hover:bg-white/5 text-xs text-zinc-500 hover:text-zinc-300 justify-start px-2 gap-2"
                >
                    <Plus className="w-3.5 h-3.5" />
                    Add {keyPlaceholder}
                </Button>
            )}

            {entries.length === 0 && readOnly && (
                <div className="text-xs text-zinc-600 italic px-2">No items</div>
            )}
        </div>
    );
}
