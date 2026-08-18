import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function workflow(name: string): string {
  return readFileSync(resolve(process.cwd(), '.github', 'workflows', name), 'utf8');
}

describe('delivery workflow gates', () => {
  it('runs all repository gates before the automatic release tag is created', () => {
    const source = workflow('auto-patch-release.yml');
    const tagIndex = source.indexOf('- name: Create and push tag');
    const validateIndex = source.indexOf('bun run validate');

    expect(tagIndex).toBeGreaterThan(0);
    expect(validateIndex).toBeGreaterThan(0);
    expect(validateIndex).toBeLessThan(tagIndex);
  });

  it('uses the repository Bun version for pull-request validation', () => {
    const source = workflow('validate.yml');
    const packageJSON = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };

    expect(source).toContain('bun-version: 1.3.10');
    expect(source).toContain('bun install --frozen-lockfile');
    expect(source).toContain('bun run validate');
    expect(packageJSON.scripts.validate).toBe(
      'bun run typecheck && bun run lint && bun run test && bun run build',
    );
  });
});
