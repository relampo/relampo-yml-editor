import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ProtocolSetupDialog } from './ProtocolSetupDialog';
describe('protocol setup window', () => {
  it('creates an HTTPS operation and returns to Studio', () => {
    const add = vi.fn(),
      close = vi.fn();
    render(
      <ProtocolSetupDialog
        open
        protocol="https"
        language="en"
        onOpenChange={close}
        onAdd={add}
        onGoToStudio={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText('URL'), { target: { value: 'https://api.test/health' } });
    fireEvent.change(screen.getByLabelText('Name (optional)'), { target: { value: 'Create order' } });
    fireEvent.change(screen.getByLabelText('Method'), { target: { value: 'POST' } });
    fireEvent.change(screen.getByLabelText('Request body (optional)'), { target: { value: '{"item":"{{item}}"}' } });
    fireEvent.click(screen.getByText('Headers and authentication'));
    fireEvent.change(screen.getByLabelText('Headers (JSON)'), {
      target: { value: '{"Authorization":"Bearer {{token}}"}' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add to Studio' }));
    expect(add).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          name: 'Create order',
          method: 'POST',
          url: 'https://api.test/health',
          body: '{"item":"{{item}}"}',
          headers: { Authorization: 'Bearer {{token}}' },
        }),
      }),
    );
    expect(close).toHaveBeenCalledWith(false);
  });
  it('shows an address error instead of creating an invalid WebSocket step', () => {
    const add = vi.fn();
    render(
      <ProtocolSetupDialog
        open
        protocol="websocket"
        language="en"
        onOpenChange={vi.fn()}
        onAdd={add}
        onGoToStudio={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText('URL'), { target: { value: 'https://api.test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add to Studio' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/ws/);
    expect(add).not.toHaveBeenCalled();
  });
  it('returns without adding a request', () => {
    const add = vi.fn(),
      go = vi.fn();
    render(
      <ProtocolSetupDialog
        open
        protocol="websocket"
        language="en"
        onOpenChange={vi.fn()}
        onAdd={add}
        onGoToStudio={go}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Go to Studio' }));
    expect(go).toHaveBeenCalledOnce();
    expect(add).not.toHaveBeenCalled();
  });
});
