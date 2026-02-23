import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Button } from '../button';
import { Trash2, Copy } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';

interface DetailHeaderProps {
    title: string;
    subtitle?: string;
    icon?: LucideIcon;
    onDuplicate?: () => void;
    onDelete?: () => void;
    className?: string;
}

export function DetailHeader({
    title,
    subtitle,
    icon: Icon,
    onDuplicate,
    onDelete,
    className
}: DetailHeaderProps) {
    const { t } = useLanguage();
    return (
        <div className={cn("flex items-center justify-between px-4 py-2 border-b border-white/5 bg-[#111111] h-10 flex-shrink-0", className)}>
            <div className="flex items-center gap-2 min-w-0">
                {Icon && <Icon className="w-4 h-4 text-yellow-500" />}
                <div className="flex items-center gap-2 min-w-0">
                    <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider truncate">
                        {title}
                    </h3>
                    {subtitle && (
                        <>
                            <span className="text-zinc-600">/</span>
                            <span className="text-xs text-zinc-500 truncate">{subtitle}</span>
                        </>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-1">
                {onDuplicate && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onDuplicate}
                        className="w-6 h-6 hover:bg-white/10 text-zinc-400 hover:text-zinc-200"
                        title={t('yamlEditor.common.duplicate') || "Duplicate"}
                    >
                        <Copy className="w-3 h-3" />
                    </Button>
                )}
                {onDelete && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onDelete}
                        className="w-6 h-6 hover:bg-red-500/10 text-zinc-400 hover:text-red-400"
                        title="Delete"
                    >
                        <Trash2 className="w-3 h-3" />
                    </Button>
                )}
            </div>
        </div>
    );
}
