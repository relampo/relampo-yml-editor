import type { ScriptNode, CookieData } from '../../types/script';
import { Plus } from 'lucide-react';

interface CookieManagerDetailProps {
  node: ScriptNode;
}

export function CookieManagerDetail({ node }: CookieManagerDetailProps) {
  const data = node.data as CookieData;

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-zinc-100">{node.name}</h3>
            <p className="text-sm text-zinc-400 mt-1">
              Manages cookies at the scenario level
            </p>
          </div>
          <button className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-300 hover:to-yellow-400 text-black font-semibold rounded-lg transition-colors text-sm shadow-lg shadow-yellow-400/30">
            <Plus className="w-4 h-4" />
            Add Cookie
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="border border-white/10 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="px-4 py-2 text-left text-xs text-zinc-400">Name</th>
                <th className="px-4 py-2 text-left text-xs text-zinc-400">Value</th>
                <th className="px-4 py-2 text-left text-xs text-zinc-400">Domain</th>
                <th className="px-4 py-2 text-left text-xs text-zinc-400">Path</th>
                <th className="px-4 py-2 text-left text-xs text-zinc-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.cookies.map((cookie, index) => (
                <tr key={index} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 text-sm text-zinc-100 font-mono">
                    {cookie.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-300 font-mono">
                    {cookie.value}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-400">
                    {cookie.domain}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-400">
                    {cookie.path}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <button className="text-blue-400 hover:text-blue-300 mr-3">
                      Edit
                    </button>
                    <button className="text-red-400 hover:text-red-300">
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
