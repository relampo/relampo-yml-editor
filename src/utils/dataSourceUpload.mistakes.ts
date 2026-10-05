import { name } from '@gdp-ts/core';
import { supportedDataSourceFile } from '../proofs/supportedDataSourceFile';
import { uploadSupportedStudioDataSourceFile } from './debugApi';

// Type-check only: the app does not import or call this function.
export function dataSourceUploadTypeChecks(rawFile: File, otherFile: File): void {
  name(rawFile, otherFile, (file, other) => {
    const maybeProof = supportedDataSourceFile(file);

    // @ts-expect-error A failed check must be handled before uploading.
    void uploadSupportedStudioDataSourceFile(file, maybeProof);
    if (!maybeProof) return;

    void uploadSupportedStudioDataSourceFile(file, maybeProof);

    // @ts-expect-error A raw file has no scoped name.
    void uploadSupportedStudioDataSourceFile(rawFile, maybeProof);
    // @ts-expect-error The upload requires a proof.
    void uploadSupportedStudioDataSourceFile(file);
    // @ts-expect-error A proof for one file does not permit uploading another.
    void uploadSupportedStudioDataSourceFile(other, maybeProof);
    // @ts-expect-error A kind label alone cannot forge a proof.
    const _forged: typeof maybeProof = { kind: 'SupportedDataSourceFile' };
  });

  // @ts-expect-error A named file cannot escape its callback.
  name(rawFile, file => file);
  // @ts-expect-error A proof cannot escape its callback.
  name(rawFile, file => supportedDataSourceFile(file));
}
