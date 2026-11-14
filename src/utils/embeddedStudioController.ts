import type { CorrelateDocument } from './correlateBridge';
import type { EditorViewMode } from '../components/EditorViewModeTabs';

export type EmbeddedStudioView = 'scripting' | 'record' | 'correlation' | 'debug' | 'run';
export interface EmbeddedStudioController {
  document: () => CorrelateDocument;
  replace: (yaml: string, fileName: string) => Promise<void>;
  save: () => Promise<void>;
  upload: () => void;
  download: (includeResponses: boolean) => void;
  newDocument: () => void;
  view: (mode: EditorViewMode) => void;
}
