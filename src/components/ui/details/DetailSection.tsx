import React, { useState } from 'react';
import * as Collapsible from '@radix-ui/react-collapsible';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface DetailSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  description?: string;
}

export function DetailSection({ title, children, defaultOpen = true, className, description }: DetailSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible.Root
      open={isOpen}
      onOpenChange={setIsOpen}
      className={cn('border-b border-white/5', className)}
    >
      <Collapsible.Trigger className="flex items-center justify-between w-full px-4 py-2 bg-[#161616] hover:bg-[#1a1a1a] transition-colors group cursor-pointer text-left select-none">
        <div className="flex items-center gap-2">
          {isOpen ? (
            <ChevronDown className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
          )}
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 group-hover:text-zinc-200 transition-colors">
            {title}
          </span>
        </div>
        {description && <span className="text-[10px] text-zinc-600 font-medium">{description}</span>}
      </Collapsible.Trigger>
      <Collapsible.Content className="p-4 space-y-3 bg-[#1f1f1f] animate-slide-down">{children}</Collapsible.Content>
    </Collapsible.Root>
  );
}
