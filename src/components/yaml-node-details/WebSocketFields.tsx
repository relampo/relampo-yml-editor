import { useState } from 'react';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const inputClass =
  'w-full rounded bg-white/5 border border-white/10 px-3 py-2 text-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400/70 disabled:opacity-60';

export function Field({
  label,
  value,
  onChange,
  placeholder = '',
}: {
  label: string;
  value: unknown;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block space-y-1 text-xs">
      <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{label}</span>
      <Input
        className={inputClass}
        aria-label={label}
        value={String(value ?? '')}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
      />
    </label>
  );
}
const splitList = (text: string) =>
  text
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
/** Comma-separated list input: keeps the typed text (for example a trailing comma) while it matches the stored list. */
export function ListField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: unknown;
  onChange: (value: string[]) => void;
}) {
  const stored = Array.isArray(value) ? value.map(String).join(', ') : '';
  const [draft, setDraft] = useState(stored);
  return (
    <Field
      label={label}
      value={splitList(draft).join(', ') === stored ? draft : stored}
      onChange={text => {
        setDraft(text);
        onChange(splitList(text));
      }}
    />
  );
}
export function Choice({
  label,
  value,
  choices,
  onChange,
}: {
  label: string;
  value: string;
  choices: [string, string][];
  onChange: (v: string) => void;
}) {
  return (
    <label className="block space-y-1 text-xs">
      <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{label}</span>
      <Select
        value={value}
        onValueChange={onChange}
      >
        <SelectTrigger
          aria-label={label}
          className={inputClass}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="border-white/10 use-accent-yellow">
          {choices.map(([key, text]) => (
            <SelectItem
              key={key}
              value={key}
            >
              {text}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}
