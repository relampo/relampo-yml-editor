import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConstantLoadMode } from './ConstantLoadMode';

describe('ConstantLoadMode', () => {
  it('uses accessible helper text instead of placeholders for load fields', () => {
    render(
      <ConstantLoadMode
        data={{ users: '', duration: '', iterations: '', ramp_up: '' }}
        onChange={vi.fn()}
      />,
    );

    for (const label of ['Virtual Users', 'Duration', 'Iterations', 'Ramp Up']) {
      const input = screen.getByLabelText(label);
      expect(input).not.toHaveAttribute('placeholder');
      expect(input).toHaveAccessibleDescription();
    }
    expect(screen.getAllByText(/Default unit: seconds/i)).toHaveLength(2);
  });

  it('allows millisecond values long enough to represent at least one hour', () => {
    const onChange = vi.fn();
    render(
      <ConstantLoadMode
        data={{ duration: '', ramp_up: '' }}
        onChange={onChange}
      />,
    );

    expect(screen.getByLabelText('Duration')).toHaveAttribute('maxlength', '16');
    expect(screen.getByLabelText('Ramp Up')).toHaveAttribute('maxlength', '16');
    fireEvent.change(screen.getByLabelText('Duration'), { target: { value: '3600000ms' } });
    fireEvent.change(screen.getByLabelText('Ramp Up'), { target: { value: '3600000ms' } });
    expect(onChange).toHaveBeenCalledWith('duration', '3600000ms');
    expect(onChange).toHaveBeenCalledWith('ramp_up', '3600000ms');
  });

  it('disables finite stop fields during an explicit manual-stop run', () => {
    render(
      <ConstantLoadMode
        data={{ users: '3', duration: '', iterations: '', run_until_stopped: true }}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('Duration')).toBeDisabled();
    expect(screen.getByLabelText('Iterations')).toBeDisabled();
    expect(screen.getByLabelText('Virtual Users')).toBeEnabled();
  });
});
