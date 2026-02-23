
import { parseYAMLToTree, treeToYAML } from '../src/utils/yamlParser';
import * as fs from 'fs';
import * as path from 'path';

// Mock YAML string with OLD format (bind map)
const oldYaml = `
data_source:
  file: users.csv
  type: csv
  bind:
    email: email
    password: password
`;

// Mock YAML string with NEW format (variable_names)
const newYaml = `
data_source:
  file: products.csv
  type: csv
  variable_names: "id,name,price"
`;

console.log("--- Testing parseYAMLToTree (Migration) ---");
try {
    const treeOld = parseYAMLToTree(oldYaml);
    const dataSourceNode = treeOld.children?.find(c => c.type === 'data_source');
    if (dataSourceNode && dataSourceNode.data.variable_names === 'email,password') {
        console.log("PASS: Old YAML 'bind' migrated to 'variable_names':", dataSourceNode.data.variable_names);
    } else {
        console.error("FAIL: Old YAML migration failed. Data:", dataSourceNode?.data);
    }

    const treeNew = parseYAMLToTree(newYaml);
    const dataSourceNodeNew = treeNew.children?.find(c => c.type === 'data_source');
    if (dataSourceNodeNew && dataSourceNodeNew.data.variable_names === 'id,name,price') {
        console.log("PASS: New YAML 'variable_names' parsed correctly:", dataSourceNodeNew.data.variable_names);
    } else {
        console.error("FAIL: New YAML parse failed. Data:", dataSourceNodeNew?.data);
    }

    console.log("\n--- Testing treeToYAML (Generation) ---");
    // Generate YAML from treeOld (should prioritize variable_names and remove bind)
    const generatedYaml = treeToYAML(treeOld);
    console.log("Generated YAML:\n", generatedYaml);

    if (generatedYaml.includes('variable_names: email,password') && !generatedYaml.includes('bind:')) {
        console.log("PASS: Generated YAML uses variable_names and removed bind.");
    } else {
        console.error("FAIL: Generated YAML incorrect format.");
    }

} catch (e) {
    console.error("Error running verification:", e);
}
