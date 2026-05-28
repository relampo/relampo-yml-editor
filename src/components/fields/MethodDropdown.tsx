import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface MethodDropdownProps {
  value: string;
  onChange: (method: string) => void;
  className?: string;
  id?: string;
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];


export function MethodDropdown({ value, onChange, className = '', id }: MethodDropdownProps) {
  const currentMethod = (value?.toUpperCase() || 'GET') as HttpMethod;

  return (
    <Select
      value={currentMethod}
      onValueChange={onChange}
    >
      <SelectTrigger id={id} className={`px-3 py-2 border rounded text-sm font-mono font-semibold uppercase cursor-pointer transition-colors ${className}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="border-white/10 use-accent-yellow">
        {HTTP_METHODS.map(method => (
          <SelectItem
            key={method}
            value={method}
            className="font-mono font-semibold uppercase"
          >
            {method}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
