import type { ParseWorkerRequest, ParseWorkerResponse } from '../components/yamlEditorHelpers';
import { parseYAMLToTree } from '../utils/yamlParser';

export function handleParseWorkerRequest(payload: ParseWorkerRequest): ParseWorkerResponse {
  try {
    return {
      id: payload.id,
      ok: true,
      tree: parseYAMLToTree(payload.yaml || '', payload.rootName),
    };
  } catch (error) {
    return {
      id: payload.id,
      ok: false,
      error: error instanceof Error ? error.message : 'Error parsing YAML',
    };
  }
}
