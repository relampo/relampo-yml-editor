import { normalizeLoadType, parseTimeToSeconds } from '../components/yaml-node-details/loadUtils';
import type { YAMLNode } from '../types/yaml';
import { normalizeBalancedExecutionMode } from './balancedController';

interface YAMLSemanticIssue {
  nodeId: string;
  message: string;
}

export function validateYAMLSemantics(tree: YAMLNode | null): YAMLSemanticIssue[] {
  if (!tree) {
    return [];
  }

  const issues: YAMLSemanticIssue[] = [];
  const scenarioNodes: YAMLNode[] = [];
  let scenariosNodeId: string | null = null;

  const collectScenarios = (node: YAMLNode) => {
    if (node.type === 'scenarios' && scenariosNodeId === null) {
      scenariosNodeId = node.id;
    }
    if (node.type === 'scenario') {
      scenarioNodes.push(node);
    }
    node.children?.forEach(collectScenarios);
  };

  collectScenarios(tree);
  if (scenarioNodes.length > 1) {
    issues.push({
      nodeId: scenariosNodeId ?? tree.id,
      message: 'Relampo Studio supports only one scenario. Remove or merge extra scenarios before running Debug.',
    });
  }

  const walk = (node: YAMLNode, scenarioIterations = 0) => {
    if (node.data?.enabled === false) {
      return;
    }

    if (node.type === 'scenario') {
      const loadNode = node.children?.find(child => child.type === 'load');
      scenarioIterations = Number(String(loadNode?.data?.iterations ?? '').trim() || 0);
    }

    if (node.type === 'transaction' && !(node.children ?? []).some(child => child.data?.enabled !== false)) {
      issues.push({
        nodeId: node.id,
        message: `"${node.name || 'Transaction'}" must contain at least 1 related step.`,
      });
    }

    if (
      node.type === 'balanced' &&
      normalizeBalancedExecutionMode(node.data?.mode) === 'iteraciones' &&
      !(Number.isFinite(scenarioIterations) && scenarioIterations > 0)
    ) {
      issues.push({
        nodeId: node.id,
        message: `"${node.name || 'Balanced Controller'}" in Iterations mode requires scenario load Iterations greater than 0.`,
      });
    }

    // Manual-stop is a non-intent contract; intent loads have no such control,
    // so keep this validation off them to avoid a message they can't act on.
    if (node.type === 'load' && normalizeLoadType(node.data?.type) !== 'intent') {
      const duration = String(node.data?.duration ?? '').trim();
      const rawIterations = String(node.data?.iterations ?? '').trim();
      const iterations = Number(rawIterations || 0);
      const hasFiniteLimit = parseTimeToSeconds(duration) > 0 || (Number.isFinite(iterations) && iterations > 0);
      const runsUntilStopped = node.data?.run_until_stopped === true;
      const hasExplicitStopFields =
        Object.hasOwn(node.data ?? {}, 'duration') ||
        Object.hasOwn(node.data ?? {}, 'iterations') ||
        Object.hasOwn(node.data ?? {}, 'run_until_stopped');

      // Only a real limit (a duration or a positive iteration count) conflicts;
      // iterations: 0 is the finite-type default and means "unlimited", not a
      // configured limit.
      if (runsUntilStopped && hasFiniteLimit) {
        issues.push({
          nodeId: node.id,
          message: 'Run until manually stopped cannot be combined with Duration or Iterations.',
        });
      } else if (hasExplicitStopFields && !runsUntilStopped && !hasFiniteLimit) {
        issues.push({
          nodeId: node.id,
          message: 'Define Duration or Iterations, or explicitly enable Run until manually stopped.',
        });
      }
    }

    node.children?.forEach(child => walk(child, scenarioIterations));
  };

  walk(tree);
  return issues;
}
