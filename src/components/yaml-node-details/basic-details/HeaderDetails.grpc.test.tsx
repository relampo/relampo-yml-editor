import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { LanguageProvider } from '../../../contexts/LanguageContext';
import { HeadersDetails } from './HeaderDetails';
import type { YAMLNode } from '../../../types/yaml';
it('edits a gRPC metadata value while retaining repeated metadata values', () => {
  const update = vi.fn();
  const node: YAMLNode = {
    id: 'meta',
    type: 'headers',
    name: 'Headers',
    data: { authorization: 'old', 'x-values': ['one', 'two'] } as YAMLNode['data'],
  };
  render(
    <LanguageProvider>
      <HeadersDetails
        node={node}
        onNodeUpdate={update}
        grpcContext
      />
    </LanguageProvider>,
  );
  expect(screen.getByDisplayValue('["one","two"]')).toBeInTheDocument();
  fireEvent.change(screen.getByDisplayValue('old'), { target: { value: 'new' } });
  expect(update).toHaveBeenLastCalledWith('meta', { authorization: 'new', 'x-values': ['one', 'two'] });
  fireEvent.change(screen.getByDisplayValue('["one","two"]'), { target: { value: '["three","four"]' } });
  expect(update).toHaveBeenLastCalledWith('meta', expect.objectContaining({ 'x-values': ['three', 'four'] }));
});
