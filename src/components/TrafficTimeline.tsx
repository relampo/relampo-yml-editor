import { useState } from 'react';
import { RecordedRequest, RecordingStatus } from './Recorder';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { 
  Search, 
  Trash2, 
  Tag, 
  MoreVertical,
  Filter,
  ListTree,
  List,
  GitBranch,
  Radio
} from 'lucide-react';

interface TrafficTimelineProps {
  requests: RecordedRequest[];
  selectedRequest: RecordedRequest | null;
  onSelectRequest: (request: RecordedRequest) => void;
  status: RecordingStatus;
}

type GroupingMode = 'flat' | 'by-page' | 'by-transaction';

export function TrafficTimeline({ 
  requests, 
  selectedRequest, 
  onSelectRequest,
  status 
}: TrafficTimelineProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [groupingMode, setGroupingMode] = useState<GroupingMode>('flat');
  const [showFilteredOut, setShowFilteredOut] = useState(false);

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET':
        return 'bg-blue-500/10 text-blue-400 border-blue-400/20';
      case 'POST':
        return 'bg-green-500/10 text-green-400 border-green-400/20';
      case 'PUT':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-400/20';
      case 'DELETE':
        return 'bg-red-500/10 text-red-400 border-red-400/20';
      case 'PATCH':
        return 'bg-purple-500/10 text-purple-400 border-purple-400/20';
      default:
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-400/20';
    }
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) {
      return 'bg-green-500/10 text-green-400 border-green-400/20';
    } else if (status >= 300 && status < 400) {
      return 'bg-blue-500/10 text-blue-400 border-blue-400/20';
    } else if (status >= 400 && status < 500) {
      return 'bg-yellow-500/10 text-yellow-400 border-yellow-400/20';
    } else if (status >= 500) {
      return 'bg-red-500/10 text-red-400 border-red-400/20';
    }
    return 'bg-zinc-500/10 text-zinc-400 border-zinc-400/20';
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatDeltaTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/5 bg-[#111111]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-zinc-100">Recorded Requests</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">
              {requests.length} {requests.length === 1 ? 'request' : 'requests'}
            </span>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by URL, method, or status..."
              className="pl-9 bg-[#0a0a0a] border-white/10 text-sm"
            />
          </div>

          {/* Grouping mode */}
          <div className="flex items-center gap-1 bg-[#0a0a0a] border border-white/10 rounded-lg p-1">
            <button
              onClick={() => setGroupingMode('flat')}
              className={`p-1.5 rounded transition-colors ${
                groupingMode === 'flat'
                  ? 'bg-yellow-400/10 text-yellow-400'
                  : 'text-zinc-400 hover:text-zinc-300'
              }`}
              title="Flat list"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setGroupingMode('by-page')}
              className={`p-1.5 rounded transition-colors ${
                groupingMode === 'by-page'
                  ? 'bg-yellow-400/10 text-yellow-400'
                  : 'text-zinc-400 hover:text-zinc-300'
              }`}
              title="Group by page"
            >
              <ListTree className="w-4 h-4" />
            </button>
            <button
              onClick={() => setGroupingMode('by-transaction')}
              className={`p-1.5 rounded transition-colors ${
                groupingMode === 'by-transaction'
                  ? 'bg-yellow-400/10 text-yellow-400'
                  : 'text-zinc-400 hover:text-zinc-300'
              }`}
              title="Group by transaction"
            >
              <GitBranch className="w-4 h-4" />
            </button>
          </div>

          {/* Clear */}
          <Button
            size="sm"
            variant="ghost"
            className="text-zinc-400 hover:text-red-400"
            disabled={requests.length === 0}
          >
            <Trash2 className="w-4 h-4" />
          </Button>

          {/* Mark as transaction */}
          <Button
            size="sm"
            variant="outline"
            className="border-white/10 bg-white/5 hover:bg-white/10 text-zinc-400"
            disabled={!selectedRequest}
          >
            <Tag className="w-4 h-4 mr-2" />
            Mark
          </Button>
        </div>

        {/* Show filtered checkbox */}
        <label className="flex items-center gap-2 mt-3 text-xs text-zinc-400 cursor-pointer">
          <input
            type="checkbox"
            checked={showFilteredOut}
            onChange={(e) => setShowFilteredOut(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-white/20 bg-[#0a0a0a] text-yellow-400 focus:ring-yellow-400 focus:ring-offset-0"
          />
          Show filtered-out requests
        </label>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {requests.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md px-4">
              <Radio className="w-16 h-16 text-yellow-400/20 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-zinc-300 mb-2">
                No requests recorded yet
              </h3>
              <p className="text-sm text-zinc-500 mb-6">
                Configure the proxy settings, open your application in a browser, and click "Start Recording" to begin capturing HTTP traffic.
              </p>
              {status === 'idle' && (
                <div className="text-xs text-zinc-600 space-y-1">
                  <p>1. Set your browser's proxy to <span className="text-yellow-400 font-mono">127.0.0.1:8000</span></p>
                  <p>2. Click "Start Recording" above</p>
                  <p>3. Navigate your application</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[#111111] border-b border-white/5 z-10">
              <tr>
                <th className="text-left px-4 py-2 text-xs font-medium text-zinc-500 w-12">#</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-zinc-500 w-24">Time</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-zinc-500 w-20">Δt</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-zinc-500 w-24">Method</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-zinc-500 flex-1">Path</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-zinc-500 w-20">Status</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-zinc-500 w-24">Duration</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-zinc-500 w-24">Size</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-zinc-500 w-32">Group</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request, idx) => (
                <tr
                  key={request.id}
                  onClick={() => onSelectRequest(request)}
                  className={`border-b border-white/5 cursor-pointer transition-colors ${
                    selectedRequest?.id === request.id
                      ? 'bg-yellow-400/10'
                      : 'hover:bg-white/5'
                  } ${request.excluded ? 'opacity-40' : ''}`}
                >
                  <td className="px-4 py-3 text-zinc-500 text-xs">{idx + 1}</td>
                  <td className="px-4 py-3 text-zinc-400 text-xs font-mono">
                    {new Date(request.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">
                    {request.deltaTime > 0 ? formatDeltaTime(request.deltaTime) : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getMethodColor(request.method)}`}>
                      {request.method}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-300 text-xs font-mono truncate max-w-xs">
                    {request.path}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(request.status)}`}>
                      {request.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-400 text-xs">{formatTime(request.duration)}</td>
                  <td className="px-4 py-3 text-zinc-400 text-xs">{formatSize(request.size)}</td>
                  <td className="px-4 py-3">
                    {request.group && (
                      <span className="px-2 py-0.5 rounded text-xs bg-zinc-800 text-zinc-400 border border-zinc-700">
                        {request.group}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button className="p-1 hover:bg-white/10 rounded transition-colors">
                      <MoreVertical className="w-4 h-4 text-zinc-500" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
