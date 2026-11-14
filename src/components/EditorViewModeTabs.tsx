import { Bug, Code2, Gauge, GitBranch } from 'lucide-react';
import type { ReactNode } from 'react';

export type EditorViewMode = 'tree' | 'code' | 'debug' | 'run';

interface EditorViewModeTabsProps {
  activeViewMode: EditorViewMode;
  onSelect: (mode: EditorViewMode) => void;
  language: string;
  // Debug and Run tabs are only shown when unlocked by `relampo studio`.
  debugViewEnabled: boolean;
  runViewEnabled: boolean;
}

export function EditorViewModeTabs({
  activeViewMode,
  onSelect,
  language,
  debugViewEnabled,
  runViewEnabled,
}: EditorViewModeTabsProps) {
  const tabs: Array<{ mode: EditorViewMode; icon: ReactNode; label: string }> = [
    { mode: 'tree', icon: <GitBranch className="w-4 h-4" />, label: language === 'es' ? 'Árbol' : 'Tree' },
    { mode: 'code', icon: <Code2 className="w-4 h-4" />, label: language === 'es' ? 'Código' : 'Code' },
    ...(debugViewEnabled
      ? [
          {
            mode: 'debug' as const,
            icon: <Bug className="w-4 h-4" />,
            label: language === 'es' ? 'Depuración' : 'Debug',
          },
        ]
      : []),
    ...(runViewEnabled
      ? [{ mode: 'run' as const, icon: <Gauge className="w-4 h-4" />, label: language === 'es' ? 'Carga' : 'Run' }]
      : []),
  ];

  return (
    <div
      data-editor-view-tabs
      className="@container flex min-w-0 items-center bg-[#111111] border-b border-white/5 shrink-0"
    >
      {tabs.map(tab => (
        <button
          type="button"
          key={tab.mode}
          data-editor-view-tab
          aria-pressed={activeViewMode === tab.mode}
          onClick={() => onSelect(tab.mode)}
          className={`min-w-0 flex-1 flex flex-col @min-[450px]:flex-row items-center justify-center gap-1 @min-[450px]:gap-2 px-1 @min-[450px]:px-3 py-3 text-xs @min-[450px]:text-sm font-bold transition-all duration-200 ${
            activeViewMode === tab.mode
              ? 'text-yellow-400 bg-yellow-400/10 border-b-2 border-yellow-400 shadow-[inset_0_-2px_0_rgba(250,204,21,0.5)]'
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
          }`}
        >
          {tab.icon}
          <span className="max-w-full truncate">{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
