import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import type { ScriptNode } from '../types/script';

interface RenameDialogProps {
  node: ScriptNode;
  onConfirm: (newName: string) => void;
  onCancel: () => void;
}

export function RenameDialog({ node, onConfirm, onCancel }: RenameDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Extract method prefix for HTTP requests (GET, POST, etc.)
  const getHttpMethodPrefix = (name: string): string | null => {
    const httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
    for (const method of httpMethods) {
      if (name.startsWith(method + ' ')) {
        return method + ' ';
      }
    }
    return null;
  };

  const isHttpRequest = node.type === 'http-request';
  const methodPrefix = isHttpRequest ? getHttpMethodPrefix(node.name) : null;
  const editablePart = methodPrefix ? node.name.substring(methodPrefix.length) : node.name;

  const [newName, setNewName] = useState(editablePart);

  useEffect(() => {
    // Focus input and select all text
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onCancel]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newName.trim()) {
      const finalName = methodPrefix ? methodPrefix + newName.trim() : newName.trim();
      onConfirm(finalName);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-[#111111] border border-white/10 rounded-lg shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h3 className="font-medium text-zinc-100">Rename Node</h3>
          <button
            onClick={onCancel}
            className="p-1 rounded hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4 text-zinc-500" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4">
            <label className="block text-sm text-zinc-300 mb-2">
              New name
              {methodPrefix && (
                <span className="text-xs text-zinc-500 ml-2">
                  (Method prefix "{methodPrefix}" will be preserved)
                </span>
              )}
            </label>
            
            <div className="flex items-center gap-2">
              {methodPrefix && (
                <span className="text-sm font-medium text-zinc-400 bg-white/5 px-2 py-2 rounded">
                  {methodPrefix}
                </span>
              )}
              <input
                ref={inputRef}
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="flex-1 px-3 py-2 bg-[#0a0a0a] border border-white/10 text-zinc-100 placeholder-zinc-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                placeholder="Enter new name..."
              />
            </div>
            
            <p className="text-xs text-zinc-500 mt-2">
              Current: <span className="font-mono">{node.name}</span>
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-6 py-4 bg-white/5 rounded-b-lg">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm text-zinc-300 hover:bg-white/10 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newName.trim()}
              className="px-4 py-2 text-sm bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-300 hover:to-yellow-400 text-black font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Rename
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}