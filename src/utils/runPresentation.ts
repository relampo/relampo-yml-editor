export function formatRunLatency(value: number): string {
  if (!value) return '0ms';
  return value < 10 ? `${value.toFixed(1)}ms` : `${Math.round(value)}ms`;
}

export function formatRunDuration(nanoseconds: number): string {
  const totalSeconds = nanoseconds / 1e9;
  if (totalSeconds < 1) return `${Math.round(nanoseconds / 1e6)}ms`;
  if (totalSeconds < 60) return `${totalSeconds.toFixed(totalSeconds < 10 ? 1 : 0)}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
}
