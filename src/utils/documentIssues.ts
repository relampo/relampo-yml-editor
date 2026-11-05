import type { YAMLNode } from '../types/yaml';
import { collectUnrecognizedFields, nearestNode, valueAtPath } from './unknownYamlFields';
import { authoredNodeData } from './yamlAuthoredData';

export type IssueSeverity = 'error' | 'info';

/** A document issue that belongs to a tree node. Syntax errors have no tree, so they are not listed here. */
export interface DocumentIssue {
  /** Unique within one document issue index. */
  id: string;
  kind: 'configuration' | 'unrecognized_field';
  severity: IssueSeverity;
  nodeId: string;
  message: string;
  /** YAML path of an unrecognized field, from the document root. */
  path?: string;
  /** The same path, from the owner node. */
  relativePath?: string;
  value?: unknown;
}

export interface IssueMarker {
  /** Highest severity among the node's own issues. */
  severity?: IssueSeverity;
  issues: DocumentIssue[];
  /** Highest severity among the issues of the node's descendants. */
  descendantSeverity?: IssueSeverity;
}

export interface DocumentIssueIndex {
  issues: DocumentIssue[];
  markers: Record<string, IssueMarker>;
  /** Node ids with issues: errors first, then info, each group in tree order. */
  navigationOrder: string[];
  errorCount: number;
  infoCount: number;
}

const EMPTY_INDEX: DocumentIssueIndex = { issues: [], markers: {}, navigationOrder: [], errorCount: 0, infoCount: 0 };

// Paths follow tree nodes, not the YAML document: a request path ends in
// "request.<field>" while the node data has no "request" wrapper. Try the path
// as is, then without its first segment.
function valueFromNode(node: YAMLNode, relativePath: string): unknown {
  const local = { ...authoredNodeData(node), ...node.unknownData };
  return valueAtPath(local, relativePath) ?? valueAtPath(local, relativePath.replace(/^[^.[]+\./, ''));
}

function higher(a: IssueSeverity | undefined, b: IssueSeverity | undefined): IssueSeverity | undefined {
  return a === 'error' || b === 'error' ? 'error' : (a ?? b);
}

/**
 * Joins configuration errors (already localized, paired with their node ids)
 * and unrecognized fields into one list, linked to tree nodes.
 */
export function indexDocumentIssues(
  tree: YAMLNode | null,
  validationErrors: string[],
  validationNodeIds: string[],
  language = 'en',
): DocumentIssueIndex {
  const unrecognizedLabel = language === 'es' ? 'Campo no reconocido' : 'Unrecognized field';
  if (!tree) return EMPTY_INDEX;
  const issues: DocumentIssue[] = [
    ...validationErrors.map((message, index) => ({
      id: `configuration-${index}`,
      kind: 'configuration' as const,
      severity: 'error' as const,
      nodeId: validationNodeIds[index] ?? tree.id,
      message,
    })),
    ...collectUnrecognizedFields(tree).map(field => {
      const owner = nearestNode(tree, field.path);
      return {
        id: `field-${field.path}`,
        kind: 'unrecognized_field' as const,
        severity: 'info' as const,
        nodeId: owner.node.id,
        message: `${unrecognizedLabel}: ${owner.relativePath}`,
        path: field.path,
        relativePath: owner.relativePath,
        value: valueFromNode(owner.node, owner.relativePath) ?? field.value,
      };
    }),
  ];
  if (!issues.length) return EMPTY_INDEX;

  const markers: Record<string, IssueMarker> = {};
  for (const issue of issues) {
    const marker = (markers[issue.nodeId] ??= { issues: [] });
    marker.severity = higher(marker.severity, issue.severity);
    marker.issues.push(issue);
  }

  const treeOrder: string[] = [];
  const visit = (node: YAMLNode): IssueSeverity | undefined => {
    if (markers[node.id]) treeOrder.push(node.id);
    let below: IssueSeverity | undefined;
    for (const child of node.children ?? []) below = higher(below, visit(child));
    if (below) (markers[node.id] ??= { issues: [] }).descendantSeverity = below;
    return higher(markers[node.id]?.severity, below);
  };
  visit(tree);

  return {
    issues,
    markers,
    navigationOrder: [
      ...treeOrder.filter(id => markers[id].severity === 'error'),
      ...treeOrder.filter(id => markers[id].severity === 'info'),
    ],
    errorCount: issues.filter(issue => issue.severity === 'error').length,
    infoCount: issues.filter(issue => issue.severity === 'info').length,
  };
}

/** The next node to visit after `currentNodeId`, wrapping to the first. */
export function nextIssueNodeId(navigationOrder: string[], currentNodeId: string | undefined): string | undefined {
  const index = currentNodeId ? navigationOrder.indexOf(currentNodeId) : -1;
  return navigationOrder[(index + 1) % navigationOrder.length];
}

export const DESCENDANT_ISSUE_LABEL: Record<IssueSeverity, string> = {
  error: 'Contains errors',
  info: 'Contains unrecognized fields',
};

/**
 * Text for the tree row's `aria-description`. The badge and dot are
 * hidden from assistive technology, so the row name stays the node name.
 */
export function describeIssueMarker(
  marker: IssueMarker | undefined,
  collapsed: boolean,
  descendantLabels: Record<IssueSeverity, string> = DESCENDANT_ISSUE_LABEL,
): string {
  if (!marker) return '';
  return [
    ...marker.issues.map(issue => issue.message),
    ...(collapsed && marker.descendantSeverity ? [descendantLabels[marker.descendantSeverity]] : []),
  ]
    .map(text => (/[.!?]$/.test(text) ? text : `${text}.`))
    .join(' ');
}

const PREVIEW_LENGTH = 80;

export function previewIssueValue(value: unknown): { type: 'text' | 'list' | 'object'; preview: string; truncated: boolean } {
  const type = Array.isArray(value) ? 'list' : value && typeof value === 'object' ? 'object' : 'text';
  const text = typeof value === 'string' ? value : (JSON.stringify(value) ?? String(value));
  return { type, preview: text.slice(0, PREVIEW_LENGTH), truncated: text.length > PREVIEW_LENGTH };
}
