import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { validateYAMLSemantics } from '../../utils/yamlSemanticValidation';
import { LoadVisualization } from './LoadVisualization';
import type { LoadSegmentData } from './loadUtils';

const rps = { name: 'rps', duration: '125ms', transition: 'constant', target_rps: '500', min_vus: '10', max_vus: '40' };
const vus = { name: 'vus', duration: '125ms', transition: 'constant', target_vus: '40' };

describe('RLP-767 segment continuity', () => {
  for (const previous of [rps, vus]) {
    for (const [target, required] of [[60, 'ramp_up'], [20, 'ramp_down'], [40, 'constant'], [0, 'ramp_down']] as const) {
      for (const transition of ['ramp_up', 'ramp_down', 'constant']) {
        it(`${previous.name} → VUs ${target} validates ${transition}`, () => {
          const issues = validateYAMLSemantics({ id: 'load', name: 'load', type: 'load', data: { type: 'segments', segments: [previous, { ...vus, target_vus: target, transition }] } });
          if (transition === required) expect(issues).toEqual([]);
          else expect(issues.map(issue => issue.message)).toContain(`Segment 2 Transition must be ${required === 'constant' ? 'Constant' : required === 'ramp_up' ? 'Ramp up' : 'Ramp down'} from 40 VUs to ${target} VUs.`);
        });
      }
    }
  }

  it('shows independent dashed RPS targets over exact fractional durations and VUs capacity', () => {
    const segments: LoadSegmentData[] = [vus, rps, { ...rps, name: 'second-rps', duration: '250ms', target_rps: '200', min_vus: '2', max_vus: '30' }, { ...vus, name: 'next', duration: '500ms', target_vus: '60', transition: 'ramp_up' }];
    const { container } = render(<LanguageProvider><LoadVisualization data={{ type: 'segments', segments }} loadType="segments" /></LanguageProvider>);
    const targets = container.querySelectorAll('line[data-segment-rps-target]');
    expect(targets).toHaveLength(2);
    expect(targets[0]).toHaveAttribute('data-segment-rps-target', '500');
    expect(targets[0]).toHaveAttribute('x1', '82.5');
    expect(targets[0]).toHaveAttribute('x2', '125');
    expect(targets[1]).toHaveAttribute('data-segment-rps-target', '200');
    expect(targets[1]).toHaveAttribute('x1', '125');
    expect(targets[1]).toHaveAttribute('x2', '210');
    for (const target of targets) {
      expect(target).toHaveAttribute('stroke-dasharray', '6 5');
      expect(target.getAttribute('y1')).toBe(target.getAttribute('y2'));
    }
    expect(screen.getByText(/Total:\s*1s/)).toBeInTheDocument();
    const trajectory = container.querySelector('polyline[stroke-width="3"]')!;
    expect(trajectory.getAttribute('points')).toContain('210,90'); // starts at previous RPS Max 30, on the 60-VU axis
    expect(trajectory.getAttribute('points')).toContain('380,10');
  });

  it('shows VUs Min/Max and multiple independent RPS targets in an RPS-only profile', () => {
    const { container } = render(<LanguageProvider><LoadVisualization data={{ type: 'segments', segments: [rps, { ...rps, duration: '375ms', target_rps: '200', min_vus: '2', max_vus: '30' }] }} loadType="segments" /></LanguageProvider>);
    expect(screen.getByText(/Peak VU capacity:\s*40/)).toBeInTheDocument();
    expect(container.querySelectorAll('line[data-segment-rps-target]')).toHaveLength(2);
    expect(container.querySelectorAll('rect[data-segment-vus-band]')).toHaveLength(2);
  });

  it('keeps the RPS objective independent from changes to VU bounds', () => {
    const chart = (max: number) => <LanguageProvider><LoadVisualization data={{ type: 'segments', segments: [{ ...rps, max_vus: max }] }} loadType="segments" /></LanguageProvider>;
    const { container, rerender } = render(chart(40));
    const points = () => {
      const line = container.querySelector('line[data-segment-rps-target]')!;
      return ['x1', 'x2', 'y1', 'y2', 'data-segment-rps-target'].map(attribute => line.getAttribute(attribute));
    };
    const original = points();
    rerender(chart(80));
    expect(points()).toEqual(original);
    expect(screen.getByText(/Peak VU capacity:\s*80/)).toBeInTheDocument();
  });
});
