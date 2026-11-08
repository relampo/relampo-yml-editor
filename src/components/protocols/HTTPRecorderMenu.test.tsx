import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { ProtocolMenu } from './ProtocolMenu';
it('enables HTTP recording only for a compatible Studio and keeps gRPC available', () => {
  const select = vi.fn();
  render(
    <ProtocolMenu
      language="en"
      grpcEnabled
      httpEnabled
      onSelect={select}
    />,
  );
  fireEvent.pointerDown(screen.getByRole('button', { name: 'Recorder' }), { button: 0 });
  const http = screen.getByRole('menuitem', { name: 'HTTP/HTTPS' });
  expect(http).not.toHaveAttribute('aria-disabled', 'true');
  fireEvent.click(http);
  expect(select).toHaveBeenCalledWith('https');
});
