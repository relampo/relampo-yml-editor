import { Check, CheckCircle2, Circle, Edit2, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { StringMap } from '../types/shared';
import { HighlightedInput } from './ui/HighlightedInput';
import { Input } from './ui/input';

interface EditableListItem {
  originalKey: string;
  key: string;
  value: string;
  checked?: boolean;
}

interface EditableListProps {
  title: string;
  items: StringMap;
  onUpdate: (items: StringMap) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  enableCheckboxes?: boolean;
  enableBulkActions?: boolean;
  onBulkDelete?: (keys: string[]) => void;
  variant?: 'default' | 'minimal';
  searchText?: string;
}

const addButtonClass =
  'flex items-center gap-1 px-2 py-1 text-xs text-amber-500 hover:text-amber-400 border border-yellow-400/20 bg-yellow-400/5 hover:bg-yellow-400/10 hover:border-yellow-400/35 rounded transition-colors';

function getItemStyles(variant: 'default' | 'minimal', isCurrentItem: boolean) {
  if (variant === 'minimal') {
    return `py-3 px-1 border-b border-white/5 transition-colors flex items-center gap-3 group ${
      isCurrentItem ? 'bg-purple-400/5' : 'hover:bg-white/[0.02]'
    }`;
  }
  return `p-3 bg-white/5 border-2 rounded-lg transition-[color,background-color,border-color,box-shadow] ${
    isCurrentItem
      ? 'border-purple-400/60 bg-purple-400/10 shadow-lg shadow-purple-500/10'
      : 'border-white/10 hover:border-white/20 hover:bg-white/[0.07]'
  }`;
}

interface EditableListToolbarProps {
  title: string;
  enableCheckboxes: boolean;
  enableBulkActions: boolean;
  itemCount: number;
  selectedCount: number;
  allSelected: boolean;
  onSelectAll: () => void;
  onBulkDelete: () => void;
  onAdd: () => void;
}

function EditableListToolbar({
  title,
  enableCheckboxes,
  enableBulkActions,
  itemCount,
  selectedCount,
  allSelected,
  onSelectAll,
  onBulkDelete,
  onAdd,
}: EditableListToolbarProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{title}</span>

        {enableCheckboxes && itemCount > 0 && (
          <button type="button"
            onClick={onSelectAll}
            className="text-xs text-zinc-400 hover:text-zinc-300 transition-colors"
          >
            {allSelected ? 'Deselect All' : 'Select All'}
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        {enableBulkActions && selectedCount > 0 && (
          <button type="button"
            onClick={onBulkDelete}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-400 bg-red-400/10 hover:bg-red-400/20 border border-red-400/20 rounded transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            Delete ({selectedCount})
          </button>
        )}

        <button type="button"
          onClick={onAdd}
          className={addButtonClass}
        >
          <Plus className="w-3 h-3" />
          Add
        </button>
      </div>
    </div>
  );
}

interface EditableListRowProps {
  item: EditableListItem;
  variant: 'default' | 'minimal';
  keyPlaceholder: string;
  valuePlaceholder: string;
  searchText: string;
  enableCheckboxes: boolean;
  selectedKeys: Set<string>;
  editingKey: string | null;
  editingValue: { key: string; value: string } | null;
  items: StringMap;
  onUpdate: (items: StringMap) => void;
  setLocalItems: Dispatch<SetStateAction<EditableListItem[]>>;
  onCheckToggle: (key: string) => void;
  onDelete: (key: string) => void;
  onKeyChange: (originalKey: string, newKey: string) => void;
  onResetKey: (originalKey: string) => void;
  onValueSave: () => void;
  onEditKey: (key: string | null) => void;
  onEditValue: (value: { key: string; value: string } | null) => void;
}

function EditableListRow({
  item,
  variant,
  keyPlaceholder,
  valuePlaceholder,
  searchText,
  enableCheckboxes,
  selectedKeys,
  editingKey,
  editingValue,
  items,
  onUpdate,
  setLocalItems,
  onCheckToggle,
  onDelete,
  onKeyChange,
  onResetKey,
  onValueSave,
  onEditKey,
  onEditValue,
}: EditableListRowProps) {
  return (
    <div className={getItemStyles(variant, selectedKeys.has(item.originalKey))}>
      <div className="flex items-center gap-3 w-full min-w-0">
        {enableCheckboxes && (
          <button type="button"
            onClick={() => onCheckToggle(item.key)}
            className="text-purple-400 hover:text-purple-300 transition-colors shrink-0"
            title={selectedKeys.has(item.key) ? 'Deselect' : 'Select'}
          >
            {selectedKeys.has(item.key) ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
          </button>
        )}

        {variant === 'minimal' ? (
          <>
            <div className="flex-1 flex items-center gap-3 min-w-0">
              <div className="flex items-center gap-2 shrink-0 w-[250px]">
                <HighlightedInput
                  value={item.key}
                  onFocus={() => onEditKey(item.originalKey)}
                  onChange={e => {
                    setLocalItems(currentItems =>
                      currentItems.map(currentItem =>
                        currentItem.originalKey === item.originalKey
                          ? { ...currentItem, key: e.target.value }
                          : currentItem,
                      ),
                    );
                  }}
                  onBlur={() => onKeyChange(item.originalKey, item.key)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      onKeyChange(item.originalKey, item.key);
                    } else if (e.key === 'Escape') {
                      onResetKey(item.originalKey);
                    }
                  }}
                  placeholder={keyPlaceholder}
                  maxLength={50}
                  className="flex-1 px-2 py-1 text-xs font-mono text-yellow-400 bg-yellow-400/5 border-yellow-400/20 focus:border-yellow-400/40"
                  searchText={searchText}
                  overlayClass="px-2 py-1 text-xs font-mono text-yellow-400"
                />
                <span className="text-zinc-500 font-bold shrink-0">=</span>
              </div>

              <div className="w-0 flex-1 min-w-0 overflow-x-auto scrollbar-none">
                <HighlightedInput
                  value={item.value}
                  onChange={e => {
                    const updatedItems = {
                      ...items,
                      [item.key]: e.target.value,
                    };
                    onUpdate(updatedItems);
                  }}
                  placeholder={valuePlaceholder}
                  className="w-full px-2 py-1 text-sm font-mono text-zinc-300 bg-white/5 border-white/10 focus:border-white/30"
                  searchText={searchText}
                  overlayClass="px-2 py-1 text-sm font-mono text-zinc-300"
                />
              </div>
            </div>

            <button type="button"
              onClick={() => onDelete(item.originalKey)}
              className="p-2 h-9 text-zinc-500 hover:text-red-400 bg-white/5 hover:bg-white/10 rounded shrink-0 transition-colors"
              title="Remove"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        ) : (
          <>
            {editingKey === item.originalKey ? (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Input
                  value={item.key}
                  onChange={e => {
                    setLocalItems(currentItems =>
                      currentItems.map(i =>
                        i.originalKey === item.originalKey ? { ...i, key: e.target.value } : i,
                      ),
                    );
                  }}
                  onBlur={() => {
                    onKeyChange(item.originalKey, item.key);
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      onKeyChange(item.originalKey, item.key);
                    } else if (e.key === 'Escape') {
                      onResetKey(item.originalKey);
                    }
                  }}
                  className="w-40 shrink-0 px-2 py-1 text-xs font-mono text-purple-400 bg-purple-400/5 border-purple-400/30"
                  placeholder={keyPlaceholder}
                  maxLength={50}
                />
                <div className="flex items-center gap-1">
                  <button type="button"
                    onClick={() => {
                      onKeyChange(item.originalKey, item.key);
                    }}
                    className="p-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 hover:text-green-300 rounded-md transition-colors"
                    title="Save"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button type="button"
                    onClick={() => {
                      onResetKey(item.originalKey);
                    }}
                    className="p-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 rounded-md transition-colors"
                    title="Cancel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 shrink-0 w-40">
                  <button type="button"
                    onClick={() => onEditKey(item.originalKey)}
                    className="text-xs font-mono text-purple-400 font-bold bg-purple-400/10 hover:bg-purple-400/20 px-2 py-1 rounded transition-colors cursor-pointer truncate w-full"
                    title="Click to edit name"
                  >
                    {item.key}
                  </button>
                  <span className="text-zinc-500 font-bold shrink-0">=</span>
                </div>

                {editingValue?.key === item.originalKey ? (
                  <div className="flex-1 flex items-center gap-2 min-w-0">
                    <Input
                      value={editingValue.value}
                      onChange={e =>
                        onEditValue({
                          key: item.originalKey,
                          value: e.target.value,
                        })
                      }
                      onBlur={onValueSave}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          onValueSave();
                        } else if (e.key === 'Escape') {
                          onEditValue(null);
                        }
                      }}
                      className="w-0 flex-1 px-2 py-1 text-sm font-mono text-zinc-300 bg-white/5 border-white/10"
                      placeholder={valuePlaceholder}
                    />
                    <div className="flex items-center gap-1">
                      <button type="button"
                        onClick={onValueSave}
                        className="p-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 hover:text-green-300 rounded-md transition-colors"
                        title="Save"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button type="button"
                        onClick={() => onEditValue(null)}
                        className="p-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 rounded-md transition-colors"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 min-w-0 flex items-center justify-between group">
                    <div className="flex-1 min-w-0 px-3 py-1.5 bg-white/5 border border-white/10 rounded overflow-x-auto scrollbar-none">
                      <span className="text-sm font-mono text-zinc-200 whitespace-nowrap block">
                        {item.value || <span className="text-zinc-600 italic">empty</span>}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button type="button"
                        onClick={() =>
                          onEditValue({
                            key: item.originalKey,
                            value: item.value,
                          })
                        }
                        className="p-1.5 text-blue-400 hover:bg-blue-400/20 hover:text-blue-300 rounded-md transition-colors"
                        title="Edit value"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button type="button"
                        onClick={() => onDelete(item.originalKey)}
                        className="p-1.5 text-red-400 hover:bg-red-400/20 hover:text-red-300 rounded-md transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function EditableList({
  title,
  items,
  onUpdate,
  keyPlaceholder = 'Name',
  valuePlaceholder = 'Value',
  enableCheckboxes = true,
  enableBulkActions = true,
  onBulkDelete,
  variant = 'default',
  searchText = '',
}: EditableListProps) {
  const [localItems, setLocalItems] = useState<EditableListItem[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<{
    key: string;
    value: string;
  } | null>(null);

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

    setTimeout(() => {
      setEditingValue({ key: newKey, value: '' });
    }, 50);
  };

  const handleDelete = (key: string) => {
    const updatedItems = { ...items };
    delete updatedItems[key];
    onUpdate(updatedItems);

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
      const newItems = localItems.map(i => (i.originalKey === originalKey ? { ...i, key: originalKey } : i));
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

  const resetLocalKey = (originalKey: string) => {
    setLocalItems(currentItems =>
      currentItems.map(item => (item.originalKey === originalKey ? { ...item, key: originalKey } : item)),
    );
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
      <EditableListToolbar
        title={title}
        enableCheckboxes={enableCheckboxes}
        enableBulkActions={enableBulkActions}
        itemCount={Object.keys(items).length}
        selectedCount={selectedKeys.size}
        allSelected={allSelected}
        onSelectAll={handleSelectAll}
        onBulkDelete={handleBulkDelete}
        onAdd={handleAdd}
      />

      <div className={variant === 'minimal' ? 'divide-y divide-white/5' : 'space-y-2'}>
        {localItems.map(item => (
          <EditableListRow
            key={item.originalKey}
            item={item}
            variant={variant}
            keyPlaceholder={keyPlaceholder}
            valuePlaceholder={valuePlaceholder}
            searchText={searchText}
            enableCheckboxes={enableCheckboxes}
            selectedKeys={selectedKeys}
            editingKey={editingKey}
            editingValue={editingValue}
            items={items}
            onUpdate={onUpdate}
            setLocalItems={setLocalItems}
            onCheckToggle={handleCheckToggle}
            onDelete={handleDelete}
            onKeyChange={handleKeyChange}
            onResetKey={resetLocalKey}
            onValueSave={handleValueSave}
            onEditKey={setEditingKey}
            onEditValue={setEditingValue}
          />
        ))}

        {Object.keys(items).length === 0 && (
          <div className="p-6 text-center text-zinc-500 text-sm border border-dashed border-white/10 rounded">
            No {title.toLowerCase()} defined. Click "Add" to create one.
          </div>
        )}
      </div>
    </div>
  );
}
