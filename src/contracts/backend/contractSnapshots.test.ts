import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import jsyaml from 'js-yaml';
import { describe, expect, it } from 'vitest';
import { parseYAMLToTree, treeToYAML } from '../../utils/yamlParser';
import { collectUnknownFieldPaths } from '../../utils/unknownYamlFields';
import {
  HTTP_COMPONENT_FIELDS,
  SQL_COMPONENT_FIELDS,
  inspectComponentConfiguration,
} from '../../utils/componentConfiguration';
import slots from './slots.json';

interface Fixture {
  kind: 'valid' | 'invalid' | 'forward' | 'roundtrip';
  path: string;
  sha256: string;
  expected_errors?: Array<{ code: string; field: string }>;
}

interface Manifest {
  schema_version: number;
  contract_version: string;
  backend_sha: string;
  fixtures: Fixture[];
  known_fields: Record<string, string[]>;
}

const snapshotRoot = dirname(fileURLToPath(import.meta.url));

function digest(contents: Uint8Array): string {
  return createHash('sha256').update(contents).digest('hex');
}

for (const [slot, version] of Object.entries(slots)) {
  describe(`${slot} backend contract ${version}`, () => {
    const bundleRoot = join(snapshotRoot, 'bundles', version);

    it('has valid provenance and checksummed fixtures', async () => {
      const manifest = JSON.parse(await readFile(join(bundleRoot, 'contract.json'), 'utf8')) as Manifest;
      expect(manifest).toMatchObject({ schema_version: 1, contract_version: version });
      expect(manifest.backend_sha).toMatch(/^[a-f0-9]{40}$/);
      expect(manifest.fixtures.map(fixture => fixture.kind).sort()).toEqual([
        'forward',
        'invalid',
        'roundtrip',
        'valid',
      ]);
      for (const fixture of manifest.fixtures) {
        expect(digest(await readFile(join(bundleRoot, fixture.path)))).toBe(fixture.sha256);
      }
      expect(manifest.fixtures.find(fixture => fixture.kind === 'invalid')?.expected_errors).toEqual([
        { code: 'required_field', field: 'scenarios' },
      ]);
    });

    if (version === '1.0.11') {
      it('pins component grammar and preserves scoped round-trip fixture presence', async () => {
        const manifest = JSON.parse(await readFile(join(bundleRoot, 'contract.json'), 'utf8')) as Manifest;
        expect(manifest.backend_sha).toBe('9dc90a3a3da78a78f6411fdf153a9bf3dd2a1c91');
        expect(manifest.known_fields.http_component_defaults).toEqual([...HTTP_COMPONENT_FIELDS]);
        expect(manifest.known_fields.sql_component_defaults).toEqual([...SQL_COMPONENT_FIELDS]);
        const fixture = manifest.fixtures.find(item => item.kind === 'roundtrip')!;
        const yaml = await readFile(join(bundleRoot, fixture.path), 'utf8');
        const input = jsyaml.load(yaml) as Record<string, any>;
        const output = jsyaml.load(treeToYAML(parseYAMLToTree(yaml)!)) as Record<string, any>;
        expect(inspectComponentConfiguration(output).errors).toEqual([]);
        expect(output.defaults).toEqual(input.defaults);
        expect(output.scenarios[0].defaults).toEqual(input.scenarios[0].defaults);
        const group = output.scenarios[0].steps[0].group;
        expect(group.defaults).toEqual(input.scenarios[0].steps[0].group.defaults);
        expect(group.steps).toHaveLength(3);
        expect(group.steps[0].request).toMatchObject({
          auth: { type: 'none' },
          follow_redirects: false,
          retrieve_embedded_resources: false,
          think_time: { enabled: false },
        });
        expect(group.steps[1].request).toMatchObject({
          auth: { type: 'none' },
          assertions: [],
          enabled: false,
          follow_redirects: false,
        });
        expect(group.steps[2].sql).toMatchObject({
          assertions: [],
          think_time: { enabled: false },
          future_sql_request: 'keep-me',
        });
        expect(group.steps[2].sql).not.toHaveProperty('on_error');
        expect(collectUnknownFieldPaths(parseYAMLToTree(treeToYAML(parseYAMLToTree(yaml)!))!)).toContain(
          'defaults.future_defaults',
        );
      });
    }

    it('parses valid and forward fixtures offline', async () => {
      const manifest = JSON.parse(await readFile(join(bundleRoot, 'contract.json'), 'utf8')) as Manifest;
      for (const fixture of manifest.fixtures.filter(item => item.kind === 'valid' || item.kind === 'forward')) {
        const yaml = await readFile(join(bundleRoot, fixture.path), 'utf8');
        const tree = parseYAMLToTree(yaml);
        expect(tree).not.toBeNull();
        expect(parseYAMLToTree(treeToYAML(tree!))).not.toBeNull();
      }
    });

    it('preserves round-trip fixture fields after a supported edit', async () => {
      const manifest = JSON.parse(await readFile(join(bundleRoot, 'contract.json'), 'utf8')) as Manifest;
      const fixture = manifest.fixtures.find(item => item.kind === 'roundtrip')!;
      const tree = parseYAMLToTree(await readFile(join(bundleRoot, fixture.path), 'utf8'))!;
      const scenario = tree.children!.find(node => node.type === 'scenarios')!.children![0];
      scenario.name = 'edited-smoke';

      const output = jsyaml.load(treeToYAML(tree)) as Record<string, any>;
      const request = output.scenarios[0].steps[0].group.steps[0].request;
      expect(output).toMatchObject({ future_root: { owner: 'backend' } });
      expect(output.test.future_test).toEqual({ enabled: true });
      expect(output.scenarios[0]).toMatchObject({ name: 'edited-smoke', future_scenario: 'keep-me' });
      expect(output.scenarios[0].steps[0].group.future_group).toEqual({ mode: 'experimental' });
      expect(request).toMatchObject({ future_request: 'keep-me' });
      expect(request.assertions[0].future_assertion).toBe('keep-me');
      expect(request.extractors[0].future_extractor).toBe('keep-me');
      expect(collectUnknownFieldPaths(parseYAMLToTree(treeToYAML(tree))!)).toContain('future_root');
    });
  });
}
