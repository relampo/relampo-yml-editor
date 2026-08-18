import type { YAMLNode } from '../types/yaml';
import { normalizeLoadDataForYaml, toLoadData } from '../components/yaml-node-details/loadUtils';
import {
  isBalancedLoadBearingChild,
  normalizeBalancedDistributionType,
  readBalancedPercentage,
  sanitizeBalancedNodeData,
  serializeBalancedDistributionType,
  serializeBalancedExecutionMode,
  validateBalancedController,
} from './balancedController';
import {
  normalizeAssertionForEngine,
  normalizeAuthForYaml,
  normalizeExtractorForEngine,
  normalizeRequestForEditor,
  normalizeSQLForYaml,
} from './yamlParserHelpers';

const HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'];

// A Spark node's before/after timing lives in its node type (spark_before /
// spark_after) — the detail panel only edits `script`, so node.data usually has
// no `when`. The runtime defaults a missing `when` to `after`, so a "Spark
// Before" would silently run *after* the request and any variables it sets
// would be absent from that request's url/body/query/form (RLP-606). Persist the
// timing explicitly from the node type so the runtime runs the script when the
// editor shows it.
function sparkDataWithWhen(node: YAMLNode): Record<string, unknown> {
  const data = { ...(node.data as Record<string, unknown> | undefined) };
  let when: string;
  if (node.type === 'spark_after') {
    when = 'after';
  } else if (node.type === 'spark_before') {
    when = 'before';
  } else {
    when = typeof data.when === 'string' && data.when ? (data.when as string) : 'before';
  }
  data.when = when;
  return data;
}

function stripControllerSerializationMetadata<T>(data: T, internalKeys: string[] = []): T {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return data;
  }

  const next = { ...(data as Record<string, unknown>) };
  delete next.enabled;
  internalKeys.forEach(key => delete next[key]);
  return next as T;
}

// Callers pass one of these module-level sets rather than a literal array: this
// runs per node during serialization, so building a Set on every call would cost
// more than the lookup it saves.
const LOOP_SHORTHAND_KEYS = new Set(['count']);
const RETRY_SHORTHAND_KEYS = new Set(['attempts']);

function hasOnlyKeys(value: unknown, keys: ReadonlySet<string>): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const valueKeys = Object.keys(value);
  return valueKeys.length > 0 && valueKeys.every(key => keys.has(key));
}

function hasRequestChildren(node: YAMLNode): boolean {
  return Array.isArray(node.children) && node.children.length > 0;
}

function hasOnlyShortHttpData(node: YAMLNode): boolean {
  if (!node.data || typeof node.data !== 'object' || Array.isArray(node.data)) {
    return true;
  }

  const data = { ...(node.data as Record<string, any>) };
  for (const key of Object.keys(data)) {
    if (key.startsWith('__')) delete data[key];
  }
  pruneDefaultRequestFields(data);

  if (typeof data.name === 'string') {
    const method = (data.method || node.type).toString().toUpperCase();
    if (data.name === `${method}: ${data.url || '/'}`) {
      delete data.name;
    }
  }

  return Object.keys(data).every(key => key === 'url' || key === 'enabled' || key === 'method');
}

// Set per treeToObject() run from `http_defaults.follow_redirects`. When the
// global default is true, a request-level `follow_redirects: false` is the
// documented per-request override and must survive serialization.
let followRedirectsEnabledByDefault = false;

function pruneDefaultRequestFields(request: Record<string, any>) {
  if (request.timeout === '') delete request.timeout;
  if (request.cookie_override === 'inherit') delete request.cookie_override;
  if (request.cache_override === 'inherit') delete request.cache_override;
  if (request.retrieve_embedded_resources === false) delete request.retrieve_embedded_resources;
  // RLP-522 / JMeter parity: the redirect modes are mutually exclusive and
  // "Redirect Automatically" wins. Drop any stale "Follow Redirects" flag that
  // older files or imported fixtures may carry alongside it, so saving always
  // emits a single redirect mode even when the user never toggled a checkbox.
  if (request.redirect_automatically === true) delete request.follow_redirects;
  if (request.redirect_automatically === false) delete request.redirect_automatically;
  // follow_redirects can be omitted only when it matches the effective global
  // default (http_defaults.follow_redirects, off when absent): an omission is
  // reparsed as that default, so any differing value is an explicit
  // per-request override that must survive the round trip.
  if (request.follow_redirects === followRedirectsEnabledByDefault) {
    delete request.follow_redirects;
  }
  if (request.throughput && request.throughput.enabled !== true) delete request.throughput;
}

