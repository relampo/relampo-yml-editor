import { CompactInput } from '../../ui/details/CompactInput';
import { isValidUrl } from '../../../lib/validation';

interface RequestSummaryProps {
  method: string;
  url: string;
  name?: string;
  onChangeMethod: (method: string) => void;
  onChangeUrl: (url: string) => void;
  onChangeName: (name: string) => void;
  className?: string;
}

const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

export function RequestSummary({
  method,
  url,
  name,
  onChangeMethod,
  onChangeUrl,
  onChangeName,
  className,
}: RequestSummaryProps) {
  return (
    <div className={className}>
      <div className="grid grid-cols-[80px_1fr] gap-2 mb-2">
        <div className="relative">
          <select
            value={method}
            onChange={e => onChangeMethod(e.target.value)}
            className="w-full h-7 text-xs font-bold px-2 bg-white/5 border border-white/10 rounded appearance-none cursor-pointer hover:bg-white/10 text-zinc-300 focus:outline-none focus:ring-1 focus:ring-yellow-500"
            style={{
              color:
                method === 'GET'
                  ? '#4ade80'
                  : method === 'POST'
                    ? '#facc15'
                    : method === 'DELETE'
                      ? '#f87171'
                      : '#e2e8f0',
            }}
          >
            {METHODS.map(m => (
              <option
                key={m}
                value={m}
              >
                {m}
              </option>
            ))}
          </select>
          {/* Custom Arrow or just native */}
        </div>
        <div className="relative">
          <CompactInput
            value={url}
            onChange={e => onChangeUrl(e.target.value)}
            placeholder="https://api.example.com/v1/resource"
            className="font-mono text-yellow-100" // Highlight URL slightly
            error={!!url && !isValidUrl(url)}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <label
          htmlFor="request-summary-name"
          className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider min-w-[30px]"
        >
          Name
        </label>
        <CompactInput
          id="request-summary-name"
          value={name || ''}
          onChange={e => onChangeName(e.target.value)}
          placeholder="Descriptive name (optional)"
          className="text-zinc-400 opacity-80 focus:opacity-100"
        />
      </div>
    </div>
  );
}
