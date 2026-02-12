import { useState } from 'react';
import { Plus } from 'lucide-react';

interface HeaderCommonDropdownProps {
  onAddHeader: (key: string, value: string) => void;
  className?: string;
}

interface CommonHeader {
  key: string;
  value: string;
  description: string;
}

const COMMON_HEADERS: CommonHeader[] = [
  { key: 'Content-Type', value: 'application/json', description: 'JSON content' },
  { key: 'Content-Type', value: 'application/xml', description: 'XML content' },
  { key: 'Content-Type', value: 'application/x-www-form-urlencoded', description: 'Form data' },
  { key: 'Content-Type', value: 'text/html', description: 'HTML content' },
  { key: 'Content-Type', value: 'text/plain', description: 'Plain text' },
  { key: 'Accept', value: 'application/json', description: 'Accept JSON' },
  { key: 'Accept', value: '*/*', description: 'Accept any' },
  { key: 'Authorization', value: 'Bearer ${token}', description: 'Bearer token' },
  { key: 'Authorization', value: 'Basic ${credentials}', description: 'Basic auth' },
  { key: 'User-Agent', value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', description: 'Chrome Windows' },
  { key: 'User-Agent', value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', description: 'Safari macOS' },
  { key: 'Accept-Language', value: 'en-US,en;q=0.9', description: 'English US' },
  { key: 'Accept-Language', value: 'es-ES,es;q=0.9', description: 'Spanish' },
  { key: 'Accept-Encoding', value: 'gzip, deflate, br', description: 'Compressed content' },
  { key: 'Cache-Control', value: 'no-cache', description: 'No cache' },
  { key: 'Cache-Control', value: 'max-age=0', description: 'Max age 0' },
  { key: 'Connection', value: 'keep-alive', description: 'Keep connection' },
  { key: 'Origin', value: 'https://example.com', description: 'Origin domain' },
  { key: 'Referer', value: 'https://example.com', description: 'Referring page' },
  { key: 'X-Requested-With', value: 'XMLHttpRequest', description: 'AJAX request' },
  { key: 'X-API-Key', value: '${api_key}', description: 'API key' },
];

export function HeaderCommonDropdown({ onAddHeader, className = '' }: HeaderCommonDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredHeaders = COMMON_HEADERS.filter(
    h => 
      h.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.value.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (header: CommonHeader) => {
    onAddHeader(header.key, header.value);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10 rounded border border-emerald-400/20 transition-colors"
      >
        <Plus className="w-3 h-3" />
        Add Common Header
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute top-full left-0 mt-1 w-96 max-h-96 overflow-auto bg-zinc-900 border border-white/10 rounded-lg shadow-2xl z-50">
            {/* Search */}
            <div className="sticky top-0 p-2 bg-zinc-900 border-b border-white/10">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search headers..."
                className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded text-sm text-zinc-300 placeholder-zinc-500 focus:outline-none focus:border-emerald-400/30"
                autoFocus
              />
            </div>

            {/* Headers list */}
            <div className="p-1">
              {filteredHeaders.length === 0 ? (
                <div className="p-4 text-center text-sm text-zinc-500">
                  No headers found
                </div>
              ) : (
                filteredHeaders.map((header, index) => (
                  <button
                    key={`${header.key}-${header.value}-${index}`}
                    onClick={() => handleSelect(header)}
                    className="w-full p-2 text-left hover:bg-white/5 rounded transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-mono text-indigo-400 truncate">
                          {header.key}
                        </div>
                        <div className="text-xs font-mono text-zinc-400 truncate mt-0.5">
                          {header.value}
                        </div>
                      </div>
                      <div className="text-xs text-zinc-500 flex-shrink-0">
                        {header.description}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
