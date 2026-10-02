import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LanguageProvider, useLanguage } from '../contexts/LanguageContext';
import { LoadDetails } from './yaml-node-details/LoadDetails';
import { TreeSearchBar } from './yaml-tree-view/TreeSearchBar';

function Controls() {
  const { setLanguage } = useLanguage();
  return <><button onClick={() => setLanguage('es')}>ES</button><button onClick={() => setLanguage('en')}>EN</button>
    <TreeSearchBar value="token" onChange={vi.fn()} onClear={vi.fn()} onReplace={() => 2} replaceMatchCount={2} currentMatchIndex={0} onCurrentMatchIndexChange={vi.fn()} searchMatchCount={2} />
    <LoadDetails node={{ id: 'load', type: 'load', name: 'Load', data: { type: 'constant', users: 2, duration: '5s' } }} onNodeUpdate={vi.fn()} />
  </>;
}

describe('Studio controls language', () => {
  it('updates basic tree and constant-load controls when switching ES and EN', () => {
    render(<LanguageProvider><Controls /></LanguageProvider>);
    fireEvent.click(screen.getByText('ES'));
    expect(screen.getByPlaceholderText('Buscar nodos...')).toHaveValue('token');
    fireEvent.click(screen.getByRole('button', { name: 'Reemplazar' }));
    fireEvent.change(screen.getByLabelText('Texto de reemplazo'), { target: { value: 'authToken' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reemplazar todo' }));
    expect(screen.getByText('2 reemplazos')).toBeVisible();
    expect(screen.getByText('Perfil constante')).toBeVisible();
    for (const label of ['Usuarios virtuales', 'Duración', 'Iteraciones', 'Incremento gradual']) {
      expect(screen.getByLabelText(label)).toHaveAccessibleDescription();
    }
    expect(screen.getByRole('checkbox', { name: /Ejecutar hasta detener manualmente/ })).toBeVisible();
    fireEvent.click(screen.getByText('EN'));
    expect(screen.getByPlaceholderText('Search nodes...')).toBeVisible();
    expect(screen.getByLabelText('Virtual Users')).toHaveValue(2);
    expect(screen.getByText('2 replacements')).toBeVisible();
  });
});
