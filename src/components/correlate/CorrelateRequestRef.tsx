import type { CorrelateLocation } from '../../utils/correlateApi';
import { httpMethodAttr } from '../../utils/httpBadges';

/** "#3 POST https://…" with the method as a color chip. */
export function CorrelateRequestRef({ location }: { location: CorrelateLocation }) {
  if (!location.URL) return <>—</>;
  return (
    <>
      #{location.RequestID || location.StepIndex + 1}{' '}
      <span data-method={httpMethodAttr(location.Method)}>{location.Method}</span> {location.URL}
    </>
  );
}
