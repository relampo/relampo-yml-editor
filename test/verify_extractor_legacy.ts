import { parseYAMLToTree, treeToYAML } from '../src/utils/yamlParser';

const legacyYaml = `
test:
  name: extractor-legacy-test
scenarios:
  - name: Legacy Scenario
    steps:
      - request:
          name: login
          method: POST
          url: /api/login
          extractors:
            - type: regex
              variable: session_id
              pattern: 'session=([a-z0-9]+)'
              template: '$1$'
              match_no: 2
            - type: json
              variable: user_id
              pattern: '$.data.user.id'
`;

const tree = parseYAMLToTree(legacyYaml);
if (!tree) {
  throw new Error('parseYAMLToTree devolvió null');
}

const scenario = tree.children?.find((c) => c.type === 'scenarios')?.children?.[0];
const request = scenario?.children?.find((c) => c.type === 'steps')?.children?.[0];
const extractors = request?.children?.filter((c) => c.type === 'extractor') || [];

if (extractors.length !== 2) {
  throw new Error(`Se esperaban 2 extractors, recibidos: ${extractors.length}`);
}

const regexExt = extractors[0].data || {};
const jsonExt = extractors[1].data || {};

console.log('--- Normalización en Editor ---');
console.log('regex.capture_mode =', regexExt.capture_mode);
console.log('regex.capture_index =', regexExt.capture_index);
console.log('regex.group =', regexExt.group);
console.log('regex.var =', regexExt.var);
console.log('json.type =', jsonExt.type);
console.log('json.expression =', jsonExt.expression);

if (regexExt.capture_mode !== 'index') throw new Error('regex.capture_mode debía ser index');
if (String(regexExt.capture_index) !== '2') throw new Error('regex.capture_index debía ser 2');
if (Number(regexExt.group) !== 1) throw new Error('regex.group debía ser 1');
if (regexExt.var !== 'session_id') throw new Error('regex.var debía ser session_id');
if (jsonExt.type !== 'jsonpath') throw new Error('json.type debía migrar a jsonpath');
if (!jsonExt.expression?.includes('$.data.user.id')) throw new Error('json.expression no migró correctamente');

const generated = treeToYAML(tree);

console.log('\n--- Serialización para Engine ---');
console.log(generated);

if (!generated.includes('match_no: 2')) throw new Error('No conservó match_no: 2');
if (!generated.includes("template: $1$")) throw new Error('No conservó template: $1$');
if (!generated.includes('type: jsonpath')) throw new Error('No serializó jsonpath');
if (!generated.includes('variable: session_id')) throw new Error('No conservó variable legacy');

console.log('\nPASS: round-trip extractor legacy OK');

