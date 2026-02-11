import type { NodeType } from '../types/script';

/**
 * Determines if a node can be dropped into a target node based on business rules
 */
export function canDropNode(draggedType: NodeType, targetType: NodeType): boolean {
  // HTTP Request: Can only be inside Scenario or Controllers
  if (draggedType === 'http-request') {
    return (
      targetType === 'scenario' ||
      targetType === 'controller-group' ||
      targetType === 'controller-if' ||
      targetType === 'controller-loop' ||
      targetType === 'controller-retry' ||
      targetType === 'controller-transaction'
    );
  }

  // Controllers: Can be inside Scenario or other Controllers (nested), but NOT inside Requests
  if (
    draggedType === 'controller-group' ||
    draggedType === 'controller-if' ||
    draggedType === 'controller-loop' ||
    draggedType === 'controller-retry' ||
    draggedType === 'controller-transaction'
  ) {
    return (
      targetType === 'scenario' ||
      targetType === 'controller-group' ||
      targetType === 'controller-if' ||
      targetType === 'controller-loop' ||
      targetType === 'controller-retry' ||
      targetType === 'controller-transaction'
    );
  }

  // Think Time, Assertion, Extractor: Only inside Requests
  if (
    draggedType === 'timer' ||
    draggedType === 'assertion' ||
    draggedType === 'extractor'
  ) {
    return targetType === 'http-request';
  }

  // Data Source, Cookie Manager, Cache Manager, Load: Only inside Scenarios
  if (
    draggedType === 'data-source' ||
    draggedType === 'cookie-manager' ||
    draggedType === 'cache-manager' ||
    draggedType === 'load'
  ) {
    return targetType === 'scenario';
  }

  // HTTP Defaults, Variables, Metrics: Only inside Test Plan
  if (
    draggedType === 'http-defaults' ||
    draggedType === 'variables' ||
    draggedType === 'metrics'
  ) {
    return targetType === 'test-plan';
  }

  // Scenario: Only inside Test Plan
  if (draggedType === 'scenario') {
    return targetType === 'test-plan';
  }

  // Header Manager: Can be in Scenario or Test Plan
  if (draggedType === 'header-manager') {
    return targetType === 'test-plan' || targetType === 'scenario';
  }

  // Default: not allowed
  return false;
}

/**
 * Determines if two nodes can be reordered as siblings (same parent)
 * This checks if both nodes can exist under the same parent type
 */
export function canReorderNodes(
  draggedType: NodeType,
  siblingType: NodeType,
  parentType: NodeType
): boolean {
  // Both nodes must be valid children of the parent
  const draggedCanBeChild = canDropNode(draggedType, parentType);
  const siblingIsChild = canDropNode(siblingType, parentType);
  
  return draggedCanBeChild && siblingIsChild;
}

/**
 * Get a human-readable message explaining why a drop is not allowed
 */
export function getDropErrorMessage(draggedType: NodeType, targetType: NodeType): string {
  const typeNames: Record<NodeType, string> = {
    'test-plan': 'Test Plan',
    'scenario': 'Scenario',
    'http-request': 'HTTP Request',
    'controller-group': 'Controller',
    'controller-if': 'If Controller',
    'controller-loop': 'Loop Controller',
    'controller-retry': 'Retry Controller',
    'controller-simple': 'Simple Controller',
    'controller-transaction': 'Transaction Controller',
    'timer': 'Think Time',
    'assertion': 'Assertion',
    'extractor': 'Extractor',
    'data-source': 'Data Source',
    'cookie-manager': 'Cookie Manager',
    'cache-manager': 'Cache Manager',
    'load': 'Load Profile',
    'http-defaults': 'HTTP Defaults',
    'variables': 'Variables',
    'metrics': 'Metrics',
    'header-manager': 'Header Manager',
  };

  const draggedName = typeNames[draggedType] || draggedType;
  const targetName = typeNames[targetType] || targetType;

  // Specific messages for common cases
  if (draggedType === 'http-request' && targetType === 'http-request') {
    return `${draggedName} cannot be nested inside another Request. Move it to a Scenario or Controller instead.`;
  }

  if (
    (draggedType === 'timer' || draggedType === 'assertion' || draggedType === 'extractor') &&
    targetType !== 'http-request'
  ) {
    return `${draggedName} can only be placed inside HTTP Requests.`;
  }

  if (
    (draggedType === 'data-source' ||
      draggedType === 'cookie-manager' ||
      draggedType === 'cache-manager' ||
      draggedType === 'load') &&
    targetType !== 'scenario'
  ) {
    return `${draggedName} can only be placed inside Scenarios.`;
  }

  if (
    (draggedType === 'http-defaults' || draggedType === 'variables' || draggedType === 'metrics') &&
    targetType !== 'test-plan'
  ) {
    return `${draggedName} can only be placed at the Test Plan level.`;
  }

  return `Cannot drop ${draggedName} into ${targetName}.`;
}