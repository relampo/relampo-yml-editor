/// <reference lib="webworker" />

import type { ParseWorkerRequest } from '../components/yamlEditorHelpers';
import { handleParseWorkerRequest } from './yamlParserWorkerProtocol';

const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = (event: MessageEvent<ParseWorkerRequest>) => {
  const payload = event.data;
  if (!payload || typeof payload.id !== 'number') return;

  ctx.postMessage(handleParseWorkerRequest(payload));
};

export {};