export function treeToObject(tree: YAMLNode): any {
  const obj: any = { ...(tree.unknownData || {}) };

  followRedirectsEnabledByDefault =
    tree.children?.find(child => child.type === 'http_defaults')?.data?.follow_redirects === true;

  if (tree.type === 'test') {
    obj.test = { ...tree.data };
    if (tree.name && tree.name !== tree.data?.name) {
      obj.test.name = tree.name;
    }
  }

  if (!tree.children) return obj;

  for (const child of tree.children) {
    if (child.type === 'variables') {
      obj.variables = child.data;
    } else if (child.type === 'data_source') {
      obj.data_source = { ...child.data };
      // The parser defaults an unnamed data source to 'Data Source', so writing
      // the node name back unconditionally invents a `name:` key the spec does
      // not define. The step and request branches already guard against this.
      if (child.name && child.name !== 'Data Source' && child.name !== child.data?.name) {
        obj.data_source.name = child.name;
      }
    } else if (child.type === 'http_defaults') {
      const auth = normalizeAuthForYaml(child.data?.auth);
      obj.http_defaults = {
        ...child.data,
        ...(auth ? { auth } : {}),
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
  const scenario: any = { ...(node.data || {}) };
  delete scenario.load;
  delete scenario.cookies;
  delete scenario.cache_manager;
  delete scenario.error_policy;
  delete scenario.steps;
  delete scenario.description;
  scenario.name = node.name || node.data?.name || 'Scenario';

  if (!node.children) return scenario;

  for (const child of node.children) {
    if (child.type === 'load') {
      scenario.load = normalizeLoadDataForYaml(toLoadData(child.data as Record<string, unknown> | undefined));
    } else if (child.type === 'cookies') {
      scenario.cookies = child.data;
    } else if (child.type === 'cache_manager') {
      scenario.cache_manager = child.data;
    } else if (child.type === 'error_policy') {
      scenario.error_policy = child.data;
    } else if (child.type === 'steps') {
      if (child.data?.description) {
        scenario.description = child.data.description;
      }
      scenario.steps = child.children?.map(stepNodeToObject) || [];
    }
  }

  return scenario;
}

function stepNodeToObject(node: YAMLNode): any {
  if (HTTP_METHODS.includes(node.type)) {
    const isEnabled = node.data?.enabled !== false;
    if (!hasRequestChildren(node) && hasOnlyShortHttpData(node) && isEnabled) {
      return { ...(node.unknownData || {}), [node.type]: node.data?.url || '/' };
    }
    if (!hasRequestChildren(node) && hasOnlyShortHttpData(node)) {
      return {
        ...(node.unknownData || {}),
        [node.type]: {
          url: node.data?.url || '/',
          enabled: false,
        },
      };
    }
    return requestNodeToObject(node, node.type.toUpperCase());
  }

  if (node.type === 'request') {
    return requestNodeToObject(node);
  }

  if (node.type === 'sql') {
    const sqlStep = normalizeSQLForYaml(
      sanitizeBalancedNodeData(node.data as Record<string, unknown> | undefined),
    );
    if (node.name && node.name !== node.data?.name) {
      sqlStep.name = node.name;
    }
    return { ...(node.unknownData || {}), sql: sqlStep };
  }

  if (node.type === 'group') {
    const groupData = sanitizeBalancedNodeData(node.data);
    if (node.data?.assertions && Array.isArray(node.data.assertions)) {
      return {
        ...(node.unknownData || {}),
        assertions: node.data.assertions,
      };
    }

    const { steps: _steps, auth: _auth, enabled: _enabled, ...preservedGroupData } = groupData || {};
    const res: any = {
      ...(node.unknownData || {}),
      group: {
        ...preservedGroupData,
        name: node.name || groupData?.name || 'Group',
        steps: node.children?.map(stepNodeToObject) || [],
      },
    };

    const auth = normalizeAuthForYaml(groupData?.auth);
    if (auth) {
      res.group.auth = auth;
    }

    if (node.data?.enabled === false) {
      res.enabled = false;
    }
    return res;
  }

  if (node.type === 'transaction') {
    const transactionData = sanitizeBalancedNodeData(node.data);
    const { steps: _steps, auth: _auth, enabled: _enabled, ...preservedTransactionData } = transactionData || {};
    const res: any = {
      ...(node.unknownData || {}),
      transaction: {
        ...preservedTransactionData,
        name: node.name || transactionData?.name || 'Transaction',
        steps: node.children?.map(stepNodeToObject) || [],
      },
    };

    const auth = normalizeAuthForYaml(transactionData?.auth);
    if (auth) {
      res.transaction.auth = auth;
    }

    if (node.data?.enabled === false) {
      res.enabled = false;
    }
    return res;
  }

  if (node.type === 'parallel') {
    const childSteps = node.children?.map(stepNodeToObject) || [];

    const { steps: _steps, enabled: _enabled, ...parallelData } = node.data || {};
    const res: any = {
      ...(node.unknownData || {}),
      parallel: {
        ...parallelData,
        name: node.name || node.data?.name || 'Parallel Controller',
        steps: childSteps,
      },
    };

    if (node.data?.enabled === false) {
      res.enabled = false;
    }
    return res;
  }

  if (node.type === 'balanced') {
    const balancedData = sanitizeBalancedNodeData(node.data);
    const stepsInController = balancedData?.__stepsInController === true;
    const balancedType = normalizeBalancedDistributionType(balancedData?.type);
    validateBalancedController(balancedType, node.children || []);
    const {
      name: _name,
      type: _type,
      mode: _mode,
      enabled: _enabled,
      steps: _steps,
      __stepsInController: _stepsInController,
      ...preservedBalancedData
    } = balancedData || {};
    const childSteps =
      node.children?.map(child => {
        const step = stepNodeToObject(child);
        const percentage = isBalancedLoadBearingChild(child)
          ? readBalancedPercentage(child.data?.__balancedPercentage)
          : null;
        return percentage === null ? step : { ...step, percentage };
      }) || [];

    const res: any = {
      ...(node.unknownData || {}),
      balanced: {
        ...preservedBalancedData,
        name: node.name || balancedData?.name || 'Balanced Controller',
        type: serializeBalancedDistributionType(balancedType),
        mode: serializeBalancedExecutionMode(balancedData?.mode),
      },
    };
    if (stepsInController) res.balanced.steps = childSteps;
    else res.steps = childSteps;

    if (balancedData?.enabled === false) {
      res.enabled = false;
    }
    return res;
  }

  if (node.type === 'if') {
    const ifData = sanitizeBalancedNodeData(node.data);
    const res: any = {
      ...(node.unknownData || {}),
      if: ifData?.condition || 'true',
      steps: node.children?.map(stepNodeToObject) || [],
    };

    if (node.data?.enabled === false) {
      res.enabled = false;
    }
    return res;
  }

  if (node.type === 'loop') {
    const rawLoopData = stripControllerSerializationMetadata(sanitizeBalancedNodeData(node.data), ['__scalarLoop']);
    const shouldSerializeScalar =
      Boolean(node.data && typeof node.data === 'object' && !Array.isArray(node.data) && node.data.__scalarLoop) &&
      hasOnlyKeys(rawLoopData, LOOP_SHORTHAND_KEYS);
    const loopData = shouldSerializeScalar ? rawLoopData.count : rawLoopData;
    const res: any = {
      ...(node.unknownData || {}),
      loop: loopData,
      steps: node.children?.map(stepNodeToObject) || [],
    };

    if (node.data?.enabled === false) {
      res.enabled = false;
    }
    return res;
  }

  if (node.type === 'retry') {
    const stepsInController = node.data?.__stepsInController === true;
    const rawRetryData = stripControllerSerializationMetadata(sanitizeBalancedNodeData(node.data), [
      '__scalarRetry',
      '__stepsInController',
      'steps',
    ]);
    const shouldSerializeScalar =
      Boolean(node.data && typeof node.data === 'object' && !Array.isArray(node.data) && node.data.__scalarRetry) &&
      hasOnlyKeys(rawRetryData, RETRY_SHORTHAND_KEYS);
    const retryData = shouldSerializeScalar ? rawRetryData.attempts : rawRetryData;
    const childSteps = node.children?.map(stepNodeToObject) || [];
    const res: any = { ...(node.unknownData || {}), retry: retryData };
    if (stepsInController && retryData && typeof retryData === 'object') {
      res.retry = { ...retryData, steps: childSteps };
    }
    else res.steps = childSteps;

    if (node.data?.enabled === false) {
      res.enabled = false;
    }
    return res;
  }

  if (node.type === 'one_time') {
    const oneTimeData = { ...(node.data || {}) };
    delete oneTimeData.enabled;
    delete oneTimeData.__stepsInController;
    delete oneTimeData.steps;
    const stepsInController = node.data?.__stepsInController === true;

    if (node.name) {
      oneTimeData.name = node.name;
    } else {
      delete oneTimeData.name;
    }

    const childSteps = node.children?.map(stepNodeToObject) || [];
    const res: any = { ...(node.unknownData || {}), one_time: oneTimeData };
    if (stepsInController) oneTimeData.steps = childSteps;
    else res.steps = childSteps;

    if (node.data?.enabled === false) {
      res.enabled = false;
    }
    return res;
  }

  if (node.type === 'on_error') {
    const onErrorData = sanitizeBalancedNodeData(node.data);
    const res: any = {
      ...(node.unknownData || {}),
      on_error: onErrorData?.action || onErrorData || 'continue',
      steps: node.children?.map(stepNodeToObject) || [],
    };

    if (node.data?.enabled === false) {
      res.enabled = false;
    }
    return res;
  }

  if (node.type === 'think_time') {
    const thinkTimeData = sanitizeBalancedNodeData(node.data);
    const res: any = { ...(node.unknownData || {}), think_time: thinkTimeData?.duration || thinkTimeData };
    if (node.data?.enabled === false) {
      res.enabled = false;
    }
    return res;
  }

  if (node.type === 'spark_before' || node.type === 'spark_after' || node.type === 'spark') {
    const res: any = { ...(node.unknownData || {}), spark: sparkDataWithWhen(node) };
    if (node.data?.enabled === false) {
      res.enabled = false;
    }
    return res;
  }

  if (node.type === 'assertion') {
    const res: any = {
      ...(node.unknownData || {}),
      assertion: normalizeAssertionForEngine(
        sanitizeBalancedNodeData(node.data as Record<string, unknown> | undefined),
      ),
    };
    if (node.data?.enabled === false) {
      res.enabled = false;
    }
    return res;
  }

  if (node.type === 'assert') {
    const nextData = { ...(node.data || {}) };
    delete nextData.__lockedType;
    delete nextData.__allowTypeSelection;
    const res: any = { ...(node.unknownData || {}), assertion: nextData };
    if (node.data?.enabled === false) {
      res.enabled = false;
    }
    return res;
  }

  if (node.type === 'extractor' || node.type === 'extract') {
    const res: any = {
      ...(node.unknownData || {}),
      extractor: normalizeExtractorForEngine(
        sanitizeBalancedNodeData(node.data as Record<string, unknown> | undefined),
      ),
    };
    if (node.data?.enabled === false) {
      res.enabled = false;
    }
    return res;
  }

  if (node.type === 'data_source') {
    const res: any = {
      ...(node.unknownData || {}),
      data_source: sanitizeBalancedNodeData(node.data as Record<string, unknown> | undefined),
    };
    if (node.name && node.name !== 'Data Source' && node.name !== node.data?.name) {
      res.data_source.name = node.name;
    }
    if (node.data?.enabled === false) {
      res.enabled = false;
    }
    return res;
  }

  return node.data || {};
}

function requestNodeToObject(node: YAMLNode, methodFallback?: string): any {
  const requestData = sanitizeBalancedNodeData({
    ...(node.data || {}),
    method: node.data?.method || methodFallback,
  });
  const normalizedRequest = normalizeRequestForEditor(requestData, followRedirectsEnabledByDefault);
  const request: any = { ...(node.unknownData || {}), request: { ...normalizedRequest } };
  pruneDefaultRequestFields(request.request);

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
  delete request.request.data_source;

  if (node.data?.enabled === false) {
    request.request.enabled = false;
  }

  if (node.children) {
    const sparkNodes = node.children.filter(child => child.type === 'spark_before' || child.type === 'spark_after');
    if (sparkNodes.length > 0) {
      request.request.spark = sparkNodes.map(spark => sparkDataWithWhen(spark));
    }

    const extractorNodes = node.children.filter(child => child.type === 'extractor');
    if (extractorNodes.length > 0) {
      request.request.extractors = extractorNodes.map(ext =>
        normalizeExtractorForEngine(ext.data as Record<string, unknown> | undefined),
      );
    }

    const extractNodes = node.children.filter(child => child.type === 'extract');
    if (extractNodes.length > 0) {
      if (extractNodes[0].data?.var || extractNodes[0].data?.name) {
        request.request.extract = extractNodes.map(ext => ext.data);
      } else {
        request.request.extract = {};
        extractNodes.forEach(extractor => {
          const variable = extractor.data?.variable;
          if (variable) request.request.extract[variable] = extractor.data?.expression;
        });
      }
    }

    const assertionNodes = node.children.filter(child => child.type === 'assertion');
    if (assertionNodes.length > 0) {
      request.request.assertions = assertionNodes.map(assertion =>
        normalizeAssertionForEngine(assertion.data as Record<string, unknown> | undefined),
      );
    }

    const assertNodes = node.children.filter(child => child.type === 'assert');
    if (assertNodes.length > 0) {
      if (assertNodes[0].data?.type || assertNodes[0].data?.name) {
        request.request.assert = assertNodes.map(assertion => assertion.data);
      } else {
        request.request.assert = {};
        assertNodes.forEach(assertion => {
          const assertionKey = assertion.data?.assertion;
          if (assertionKey) request.request.assert[assertionKey] = assertion.data?.value;
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
      request.request.data_source = sanitizeBalancedNodeData(dataSourceNode.data);
      if (
        dataSourceNode.name &&
        dataSourceNode.name !== 'Data Source' &&
        dataSourceNode.name !== dataSourceNode.data?.name
      ) {
        request.request.data_source.name = dataSourceNode.name;
      }
    }
  }

  return request;
}
