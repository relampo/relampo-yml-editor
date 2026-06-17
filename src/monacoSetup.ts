// Bundles Monaco into the app instead of loading it from the CDN, so the
// editor works fully offline (required for `relampo studio`, RLP-507).
// Only the languages the app actually uses are included: YAML and SQL get
// monarch highlighting, JSON gets the full language service (worker-backed),
// and JavaScript gets highlighting only (no TypeScript language service, so
// no JS intellisense/markers; including it would roughly double the bundle).
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import 'monaco-editor/esm/vs/editor/editor.all';
import 'monaco-editor/esm/vs/basic-languages/yaml/yaml.contribution';
import 'monaco-editor/esm/vs/basic-languages/sql/sql.contribution';
import 'monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution';
import 'monaco-editor/esm/vs/language/json/monaco.contribution';
import { loader } from '@monaco-editor/react';

import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';

self.MonacoEnvironment = {
  getWorker(_workerId: string, label: string) {
    if (label === 'json') {
      return new JsonWorker();
    }
    return new EditorWorker();
  },
};

loader.config({ monaco });
