import { YAMLEditor } from './YAMLEditor';
import { YAMLProvider } from '../contexts/YAMLContext';
import type { View } from '../App';

export function CLI(_: { onViewChange?: (view: View) => void }) {
  return (
    <YAMLProvider>
      <div className="h-full flex flex-col bg-[#0a0a0a]">
        <YAMLEditor />
      </div>
    </YAMLProvider>
  );
}
