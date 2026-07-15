import type { YAMLNode } from '../types/yaml';

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

  const walk = (node: YAMLNode) => {
    if (node.data?.enabled === false) {
      return;
    }

    if (node.type === 'transaction' && !(node.children ?? []).some(child => child.data?.enabled !== false)) {
      issues.push({
        nodeId: node.id,
        message: `"${node.name || 'Transaction'}" must contain at least 1 related step.`,
      });
    }

    if (node.type === 'load') {
      const duration = String(node.data?.duration ?? '').trim();
      const rawIterations = String(node.data?.iterations ?? '').trim();
      const iterations = Number(rawIterations || 0);
      const hasFiniteLimit = duration !== '' || (Number.isFinite(iterations) && iterations > 0);
      const hasConfiguredLimit = duration !== '' || rawIterations !== '';
      const runsUntilStopped = node.data?.run_until_stopped === true;
      const hasExplicitStopFields =
        Object.hasOwn(node.data ?? {}, 'duration') ||
        Object.hasOwn(node.data ?? {}, 'iterations') ||
        Object.hasOwn(node.data ?? {}, 'run_until_stopped');

      if (runsUntilStopped && hasConfiguredLimit) {
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

    node.children?.forEach(walk);
  };

  walk(tree);
  return issues;
}
