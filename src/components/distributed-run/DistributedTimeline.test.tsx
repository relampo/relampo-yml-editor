import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { DistributedTimeline } from './DistributedTimeline';
import type { DistributedPoint } from '../../utils/distributedApi';
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
const start = '2026-11-18T16:00:00Z';
const point = (seconds: number, failures = 0, p95: number | null = 30): DistributedPoint => ({
  at: new Date(Date.parse(start) + seconds * 1000).toISOString(),
  requests: seconds * 10,
  failures,
  rps: 10,
  active_vus: 1,
  avg_ms: 20,
  p95_ms: p95,
});
const view = (points: DistributedPoint[]) => (
  <LanguageProvider>
    <DistributedTimeline
      points={points}
      startedAt={start}
      durationSeconds={60}
      configuredUsers={10}
    />
  </LanguageProvider>
);
it('fills a single timeline progressively without extending measured lines into the future', () => {
  const { rerender } = render(view([point(1), point(10, 2)]));
  const chart = screen.getByRole('img', { name: 'Timeline of RPS, VUs, latency and errors' });
  expect(chart.querySelectorAll('path[data-metric]')).toHaveLength(3);
  expect(screen.getByRole('button', { name: 'AVG' })).toHaveAttribute('aria-pressed', 'false');
  expect(screen.getByRole('button', { name: 'RPS' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: 'VUs' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: 'Errors' })).toHaveAttribute('aria-pressed', 'true');
  const line = chart.querySelector('path[data-metric="rps"]')!;
  const initial = line.getAttribute('d');
  expect(initial).toContain('238.3'); // 10 seconds of a 60-second configured run.
  expect(chart.querySelector('path[data-metric="active_vus"]')?.getAttribute('d')).toContain('258.4'); // 1 measured VU on the configured 10-VU scale.
  rerender(view([point(1), point(10, 2), point(20, 3)]));
  expect(chart.querySelector('path[data-metric="rps"]')).toBe(line);
  expect(line.getAttribute('d')).not.toBe(initial);
  expect(line.getAttribute('d')).toContain('366.7');
  expect(screen.getByRole('group', { name: 'Timeline values' })).toHaveTextContent('Errors: 1');
  expect(screen.getByRole('group', { name: 'Timeline values' })).toHaveTextContent('VUs: 1');
});
it('keeps unavailable latency as gaps and permits hiding a metric', () => {
  render(view([point(1, 0, null), point(2, 0, null)]));
  const chart = screen.getByRole('img');
  expect(chart.querySelector('path[data-metric="p95_ms"]')).toBeNull();
  expect(screen.getByRole('button', { name: 'P95' })).toHaveAttribute('aria-pressed', 'false');
  fireEvent.click(screen.getByRole('button', { name: 'P95' }));
  expect(chart.querySelector('path[data-metric="p95_ms"]')).toHaveAttribute('d', '');
  expect(screen.getByRole('group', { name: 'Timeline values' })).toHaveTextContent('P95: —');
  fireEvent.click(screen.getByRole('button', { name: 'P95' }));
  expect(screen.getByRole('button', { name: 'P95' })).toHaveAttribute('aria-pressed', 'false');
  expect(chart.querySelector('path[data-metric="p95_ms"]')).toBeNull();
});
it('supports drag zoom, reset, and keyboard inspection of confirmed values', () => {
  vi.stubGlobal('PointerEvent', MouseEvent);
  render(view([point(1), point(10, 2), point(20, 3)]));
  const chart = screen.getByRole('img');
  vi.spyOn(chart, 'getBoundingClientRect').mockReturnValue({ left: 0, width: 1000 } as DOMRect);
  fireEvent.pointerDown(chart, { button: 0, clientX: 110 });
  fireEvent.pointerMove(chart, { clientX: 400 });
  fireEvent.pointerUp(chart, { clientX: 400 });
  expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
  expect(screen.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument();
  fireEvent.keyDown(chart, { key: 'ArrowLeft' });
  expect(screen.getByRole('group', { name: 'Timeline values' })).toHaveTextContent('0:10');
});
it('shows a floating report-style tooltip for the hovered sample and hides it on leave', () => {
  vi.stubGlobal('PointerEvent', MouseEvent);
  render(view([point(1), point(10, 2), point(20, 3)]));
  const chart = screen.getByRole('img');
  vi.spyOn(chart, 'getBoundingClientRect').mockReturnValue({ left: 0, width: 1000 } as DOMRect);
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  fireEvent.pointerMove(chart, { clientX: 238 });
  const tooltip = screen.getByRole('tooltip');
  expect(tooltip).toHaveTextContent('0:10');
  expect(tooltip).toHaveTextContent('RPS10 req/s');
  expect(tooltip).toHaveTextContent('VUs1 VUs');
  expect(tooltip).toHaveTextContent('Errors2');
  expect(tooltip).not.toHaveTextContent('P95');
  fireEvent.click(screen.getByRole('button', { name: 'P95' }));
  expect(screen.getByRole('tooltip')).toHaveTextContent('P9530 ms');
  fireEvent.pointerLeave(chart);
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
});

function animationClock() {
  let now = 0;
  let id = 0;
  const frames = new Map<number, FrameRequestCallback>();
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.set(++id, callback);
    return id;
  });
  vi.stubGlobal('cancelAnimationFrame', (frame: number) => frames.delete(frame));
  return {
    frames,
    set: (time: number) => {
      now = time;
    },
    frame: (time: number) => {
      now = time;
      const pending = [...frames.values()];
      frames.clear();
      pending.forEach(callback => callback(time));
    },
  };
}
const liveView = (points: DistributedPoint[], live = true) => (
  <LanguageProvider>
    <DistributedTimeline
      points={points}
      startedAt={start}
      durationSeconds={60}
      live={live}
    />
  </LanguageProvider>
);

