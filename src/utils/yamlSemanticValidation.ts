import type { YAMLNode } from '../types/yaml';

interface YAMLSemanticIssue {
  nodeId: string;
  message: string;
}

/** Returns true when the step type can issue HTTP or SQL requests. */
function stepTypeIssuesRequests(type: string): boolean {
  const requestTypes = new Set([
    'request', 'get', 'post', 'put', 'delete', 'patch', 'head', 'options', 'sql',
  ]);
  return requestTypes.has(type);
}

/**
 * Returns true when the node subtree contains at least one enabled request/SQL
 * step. think_time and purely-timer-only subtrees return false.
 *
 * Note: this is a structural check only — runtime conditions (e.g. `if`
 * branches) are not evaluated.
 */
function subtreeHasRequest(node: YAMLNode): boolean {
  if (stepTypeIssuesRequests(node.type)) return true;
  return (node.children ?? []).some(subtreeHasRequest);
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

    if (node.type === 'balanced') {
      (node.children ?? []).forEach(child => {
        if (child.type === 'think_time') {
          issues.push({
            nodeId: child.id,
            message:
              `"${child.name || 'think_time'}" cannot be a balanced child: it would consume a ` +
              `load percentage without issuing any requests.`,
          });
        } else if (!subtreeHasRequest(child)) {
          issues.push({
            nodeId: child.id,
            message:
              `"${child.name || child.type}" contains no requests: all VUs assigned to it ` +
              `will execute no load.`,
          });
        }
      });
    }

    node.children?.forEach(walk);
  };

  walk(tree);
  return issues;
}
