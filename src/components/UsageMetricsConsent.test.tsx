import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
const consent = vi.hoisted(() => ({ value: false, set: vi.fn() }));
vi.mock('../utils/analytics', () => ({
  getAnalyticsConsent: () => consent.value,
  setAnalyticsConsent: (value: boolean) => {
    consent.value = value;
    consent.set(value);
  },
}));
vi.mock('../utils/runtimeConfig', () => ({ getRuntimeConfig: () => ({ mode: 'studio' }) }));
import { UsageMetricsConsent } from './UsageMetricsConsent';
describe('Studio consent control', () => {
  it('starts disabled and applies explicit opt-in and opt-out', () => {
    consent.value = false;
    render(<UsageMetricsConsent language="en" />);
    const input = screen.getByRole('checkbox', { name: 'Share usage metrics' });
    expect(input).not.toBeChecked();
    fireEvent.click(input);
    expect(input).toBeChecked();
    expect(consent.set).toHaveBeenLastCalledWith(true);
    fireEvent.click(input);
    expect(input).not.toBeChecked();
    expect(consent.set).toHaveBeenLastCalledWith(false);
  });
  it('uses Spanish text and explains the data boundary', () => {
    render(<UsageMetricsConsent language="es" />);
    expect(screen.getByRole('checkbox', { name: 'Compartir métricas de uso' })).toBeVisible();
    expect(screen.getByTitle(/No envía scripts/)).toBeVisible();
  });
});
