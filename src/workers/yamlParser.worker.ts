/// <reference lib="webworker" />

import { parseYAMLToTree } from '../utils/yamlParser';

type ParseWorkerRequest = {
  id: number;
  yaml: string;
};

type ParseWorkerResponse =
  | { id: number; ok: true; tree: ReturnType<typeof parseYAMLToTree> }
  | { id: number; ok: false; error: string };

const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = (event: MessageEvent<ParseWorkerRequest>) => {
  const payload = event.data;
  if (!payload || typeof payload.id !== 'number') return;

  try {
    const tree = parseYAMLToTree(payload.yaml || '');
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
