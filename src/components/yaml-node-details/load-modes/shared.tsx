import { useId, type ReactNode } from 'react';
import { Input } from '../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { limitedInputValue, type LoadData, type LoadDataValue } from '../loadUtils';

export interface LoadModeProps {
  data: LoadData;
  onChange: (field: string, value: LoadDataValue) => void;
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
  placeholder?: string;
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
  maxLength = 16,
}: LoadFieldProps) {
  const inputId = useId();
  const helpId = `${inputId}-help`;

  return (
    <div className="space-y-2">
      <label
        htmlFor={inputId}
        className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500"
      >
        {label}
      </label>
      <Input
        id={inputId}
        type={type}
        maxLength={maxLength}
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        aria-describedby={helpText ? helpId : undefined}
        className="h-10 w-full rounded-md border border-white/10 bg-[#151515] px-3 py-2 text-sm font-mono text-zinc-200"
      />
      {helpText && (
        <p
          id={helpId}
          className="text-[11px] leading-relaxed text-zinc-500"
        >
          {helpText}
        </p>
      )}
    </div>
  );
}

export const LOAD_DURATION_HELP_TEXT = 'Default unit: seconds. Examples: 500ms, 5s, 5m.';
export const LOAD_USERS_HELP_TEXT = 'Number of concurrent virtual users.';
export const LOAD_ITERATIONS_HELP_TEXT = 'Optional limit for how many times each virtual user repeats the scenario.';

interface LoadFieldConfig {
  field: string;
  label: string;
  placeholder?: string;
  helpText?: string;
  type?: 'text' | 'number';
  maxLength?: number;
}

interface LoadFieldGroupProps {
  data: LoadData;
  fields: readonly LoadFieldConfig[];
  onChange: (field: string, value: LoadDataValue) => void;
}

export function LoadFieldGroup({ data, fields, onChange }: LoadFieldGroupProps) {
  return (
    <>
      {fields.map(field => (
        <LoadField
          key={field.field}
          label={field.label}
          value={data[field.field] || ''}
          placeholder={field.placeholder}
          onChange={value => onChange(field.field, limitedInputValue(value))}
          type={field.type}
          maxLength={field.maxLength}
          helpText={field.helpText}
        />
      ))}
    </>
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
      <Select
        value={value}
        onValueChange={onChange}
      >
        <SelectTrigger className="h-10 w-full rounded-md border border-white/10 bg-[#151515] px-3 py-2 text-sm font-mono text-zinc-200">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="border-white/10">
          {options.map(option => (
            <SelectItem
              key={option.value}
              value={option.value}
              className="font-mono"
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {helpText && <p className="text-[11px] leading-relaxed text-zinc-500">{helpText}</p>}
    </div>
  );
}
