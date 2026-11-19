import { useLayoutEffect, useRef } from 'react';

type Playback = {
  first: number;
  latest: number;
  position: number;
  receivedAt: number;
  deadline: number;
};

/** Animate the SVG reveal only. Samples, tooltips and reported values stay untouched. */
export function useTimelineReveal({
  live,
  first,
  latest,
  rangeStart,
  rangeEnd,
  left,
  width,
}: {
  live: boolean;
  first: number;
  latest: number;
  rangeStart: number;
  rangeEnd: number;
  left: number;
  width: number;
}) {
  const clipRef = useRef<SVGRectElement>(null);
  const cursorRef = useRef<SVGLineElement>(null);
  const playback = useRef<Playback | null>(null);

  useLayoutEffect(() => {
    const now = performance.now();
    const previous = playback.current;
    const sameSeries = previous?.first === first && latest >= previous.latest;
    const changed = sameSeries && latest > previous.latest;
    // Small headroom absorbs normal arrival jitter so the trace does not pause between samples.
    const duration = changed ? Math.min(2000, Math.max(100, (now - previous.receivedAt) * 1.1)) : 0;
    const state: Playback = {
      first,
      latest,
      position: sameSeries ? previous.position : latest,
      receivedAt: changed || !sameSeries ? now : previous.receivedAt,
      deadline: changed ? now + duration : sameSeries ? previous.deadline : now,
    };
    playback.current = state;
    const motion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
    let frame: number | undefined;
    const draw = () => {
      const x =
        left +
        ((Math.max(rangeStart, Math.min(rangeEnd, state.position)) - rangeStart) / Math.max(1, rangeEnd - rangeStart)) *
          width;
      clipRef.current?.setAttribute('width', String(x));
      cursorRef.current?.setAttribute('x1', String(x));
      cursorRef.current?.setAttribute('x2', String(x));
    };
    const finish = () => {
      if (frame !== undefined) cancelAnimationFrame(frame);
      state.position = latest;
      draw();
    };
    const from = state.position;
    const remaining = state.deadline - now;
    const advance = (time: number) => {
      const fraction = Math.min(1, Math.max(0, (time - now) / remaining));
      state.position = Math.min(latest, from + (latest - from) * fraction);
      draw();
      if (fraction < 1) frame = requestAnimationFrame(advance);
    };
    if (!live || motion?.matches || remaining <= 0 || from >= latest) finish();
    else {
      draw();
      frame = requestAnimationFrame(advance);
    }
    const motionChanged = () => {
      if (motion?.matches) finish();
    };
    motion?.addEventListener('change', motionChanged);
    return () => {
      if (frame !== undefined) cancelAnimationFrame(frame);
      motion?.removeEventListener('change', motionChanged);
    };
  }, [live, first, latest, rangeStart, rangeEnd, left, width]);
  return { clipRef, cursorRef };
}
