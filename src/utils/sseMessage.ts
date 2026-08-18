export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseSSEMessage<T>(message: Event, isValid: (value: unknown) => value is T): T | null {
  const data = (message as MessageEvent).data;
  if (typeof data !== 'string') return null;

  try {
    const value: unknown = JSON.parse(data);
    return isValid(value) ? value : null;
  } catch {
    return null;
  }
}

export function createValidatedEventStream(
  url: string,
  reconnectGraceMs: number,
  onConnectionError: () => void,
) {
  const source = new EventSource(url);
  let finished = false;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  const clearReconnectTimer = () => {
    if (reconnectTimer === null) return;
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  };
  const close = () => {
    finished = true;
    clearReconnectTimer();
    source.close();
  };
  const fail = () => {
    if (finished) return;
    close();
    onConnectionError();
  };
  const parse = <T>(message: Event, isValid: (value: unknown) => value is T): T | null => {
    if (finished) return null;
    const parsed = parseSSEMessage(message, isValid);
    if (parsed === null) fail();
    return parsed;
  };

  source.addEventListener('open', clearReconnectTimer);
  source.onerror = () => {
    if (finished) return;
    if (source.readyState === EventSource.CLOSED) {
      fail();
      return;
    }
    if (reconnectTimer === null) {
      reconnectTimer = setTimeout(fail, reconnectGraceMs);
    }
  };

  return { source, close, isFinished: () => finished, parse };
}
