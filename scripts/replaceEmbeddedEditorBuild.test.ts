import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { replaceEmbeddedEditorBuild } from './replaceEmbeddedEditorBuild';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(directory => rm(directory, { force: true, recursive: true })));
});

describe('replaceEmbeddedEditorBuild', () => {
  it('removes stale packaged assets before copying the current build', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'relampo-embedded-editor-'));
    temporaryDirectories.push(root);
    const sourceDir = path.join(root, 'build');
    const targetDir = path.join(root, 'embedded', 'dist');
    await mkdir(sourceDir, { recursive: true });
    await mkdir(targetDir, { recursive: true });
    await writeFile(path.join(sourceDir, 'index.html'), 'current build');
    await writeFile(path.join(targetDir, 'stale-hashed-asset.js'), 'stale build');

    await replaceEmbeddedEditorBuild(sourceDir, targetDir);

    await expect(readFile(path.join(targetDir, 'index.html'), 'utf8')).resolves.toBe('current build');
    await expect(readFile(path.join(targetDir, 'stale-hashed-asset.js'), 'utf8')).rejects.toThrow();
  });
});
