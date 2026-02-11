import { Database, FileSpreadsheet, FileJson, FileCode } from 'lucide-react';
import type { ScriptNode } from '../../types/script';

interface DataSourceDetailProps {
  node: ScriptNode;
}

export function DataSourceDetail({ node }: DataSourceDetailProps) {
  const data = node.data || { type: 'csv', path: '', variables: [] };
  
  const getFileIcon = () => {
    switch (data.type) {
      case 'csv':
        return <FileSpreadsheet className="w-4 h-4" />;
      case 'json':
        return <FileJson className="w-4 h-4" />;
      case 'xml':
        return <FileCode className="w-4 h-4" />;
      default:
        return <Database className="w-4 h-4" />;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-neutral-200">
        <div className="flex items-center gap-2 mb-1">
          <Database className="w-5 h-5 text-emerald-600" />
          <h3 className="text-neutral-900">{node.name}</h3>
        </div>
        <p className="text-xs text-neutral-500">
          External data source for parameterization
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6">
          {/* File Configuration */}
          <div>
            <h4 className="text-sm font-medium text-neutral-900 mb-3">File Configuration</h4>
            <div className="bg-neutral-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-emerald-700">
                  {getFileIcon()}
                  <span className="text-sm font-medium uppercase">{data.type}</span>
                </div>
              </div>
              
              <div>
                <label className="block text-xs text-neutral-600 mb-1">File Path</label>
                <div className="bg-white rounded px-3 py-2 border border-neutral-200 font-mono text-sm text-neutral-700">
                  {data.path || 'No path specified'}
                </div>
              </div>
            </div>
          </div>

          {/* Variable Mapping */}
          <div>
            <h4 className="text-sm font-medium text-neutral-900 mb-3">
              Variable Mapping
              {data.variables && data.variables.length > 0 && (
                <span className="ml-2 text-xs text-neutral-500">
                  ({data.variables.length} columns)
                </span>
              )}
            </h4>
            
            {data.variables && data.variables.length > 0 ? (
              <div className="border border-neutral-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-neutral-50 border-b border-neutral-200">
                    <tr>
                      <th className="text-left px-4 py-2 text-xs font-medium text-neutral-600">
                        Column Name
                      </th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-neutral-600">
                        Sample Value
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.variables.map((variable: any, idx: number) => (
                      <tr 
                        key={idx}
                        className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50"
                      >
                        <td className="px-4 py-2.5 font-mono text-emerald-700">
                          ${'{' + variable.name + '}'}
                        </td>
                        <td className="px-4 py-2.5 text-neutral-600">
                          {variable.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-neutral-50 rounded-lg p-8 text-center">
                <Database className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
                <p className="text-sm text-neutral-500">No variables mapped yet</p>
              </div>
            )}
          </div>

          {/* Settings */}
          <div>
            <h4 className="text-sm font-medium text-neutral-900 mb-3">Settings</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                <span className="text-neutral-700">Sharing Mode</span>
                <span className="text-neutral-600 font-medium">All threads</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                <span className="text-neutral-700">Recycle on EOF</span>
                <span className="text-emerald-600 font-medium">True</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                <span className="text-neutral-700">Stop thread on EOF</span>
                <span className="text-neutral-600 font-medium">False</span>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-xs text-blue-800 leading-relaxed">
              <strong>Note:</strong> Variables from this data source can be referenced 
              in your test using the <code className="bg-blue-100 px-1 rounded">${'{'}{'{variable_name}'}</code> syntax. 
              Each thread iteration will use the next row from the file.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
