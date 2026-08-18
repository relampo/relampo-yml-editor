import { cp, rm } from 'node:fs/promises';

export async function replaceEmbeddedEditorBuild(sourceDir: string, targetDir: string) {
  await rm(targetDir, { force: true, recursive: true });
  await cp(sourceDir, targetDir, { recursive: true });
}