it('advances between confirmed samples on animation frames and stops at the last real measurement', () => {
  const clock = animationClock();
  const points = [point(1), point(2)];
  const { rerender } = render(liveView(points));
  const chart = screen.getByRole('img');
  const reveal = chart.querySelector('clipPath rect')!;
  const initial = Number(reveal.getAttribute('width'));
  clock.set(1000);
  const next = [...points, { ...point(3), rps: 25 }];
  const evidence = JSON.stringify(next);
  rerender(liveView(next));
  expect(Number(reveal.getAttribute('width'))).toBe(initial);
  clock.frame(1500);
  const halfway = Number(reveal.getAttribute('width'));
  expect(halfway).toBeGreaterThan(initial);
  clock.frame(1750);
  expect(Number(reveal.getAttribute('width'))).toBeGreaterThan(halfway);
  clock.frame(2100);
  const final = Number(reveal.getAttribute('width'));
  expect(final).toBeCloseTo(110 + (3 / 60) * 770);
  clock.frame(6000);
  expect(Number(reveal.getAttribute('width'))).toBe(final);
  expect(clock.frames.size).toBe(0);
  expect(JSON.stringify(next)).toBe(evidence);
  expect(screen.getByRole('group', { name: 'Timeline values' })).toHaveTextContent('RPS: 25 req/s');
});

it('shows the exact finished series immediately and cancels animation on completion or unmount', () => {
  const clock = animationClock();
  const { rerender, unmount } = render(liveView([point(1), point(2)]));
  clock.set(1000);
  const points = [point(1), point(2), point(3)];
  rerender(liveView(points));
  clock.frame(1400);
  expect(clock.frames.size).toBe(1);
  rerender(liveView(points, false));
  expect(Number(screen.getByRole('img').querySelector('clipPath rect')!.getAttribute('width'))).toBeCloseTo(148.5);
  expect(clock.frames.size).toBe(0);
  unmount();
  expect(clock.frames.size).toBe(0);
});

it('honors reduced-motion preferences instead of delaying confirmed measurements', () => {
  const clock = animationClock();
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  const { rerender } = render(liveView([point(1), point(2)]));
  clock.set(1000);
  rerender(liveView([point(1), point(2), point(3)]));
  expect(Number(screen.getByRole('img').querySelector('clipPath rect')!.getAttribute('width'))).toBeCloseTo(148.5);
  expect(clock.frames.size).toBe(0);
});

it('continues from the current position when a new sample arrives mid-animation', () => {
  const clock = animationClock();
  const { rerender, unmount } = render(liveView([point(1), point(2)]));
  clock.set(1000);
  rerender(liveView([point(1), point(2), point(3)]));
  clock.frame(1900);
  const reveal = screen.getByRole('img').querySelector('clipPath rect')!;
  const before = Number(reveal.getAttribute('width'));
  clock.set(2000);
  rerender(liveView([point(1), point(2), point(3), point(4)]));
  expect(Number(reveal.getAttribute('width'))).toBe(before);
  clock.frame(2200);
  expect(Number(reveal.getAttribute('width'))).toBeGreaterThan(before);
  expect(Number(reveal.getAttribute('width'))).toBeLessThan(110 + (4 / 60) * 770);
  unmount();
  expect(clock.frames.size).toBe(0);
});

it('keeps tooltips tied to measured values and shows exact history while zooming', () => {
  const clock = animationClock();
  vi.stubGlobal('PointerEvent', MouseEvent);
  const { rerender } = render(liveView([point(1), point(2)]));
  clock.set(1000);
  rerender(liveView([point(1), point(2), { ...point(3), rps: 25 }]));
  const chart = screen.getByRole('img');
  vi.spyOn(chart, 'getBoundingClientRect').mockReturnValue({ left: 0, width: 1000 } as DOMRect);
  clock.frame(1400);
  fireEvent.pointerMove(chart, { clientX: 148.5 });
  expect(screen.getByRole('tooltip')).toHaveTextContent('RPS25 req/s');
  fireEvent.pointerDown(chart, { button: 0, clientX: 110 });
  fireEvent.pointerMove(chart, { clientX: 160 });
  fireEvent.pointerUp(chart, { clientX: 160 });
  expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument();
  expect(clock.frames.size).toBe(0);
});
