import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { DistributedNodes } from './DistributedNodes';
afterEach(cleanup);
function Fixture({ limit = 10 }: { limit?: number }) {
  const [selected, onChange] = useState([1, 2]);
  return (
    <>
      <DistributedNodes
        selected={selected}
        onChange={onChange}
        capacity={40}
        maxSelected={limit}
        disabled={false}
        es
      />
      <button>Fuera</button>
    </>
  );
}
describe('compact node selection', () => {
  it('shows 40 slots, counts the selected slots and allows any 10', () => {
    render(<Fixture />);
    const trigger = screen.getByRole('button', { name: 'Nodos' });
    expect(trigger).toHaveTextContent('2');
    fireEvent.click(trigger);
    const slots = screen.getAllByRole('button', { name: /^Nodo \d+$/ });
    expect(slots).toHaveLength(40);
    fireEvent.click(screen.getByRole('button', { name: 'Nodo 40' }));
    for (let i = 3; i <= 9; i++) fireEvent.click(screen.getByRole('button', { name: `Nodo ${i}` }));
    expect(trigger).toHaveTextContent('10');
    expect(screen.getByRole('button', { name: 'Nodo 10' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Nodo 40' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Nodo 1' }));
    expect(trigger).toHaveTextContent('9');
    expect(screen.getByRole('button', { name: 'Nodo 10' })).toBeEnabled();
  });
  it('closes outside and with Escape without resetting the count', () => {
    render(<Fixture />);
    const trigger = screen.getByRole('button', { name: 'Nodos' });
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('button', { name: 'Nodo 3' }));
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Fuera' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveTextContent('3');
    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
  it('accepts a different plan limit', () => {
    render(<Fixture limit={2} />);
    fireEvent.click(screen.getByRole('button', { name: 'Nodos' }));
    expect(screen.getByRole('button', { name: 'Nodo 3' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Nodo 1' }));
    expect(screen.getByRole('button', { name: 'Nodo 40' })).toBeEnabled();
  });
});
