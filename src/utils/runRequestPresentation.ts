import type { RunRequestStat } from './runApi';

type RequestIdentity = Pick<RunRequestStat, 'name' | 'method' | 'path'>;

/** The table shows the executed request, without recording prefixes or tree numbers. */
export function runRequestPresentation(request: RequestIdentity) {
  const name = request.name.replace(/^\[[^\]]+\]\s*/, '');
  // Distributed scopes may carry only a display name, including a recording prefix.
  const match =
    /(?:^|\s)(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS|CONNECT|TRACE|GRPC|SQL|WEBSOCKET|WEBRTC)\s+(.+)$/i.exec(name);
  const method = request.method || match?.[1]?.toUpperCase() || '';
  const label = request.path || match?.[2] || name;
  return { method, label, title: label };
}
