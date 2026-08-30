import { normalizeLoadType, parseTimeToSeconds } from '../components/yaml-node-details/loadUtils';
import type { YAMLNode } from '../types/yaml';
import { normalizeBalancedExecutionMode } from './balancedController';

interface YAMLSemanticIssue {
  nodeId: string;
  message: string;
}

const UNSUPPORTED_STAGES_MESSAGE =
  'Load stages are documented but unsupported by the editor and Pulse runtime. Remove stages before running.';
const UNSUPPORTED_STAGES_MESSAGE_ES =
  'Las etapas de carga están documentadas, pero el editor y el runtime de Pulse no las admiten. Elimina stages antes de ejecutar.';

export function localizeYAMLSemanticError(message: string, language: string): string {
  if (language === 'es' && message === UNSUPPORTED_STAGES_MESSAGE) return UNSUPPORTED_STAGES_MESSAGE_ES;
  if (language !== 'es' && message === UNSUPPORTED_STAGES_MESSAGE_ES) return UNSUPPORTED_STAGES_MESSAGE;
  return message;
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

    if (node.type === 'load' && Object.hasOwn(node.data ?? {}, 'stages')) {
      issues.push({
        nodeId: node.id,
        message: UNSUPPORTED_STAGES_MESSAGE,
      });
    }

    if (node.type === 'load' && normalizeLoadType(node.data?.type) === 'throughput') {
      validateThroughputLoadNode(node, issues);
    }

    if (node.type === 'load' && normalizeLoadType(node.data?.type) === 'intent') {
      validateIntentLoadNode(node, issues);
    }

    if (node.type === 'load' && normalizeLoadType(node.data?.type) === 'segments') {
      validateSegmentsLoadNode(node, issues);
    }

    // Manual-stop is a non-intent contract; intent loads have no such control,
    // so keep this validation off them to avoid a message they can't act on.
    if (node.type === 'load' && !['intent', 'segments'].includes(normalizeLoadType(node.data?.type))) {
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

function validateThroughputLoadNode(node: YAMLNode, issues: YAMLSemanticIssue[]) {
  const targetRps = Number(String(node.data?.target_rps ?? '').trim() || 0);
  if (!Number.isFinite(targetRps) || targetRps <= 0) {
    issues.push({
      nodeId: node.id,
      message: 'Throughput load requires Target RPS greater than 0.',
    });
  }

  const maxVusValue = String(node.data?.max_vus ?? '').trim();
  if (maxVusValue === '') {
    issues.push({
      nodeId: node.id,
      message: 'Throughput load requires Max VUs.',
    });
    return;
  }

  const minVus = Number(String(node.data?.min_vus ?? '').trim() || 0);
  const maxVus = Number(maxVusValue);
  if (!Number.isFinite(maxVus) || maxVus <= 0) {
    issues.push({
      nodeId: node.id,
      message: 'Throughput Max VUs must be greater than 0.',
    });
  }
  if (Number.isFinite(minVus) && minVus > 0 && Number.isFinite(maxVus) && maxVus > 0 && minVus > maxVus) {
    issues.push({
      nodeId: node.id,
      message: 'Throughput Min VUs cannot be greater than Max VUs.',
    });
  }
}

function validateIntentLoadNode(node: YAMLNode, issues: YAMLSemanticIssue[]) {
  const data = (node.data ?? {}) as Record<string, unknown>;
  const target = node.data?.target;
  const targetRecord =
    target && typeof target === 'object' && !Array.isArray(target) ? (target as Record<string, unknown>) : undefined;
  const targetUnit = String(targetRecord?.type ?? node.data?.target_unit ?? '')
    .trim()
    .toLowerCase();
  const targetValue = positiveNumber(targetRecord?.value ?? node.data?.target_value);
  const minVus = positiveNumber(node.data?.min_vus);
  const maxVus = positiveNumber(node.data?.max_vus);
  const hasDuration = data.duration !== undefined;
  const hasWarmup = data.warmup !== undefined;
  const hasRampUp = data.ramp_up !== undefined;
  const hasRampDown = data.ramp_down !== undefined;
  const hasWindow = data.window !== undefined || data.control_window !== undefined;
  const duration = parseTimeToSeconds(String(data.duration ?? '').trim());
  const warmup = parseTimeToSeconds(String(data.warmup ?? '').trim());
  const rampUp = parseTimeToSeconds(String(data.ramp_up ?? '').trim());
  const rampDown = parseTimeToSeconds(String(data.ramp_down ?? '').trim());
  const window = parseTimeToSeconds(String(data.window ?? data.control_window ?? '').trim());

  if (!['rps', 'vus'].includes(targetUnit)) {
    issues.push({ nodeId: node.id, message: 'Intent target unit must be either RPS or VUs.' });
  }
  if (targetValue === null) {
    issues.push({ nodeId: node.id, message: 'Intent target value must be greater than 0.' });
  }
  if (minVus === null) {
    issues.push({ nodeId: node.id, message: 'Intent Min VUs must be greater than 0.' });
  }
  if (maxVus === null) {
    issues.push({ nodeId: node.id, message: 'Intent Max VUs must be greater than 0.' });
  }
  if (minVus !== null && maxVus !== null && minVus >= maxVus) {
    issues.push({ nodeId: node.id, message: 'Intent Min VUs must be less than Max VUs.' });
  }
  if (hasDuration && duration <= 0) {
    issues.push({ nodeId: node.id, message: 'Intent load requires Duration greater than 0.' });
  }
  if (hasWarmup && (warmup <= 0 || (duration > 0 && warmup >= duration))) {
    issues.push({ nodeId: node.id, message: 'Intent Warmup must be shorter than Duration.' });
  }
  if (hasRampUp && rampUp <= 0) {
    issues.push({ nodeId: node.id, message: 'Intent Ramp Up must be greater than 0.' });
  }
  if (hasRampDown && rampDown <= 0) {
    issues.push({ nodeId: node.id, message: 'Intent Ramp Down must be greater than 0.' });
  }
  if (hasWindow && window <= 0) {
    issues.push({ nodeId: node.id, message: 'Intent Window must be greater than 0.' });
  }

  const aggressiveness = String(data.aggressiveness ?? '')
    .trim()
    .toLowerCase();
  if (aggressiveness && !['low', 'medium', 'high'].includes(aggressiveness)) {
    issues.push({ nodeId: node.id, message: 'Intent aggressiveness must be low, medium, or high.' });
  }

  const sloFields = [
    ['p50_max_ms', 'p50'],
    ['p75_max_ms', 'p75'],
    ['p95_max_ms', 'p95'],
    ['p99_max_ms', 'p99'],
    ['p999_max_ms', 'p999'],
  ] as const;
  for (const [field, label] of sloFields) {
    const nestedLatency = node.data?.latency;
    const nestedValue =
      nestedLatency && typeof nestedLatency === 'object' && !Array.isArray(nestedLatency)
        ? (nestedLatency as Record<string, unknown>).max_ms
        : undefined;
    const value = data[field] ?? (field === 'p95_max_ms' ? nestedValue : undefined);
    if (value !== undefined && positiveNumber(value) === null) {
      issues.push({ nodeId: node.id, message: `Intent ${label} latency limit must be greater than 0.` });
    }
  }
  const errorFields = [
    ['error_rate_max_pct', 'error rate'],
    ['error_4xx_max_pct', '4xx error rate'],
    ['error_5xx_max_pct', '5xx error rate'],
  ] as const;
  for (const [field, label] of errorFields) {
    const nestedErrorRate = node.data?.error_rate;
    const nestedValue =
      nestedErrorRate && typeof nestedErrorRate === 'object' && !Array.isArray(nestedErrorRate)
        ? (nestedErrorRate as Record<string, unknown>).max_pct
        : undefined;
    const value = data[field] ?? (field === 'error_rate_max_pct' ? nestedValue : undefined);
    if (value !== undefined && nonNegativeNumber(value) === null) {
      issues.push({ nodeId: node.id, message: `Intent ${label} limit must be between 0 and 100.` });
    } else if (value !== undefined && (nonNegativeNumber(value) ?? 0) > 100) {
      issues.push({ nodeId: node.id, message: `Intent ${label} limit must be between 0 and 100.` });
    }
  }

  if (targetUnit === 'vus' && targetValue !== null && maxVus !== null && maxVus < Math.ceil(targetValue)) {
    issues.push({
      nodeId: node.id,
      message: 'Intent Max VUs must be greater than or equal to the target VUs.',
    });
  }
}

function positiveNumber(value: unknown): number | null {
  const parsed = Number(String(value ?? '').trim());
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function nonNegativeNumber(value: unknown): number | null {
  const parsed = Number(String(value ?? '').trim());
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function validateSegmentsLoadNode(node: YAMLNode, issues: YAMLSemanticIssue[]) {
  const segments = Array.isArray(node.data?.segments) ? node.data.segments : [];
  if (segments.length === 0) {
    issues.push({
      nodeId: node.id,
      message: 'Segments load requires at least one segment.',
    });
    return;
  }

  const rootDuration = parseTimeToSeconds(String(node.data?.duration ?? '').trim());
  const explicitDurations = segments.filter(segment => parseTimeToSeconds(String(segment?.duration ?? '').trim()) > 0).length;
  if (explicitDurations > 0 && explicitDurations !== segments.length) {
    issues.push({
      nodeId: node.id,
      message: 'Segments must either all define Duration or all use the total Duration.',
    });
  }
  if (explicitDurations === 0 && rootDuration <= 0) {
    issues.push({
      nodeId: node.id,
      message: 'Segments load requires a total Duration when segment durations are omitted.',
    });
  }
  if (explicitDurations === segments.length && rootDuration > 0) {
    const segmentDurationTotal = segments.reduce(
      (total, segment) => total + parseTimeToSeconds(String(segment?.duration ?? '').trim()),
      0,
    );
    if (Math.abs(segmentDurationTotal - rootDuration) > 0.001) {
      issues.push({
        nodeId: node.id,
        message: `Segments Duration total must equal load Duration (${formatDuration(rootDuration)}). Current segments total is ${formatDuration(segmentDurationTotal)}.`,
      });
    }
  }

  segments.forEach((segment, index) => {
    const targetRps = Number(String(segment?.target_rps ?? '').trim() || 0);
    const targetVus = Number(String(segment?.target_vus ?? '').trim() || 0);
    const hasTargetRps = Number.isFinite(targetRps) && targetRps > 0;
    const hasTargetVus = Number.isFinite(targetVus) && targetVus > 0;
    if (hasTargetRps === hasTargetVus) {
      issues.push({
        nodeId: node.id,
        message: `Segment ${index + 1} must define exactly one target: Target RPS or Target VUs.`,
      });
    }
    if (hasTargetRps && !hasTargetVus && String(segment?.max_vus ?? '').trim() === '') {
      issues.push({
        nodeId: node.id,
        message: `Segment ${index + 1} with Target RPS requires Max VUs.`,
      });
    }
    if (hasTargetVus && (String(segment?.min_vus ?? '').trim() !== '' || String(segment?.max_vus ?? '').trim() !== '')) {
      issues.push({
        nodeId: node.id,
        message: `Segment ${index + 1} can use Min VUs / Max VUs only with Target RPS.`,
      });
    }
  });
}

function formatDuration(seconds: number): string {
  if (seconds > 0 && seconds < 1) return `${Math.round(seconds * 1000)}ms`;
  const rounded = Math.max(0, Math.round(seconds));
  if (rounded % 3600 === 0 && rounded > 0) return `${rounded / 3600}h`;
  if (rounded % 60 === 0 && rounded > 0) return `${rounded / 60}m`;
  return `${rounded}s`;
}
