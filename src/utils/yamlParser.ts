import type { YAMLNode } from '../types/yaml';
import * as jsyaml from 'js-yaml';
import { normalizeBalancedDistributionType, normalizeBalancedExecutionMode } from './balancedController';
import {
  buildSQLStepName,
  normalizeAssertionForEditor,
  normalizeAuthForEditor,
  normalizeExtractorForEditor,
  normalizeRequestForEditor,
  normalizeSQLForEditor,
} from './yamlParserHelpers';
import { treeToObject } from './yamlTreeSerializer';

// Parser: YAML string → Tree
export function parseYAMLToTree(yamlString: string): YAMLNode | null {
  if (!yamlString || yamlString.trim() === '') {
    return null;
  }
  try {
    const parsed = jsyaml.load(yamlString);
    if (!parsed) return null;
    return convertToTree(parsed);
  } catch (error) {
    throw new Error(`Error parsing YAML: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Generator: Tree → YAML string
export function treeToYAML(tree: YAMLNode): string {
  try {
    const obj = treeToObject(tree);
    return jsyaml.dump(obj, { indent: 2, lineWidth: -1, noRefs: true });
  } catch (error) {
    throw new Error(`Error generating YAML: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Convert parsed object to tree structure
function convertToTree(obj: any, _: string[] = []): YAMLNode {
  const rootId = 'root';

  const root: YAMLNode = {
    id: rootId,
    type: 'test',
    name: obj.test?.name || 'Relampo Test',
    children: [],
    expanded: true,
    path: [],
    data: obj.test || { name: 'Relampo Test', description: '', version: '1.0' },
  };

  // Variables
  if (obj.variables) {
    root.children!.push({
      id: `${rootId}_variables`,
      type: 'variables',
      name: 'Variables',
      data: obj.variables,
      path: ['variables'],
    });
  }

  // Data Source
  if (obj.data_source) {
    root.children!.push({
      id: `${rootId}_data_source`,
      type: 'data_source',
      name: 'Data Source',
      data: obj.data_source,
      path: ['data_source'],
    });
  }

  // Root Error Policy
  if (obj.error_policy) {
    root.children!.push({
      id: `${rootId}_error_policy`,
      type: 'error_policy',
      name: 'Error Policy',
      data: obj.error_policy,
      path: ['error_policy'],
    });
  }

  // HTTP Defaults
  if (obj.http_defaults) {
    root.children!.push({
      id: `${rootId}_http_defaults`,
      type: 'http_defaults',
      name: 'HTTP Defaults',
      data: {
        ...obj.http_defaults,
        auth: normalizeAuthForEditor(obj.http_defaults.auth),
      },
      path: ['http_defaults'],
    });
  }

  // Scenarios
  if (obj.scenarios && Array.isArray(obj.scenarios)) {
    const scenariosNode: YAMLNode = {
      id: `${rootId}_scenarios`,
      type: 'scenarios',
      name: 'Scenarios',
      children: [],
      expanded: true,
      path: ['scenarios'],
    };

    obj.scenarios.forEach((scenario: any, index: number) => {
      const scenarioNode = convertScenarioToNode(scenario, index, ['scenarios', index]);
      scenariosNode.children!.push(scenarioNode);
    });

    root.children!.push(scenariosNode);
  }

  // Metrics
  if (obj.metrics) {
    root.children!.push({
      id: `${rootId}_metrics`,
      type: 'metrics',
      name: 'Metrics',
      data: obj.metrics,
      path: ['metrics'],
    });
  }

  return root;
}

function convertScenarioToNode(scenario: any, index: number, path: any[]): YAMLNode {
  const scenarioId = `scenario_${index}`;
  const scenarioNode: YAMLNode = {
    id: scenarioId,
    type: 'scenario',
    name: scenario.name || `Scenario ${index + 1}`,
    children: [],
    expanded: true,
    data: scenario,
    path,
  };

  // Load
  if (scenario.load) {
    scenarioNode.children!.push({
      id: `${scenarioId}_load`,
      type: 'load',
      name: `Load: ${scenario.load.type || 'constant'}`,
      data: scenario.load,
      path: [...path, 'load'],
    });
  }

  // Cookies
  if (scenario.cookies) {
    scenarioNode.children!.push({
      id: `${scenarioId}_cookies`,
      type: 'cookies',
      name: 'Cookie Manager',
      data: scenario.cookies,
      path: [...path, 'cookies'],
    });
  }

  // Cache Manager
  if (scenario.cache_manager) {
    scenarioNode.children!.push({
      id: `${scenarioId}_cache`,
      type: 'cache_manager',
      name: 'Cache Manager',
      data: scenario.cache_manager,
      path: [...path, 'cache_manager'],
    });
  }

  // Error Policy
  if (scenario.error_policy) {
    scenarioNode.children!.push({
      id: `${scenarioId}_error`,
      type: 'error_policy',
      name: 'Error Policy',
      data: scenario.error_policy,
      path: [...path, 'error_policy'],
    });
  }

  // Steps
  if (scenario.steps && Array.isArray(scenario.steps)) {
    const stepsNode: YAMLNode = {
      id: `${scenarioId}_steps`,
      type: 'steps',
      name: 'Steps',
      children: [],
      expanded: true,
      path: [...path, 'steps'],
    };

    scenario.steps.forEach((step: any, stepIndex: number) => {
      const stepNode = convertStepToNode(step, scenarioId, stepIndex, [...path, 'steps', stepIndex]);
      stepsNode.children!.push(stepNode);
    });

    scenarioNode.children!.push(stepsNode);
  }

  return scenarioNode;
}

function convertStepToNode(step: any, parentId: string, index: number, path: any[]): YAMLNode {
  const stepId = `${parentId}_step_${index}`;

  // Parsear enabled ANTES (común para todos los tipos)
  const isEnabled = step.enabled !== undefined ? step.enabled : true;

  // HTTP methods (short form)
  const httpMethods = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'];
  for (const method of httpMethods) {
    if (step[method] !== undefined) {
      return {
        id: stepId,
        type: method as any,
        name: `${method.toUpperCase()}: ${step[method]}`,
        data: { url: step[method], ...step, enabled: isEnabled },
        path,
        children: [],
        expanded: false,
      };
    }
  }

  // Request (long form)
  if (step.request) {
    const req = normalizeRequestForEditor(step.request);
    const requestNode: YAMLNode = {
      id: stepId,
      type: 'request',
      name: req.name || `${req.method || 'GET'}: ${req.url || '/'}`,
      data: { ...req, enabled: isEnabled },
      path,
      children: [],
      expanded: false,
    };

    // HEADERS (object format: {header_name: value}) - PRIMERO
    if (req.headers && typeof req.headers === 'object' && !Array.isArray(req.headers)) {
      const headerEntries = Object.entries(req.headers);
      if (headerEntries.length > 0) {
        requestNode.children!.push({
          id: `${stepId}_headers`,
          type: 'headers',
          name: 'Headers',
          data: req.headers,
          path: [...path, 'request', 'headers'],
        });
      }
    }

    // 🔥 SPARK SCRIPTS (Pulse format)
    if (req.spark && Array.isArray(req.spark)) {
      req.spark.forEach((sparkItem: any, idx: number) => {
        const when = sparkItem.when || 'before';
        requestNode.children!.push({
          id: `${stepId}_spark_${idx}`,
          type: when === 'after' ? 'spark_after' : 'spark_before',
          name: `Spark (${when})`,
          data: sparkItem,
          path: [...path, 'spark', idx],
        });
      });
    }

    // EXTRACTORS as array (Pulse format: extractors[])
    if (req.extractors && Array.isArray(req.extractors)) {
      req.extractors.forEach((extractor: any, idx: number) => {
        const normalizedExtractor = normalizeExtractorForEditor(extractor);
        requestNode.children!.push({
          id: `${stepId}_extractor_${idx}`,
          type: 'extractor',
          name: `Extract: ${normalizedExtractor.var || normalizedExtractor.variable || 'unknown'}`,
          data: normalizedExtractor,
          path: [...path, 'extractors', idx],
        });
      });
    }

    // EXTRACT as array (JMX converter format: [{name, var, expression}])
    if (req.extract && Array.isArray(req.extract)) {
      req.extract.forEach((extractor: any, idx: number) => {
        const varName = extractor.var || extractor.variable || 'unknown';
        requestNode.children!.push({
          id: `${stepId}_extract_${idx}`,
          type: 'extract',
          name: `Extract: ${varName}`,
          data: extractor,
          path: [...path, 'request', 'extract', idx],
        });
      });
    }
    // EXTRACT as object (spec format: {var: expression})
    else if (req.extract && typeof req.extract === 'object' && !Array.isArray(req.extract)) {
      Object.entries(req.extract).forEach(([key, value], idx) => {
        requestNode.children!.push({
          id: `${stepId}_extract_${idx}`,
          type: 'extract',
          name: `Extract: ${key}`,
          data: { variable: key, expression: value },
          path: [...path, 'request', 'extract', key],
        });
      });
    }

    // ASSERTIONS as array (Pulse format: assertions[])
    if (req.assertions && Array.isArray(req.assertions)) {
      req.assertions.forEach((assertion: any, idx: number) => {
        const normalizedAssertion = normalizeAssertionForEditor(assertion);
        const label = normalizedAssertion.type || 'check';
        const detail = normalizedAssertion.value || normalizedAssertion.pattern || normalizedAssertion.name || '';
        requestNode.children!.push({
          id: `${stepId}_assertion_${idx}`,
          type: 'assertion',
          name: `Assert: ${label}${detail ? ' = ' + String(detail).substring(0, 20) : ''}`,
          data: normalizedAssertion,
          path: [...path, 'assertions', idx],
        });
      });
    }

    // ASSERT as array (JMX converter format: [{name, type, value}])
    if (req.assert && Array.isArray(req.assert)) {
      req.assert.forEach((assertion: any, idx: number) => {
        const label = assertion.type || assertion.name || 'check';
        const detail = assertion.value || '';
        requestNode.children!.push({
          id: `${stepId}_assert_${idx}`,
          type: 'assert',
          name: `Assert: ${label}${detail ? ' = ' + String(detail).substring(0, 20) : ''}`,
          data: assertion,
          path: [...path, 'request', 'assert', idx],
        });
      });
    }
    // ASSERT as object (spec format: {status: 200, ...})
    else if (req.assert && typeof req.assert === 'object' && !Array.isArray(req.assert)) {
      Object.entries(req.assert).forEach(([key, value], idx) => {
        requestNode.children!.push({
          id: `${stepId}_assert_${idx}`,
          type: 'assert',
          name: `Assert: ${key} = ${value}`,
          data: { assertion: key, value },
          path: [...path, 'request', 'assert', key],
        });
      });
    }

    // THINK_TIME inline (inside the request)
    if (req.think_time) {
      requestNode.children!.push({
        id: `${stepId}_think_time`,
        type: 'think_time',
        name: 'Think Time', // SOLO el nombre, duración va en el badge
        data: { duration: req.think_time },
        path: [...path, 'think_time'],
      });
    }

    // ERROR_POLICY inline (inside the request), keep on_error as legacy fallback
    if (req.error_policy || req.on_error) {
      const policy = req.error_policy || { on_error: req.on_error };
      requestNode.children!.push({
        id: `${stepId}_error_policy`,
        type: 'error_policy',
        name: 'Error Policy',
        data: policy,
        path: [...path, 'error_policy'],
      });
    }

    // FILES (array format: files[])
    if (req.files && Array.isArray(req.files)) {
      req.files.forEach((file: any, idx: number) => {
        const fieldName = file.field || 'file';
        const fileName = file.path ? file.path.split('/').pop() : 'unknown';
        requestNode.children!.push({
          id: `${stepId}_file_${idx}`,
          type: 'file',
          name: `${fieldName}: ${fileName}`,
          data: file,
          path: [...path, 'files', idx],
        });
      });
    }

    return requestNode;
  }

  if (step.sql) {
    const sql = normalizeSQLForEditor(step.sql);
    return {
      id: stepId,
      type: 'sql',
      name: buildSQLStepName(sql),
      data: sql,
      path: [...path, 'sql'],
      children: [],
      expanded: false,
    };
  }

  // Think time (standalone - can be between requests)
  if (step.think_time !== undefined) {
    let duration: string;
    let data: any;

    if (typeof step.think_time === 'string') {
      // Simple format: "2s"
      duration = step.think_time;
      data = { duration: step.think_time };
    } else if (step.think_time.duration) {
      // Converter format: {name: "...", duration: "1s"}
      duration = step.think_time.duration;
      data = step.think_time;
    } else if (step.think_time.min) {
      // Variable format: {min: "1s", max: "3s"}
      duration = `${step.think_time.min}-${step.think_time.max}`;
      data = step.think_time;
    } else {
      duration = '?';
      data = step.think_time;
    }

    return {
      id: stepId,
      type: 'think_time',
      name: 'Think Time', // SOLO el nombre, duración va en el badge
      data: { ...data, duration }, // Asegurar que duration esté en data para el badge
      path,
    };
  }

  // Assertions (standalone - array format from JMX converter)
  if (step.assertions && Array.isArray(step.assertions)) {
    // Si hay múltiples assertions, crear un grupo
    if (step.assertions.length > 1) {
      const groupNode: YAMLNode = {
        id: stepId,
        type: 'group',
        name: 'Assertions',
        children: [],
        expanded: true,
        data: { assertions: step.assertions },
        path,
      };

      step.assertions.forEach((assertion: any, idx: number) => {
        const normalizedAssertion = normalizeAssertionForEditor(assertion);
        const label = normalizedAssertion.type || normalizedAssertion.name || 'check';
        const detail = normalizedAssertion.value || normalizedAssertion.pattern || '';
        groupNode.children!.push({
          id: `${stepId}_assertion_${idx}`,
          type: 'assertion',
          name: `Assert: ${label}${detail ? ' = ' + String(detail).substring(0, 20) : ''}`,
          data: normalizedAssertion,
          path: [...path, 'assertions', idx],
        });
      });

      return groupNode;
    }
    // Si solo hay una assertion, retornarla directamente
    else if (step.assertions.length === 1) {
      const assertion = normalizeAssertionForEditor(step.assertions[0]);
      const label = assertion.type || assertion.name || 'check';
      const detail = assertion.value || assertion.pattern || '';

      return {
        id: stepId,
        type: 'assertion',
        name: `Assert: ${label}${detail ? ' = ' + String(detail).substring(0, 20) : ''}`,
        data: assertion,
        path: [...path, 'assertions', 0],
      };
    }
  }

  // Assertion (standalone - single object)
  if (step.assertion || step.assert) {
    const assertData = normalizeAssertionForEditor(step.assertion || step.assert);
    const label = assertData.type || assertData.name || 'check';
    const detail = assertData.value || assertData.pattern || '';

    return {
      id: stepId,
      type: 'assertion',
      name: `Assert: ${label}${detail ? ' = ' + String(detail).substring(0, 20) : ''}`,
      data: assertData,
      path,
    };
  }

  // Extractor (standalone)
  if (step.extractor || step.extract) {
    const extractData = normalizeExtractorForEditor(step.extractor || step.extract);
    const varName = extractData.var || extractData.variable || extractData.name || 'unknown';

    return {
      id: stepId,
      type: 'extractor',
      name: `Extract: ${varName}`,
      data: extractData,
      path,
    };
  }

  // Spark (standalone)
  if (step.spark) {
    const when = step.spark.when || 'before';

    return {
      id: stepId,
      type: when === 'after' ? 'spark_after' : 'spark_before',
      name: `Spark (${when})`,
      data: step.spark,
      path,
    };
  }

  // Group (Simple controller for organization)
  if (step.group) {
    const groupNode: YAMLNode = {
      id: stepId,
      type: step.group.simple ? 'simple' : 'group',
      name: step.group.name || 'Group',
      children: [],
      expanded: true,
      data: {
        ...step.group,
        auth: normalizeAuthForEditor(step.group.auth),
      },
      path,
    };

    if (step.group.steps && Array.isArray(step.group.steps)) {
      step.group.steps.forEach((childStep: any, childIndex: number) => {
        const childNode = convertStepToNode(childStep, stepId, childIndex, [...path, 'steps', childIndex]);
        groupNode.children!.push(childNode);
      });
    }

    return groupNode;
  }

  if (step.transaction) {
    const transactionNode: YAMLNode = {
      id: stepId,
      type: 'transaction',
      name: step.transaction.name || 'Transaction',
      children: [],
      expanded: true,
      data: {
        ...step.transaction,
        auth: normalizeAuthForEditor(step.transaction.auth),
      },
      path,
    };

    if (step.transaction.steps && Array.isArray(step.transaction.steps)) {
      step.transaction.steps.forEach((childStep: any, childIndex: number) => {
        const childNode = convertStepToNode(childStep, stepId, childIndex, [...path, 'steps', childIndex]);
        transactionNode.children!.push(childNode);
      });
    }

    return transactionNode;
  }

  if (step.balanced) {
    const balancedData = typeof step.balanced === 'object' && step.balanced !== null ? step.balanced : {};
    const balancedNode: YAMLNode = {
      id: stepId,
      type: 'balanced',
      name: balancedData.name || 'Balanced Controller',
      children: [],
      expanded: true,
      data: {
        ...balancedData,
        type: normalizeBalancedDistributionType(balancedData.type),
        mode: normalizeBalancedExecutionMode(balancedData.mode),
      },
      path,
    };

    if (step.steps && Array.isArray(step.steps)) {
      step.steps.forEach((childStep: any, childIndex: number) => {
        const balancedPercentage = childStep?.percentage;
        const normalizedChildStep = { ...childStep };
        delete normalizedChildStep.percentage;

        const childNode = convertStepToNode(normalizedChildStep, stepId, childIndex, [...path, 'steps', childIndex]);
        childNode.data = {
          ...(childNode.data || {}),
          __balancedPercentage: balancedPercentage ?? '',
        };
        balancedNode.children!.push(childNode);
      });
    }

    return balancedNode;
  }

  // If
  if (step.if !== undefined) {
    const ifNode: YAMLNode = {
      id: stepId,
      type: 'if',
      name: `If: ${step.if}`,
      children: [],
      expanded: true,
      data: { condition: step.if },
      path,
    };

    if (step.steps && Array.isArray(step.steps)) {
      step.steps.forEach((childStep: any, childIndex: number) => {
        const childNode = convertStepToNode(childStep, stepId, childIndex, [...path, 'steps', childIndex]);
        ifNode.children!.push(childNode);
      });
    }

    return ifNode;
  }

  // Loop
  if (step.loop !== undefined) {
    const loopNode: YAMLNode = {
      id: stepId,
      type: 'loop',
      name: 'Loop',
      children: [],
      expanded: true,
      data: typeof step.loop === 'number' ? { count: step.loop } : step.loop,
      path,
    };

    if (step.steps && Array.isArray(step.steps)) {
      step.steps.forEach((childStep: any, childIndex: number) => {
        const childNode = convertStepToNode(childStep, stepId, childIndex, [...path, 'steps', childIndex]);
        loopNode.children!.push(childNode);
      });
    }

    return loopNode;
  }

  // Retry
  if (step.retry) {
    const retryNode: YAMLNode = {
      id: stepId,
      type: 'retry',
      name: 'Retry',
      children: [],
      expanded: true,
      data: step.retry,
      path,
    };

    if (step.steps && Array.isArray(step.steps)) {
      step.steps.forEach((childStep: any, childIndex: number) => {
        const childNode = convertStepToNode(childStep, stepId, childIndex, [...path, 'steps', childIndex]);
        retryNode.children!.push(childNode);
      });
    }

    return retryNode;
  }

  // On Error (standalone)
  if (step.on_error !== undefined) {
    const onErrorNode: YAMLNode = {
      id: stepId,
      type: 'on_error',
      name: `On Error: ${step.on_error.action || step.on_error}`,
      children: [],
      expanded: true,
      data: typeof step.on_error === 'string' ? { action: step.on_error } : step.on_error,
      path,
    };

    if (step.steps && Array.isArray(step.steps)) {
      step.steps.forEach((childStep: any, childIndex: number) => {
        const childNode = convertStepToNode(childStep, stepId, childIndex, [...path, 'steps', childIndex]);
        onErrorNode.children!.push(childNode);
      });
    }

    return onErrorNode;
  }

  // Default
  return {
    id: stepId,
    type: 'step',
    name: 'Unknown Step',
    data: step,
    path,
  };
}
