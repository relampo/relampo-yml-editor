import { useRef } from 'react';
import { Database, FileSpreadsheet, FileJson, FileCode, Upload } from 'lucide-react';
import type { ScriptNode } from '../../types/script';
import { Input } from '../ui/input';
import { Button } from '../ui/button';

interface DataSourceDetailProps {
  node: ScriptNode;
  onNodeUpdate?: (nodeId: string, data: any) => void;
}

export function DataSourceDetail({ node, onNodeUpdate }: DataSourceDetailProps) {
  const data = node.data || { type: 'csv', file: '', variable_names: '' };
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (field: string, value: any) => {
    if (onNodeUpdate) {
      const updatedData = { ...data, [field]: value };
      // If we are updating 'file', ensure any legacy 'path' is removed
      if (field === 'file') {
        delete updatedData.path;
      }
      onNodeUpdate(node.id, updatedData);
    }
  };

  const handleBrowseClick = async () => {
    if ((window as any).electron?.selectFile) {
      try {
        const path = await (window as any).electron.selectFile();
        if (path) {
          handleChange('file', path);
        }
        return;
      } catch (err) {
        console.error('Electron file selection failed:', err);
      }
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const path = (file as any).path || file.name;
      handleChange('file', path);
    }
  };

  const getFileIcon = () => {
    switch (data.type) {
      case 'csv':
      case 'txt':
        return <FileSpreadsheet className="w-5 h-5 text-yellow-400" />;
      case 'json':
        return <FileJson className="w-5 h-5 text-yellow-400" />;
      case 'xml':
        return <FileCode className="w-5 h-5 text-yellow-400" />;
      default:
        return <Database className="w-5 h-5 text-yellow-400" />;
    }
  };

  const pathValue = data.file || data.path || '';

  return (
    <div className="h-full bg-[#0a0a0a] flex flex-col">
      {/* Header */}
      <div className="px-8 py-6 bg-[#111111] border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-yellow-400/10 rounded-lg">
            <Database className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <h3 className="text-zinc-100 font-semibold tracking-tight">{node.name}</h3>
            <p className="text-sm text-zinc-500 mt-1">
              External data source for parameterization
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="space-y-8 max-w-4xl">
          {/* Data Source Details */}
          <div className="bg-[#111111] rounded-xl p-6 border border-white/5 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                {getFileIcon()}
                Data Source Details
              </h4>
              <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-md text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                {data.type || 'csv'}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                  Name
                </p>
                <div
                  className="h-10 px-3 rounded-md bg-[#0a0a0a] border border-white/10 text-zinc-300 font-mono text-sm flex items-center truncate"
                  title={node.name}
                >
                  {node.name}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="ds-detail-type" className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                    Type
                  </label>
                  <select
                    id="ds-detail-type"
                    value={data.type || 'csv'}
                    onChange={(e) => handleChange('type', e.target.value)}
                    className="w-full h-10 bg-[#0a0a0a] border border-white/10 rounded-md px-3 text-sm text-zinc-300"
                  >
                    <option value="csv">CSV</option>
                    <option value="txt">TXT</option>
                    <option value="json">JSON</option>
                    <option value="xml">XML</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="ds-detail-file" className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                    File
                  </label>
                  <div className="flex gap-2">
                    <Input
                      id="ds-detail-file"
                      value={pathValue}
                      onChange={(e) => handleChange('file', e.target.value)}
                      placeholder="users.csv or /path/to/users.csv"
                      className="flex-1 h-10 bg-[#0a0a0a] border-white/10 text-zinc-300 font-mono"
                    />
                    <Button
                      onClick={handleBrowseClick}
                      variant="outline"
                      className="h-10 border-yellow-400/20 bg-yellow-400/5 hover:bg-yellow-400/10 text-yellow-400"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Browse
                    </Button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Variable Mapping */}
          <div className="bg-[#111111] rounded-xl p-6 border border-white/5 shadow-2xl">
            <h4 className="text-sm font-semibold text-zinc-100 mb-4 tracking-tight">Variable Mapping</h4>
            <div className="mb-4">
              <label htmlFor="ds-detail-var-names" className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                Variable Names (comma-separated)
              </label>
              <Input
                id="ds-detail-var-names"
                value={data.variable_names || ''}
                onChange={(e) => handleChange('variable_names', e.target.value)}
                placeholder="var1, var2, var3"
                className="w-full bg-[#0a0a0a] border-white/10 text-zinc-300 font-mono"
              />
            </div>
            {data.variable_names ? (
              <div className="flex flex-wrap gap-2 mt-4">
                {data.variable_names.split(',').map((name: string, idx: number) => (
                  <div key={name.trim() || idx} className="bg-yellow-400/10 border border-yellow-400/20 rounded-lg px-3 py-1.5 text-xs font-mono text-yellow-400">
                    {name.trim() ? '{{' + name.trim() + '}}' : ''}
                  </div>
                )).filter((item: any) => item !== '')}
              </div>
            ) : (
              <div className="py-8 text-center bg-[#0a0a0a] rounded-lg border border-white/5">
                <Database className="w-8 h-8 mx-auto mb-3 text-zinc-800" />
                <p className="text-sm text-zinc-500">No variables mapped</p>
              </div>
            )}
          </div>
          <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-6">
            <div className="flex gap-3">
              <div className="w-1 h-auto bg-blue-500 rounded-full shrink-0" />
              <div className="text-xs text-zinc-400 leading-relaxed space-y-3">
                <div>
                  <strong className="text-zinc-200">Local:</strong> In browser mode, the file picker usually returns only the file name. Copy and paste the full CSV/TXT path if you plan to run this script locally.
                </div>
                <div>
                  <strong className="text-zinc-200">Distributed:</strong> Use only the file name or a relative path (for example, <code className="text-zinc-300">users.csv</code>). Relampo handles path resolution automatically across distributed nodes.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
