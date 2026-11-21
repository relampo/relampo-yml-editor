import { isRecord } from './sseMessage';

export interface SQLResult {
  query?: string;
  params?: Array<string | number | boolean | null>;
  dialect?: string;
  request_truncated?: boolean;
  kind: 'query' | 'exec';
  columns: string[];
  rows: Array<Array<string | number | boolean | null>>;
  rows_returned: number;
  rows_affected: number;
  truncated: boolean;
}

export function isSQLResult(value: unknown): value is SQLResult {
  if (!isRecord(value)) return false;
  return (
    (value.kind === 'query' || value.kind === 'exec') &&
    (value.query === undefined || typeof value.query === 'string') &&
    (value.dialect === undefined || typeof value.dialect === 'string') &&
    (value.request_truncated === undefined || typeof value.request_truncated === 'boolean') &&
    (value.params === undefined ||
      (Array.isArray(value.params) &&
        value.params.length <= 32 &&
        value.params.every(
          cell =>
            cell === null ||
            typeof cell === 'string' ||
            typeof cell === 'boolean' ||
            (typeof cell === 'number' && Number.isFinite(cell)),
        ))) &&
    Array.isArray(value.columns) &&
    value.columns.length <= 64 &&
    value.columns.every(column => typeof column === 'string') &&
    Array.isArray(value.rows) &&
    value.rows.length <= 100 &&
    value.rows.every(
      row =>
        Array.isArray(row) &&
        row.length === (value.columns as unknown[]).length &&
        row.every(
          cell =>
            cell === null ||
            typeof cell === 'string' ||
            typeof cell === 'boolean' ||
            (typeof cell === 'number' && Number.isFinite(cell)),
        ),
    ) &&
    typeof value.rows_returned === 'number' &&
    Number.isSafeInteger(value.rows_returned) &&
    value.rows_returned >= 0 &&
    typeof value.rows_affected === 'number' &&
    Number.isSafeInteger(value.rows_affected) &&
    value.rows_affected >= 0 &&
    typeof value.truncated === 'boolean'
  );
}
