import { expect, it } from 'vitest';
import { projectInputsKey, projectFileChanges } from './distributedProjectState';
import type { DistributedConfig } from './distributedApi';
const config: DistributedConfig = {
  provider: 'github',
  repository: 'owner/repo',
  yaml: 'test: {name: example}',
  file_name: 'example.yaml',
  nodes: 2,
  language: 'en',
  workspace: {
    scriptPath: 'Scripts/example.yaml',
    files: [
      { path: 'Scripts/example.yaml', data: 'saved-yaml' },
      { path: 'Data/users.csv', data: 'dXNlcgph' },
    ],
  },
};
it('compares the CSV content independently of its unchanged name and YAML', () => {
  const next = {
    ...config,
    workspace: {
      ...config.workspace!,
      files: [config.workspace!.files[0], { path: 'Data/users.csv', data: 'dXNlcgpi' }],
    },
  };
  expect(projectInputsKey(next)).not.toBe(projectInputsKey(config));
  expect(projectFileChanges(config, next)).toEqual([{ path: 'Data/users.csv', kind: 'modified' }]);
});
it('reports additions, modifications and removals by path', () => {
  const next = {
    ...config,
    yaml: 'test: {name: edited}',
    workspace: { ...config.workspace!, files: [{ path: 'Data/new.csv', data: 'bmV3' }] },
  };
  expect(projectFileChanges(config, next)).toEqual([
    { path: 'Data/new.csv', kind: 'new' },
    { path: 'Data/users.csv', kind: 'removed' },
    { path: 'Scripts/example.yaml', kind: 'modified' },
  ]);
});
it('ignores enumeration, nodes, formats and the saved YAML superseded by the editor', () => {
  const next = {
    ...config,
    nodes: 3,
    report_formats: ['json'],
    workspace: {
      ...config.workspace!,
      files: [config.workspace!.files[1], { path: 'Scripts/example.yaml', data: 'new-saved-yaml' }],
    },
  };
  expect(projectInputsKey(next)).toBe(projectInputsKey(config));
  expect(projectFileChanges(config, next)).toEqual([]);
});
it('keeps repository changes distinct and labels initial files as new', () => {
  expect(projectInputsKey({ ...config, repository: 'owner/other' })).not.toBe(projectInputsKey(config));
  expect(projectFileChanges(undefined, config).every(change => change.kind === 'new')).toBe(true);
});
