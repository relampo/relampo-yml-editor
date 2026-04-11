import type { YAMLNode } from '../types/yaml';
import { normalizeLoadDataForYaml } from '../components/yaml-node-details/loadUtils';
import {
  normalizeAssertionForEngine,
  normalizeAuthForYaml,
  normalizeExtractorForEngine,
  normalizeRequestForEditor,
  normalizeSQLForYaml,
} from './yamlParserHelpers';

export function treeToObject(tree: YAMLNode): any {
  const obj: any = {};

  if (!tree.children) return obj;

  for (const child of tree.children) {
    if (child.type === 'test') {
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
      obj.http_defaults = {
        ...child.data,
        ...(normalizeAuthForYaml(child.data?.auth) ? { auth: normalizeAuthForYaml(child.data?.auth) } : {}),
      };
      if (!obj.http_defaults.auth) delete obj.http_defaults.auth;
    } else if (child.type === 'scenarios') {
      obj.scenarios = child.children?.map(scenarioNodeToObject) || [];
    } else if (child.type === 'metrics') {
      obj.metrics = child.data;
    } else if (child.type === 'error_policy') {
      obj.error_policy = child.data;
    } else if (child.type === 'on_error') {
      obj.on_error = child.data?.action || child.data || 'continue';
    }
  }

  return obj;
}

function scenarioNodeToObject(node: YAMLNode): any {
  const scenario: any = {
    name: node.name || node.data?.name || 'Scenario',
  };

  if (!node.children) return scenario;

  for (const child of node.children) {
    if (child.type === 'load') {
      scenario.load = normalizeLoadDataForYaml(child.data);
    } else if (child.type === 'cookies') {
      scenario.cookies = child.data;
    } else if (child.type === 'cache_manager') {
      scenario.cache_manager = child.data;
    } else if (child.type === 'error_policy') {
      scenario.error_policy = child.data;
    } else if (child.type === 'steps') {
      scenario.steps = child.children?.map(stepNodeToObject) || [];
    }
  }

  return scenario;
}

