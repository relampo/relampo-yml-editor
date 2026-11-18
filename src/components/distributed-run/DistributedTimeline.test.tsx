import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { DistributedTimeline } from './DistributedTimeline';
import type { DistributedPoint } from '../../utils/distributedApi';
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
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
