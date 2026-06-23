import type { YAMLNode } from '../types/yaml';
import { isBalancedLoadBearingChild } from './balancedController';

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
    if (node.type === 'transaction' && (node.children?.length || 0) < 1) {
      issues.push({
        nodeId: node.id,
        message: `"${node.name || 'Transaction'}" must contain at least 1 related step.`,
      });
    }

    if (node.type === 'balanced') {
      (node.children ?? []).forEach(child => {
        if (child.type === 'think_time') {
          issues.push({
            nodeId: child.id,
            message:
              `"${child.name || 'think_time'}" is excluded from this Balanced Controller: it issues ` +
              `no requests, so it takes no load percentage.`,
          });
        } else if (!isBalancedLoadBearingChild(child)) {
          issues.push({
            nodeId: child.id,
            message:
              `"${child.name || child.type}" is excluded from this Balanced Controller: it contains ` +
              `no requests, so it takes no load percentage.`,
          });
        }
      });
    }

    node.children?.forEach(walk);
  };

  walk(tree);
  return issues;
}
