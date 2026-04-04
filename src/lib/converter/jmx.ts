import { stringifyYAML } from './yaml';
import { ConversionResult } from './postman';

const DEFAULT_OPTIONS = {
  defaultUsers: 1,
  defaultDuration: '1m',
  defaultRampUp: '0s',
  defaultTimeout: '10s',
  defaultUA: 'Pulse-Test'
};

const CONTROLLER_TAGS = new Set([
  'GenericController',
  'TransactionController',
  'SimpleController'
]);

interface Context {
  stats?: {
    requests: number;
    extractors: number;
    folders: number;
    assertions: number;
    sparkScripts: number;
    variables: number;
    dataSources: number;
    timers: number;
    controllers: number;
  };
  warnings?: string[];
  globalSparkScripts?: any[];
  globalSparkAdded?: boolean;
}

function elementChildren(node: Element | null): Element[] {
  if (!node) {
    return [];
  }
  return Array.from(node.children ?? []);
}

function findDirectChild(node: Element, tagName: string, attrName?: string, attrValue?: string): Element | null {
  for (const child of elementChildren(node)) {
    if (child.tagName !== tagName) {
      continue;
    }
    if (!attrName) {
      return child;
    }
    if (child.getAttribute(attrName) === attrValue) {
      return child;
    }
  }
  return null;
}

function getStringProp(node: Element, name: string): string {
  const prop = findDirectChild(node, 'stringProp', 'name', name);
  return prop?.textContent?.trim() ?? '';
}

function getBoolProp(node: Element, name: string): boolean {
  const prop = findDirectChild(node, 'boolProp', 'name', name);
  return (prop?.textContent?.trim() ?? '').toLowerCase() === 'true';
}

function getElementName(node: Element, fallback: string): string {
  return node?.getAttribute('testname')?.trim() || fallback;
}

function getHashTreePairs(hashTreeNode: Element | null) {
  if (!hashTreeNode) return [];
  const children = elementChildren(hashTreeNode);
  const pairs: { element: Element; hashTree: Element | null }[] = [];

  for (let i = 0; i < children.length; i += 1) {
    const element = children[i];
    let hashTree = null;

    if (children[i + 1] && children[i + 1].tagName === 'hashTree') {
      hashTree = children[i + 1];
      i += 1;
    }

    if (element.tagName !== 'hashTree') {
      pairs.push({ element, hashTree });
    }
  }

  return pairs;
}

function parseHeaderManager(headerManager: Element) {
  const headers: Record<string, string> = {};
  const collection = findDirectChild(headerManager, 'collectionProp', 'name', 'HeaderManager.headers');
  if (!collection) {
    return headers;
  }

  for (const headerElement of elementChildren(collection)) {
    if (headerElement.tagName !== 'elementProp') {
      continue;
    }
    const key = getStringProp(headerElement, 'Header.name');
    const value = getStringProp(headerElement, 'Header.value');
    if (key) {
      headers[key] = value;
    }
  }

  return headers;
}

function _extractBaseURLFromPath(rawPath: string): string {
  if (!rawPath) {
    return '';
  }

  try {
    const parsed = new URL(rawPath);
    if (parsed.protocol && parsed.host) {
      return `${parsed.protocol}//${parsed.host}`;
    }
  } catch (_err) {
    // Not an absolute URL.
  }

  return '';
}

function normalizePath(rawPath: string): string {
  if (!rawPath) {
    return '/';
  }

  try {
    const parsed = new URL(rawPath);
    if (parsed.host) {
      return `${parsed.pathname}${parsed.search}`;
    }
  } catch (_err) {
    // Keep non-absolute path values.
  }

  if (rawPath.startsWith('/')) {
    return rawPath;
  }

  return `/${rawPath}`;
}

function extractSamplerArguments(sampler: Element) {
  const argsRoot = findDirectChild(sampler, 'elementProp', 'name', 'HTTPsampler.Arguments');
  if (!argsRoot) {
    return [];
  }

  const argCollection = findDirectChild(argsRoot, 'collectionProp', 'name', 'Arguments.arguments');
  if (!argCollection) {
    return [];
  }

  const args = [];
  for (const argNode of elementChildren(argCollection)) {
    if (argNode.tagName !== 'elementProp') {
      continue;
    }
    const name = getStringProp(argNode, 'Argument.name');
    const value = getStringProp(argNode, 'Argument.value');
    if (name || value) {
      args.push({ name, value });
    }
  }

  return args;
}

