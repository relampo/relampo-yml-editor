import type { YAMLNode } from '../types/yaml';
import * as jsyaml from 'js-yaml';

// Parser: YAML string → Tree
export function parseYAMLToTree(yamlString: string): YAMLNode {
  try {
    const parsed = jsyaml.load(yamlString);
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
function convertToTree(obj: any, path: string[] = []): YAMLNode {
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
      name: `Variables (${Object.keys(obj.variables).length})`,
      data: obj.variables,
      path: ['variables'],
    });
  }

  // Data Source
  if (obj.data_source) {
    root.children!.push({
      id: `${rootId}_data_source`,
      type: 'data_source',
      name: `Data Source (${obj.data_source.type})`,
      data: obj.data_source,
      path: ['data_source'],
    });
  }

  // HTTP Defaults
  if (obj.http_defaults) {
    root.children!.push({
      id: `${rootId}_http_defaults`,
      type: 'http_defaults',
      name: 'HTTP Defaults',
      data: obj.http_defaults,
      path: ['http_defaults'],
    });
  }

  // Scenarios
  if (obj.scenarios && Array.isArray(obj.scenarios)) {
    const scenariosNode: YAMLNode = {
      id: `${rootId}_scenarios`,
      type: 'scenarios',
      name: `Scenarios (${obj.scenarios.length})`,
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
      name: `Steps (${scenario.steps.length})`,
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
    const req = step.request;
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
        requestNode.children!.push({
          id: `${stepId}_extractor_${idx}`,
          type: 'extractor',
          name: `Extract: ${extractor.var || extractor.variable || 'unknown'}`,
          data: extractor,
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
        const label = assertion.type || 'check';
        const detail = assertion.value || assertion.pattern || assertion.name || '';
        requestNode.children!.push({
          id: `${stepId}_assertion_${idx}`,
          type: 'assertion',
          name: `Assert: ${label}${detail ? ' = ' + String(detail).substring(0, 20) : ''}`,
          data: assertion,
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
        name: 'Think Time',  // SOLO el nombre, duración va en el badge
        data: { duration: req.think_time },
        path: [...path, 'think_time'],
      });
    }

    // ON_ERROR inline (inside the request)
    if (req.on_error) {
      requestNode.children!.push({
        id: `${stepId}_on_error`,
        type: 'on_error',
        name: `On Error: ${req.on_error}`,
        data: { action: req.on_error },
        path: [...path, 'on_error'],
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
      name: 'Think Time',  // SOLO el nombre, duración va en el badge
      data: { ...data, duration },  // Asegurar que duration esté en data para el badge
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
        name: `Assertions (${step.assertions.length})`,
        children: [],
        expanded: true,
        data: { assertions: step.assertions },
        path,
      };
      
      step.assertions.forEach((assertion: any, idx: number) => {
        const label = assertion.type || assertion.name || 'check';
        const detail = assertion.value || assertion.pattern || '';
        groupNode.children!.push({
          id: `${stepId}_assertion_${idx}`,
          type: 'assertion',
          name: `Assert: ${label}${detail ? ' = ' + String(detail).substring(0, 20) : ''}`,
          data: assertion,
          path: [...path, 'assertions', idx],
        });
      });
      
      return groupNode;
    }
    // Si solo hay una assertion, retornarla directamente
    else if (step.assertions.length === 1) {
      const assertion = step.assertions[0];
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
    const assertData = step.assertion || step.assert;
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
    const extractData = step.extractor || step.extract;
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
      data: step.group,
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
    const loopCount = typeof step.loop === 'number' ? step.loop : step.loop.count;
    const loopNode: YAMLNode = {
      id: stepId,
      type: 'loop',
      name: `Loop (${loopCount}x)`,
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
    const attempts = step.retry.attempts || step.retry.max_attempts || 3;
    const retryNode: YAMLNode = {
      id: stepId,
      type: 'retry',
      name: `Retry (${attempts}x)`,
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

// Convert tree back to object
function treeToObject(tree: YAMLNode): any {
  const obj: any = {};

  if (!tree.children) return obj;

  for (const child of tree.children) {
    if (child.type === 'test') {
      // Sincronizar node.name a test.name si fue editado
      obj.test = { ...child.data };
      if (child.name && child.name !== child.data?.name) {
        obj.test.name = child.name;
      }
    } else if (child.type === 'variables') {
      obj.variables = child.data;
    } else if (child.type === 'data_source') {
      obj.data_source = { ...child.data };
      if (child.name && child.name !== child.data?.name) {
        obj.data_source.name = child.name;
      }
    } else if (child.type === 'http_defaults') {
      obj.http_defaults = child.data;
    } else if (child.type === 'scenarios') {
      obj.scenarios = child.children?.map(scenarioNode => scenarioNodeToObject(scenarioNode)) || [];
    } else if (child.type === 'metrics') {
      obj.metrics = child.data;
    }
  }

  return obj;
}

function scenarioNodeToObject(node: YAMLNode): any {
  // Priorizar node.name si fue editado, sino usar data.name
  const scenario: any = {
    name: node.name || node.data?.name || 'Scenario',
  };

  if (!node.children) return scenario;

  for (const child of node.children) {
    if (child.type === 'load') {
      scenario.load = child.data;
    } else if (child.type === 'cookies') {
      scenario.cookies = child.data;
    } else if (child.type === 'cache_manager') {
      scenario.cache_manager = child.data;
    } else if (child.type === 'error_policy') {
      scenario.error_policy = child.data;
    } else if (child.type === 'steps') {
      scenario.steps = child.children?.map(stepNode => stepNodeToObject(stepNode)) || [];
    }
  }

  return scenario;
}

function stepNodeToObject(node: YAMLNode): any {
  const httpMethods = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'];
  
  if (httpMethods.includes(node.type)) {
    return { [node.type]: node.data?.url || '/' };
  }

  if (node.type === 'request') {
    const request: any = { request: { ...node.data } };
    
    // Sincronizar node.name a request.name si fue editado
    if (node.name && node.name !== node.data?.name) {
      request.request.name = node.name;
    }
    
    // Clean up children data from request.data (will be rebuilt)
    delete request.request.spark;
    delete request.request.extractors;
    delete request.request.assertions;
    delete request.request.extract;
    delete request.request.assert;
    delete request.request.files;
    delete request.request.headers;
    
    if (node.children) {
      // 🔥 SPARK SCRIPTS
      const sparkNodes = node.children.filter(child => 
        child.type === 'spark_before' || child.type === 'spark_after'
      );
      if (sparkNodes.length > 0) {
        request.request.spark = sparkNodes.map(spark => spark.data);
      }

      // EXTRACTORS (Pulse format: extractors[])
      const extractorNodes = node.children.filter(child => child.type === 'extractor');
      if (extractorNodes.length > 0) {
        request.request.extractors = extractorNodes.map(ext => ext.data);
      }

      // EXTRACT (detect format from data)
      const extractNodes = node.children.filter(child => child.type === 'extract');
      if (extractNodes.length > 0) {
        // If it has 'var' or 'name' in data, it's array format
        if (extractNodes[0].data?.var || extractNodes[0].data?.name) {
          request.request.extract = extractNodes.map(ext => ext.data);
        } else {
          // Spec object format {variable: expression}
          request.request.extract = {};
          extractNodes.forEach(extractor => {
            request.request.extract[extractor.data.variable] = extractor.data.expression;
          });
        }
      }

      // ASSERTIONS (Pulse format: assertions[])
      const assertionNodes = node.children.filter(child => child.type === 'assertion');
      if (assertionNodes.length > 0) {
        request.request.assertions = assertionNodes.map(assertion => assertion.data);
      }

      // ASSERT (detect format from data)
      const assertNodes = node.children.filter(child => child.type === 'assert');
      if (assertNodes.length > 0) {
        // If it has 'type' or 'name' in data, it's array format
        if (assertNodes[0].data?.type || assertNodes[0].data?.name) {
          request.request.assert = assertNodes.map(assertion => assertion.data);
        } else {
          // Spec object format {assertion: value}
          request.request.assert = {};
          assertNodes.forEach(assertion => {
            request.request.assert[assertion.data.assertion] = assertion.data.value;
          });
        }
      }

      // THINK_TIME inline
      const thinkTimeNode = node.children.find(child => child.type === 'think_time');
      if (thinkTimeNode) {
        request.request.think_time = thinkTimeNode.data?.duration || thinkTimeNode.data;
      }

      // ON_ERROR inline
      const onErrorNode = node.children.find(child => child.type === 'on_error');
      if (onErrorNode) {
        request.request.on_error = onErrorNode.data?.action || onErrorNode.data;
      }

      // FILES
      const fileNodes = node.children.filter(child => child.type === 'file');
      if (fileNodes.length > 0) {
        request.request.files = fileNodes.map(file => file.data);
      }

      // HEADERS - desde el nodo headers (data contiene el objeto headers)
      const headersNode = node.children.find(child => child.type === 'headers');
      if (headersNode && headersNode.data) {
        request.request.headers = headersNode.data;
      }
    }

    return request;
  }

  if (node.type === 'group') {
    // Detectar si es un grupo de assertions (creado por el parser de assertions standalone)
    if (node.data?.assertions && Array.isArray(node.data.assertions)) {
      return {
        assertions: node.data.assertions,
      };
    }
    
    return {
      group: {
        name: node.name || node.data?.name || 'Group',
        steps: node.children?.map(stepNodeToObject) || [],
      },
    };
  }

  if (node.type === 'if') {
    return {
      if: node.data?.condition || 'true',
      steps: node.children?.map(stepNodeToObject) || [],
    };
  }

  if (node.type === 'loop') {
    const loopData = node.data?.count ? node.data.count : node.data;
    return {
      loop: loopData,
      steps: node.children?.map(stepNodeToObject) || [],
    };
  }

  if (node.type === 'retry') {
    return {
      retry: node.data,
      steps: node.children?.map(stepNodeToObject) || [],
    };
  }

  if (node.type === 'on_error') {
    return {
      on_error: node.data?.action ? node.data : (node.data || 'continue'),
      steps: node.children?.map(stepNodeToObject) || [],
    };
  }

  if (node.type === 'think_time') {
    return {
      think_time: node.data?.duration || node.data,
    };
  }

  // Assertion standalone (single assertion step)
  if (node.type === 'assertion') {
    return {
      assertions: [node.data],
    };
  }

  // Extractor standalone
  if (node.type === 'extractor') {
    return {
      extractors: [node.data],
    };
  }

  return node.data || {};
}