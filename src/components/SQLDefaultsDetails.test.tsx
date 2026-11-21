import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { LanguageProvider } from '../contexts/LanguageContext';
import type { YAMLNode, YAMLNodeData } from '../types/yaml';
import { SQLDefaultsDetails } from './SQLDefaultsDetails';
import { SQLRequestDetails } from './SQLRequestDetails';
import { parseYAMLToTree, treeToYAML } from '../utils/yamlParser';
vi.mock('@monaco-editor/react', () => ({
  default: ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
    <textarea
      aria-label="SQL editor"
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  ),
}));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState({}, '', '/');
});
function setupLanguage() {
  window.history.replaceState({}, '', '/?lang=es');
}
function Defaults() {
  const [data, setData] = useState<YAMLNodeData>({ connections: {} });
  const node: YAMLNode = { id: 'defaults', type: 'sql_defaults', name: 'SQL Defaults', data };
  const tree: YAMLNode = { id: 'root', type: 'test', name: 'Test', children: [node] };
  return (
    <LanguageProvider>
      <SQLDefaultsDetails
        node={node}
        tree={tree}
        onNodeUpdate={(_, data) => setData(data)}
        canTest
      />
    </LanguageProvider>
  );
}
describe('SQL Defaults and Request', () => {
  it('creates a named connection and tests the current settings without exposing credentials in the result', async () => {
    setupLanguage();
    const fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, duration_ms: 12.3 }) });
    vi.stubGlobal('fetch', fetch);
    render(<Defaults />);
    fireEvent.change(screen.getByLabelText('Nombre de la nueva conexión'), { target: { value: 'tickets' } });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar conexión' }));
    for (const [label, value] of [
      ['Servidor', 'localhost'],
      ['Base de datos', 'tickets'],
      ['Usuario', 'reader'],
      ['Contraseña o variable', '{{db_password}}'],
    ])
      fireEvent.change(screen.getByLabelText(label), { target: { value } });
    fireEvent.click(screen.getByRole('button', { name: 'Probar conexión' }));
    await screen.findByText('Conectado · 12.3 ms');
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.connection_ref).toBe('tickets');
    expect(body.yaml).toContain('database: tickets');
    expect(body).not.toHaveProperty('query');
    fireEvent.change(screen.getByLabelText('Base de datos'), { target: { value: 'auctions' } });
    await waitFor(() => expect(screen.queryByText(/Conectado ·/)).not.toBeInTheDocument());
  });
  it('inherits the only connection without copying credentials into the request', () => {
    setupLanguage();
    const tree = parseYAMLToTree(
      'sql_defaults: {connections: {tickets: {dialect: postgres, connection: {host: localhost, database: tickets, user: reader}}}}\nscenarios: []',
    )!;
    const node: YAMLNode = {
      id: 'sql',
      type: 'sql',
      name: 'SQL Request',
      data: { kind: 'query', query: 'SELECT 1', params: [] },
    };
    const update = vi.fn();
    render(
      <LanguageProvider>
        <SQLRequestDetails
          node={node}
          tree={tree}
          onNodeUpdate={update}
        />
      </LanguageProvider>,
    );
    expect(screen.getByLabelText('Conexión')).toHaveValue('tickets');
    expect(screen.queryByLabelText('Contraseña o variable')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('SQL editor'), { target: { value: 'SELECT id FROM events' } });
    expect(update).toHaveBeenLastCalledWith('sql', expect.objectContaining({ query: 'SELECT id FROM events' }));
    expect(update.mock.calls[0][1]).not.toHaveProperty('connection');
    expect(treeToYAML(tree)).toContain('sql_defaults:');
  });
  it('does not offer connection tests when the backend lacks the capability', () => {
    setupLanguage();
    const node: YAMLNode = {
      id: 'defaults',
      type: 'sql_defaults',
      name: 'SQL Defaults',
      data: {
        connections: {
          main: { dialect: 'postgres', connection: { host: 'localhost', database: 'tickets', user: 'reader' } },
        },
      },
    };
    render(
      <LanguageProvider>
        <SQLDefaultsDetails
          node={node}
          canTest={false}
        />
      </LanguageProvider>,
    );
    expect(screen.getByRole('button', { name: 'Probar conexión' })).toBeDisabled();
  });
});
