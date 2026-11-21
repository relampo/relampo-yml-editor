const HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'TRACE', 'CONNECT']);

/** The HTTP method for the `data-method` color chip; other protocols (SQL, gRPC) get no chip. */
export function httpMethodAttr(method?: string | null): string | undefined {
  const value = (method ?? '').toUpperCase();
  return HTTP_METHODS.has(value) ? value : undefined;
}

/** The status family (1 to 5) for the `data-status-class` color chip. */
export function httpStatusClass(status?: number | string | null): string | undefined {
  const value = Number(status);
  return Number.isInteger(value) && value >= 100 && value < 600 ? String(Math.floor(value / 100)) : undefined;
}
