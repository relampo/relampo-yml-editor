import { describe, expect, it } from 'vitest';
import { translations } from '../../i18n/translations';
import type { YAMLNode } from '../../types/yaml';
import { getNodeDisplayName } from './nodeDisplayName';

const tFor = (lang: 'en' | 'es') => (key: string) =>
  String(key.split('.').reduce<unknown>((value, part) => (value as Record<string, unknown>)?.[part], translations[lang]) ?? key);
const node = (type: string, name: string, data?: Record<string, unknown>) => ({ id: name, type, name, data }) as YAMLNode;

describe('getNodeDisplayName', () => {
  it('translates generated structural names and keeps English unchanged', () => {
    const cases: Array<[YAMLNode, string]> = [
      [node('scenarios', 'Scenarios'), 'Escenarios'],
      [node('cookies', 'Cookie Manager'), 'Gestor de cookies'],
      [node('cookies', 'Cookies'), 'Cookies'],
      [node('load', 'Load Config'), 'Configuración de carga'],
      [node('load', 'Load: Ramp', { type: 'ramp_up_down' }), 'Carga: Incremento y reducción'],
      [node('extractor', 'Extract: token'), 'Extracción: token'],
    ];
    for (const [input, spanish] of cases) {
      expect(getNodeDisplayName(input, tFor('es'))).toBe(spanish);
      expect(getNodeDisplayName(input, tFor('en'))).toBe(input.name);
    }
  });

  it('keeps user-chosen names as typed', () => {
    expect(getNodeDisplayName(node('data_source', 'users.csv'), tFor('es'))).toBe('users.csv');
    expect(getNodeDisplayName(node('group', 'Scenarios'), tFor('es'))).toBe('Scenarios');
  });
});
