import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Check, X, CheckCircle2, Circle } from 'lucide-react';
import { Input } from './ui/input';

interface EditableListItem {
  originalKey: string;  // La key original que no cambia
  key: string;          // La key que se edita
  value: string;
  checked?: boolean;
}

interface EditableListProps {
  title: string;
  items: Record<string, string>;
  onUpdate: (items: Record<string, string>) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  keyLabel?: string;
  valueLabel?: string;
  enableCheckboxes?: boolean;
  enableBulkActions?: boolean;
  onBulkDelete?: (keys: string[]) => void;
}

export function EditableList({
  title,
  items,
  onUpdate,
  keyPlaceholder = 'Name',
  valuePlaceholder = 'Value',
  keyLabel = 'Name',
  valueLabel = 'Value',
  enableCheckboxes = true,
  enableBulkActions = true,
  onBulkDelete,
}: EditableListProps) {
  const [localItems, setLocalItems] = useState<EditableListItem[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<{ key: string; value: string } | null>(null);

  // Sincronizar items externos con estado local
  useEffect(() => {
    const newItems = Object.entries(items).map(([key, value]) => ({
      originalKey: key,
      key,
      value: String(value),
      checked: selectedKeys.has(key),
    }));
    setLocalItems(newItems);
  }, [items, selectedKeys]);

  const handleAdd = () => {
    const newKey = `new_item_${Date.now()}`;
    const updatedItems = { ...items, [newKey]: '' };
    onUpdate(updatedItems);
    
    // Auto-editar el nuevo item
    setTimeout(() => {
      setEditingValue({ key: newKey, value: '' });
    }, 50);
  };

  const handleDelete = (key: string) => {
    const updatedItems = { ...items };
    delete updatedItems[key];
    onUpdate(updatedItems);
    
    // Remover de seleccionados
    const newSelected = new Set(selectedKeys);
    newSelected.delete(key);
    setSelectedKeys(newSelected);
  };

  const handleBulkDelete = () => {
    if (selectedKeys.size === 0) return;
    
    const updatedItems = { ...items };
    selectedKeys.forEach(key => delete updatedItems[key]);
    onUpdate(updatedItems);
    
    if (onBulkDelete) {
      onBulkDelete(Array.from(selectedKeys));
    }
    
    setSelectedKeys(new Set());
  };

  const handleKeyChange = (originalKey: string, newKey: string) => {
    if (!newKey.trim()) {
      setEditingKey(null);
      // Restaurar valor original
      const newItems = localItems.map(i =>
        i.originalKey === originalKey ? { ...i, key: originalKey } : i
      );
      setLocalItems(newItems);
      return;
    }

    const updatedItems = { ...items };
    const value = updatedItems[originalKey];
    delete updatedItems[originalKey];
    updatedItems[newKey] = value;
    
    onUpdate(updatedItems);
    setEditingKey(null);
  };

  const handleValueSave = () => {
    if (editingValue) {
      const updatedItems = { ...items, [editingValue.key]: editingValue.value };
      onUpdate(updatedItems);
      setEditingValue(null);
    }
  };

  const handleCheckToggle = (key: string) => {
    const newSelected = new Set(selectedKeys);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedKeys(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedKeys.size === Object.keys(items).length) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(Object.keys(items)));
    }
  };

  const allSelected = Object.keys(items).length > 0 && selectedKeys.size === Object.keys(items).length;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            {title} ({Object.keys(items).length})
          </label>
          
          {enableCheckboxes && Object.keys(items).length > 0 && (
            <button
              onClick={handleSelectAll}
              className="text-xs text-zinc-400 hover:text-zinc-300 transition-colors"
            >
              {allSelected ? 'Deselect All' : 'Select All'}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {enableBulkActions && selectedKeys.size > 0 && (
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-400 bg-red-400/10 hover:bg-red-400/20 border border-red-400/20 rounded transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Delete ({selectedKeys.size})
            </button>
          )}
          
          <button
            onClick={handleAdd}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-400 bg-green-400/10 hover:bg-green-400/20 border border-green-400/20 rounded transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add
          </button>
        </div>
      </div>

      {/* Items List */}
      <div className="space-y-2">
        {localItems.map((item) => (
          <div
            key={item.originalKey}
            className={`p-3 bg-white/5 border-2 rounded-lg transition-all ${
              selectedKeys.has(item.originalKey)
                ? 'border-purple-400/60 bg-purple-400/10 shadow-lg shadow-purple-500/10'
                : 'border-white/10 hover:border-white/20 hover:bg-white/[0.07]'
            }`}
          >
            <div className="flex items-center gap-3">
              {/* Checkbox Visual */}
              {enableCheckboxes && (
                <button
                  onClick={() => handleCheckToggle(item.key)}
                  className="text-purple-400 hover:text-purple-300 transition-colors flex-shrink-0"
                  title={selectedKeys.has(item.key) ? 'Deselect' : 'Select'}
                >
                  {selectedKeys.has(item.key) ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <Circle className="w-5 h-5" />
                  )}
                </button>
              )}

              {/* Content */}
              <div className="flex-1 space-y-2">
                {/* Key (nombre) - en una línea con el valor */}
                <div className="flex items-center gap-2">
                  {editingKey === item.originalKey ? (
                    <>
                      <Input
                        autoFocus
                        value={item.key}
                        onChange={(e) => {
                          const newItems = localItems.map(i =>
                            i.originalKey === item.originalKey ? { ...i, key: e.target.value } : i
                          );
                          setLocalItems(newItems);
                        }}
                        onBlur={() => {
                          handleKeyChange(item.originalKey, item.key);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleKeyChange(item.originalKey, item.key);
                          } else if (e.key === 'Escape') {
                            setEditingKey(null);
                            const newItems = localItems.map(i =>
                              i.originalKey === item.originalKey ? { ...i, key: item.originalKey } : i
                            );
                            setLocalItems(newItems);
                          }
                        }}
                        className="flex-1 px-2 py-1 text-xs font-mono text-purple-400 bg-purple-400/5 border-purple-400/30"
                        placeholder={keyPlaceholder}
                      />
                      <button
                        onClick={() => {
                          handleKeyChange(item.originalKey, item.key);
                        }}
                        className="p-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 hover:text-green-300 rounded-md transition-all"
                        title="Save"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingKey(null);
                          const newItems = localItems.map(i =>
                            i.originalKey === item.originalKey ? { ...i, key: item.originalKey } : i
                          );
                          setLocalItems(newItems);
                        }}
                        className="p-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 rounded-md transition-all"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <button
                          onClick={() => setEditingKey(item.originalKey)}
                          className="text-xs font-mono text-purple-400 font-bold bg-purple-400/10 hover:bg-purple-400/20 px-2 py-1 rounded transition-colors cursor-pointer"
                          title="Click to edit name"
                        >
                          {item.key}
                        </button>
                        <span className="text-zinc-500 font-bold">=</span>
                      </div>
                      
                      {/* Value inline */}
                      {editingValue?.key === item.originalKey ? (
                        <div className="flex-1 flex items-center gap-2">
                          <Input
                            autoFocus
                            value={editingValue.value}
                            onChange={(e) => setEditingValue({ key: item.originalKey, value: e.target.value })}
                            onBlur={handleValueSave}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleValueSave();
                              } else if (e.key === 'Escape') {
                                setEditingValue(null);
                              }
                            }}
                            className="flex-1 px-2 py-1 text-sm font-mono text-zinc-300 bg-white/5 border-white/10"
                            placeholder={valuePlaceholder}
                          />
                          <button
                            onClick={handleValueSave}
                            className="p-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 hover:text-green-300 rounded-md transition-all"
                            title="Save"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingValue(null)}
                            className="p-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 rounded-md transition-all"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex-1 flex items-center justify-between group">
                          <div className="flex-1 px-3 py-1.5 bg-white/5 border border-white/10 rounded overflow-hidden">
                            <span className="text-sm font-mono text-zinc-200 break-all overflow-wrap-anywhere block">
                              {item.value || <span className="text-zinc-600 italic">empty</span>}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setEditingValue({ key: item.originalKey, value: item.value })}
                              className="p-1.5 text-blue-400 hover:bg-blue-400/20 hover:text-blue-300 rounded-md transition-all"
                              title="Edit value"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(item.originalKey)}
                              className="p-1.5 text-red-400 hover:bg-red-400/20 hover:text-red-300 rounded-md transition-all"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Empty state */}
        {Object.keys(items).length === 0 && (
          <div className="p-6 text-center text-zinc-500 text-sm border border-dashed border-white/10 rounded">
            No {title.toLowerCase()} defined. Click "Add" to create one.
          </div>
        )}
      </div>
    </div>
  );
}
