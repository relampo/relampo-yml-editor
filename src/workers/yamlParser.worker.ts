/// <reference lib="webworker" />

import { parseYAMLToTree } from '../utils/yamlParser';
import type { ParseWorkerRequest, ParseWorkerResponse } from '../components/yamlEditorHelpers';

const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = (event: MessageEvent<ParseWorkerRequest>) => {
  const payload = event.data;
  if (!payload || typeof payload.id !== 'number') return;

  try {
    const tree = parseYAMLToTree(payload.yaml || '', payload.rootName);
    const response: ParseWorkerResponse = {
      id: payload.id,
      ok: true,
      tree,
    };
    ctx.postMessage(response);
  } catch (error) {
    const response: ParseWorkerResponse = {
      id: payload.id,
      ok: false,
      error: error instanceof Error ? error.message : 'Error parsing YAML',
    };
    ctx.postMessage(response);
  }
};

export {};
