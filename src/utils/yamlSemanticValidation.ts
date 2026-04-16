import type { YAMLNode } from '../types/yaml';

export interface YAMLSemanticIssue {
  nodeId: string;
  message: string;
}

export function validateYAMLSemantics(tree: YAMLNode | null): YAMLSemanticIssue[] {
  if (!tree) {
    return [];
  }

  const issues: YAMLSemanticIssue[] = [];

  const walk = (node: YAMLNode) => {
    if (node.type === 'transaction' && (node.children?.length || 0) < 2) {
      issues.push({
        nodeId: node.id,
        message: `"${node.name || 'Transaction'}" must contain at least 2 related steps.`,
      });
    }

    node.children?.forEach(walk);
  };

  walk(tree);
  return issues;
}
