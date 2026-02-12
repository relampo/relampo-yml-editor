interface MethodDropdownProps {
  value: string;
  onChange: (method: string) => void;
  className?: string;
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

// Color coding similar to REST clients like Postman/Insomnia
const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: 'text-green-400 bg-green-400/10 border-green-400/20',
  POST: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  PUT: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  DELETE: 'text-red-400 bg-red-400/10 border-red-400/20',
  PATCH: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  HEAD: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
  OPTIONS: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
};

export function MethodDropdown({ value, onChange, className = '' }: MethodDropdownProps) {
  const currentMethod = (value?.toUpperCase() || 'GET') as HttpMethod;
  const colorClasses = METHOD_COLORS[currentMethod] || METHOD_COLORS.GET;

  return (
    <select
      value={currentMethod}
      onChange={(e) => onChange(e.target.value)}
      className={`px-3 py-2 border rounded text-sm font-mono font-semibold uppercase cursor-pointer transition-colors ${colorClasses} ${className}`}
    >
      {HTTP_METHODS.map((method) => (
        <option key={method} value={method} className="bg-zinc-900">
          {method}
        </option>
      ))}
    </select>
  );
}
