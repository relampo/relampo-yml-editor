import { embeddedPlanDraftKey } from './embeddedPlanDraft';
import { persistEmbeddedRecordingFiles } from './embeddedFileStorage';
import { requestExecutionProject } from './executionProject';
import { uploadStudioDataSourceFile, previewStudioDataSourceFile, type StudioDataSourcePreview } from './debugApi';

export async function uploadPlanDataSource(file: File) {
  if (!embeddedPlanDraftKey() || window.parent === window) return uploadStudioDataSourceFile(file);
  if (
    !/^[^/\\]{1,180}\.(csv|txt)$/i.test(file.name) ||
    file.name.startsWith('.') ||
    Array.from(file.name).some(char => char.charCodeAt(0) < 32) ||
    file.size > 20 * 1024 * 1024
  )
    throw Error('Choose a CSV or TXT file up to 20 MB.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  for (let at = 0; at < bytes.length; at += 8192) binary += String.fromCharCode(...bytes.subarray(at, at + 8192));
  const path = `Data/${file.name}`;
  await persistEmbeddedRecordingFiles([{ path, data: btoa(binary) }]);
  return { path, name: file.name };
}
export async function previewPlanDataSource(path: string, signal?: AbortSignal): Promise<StudioDataSourcePreview> {
  if (!embeddedPlanDraftKey() || window.parent === window) return previewStudioDataSourceFile(path, signal);
  const project = await requestExecutionProject();
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  const relative = path.startsWith('.relampo/datasources/')
    ? `Data/${path.slice('.relampo/datasources/'.length)}`
    : path;
  const file = project?.files.find(file => file.path === relative || file.path === `Data/${relative}`);
  if (!file) throw Error('The data source file is not in this Test Plan. Add it to Data/.');
  const binary = atob(file.data);
  const text = new TextDecoder().decode(Uint8Array.from(binary.slice(0, 65536), char => char.charCodeAt(0)));
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  return { path, lines: lines.slice(0, 21), truncated: binary.length > 65536 || lines.length > 21 };
}
