import { textMatcher } from './treeOperations';
import { useEffect, useRef } from 'react';
import { useSearchNavigation } from './SearchNavigationContext';

/** Reveals the search occurrence in its original field without adding visible content. */
export function SearchMatchDetails({ nodeId }: { nodeId: string }) {
  const { match } = useSearchNavigation();
  const previewRef = useRef<HTMLStyleElement>(null);
  const active = match?.nodeId === nodeId ? match : null;
  useEffect(() => {
    if (!active || !previewRef.current) return;
    const preview = previewRef.current;
    const root = preview.closest('[data-node-details]');
    let selected: HTMLInputElement | HTMLTextAreaElement | undefined;
    let frame = 0;
    let attempts = 0;
    const reveal = () => {
      attempts++;
      const controls = Array.from(
        root?.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input:not([type="hidden"]), textarea') ?? [],
      ).filter(
        element =>
          element.getClientRects().length &&
          !element.closest('[data-search-preview]') &&
          (active.path[0] === 'name' || element.id !== 'nodedetails-node-name'),
      );
      selected =
        active.path[0] === 'name'
          ? controls.find(element => element.id === 'nodedetails-node-name' || element.value === active.value)
          : (controls.find(element => element.value === active.value) ??
            controls.find(element => active.scope === 'requests' && active.value && element.value.includes(active.value)));
      let rangeStart = active.start;
      let rangeEnd = active.end;
      const sourceControl = controls.find(element => element.dataset.searchSourcePath === JSON.stringify(active.path));
      if (sourceControl) selected = sourceControl;
      const formControls = controls.filter(element => element.hasAttribute('data-search-form-field'));
      const projectedForm = (active.path[0] === 'body' || active.path[0] === 'body_raw') && active.path.length === 1 && formControls.length > 0;
      if (projectedForm) {
        const locations = formControls.flatMap(element => {
          const matcher = textMatcher(active.query, false);
          return matcher ? Array.from(element.value.matchAll(matcher), match => ({ element, start: match.index, end: match.index + match[0].length })) : [];
        });
        const location = locations[active.bodyIndex];
        selected = location?.element;
        if (location) { rangeStart = location.start; rangeEnd = location.end; }
      }
      if (active.path[0] === 'url') {
        const locations = controls
          .filter(element => element.closest('[data-search-field="url"]'))
          .flatMap(element => {
            const matcher = textMatcher(active.query, false);
            return matcher
              ? Array.from(element.value.matchAll(matcher), match => ({
                  element,
                  start: match.index,
                  end: match.index + match[0].length,
                }))
              : [];
          });
        const location = locations[active.fieldIndex];
        if (location) {
          selected = location.element;
          rangeStart = location.start;
          rangeEnd = location.end;
        }
      }
      if (!selected) {
        if (attempts < 30) frame = requestAnimationFrame(reveal);
        return;
      }
      const localMatcher = textMatcher(active.query, false);
      const localMatches = localMatcher ? Array.from(selected.value.matchAll(localMatcher)) : [];
      selected.setAttribute('data-search-active-index', String(Math.max(0, localMatches.findIndex(match => match.index === rangeStart))));
      selected.setAttribute('data-search-active', 'true');
      selected.scrollIntoView?.({ block: 'center', inline: 'nearest' });
      selected.focus({ preventScroll: true });
      const prefix = Math.max(0, selected.value.indexOf(active.value));
      try {
        selected.setSelectionRange(
          active.path[0] === 'url' || projectedForm ? rangeStart : prefix + rangeStart,
          active.path[0] === 'url' || projectedForm ? rangeEnd : prefix + rangeEnd,
        );
      } catch {
        /* Number inputs cannot select a range. */
      }
      if (selected instanceof HTMLTextAreaElement) {
        const line = selected.value.slice(0, prefix + active.start).split('\n').length - 1;
        const height = Number.parseFloat(getComputedStyle(selected).lineHeight) || 20;
        selected.scrollTop = Math.max(0, line * height - selected.clientHeight / 2);
      }
    };
    frame = requestAnimationFrame(reveal);
    return () => {
      cancelAnimationFrame(frame);
      selected?.removeAttribute('data-search-active');
      selected?.removeAttribute('data-search-active-index');
    };
  }, [active]);
  if (!active) return null;
  return (
    <style
      ref={previewRef}
      data-search-location
      data-search-path={active.path.join('.')}
    >
      {`[data-search-active] { outline: 2px solid #4ade80 !important; outline-offset: 2px; } [data-search-active]::selection { background: #86efac; color: #111; }`}
    </style>
  );
}
