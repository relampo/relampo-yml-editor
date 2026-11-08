/** New Studio tabs use a stable URL identity for their own reloadable draft. */
export function studioEditorId(): string | null {
  if (typeof window === 'undefined') return null;
  const id = new URLSearchParams(window.location.search).get('editor');
  return id && /^[a-zA-Z0-9_-]{1,80}$/.test(id) ? id : null;
}
