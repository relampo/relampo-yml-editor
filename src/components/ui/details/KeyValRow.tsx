import React from 'react';
import { CompactInput } from './CompactInput';
import { Button } from '../button';
import { Trash2, Eye, EyeOff } from 'lucide-react';

interface KeyValRowProps {
    k: string;
    v: string;
    onChangeKey: (val: string) => void;
    onChangeValue: (val: string) => void;
    onDelete?: () => void;
    keyPlaceholder?: string;
    valuePlaceholder?: string;
    readOnly?: boolean;
    validationError?: string;
    isSecret?: boolean;
}

export function KeyValRow({
    k, v, onChangeKey, onChangeValue, onDelete,
    keyPlaceholder = "Key", valuePlaceholder = "Value",
    readOnly = false, validationError, isSecret = false
}: KeyValRowProps) {
    const [showSecret, setShowSecret] = React.useState(false);

    return (
        <div className="group flex items-start gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex-1 min-w-[30%]">
                <CompactInput
                    value={k}
                    onChange={(e) => onChangeKey(e.target.value)}
                    placeholder={keyPlaceholder}
                    className="font-semibold text-zinc-300 bg-transparent border-transparent hover:border-white/10 focus:border-white/20 focus:bg-white/5 transition-all"
                    disabled={readOnly}
                />
            </div>
            <div className="flex-[2] flex flex-col gap-1 min-w-0">
                <div className="relative">
                    <CompactInput
                        value={v}
                        onChange={(e) => onChangeValue(e.target.value)}
                        placeholder={valuePlaceholder}
                        className="text-zinc-400 bg-transparent border-transparent hover:border-white/10 focus:border-white/20 focus:bg-white/5 transition-all pr-8"
                        disabled={readOnly}
                        type={isSecret && !showSecret ? "password" : "text"}
                        error={!!validationError}
                    />
                    {isSecret && (
                        <button
                            type="button"
                            onClick={() => setShowSecret(!showSecret)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 cursor-pointer"
                        >
                            {showSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                    )}
                </div>

                {validationError && <span className="text-[10px] text-red-400 px-1 font-medium">{validationError}</span>}
            </div>

            {!readOnly && onDelete && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pt-0.5">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-zinc-600 hover:text-red-400 hover:bg-red-500/10"
                        onClick={onDelete}
                        tabIndex={-1}
                    >
                        <Trash2 className="w-3 h-3" />
                    </Button>
                </div>
            )}
        </div>
    )
}