function attachQueryParams(path: string, args: any[]) {
  const namedArgs = args.filter((arg) => arg.name);
  if (namedArgs.length === 0) {
    return path;
  }

  const [beforeHash, hash = ''] = path.split('#');
  const separator = beforeHash.includes('?') ? '&' : '?';
  const params = namedArgs
    .map((arg) => `${encodeURIComponent(arg.name)}=${encodeURIComponent(arg.value ?? '')}`)
    .join('&');
  const rebuilt = `${beforeHash}${separator}${params}`;
  return hash ? `${rebuilt}#${hash}` : rebuilt;
}

function buildBodyFromArgs(args: any[]) {
  if (args.length === 0) {
    return '';
  }

  return args
    .filter((arg) => arg.name)
    .map((arg) => `${encodeURIComponent(arg.name)}=${encodeURIComponent(arg.value ?? '')}`)
    .join('&');
}

function findHeadersInHashTree(hashTreeNode: Element | null) {
  const headers: Record<string, string> = {};
  for (const pair of getHashTreePairs(hashTreeNode)) {
    if (pair.element.tagName === 'HeaderManager') {
      Object.assign(headers, parseHeaderManager(pair.element));
    }
  }
  return headers;
}

function parseUserDefinedVariables(argumentsNode: Element) {
  const variables: Record<string, string> = {};
  const collection = findDirectChild(argumentsNode, 'collectionProp', 'name', 'Arguments.arguments');
  if (!collection) {
    return variables;
  }

  for (const argElement of elementChildren(collection)) {
    if (argElement.tagName !== 'elementProp') {
      continue;
    }
    const name = getStringProp(argElement, 'Argument.name');
    const value = getStringProp(argElement, 'Argument.value');
    if (name) {
      variables[name] = value;
    }
  }

  return variables;
}

function parseCSVDataSet(csvNode: Element) {
  const filename = getStringProp(csvNode, 'filename');
  const variableNames = getStringProp(csvNode, 'variableNames');
  const shareMode = getStringProp(csvNode, 'shareMode');
  const _recycle = getBoolProp(csvNode, 'recycle');
  const stopThread = getBoolProp(csvNode, 'stopThread');

  // Include even if filename is empty
  const dataSource: any = {
    type: 'csv',
    file: filename || 'INCOMPLETE',
    mode: shareMode === 'shareMode.all' ? 'shared' : 'per_vu',
    strategy: 'sequential',
    on_exhausted: stopThread ? 'stop' : 'recycle'
  };

  // Parse variable names
  if (variableNames) {
    const varList = variableNames.split(',').map(v => v.trim()).filter(v => v);
    if (varList.length > 0) {
      dataSource.bind = {};
      for (const varName of varList) {
        dataSource.bind[varName] = varName;
      }
    }
  } else {
    // Add placeholder if empty
    dataSource.bind = { INCOMPLETE: 'INCOMPLETE' };
  }

  return dataSource;
}

function convertJMeterVarToRelampo(str: string): string {
  if (!str) return str;
  // ${var} → {{var}}
  return str.replace(/\$\{([^}]+)\}/g, '{{$1}}');
}

