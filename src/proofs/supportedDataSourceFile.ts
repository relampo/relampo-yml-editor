import { defineProof, type Named, type Proof } from '@gdp-ts/core';

const SupportedDataSourceFile = defineProof('SupportedDataSourceFile');

/** The named file has a CSV/TXT extension, not necessarily valid contents. */
export interface SupportedDataSourceFile<F> extends Proof<'SupportedDataSourceFile', [F]> {}

export function supportedDataSourceFile<F>(file: Named<F, File>): SupportedDataSourceFile<F> | null {
  const filename = file.value.name;
  const extension = filename.slice(filename.lastIndexOf('.')).toLowerCase();
  return extension === '.csv' || extension === '.txt' ? SupportedDataSourceFile.prove(file) : null;
}
