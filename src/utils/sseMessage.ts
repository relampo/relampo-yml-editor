export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseSSEMessage<T>(message: Event, isValid: (value: unknown) => value is T): T | null {
  const data = (message as MessageEvent).data;
  if (typeof data !== 'string') return null;

  try {
    const value: unknown = JSON.parse(data);
    return isValid(value) ? value : null;
  } catch {
    return null;
  }
}