function stepNodeToObject(node: YAMLNode): any {
  const httpMethods = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'];

  if (httpMethods.includes(node.type)) {
    const isEnabled = node.data?.enabled !== false;
    if (isEnabled) {
      return { [node.type]: node.data?.url || '/' };
    }
    return {
      [node.type]: {
        url: node.data?.url || '/',
        enabled: false,
      },
    };
  }

  if (node.type === 'request') {
    const normalizedRequest = normalizeRequestForEditor(node.data);
    const request: any = { request: { ...normalizedRequest } };
    if (request.request.timeout === '') {
      delete request.request.timeout;
    }

    if (node.name && node.name !== node.data?.name) {
      request.request.name = node.name;
    }

    delete request.request.spark;
    delete request.request.extractors;
    delete request.request.assertions;
    delete request.request.extract;
    delete request.request.assert;
    delete request.request.files;
    delete request.request.headers;

    if (node.data?.enabled === false) {
      request.request.enabled = false;
    }

    if (node.children) {
      const sparkNodes = node.children.filter(child => child.type === 'spark_before' || child.type === 'spark_after');
      if (sparkNodes.length > 0) {
        request.request.spark = sparkNodes.map(spark => spark.data);
      }

      const extractorNodes = node.children.filter(child => child.type === 'extractor');
      if (extractorNodes.length > 0) {
        request.request.extractors = extractorNodes.map(ext => normalizeExtractorForEngine(ext.data));
      }

      const extractNodes = node.children.filter(child => child.type === 'extract');
      if (extractNodes.length > 0) {
        if (extractNodes[0].data?.var || extractNodes[0].data?.name) {
          request.request.extract = extractNodes.map(ext => ext.data);
        } else {
          request.request.extract = {};
          extractNodes.forEach(extractor => {
            request.request.extract[extractor.data.variable] = extractor.data.expression;
          });
        }
      }

      const assertionNodes = node.children.filter(child => child.type === 'assertion');
      if (assertionNodes.length > 0) {
        request.request.assertions = assertionNodes.map(assertion => normalizeAssertionForEngine(assertion.data));
      }

      const assertNodes = node.children.filter(child => child.type === 'assert');
      if (assertNodes.length > 0) {
        if (assertNodes[0].data?.type || assertNodes[0].data?.name) {
          request.request.assert = assertNodes.map(assertion => assertion.data);
        } else {
          request.request.assert = {};
          assertNodes.forEach(assertion => {
            request.request.assert[assertion.data.assertion] = assertion.data.value;
          });
        }
      }

      const thinkTimeNode = node.children.find(child => child.type === 'think_time');
      if (thinkTimeNode) {
        request.request.think_time = thinkTimeNode.data?.duration || thinkTimeNode.data;
      }

      const errorPolicyNode = node.children.find(child => child.type === 'error_policy');
      if (errorPolicyNode) {
        request.request.error_policy = errorPolicyNode.data;
      } else {
        const onErrorNode = node.children.find(child => child.type === 'on_error');
        if (onErrorNode) {
          request.request.on_error = onErrorNode.data?.action || onErrorNode.data;
        }
      }

      const fileNodes = node.children.filter(child => child.type === 'file');
      if (fileNodes.length > 0) {
        request.request.files = fileNodes.map(file => file.data);
      }

      const headersNode = node.children.find(child => child.type === 'headers');
      if (headersNode && headersNode.data) {
        request.request.headers = headersNode.data;
      }

      const dataSourceNode = node.children.find(child => child.type === 'data_source');
      if (dataSourceNode) {
        request.request.data_source = dataSourceNode.data;
      }
    }

    return request;
  }

  if (node.type === 'sql') {
    const sqlStep = normalizeSQLForYaml(node.data);
    if (node.name && node.name !== node.data?.name) {
      sqlStep.name = node.name;
    }
    return { sql: sqlStep };
  }

  if (node.type === 'group') {
    if (node.data?.assertions && Array.isArray(node.data.assertions)) {
      return {
        assertions: node.data.assertions,
      };
    }

    const res: any = {
      group: {
        name: node.name || node.data?.name || 'Group',
        steps: node.children?.map(stepNodeToObject) || [],
      },
    };

    const auth = normalizeAuthForYaml(node.data?.auth);
    if (auth) {
      res.group.auth = auth;
    }

    if (node.data?.enabled === false) {
      res.enabled = false;
    }
    return res;
  }

  if (node.type === 'transaction') {
    const res: any = {
      transaction: {
        name: node.name || node.data?.name || 'Transaction',
        steps: node.children?.map(stepNodeToObject) || [],
      },
    };

    const auth = normalizeAuthForYaml(node.data?.auth);
    if (auth) {
      res.transaction.auth = auth;
    }

    if (node.data?.enabled === false) {
      res.enabled = false;
    }
    return res;
  }

  if (node.type === 'if') {
    const res: any = {
      if: node.data?.condition || 'true',
      steps: node.children?.map(stepNodeToObject) || [],
    };

    if (node.data?.enabled === false) {
      res.enabled = false;
    }
    return res;
  }

  if (node.type === 'loop') {
    const loopData = node.data?.count ? node.data.count : node.data;
    const res: any = {
      loop: loopData,
      steps: node.children?.map(stepNodeToObject) || [],
    };

    if (node.data?.enabled === false) {
      res.enabled = false;
    }
    return res;
  }

  if (node.type === 'retry') {
    const res: any = {
      retry: node.data,
      steps: node.children?.map(stepNodeToObject) || [],
    };

    if (node.data?.enabled === false) {
      res.enabled = false;
    }
    return res;
  }

  if (node.type === 'on_error') {
    const res: any = {
      on_error: node.data?.action || node.data || 'continue',
      steps: node.children?.map(stepNodeToObject) || [],
    };

    if (node.data?.enabled === false) {
      res.enabled = false;
    }
    return res;
  }

  if (node.type === 'think_time') {
    const res: any = { think_time: node.data?.duration || node.data };
    if (node.data?.enabled === false) {
      res.enabled = false;
    }
    return res;
  }

  if (node.type === 'spark_before' || node.type === 'spark_after' || node.type === 'spark') {
    const res: any = { spark: node.data };
    if (node.data?.enabled === false) {
      res.enabled = false;
    }
    return res;
  }

  if (node.type === 'assertion') {
    const res: any = { assertion: normalizeAssertionForEngine(node.data) };
    if (node.data?.enabled === false) {
      res.enabled = false;
    }
    return res;
  }

  if (node.type === 'assert') {
    const nextData = { ...(node.data || {}) };
    delete nextData.__lockedType;
    delete nextData.__allowTypeSelection;
    const res: any = { assertion: nextData };
    if (node.data?.enabled === false) {
      res.enabled = false;
    }
    return res;
  }

  if (node.type === 'extractor' || node.type === 'extract') {
    const res: any = { extractor: normalizeExtractorForEngine(node.data) };
    if (node.data?.enabled === false) {
      res.enabled = false;
    }
    return res;
  }

  if (node.type === 'data_source') {
    const res: any = { data_source: node.data };
    if (node.data?.enabled === false) {
      res.enabled = false;
    }
    return res;
  }

  return node.data || {};
}
