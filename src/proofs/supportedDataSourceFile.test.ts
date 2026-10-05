import { name } from '@gdp-ts/core';
import { describe, expect, it } from 'vitest';
import { supportedDataSourceFile } from './supportedDataSourceFile';

describe('supportedDataSourceFile', () => {
  it.each(['users.csv', 'users.txt', 'users.CSV', 'users.TxT', 'users.backup.csv'])(
    'proves the supported extension for %s',
    filename => {
      name(new File(['alice'], filename), file => {
        expect(supportedDataSourceFile(file)?.kind).toBe('SupportedDataSourceFile');
      });
    },
  );

  it.each(['users.json', 'users.csv.exe', 'users', '', 'users.csv\n', 'users.txt '])(
    'does not mint a proof for %s',
    filename => {
      name(new File(['alice'], filename), file => {
        expect(supportedDataSourceFile(file)).toBeNull();
      });
    },
  );

  it('checks the extension, not MIME type or content', () => {
    name(new File([], 'empty.csv', { type: 'application/octet-stream' }), file => {
      expect(supportedDataSourceFile(file)?.kind).toBe('SupportedDataSourceFile');
    });
  });
});
