import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { LanguageProvider } from '../contexts/LanguageContext';
import { YAMLSQLDetails } from './YAMLSQLDetails';

it('preserves SQL port references and saves a literal port as a number', () => {
  const update = vi.fn();
  render(
    <LanguageProvider>
      <YAMLSQLDetails
        node={{
          id: 'sql',
          type: 'sql',
          name: 'SQL Request',
          data: { dialect: 'mysql', connection: { port: '{{mysql_port}}' } },
        }}
        onNodeUpdate={update}
      />
    </LanguageProvider>,
  );
  const port = screen.getByLabelText('Port', { exact: true });
  expect(port).toHaveValue('{{mysql_port}}');

  fireEvent.change(port, { target: { value: '{{alternate_port}}' } });
  expect(update).toHaveBeenLastCalledWith('sql', expect.objectContaining({ connection: { port: '{{alternate_port}}' } }));

  fireEvent.change(port, { target: { value: '55479' } });
  expect(update).toHaveBeenLastCalledWith('sql', expect.objectContaining({ connection: { port: 55479 } }));
});