function convertGroovyToJavaScript(groovyCode: string): string {
  if (!groovyCode) return '';
  let jsCode = groovyCode;

  // Simple conversions for common patterns
  jsCode = jsCode.replace(/vars\.get\(["']([^"']+)["']\)/g, 'vars.$1');
  jsCode = jsCode.replace(/vars\.put\(["']([^"']+)["'],\s*(.+?)\)/g, 'vars.$1 = $2');
  jsCode = jsCode.replace(/log\.info\(/g, 'console.log(');
  jsCode = jsCode.replace(/log\.error\(/g, 'console.error(');
  jsCode = jsCode.replace(/\bdef\s+/g, 'var ');
  jsCode = jsCode.replace(/^\s*import\s+.+$/gm, '');

  return jsCode.trim();
}

function parseAssertions(hashTreeNode: Element | null, _context: Context) {
  if (!hashTreeNode) return null;

  const assertions: any[] = [];
  const sparkScripts: any[] = [];

  function findAssertions(node: Element) {
    if (!node) return;

    for (const child of elementChildren(node)) {
      const tag = child.tagName;
      const elementName = getElementName(child, tag);

      if (tag === 'ResponseAssertion') {
        const testField = getStringProp(child, 'Assertion.test_field');
        const testType = getStringProp(child, 'Assertion.test_type');

        let testStrings = findDirectChild(child, 'collectionProp', 'name', 'Asserion.test_strings');
        if (!testStrings) {
          testStrings = findDirectChild(child, 'collectionProp', 'name', 'Assertion.test_strings');
        }

        const strings = [];
        if (testStrings) {
          for (const stringChild of elementChildren(testStrings)) {
            if (stringChild.tagName === 'stringProp') {
              strings.push(stringChild.textContent?.trim() || '');
            }
          }
        }

        const value = strings.length > 0 ? strings[0] : '';
        if (!value) continue;

        if (testField === 'Assertion.response_code' || !testField) {
          assertions.push({
            type: 'status',
            value: parseInt(value) || value
          });
        } else if (testField === 'Assertion.response_data' || testField === '') {
          if (testType === '1') { // Contains
            assertions.push({ type: 'contains', value });
          } else if (testType === '16') { // Not contains
            assertions.push({ type: 'not_contains', value });
          } else if (testType === '8') { // Regex
            assertions.push({ type: 'regex', pattern: value });
          } else if (testType === '2') { // Equals
            assertions.push({ type: 'contains', value });
          }
        }
      }
      else if (tag === 'JSR223Assertion') {
        const script = getStringProp(child, 'script');
        if (script) {
          sparkScripts.push({
            name: elementName || 'JSR223 Assertion',
            when: 'after',
            script: convertGroovyToJavaScript(script)
          });
        }
      }
      else if (tag === 'JSONPathAssertion') {
        const jsonPath = getStringProp(child, 'JSON_PATH');
        const expectedValue = getStringProp(child, 'EXPECTED_VALUE');
        if (jsonPath) {
          assertions.push({
            name: elementName,
            type: 'jsonpath',
            path: jsonPath,
            value: expectedValue || true
          });
        }
      }

      if (child.children && child.children.length > 0) {
        findAssertions(child);
      }
    }
  }

  findAssertions(hashTreeNode);

  return {
    assertions: assertions.length > 0 ? assertions : null,
    sparkScripts: sparkScripts.length > 0 ? sparkScripts : null
  };
}

function parseExtractors(hashTreeNode: Element | null, _context: Context) {
  if (!hashTreeNode) return null;

  const extractors: any[] = [];

  function findExtractors(node: Element) {
    if (!node) return;

    for (const child of elementChildren(node)) {
      const tag = child.tagName;

      if (tag === 'JSONPostProcessor') {
        const refName = getStringProp(child, 'JSONPostProcessor.referenceNames');
        const jsonPath = getStringProp(child, 'JSONPostProcessor.jsonPathExprs');
        if (jsonPath) {
          extractors.push({
            type: 'jsonpath',
            var: refName || 'INCOMPLETE',
            path: jsonPath
          });
        }
      } else if (tag === 'RegexExtractor') {
        const refName = getStringProp(child, 'RegexExtractor.refname');
        const regex = getStringProp(child, 'RegexExtractor.regex');
        if (regex) {
          extractors.push({
            type: 'regex',
            var: refName || 'INCOMPLETE',
            pattern: regex
          });
        }
      }

      if (child.children && child.children.length > 0) {
        findExtractors(child);
      }
    }
  }

  findExtractors(hashTreeNode);
  return extractors.length > 0 ? extractors : null;
}

function convertSamplerToStep(sampler: Element, samplerHashTree: Element | null, context: Context) {
  const method = (getStringProp(sampler, 'HTTPSampler.method') || 'GET').toUpperCase();
  const args = extractSamplerArguments(sampler);
  const postBodyRaw = getBoolProp(sampler, 'HTTPSampler.postBodyRaw');
  const samplerName = getElementName(sampler, '');

  let url = normalizePath(getStringProp(sampler, 'HTTPSampler.path'));
  const methodUsesQuery = ['GET', 'DELETE', 'HEAD', 'OPTIONS'].includes(method);
  if (methodUsesQuery && args.length > 0) {
    url = attachQueryParams(url, args);
  }

  const request: any = {
    method,
    url
  };

  if (samplerName) {
    request.name = samplerName;
  }

  const headers = findHeadersInHashTree(samplerHashTree);
  if (Object.keys(headers).length > 0) {
    const convertedHeaders: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
      convertedHeaders[key] = convertJMeterVarToRelampo(value);
    }
    request.headers = convertedHeaders;
  }

  if (!methodUsesQuery && args.length > 0) {
    if (postBodyRaw) {
      const body = args.map((arg) => arg.value ?? '').join('');
      request.body = convertJMeterVarToRelampo(body);
    } else {
      const encoded = buildBodyFromArgs(args);
      if (encoded.length > 0) {
        request.body = encoded;
      }
    }
  }

  // Extractors & Assertions
  const extractors = parseExtractors(samplerHashTree, context);
  if (extractors && extractors.length > 0) {
    request.extractors = extractors;
    if (context.stats) context.stats.extractors += extractors.length;
  }

  const assertionResult = parseAssertions(samplerHashTree, context);
  if (assertionResult) {
    if (assertionResult.assertions) {
      request.assertions = assertionResult.assertions;
      if (context.stats) context.stats.assertions += assertionResult.assertions.length;
    }
    if (assertionResult.sparkScripts) {
      request.spark = request.spark || [];
      request.spark.push(...assertionResult.sparkScripts);
      if (context.stats) context.stats.sparkScripts += assertionResult.sparkScripts.length;
    }
  }

  if (context.stats) context.stats.requests++;

  return { request };
}

function processHashTree(pairs: any[], context: Context) {
  const steps: any[] = [];

  for (const { element, hashTree } of pairs) {
    const tag = element.tagName;

    // Sampler
    if (tag === 'HTTPSamplerProxy') {
      steps.push(convertSamplerToStep(element, hashTree, context));
    }
    // Controller
    else if (CONTROLLER_TAGS.has(tag)) {
      const childPairs = getHashTreePairs(hashTree);
      if (childPairs.length > 0) {
        const childSteps = processHashTree(childPairs, context);
        if (childSteps.length > 0) {
          steps.push({
            group: {
              name: getElementName(element, 'Group'),
              steps: childSteps
            }
          });
          if (context.stats) context.stats.folders++;
        }
      }
    }
  }

  return steps;
}

// function signature
export function convertJMXToPulseYAML(jmxText: string, customOptions = {}): ConversionResult {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(jmxText, 'text/xml');

  // Root TestPlan
  const testPlan = xmlDoc.querySelector('TestPlan');
  const testPlanHashTree = testPlan?.nextElementSibling?.tagName === 'hashTree'
    ? testPlan.nextElementSibling
    : null;

  if (!testPlan || !testPlanHashTree) {
    throw new Error('Invalid JMX: Missing TestPlan');
  }

  const context: Context = {
    stats: {
      requests: 0,
      extractors: 0,
      folders: 0,
      assertions: 0,
      sparkScripts: 0,
      variables: 0,
      dataSources: 0,
      timers: 0,
      controllers: 0
    },
    warnings: [],
    globalSparkScripts: []
  };

  // Extract Variables & DataSources at Root Level
  const variables: Record<string, string> = {};
  const dataSources: any[] = [];

  const rootPairs = getHashTreePairs(testPlanHashTree);

  // First pass for config elements
  for (const { element, hashTree: _hashTree } of rootPairs) {
    if (element.tagName === 'Arguments') {
      Object.assign(variables, parseUserDefinedVariables(element));
    } else if (element.tagName === 'CSVDataSet') {
      dataSources.push(parseCSVDataSet(element));
    }
  }

  // We assume the first ThreadGroup contains the main logic
  // In a real implementation we would recurse properly.
  // For this port, we find the first ThreadGroup and process it.
  let steps: any[] = [];

  for (const { element, hashTree } of rootPairs) {
    if (element.tagName === 'ThreadGroup') {
      const threadPairs = getHashTreePairs(hashTree);
      steps = processHashTree(threadPairs, context);
      break; // Only process first thread group for now
    }
  }

  const options = { ...DEFAULT_OPTIONS, ...customOptions };

  const apiScenarioManager: any = {
    test: {
      name: getElementName(testPlan, 'Imported JMX Plan'),
      version: '1.0'
    },
    http_defaults: {
      timeout: options.defaultTimeout,
      headers: {
        'User-Agent': options.defaultUA
      }
    },
    scenarios: [
      {
        name: 'JMeter Thread Group',
        load: {
          type: 'ramp',
          start_users: 1,
          end_users: options.defaultUsers as number,
          duration: options.defaultDuration,
          ramp_time: options.defaultRampUp
        },
        steps: steps
      }
    ]
  };

  if (Object.keys(variables).length > 0) {
    apiScenarioManager.variables = variables;
  }

  if (dataSources.length > 0) {
    apiScenarioManager.data_sources = dataSources;
  }

  const yamlContent = stringifyYAML(apiScenarioManager);

  // Generate Header
  const now = new Date();
  const timestamp = now.toISOString().replace('T', ' ').substring(0, 19);

  let header = `# ============================================================================
# RELAMPO YAML - CONVERTED FROM JMETER JMX
# ============================================================================
# Conversion Date: ${timestamp}
# Plan: ${apiScenarioManager.test.name}
#
# CONVERSION STATS:
# - HTTP Requests: ${context.stats?.requests}
# - Groups: ${context.stats?.folders}
# - Extractors: ${context.stats?.extractors}
# - Assertions: ${context.stats?.assertions}
`;

  if (context.warnings && context.warnings.length > 0) {
    header += `#
# WARNINGS (Unsupported Elements):
`;
    const uniqueWarnings = Array.from(new Set(context.warnings));
    for (const w of uniqueWarnings) {
      header += `# - ${w}\n`;
    }
  }

  header += `# ============================================================================\n`;

  // Return structured result
  // Convert warnings to limitations format
  const limitations = Array.from(new Set(context.warnings || []));

  return {
    yaml: header + yamlContent,
    stats: context.stats,
    limitations: limitations
  };
}
