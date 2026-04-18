import type { ReactNode } from 'react';
import { Input } from '../../ui/input';

export interface LoadModeProps {
  data: Record<string, any>;
  onChange: (field: string, value: any) => void;
}

interface LoadSectionProps {
  title?: string;
  description?: string;
  children: ReactNode;
}

export function LoadSection({ title, description, children }: LoadSectionProps) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
      {(title || description) && (
        <div className="mb-4">
          {title && <h4 className="text-sm font-semibold text-zinc-100">{title}</h4>}
          {description && <p className="mt-1 text-xs leading-relaxed text-zinc-400">{description}</p>}
        </div>
      )}
      {children}
    </section>
  );
}

export function LoadGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>;
}

interface LoadFieldProps {
  label: string;
  value: string | number;
  placeholder: string;
  onChange: (value: string) => void;
  helpText?: string;
  type?: 'text' | 'number';
  maxLength?: number;
}

export function LoadField({
  label,
  value,
  placeholder,
  onChange,
  helpText,
  type = 'text',
  maxLength = 5,
}: LoadFieldProps) {
  return (
    <div className="space-y-2">
      <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">{label}</label>
      <Input
        type={type}
        maxLength={maxLength}
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-md border border-white/10 bg-[#151515] px-3 py-2 text-sm font-mono text-zinc-200"
      />
      {helpText && <p className="text-[11px] leading-relaxed text-zinc-500">{helpText}</p>}
    </div>
  );
}

interface LoadDisplayFieldProps {
  label: string;
  value: string | number;
  helpText?: string;
}

export function LoadDisplayField({ label, value, helpText }: LoadDisplayFieldProps) {
  return (
    <div className="space-y-2">
      <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">{label}</label>
      <div className="flex h-10 w-full items-center rounded-md border border-white/10 bg-[#151515] px-3 py-2 text-sm font-mono text-zinc-200">
        {value}
      </div>
      {helpText && <p className="text-[11px] leading-relaxed text-zinc-500">{helpText}</p>}
    </div>
  );
}

interface LoadSelectFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  helpText?: string;
}

export function LoadSelectField({ label, value, onChange, options, helpText }: LoadSelectFieldProps) {
  return (
    <div className="space-y-2">
      <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">{label}</label>
      <select
        value={value}
        onChange={event => onChange(event.target.value)}
        className="h-10 w-full rounded-md border border-white/10 bg-[#151515] px-3 py-2 text-sm font-mono text-zinc-200 outline-none transition-all focus:border-white/20"
      >
        {options.map(option => (
          <option
            key={option.value}
            value={option.value}
            className="bg-[#151515]"
          >
            {option.label}
          </option>
        ))}
      </select>
      {helpText && <p className="text-[11px] leading-relaxed text-zinc-500">{helpText}</p>}
    </div>
  );
}
