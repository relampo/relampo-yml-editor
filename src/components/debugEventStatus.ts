import type { EngineEvent } from '../utils/debugApi';
import type { DebugStatus } from './debugRequests';

export type DebugResultLabel = 'Failed' | 'Redirect' | 'Passed';

// Debug badges describe the execution result, not the tree lineage. A final
// redirect child that returns HTTP 200 is Passed; the Redirect label is for
// successful 3xx responses.
export function getDebugEntryStatus(event: EngineEvent): DebugStatus {
  if (event.err) return 'failed';
  if (event.status >= 400) return 'failed';
  if ((event.assertions ?? []).some(assertion => !assertion.Passed)) return 'failed';
  return 'passed';
}

export function getDebugResultLabel(event: EngineEvent, status = getDebugEntryStatus(event)): DebugResultLabel {
  if (status === 'failed') return 'Failed';
  if (event.status >= 300 && event.status < 400) return 'Redirect';
  return 'Passed';
}
