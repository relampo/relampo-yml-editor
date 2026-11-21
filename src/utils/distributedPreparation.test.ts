import { expect, it } from 'vitest';
import { preparationKey, preparationChange } from './distributedPreparation';
import type { DistributedConfig } from './distributedApi';
const config: DistributedConfig = {
  provider: 'github',
  repository: 'owner/repo',
  yaml: 'test: {}',
  nodes: 2,
  language: 'en',
  workspace: {
    scriptPath: 'Scripts/test.yaml',
    files: [
      { path: 'Scripts/test.yaml', data: 'dGVzdA==' },
      { path: 'Data/users.csv', data: 'aWQKMQ==' },
    ],
  },
  report_formats: ['html', 'json'],
  files: ['b.csv', 'a.csv'],
};
it('accepts identical input regardless of file enumeration or format order', () => {
  expect(preparationKey(config)).toBe(
    preparationKey({
      ...config,
      workspace: { ...config.workspace!, files: [...config.workspace!.files].reverse() },
      report_formats: ['json', 'html'],
      files: ['a.csv', 'b.csv'],
    }),
  );
});
it('still invalidates changed file bytes, paths, script, target and nodes', () => {
  for (const next of [
    { ...config, yaml: 'test: {name: changed}' },
    { ...config, nodes: 3 },
    { ...config, repository: 'owner/other' },
    { ...config, workspace: { ...config.workspace!, files: [{ path: 'Data/users.csv', data: 'changed' }] } },
  ])
    expect(preparationKey(next)).not.toBe(preparationKey(config));
  expect(preparationChange(config, { ...config, nodes: 3 }, false)).toContain('nodes');
  expect(preparationChange(config, { ...config, workspace: { ...config.workspace!, files: [] } }, true)).toContain(
    'Data/users.csv',
  );
});
