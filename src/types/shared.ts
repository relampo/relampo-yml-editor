export type StringMap = Record<string, string>;
type StructuredScalar = string | number | boolean | null;
type StructuredValue =
  | StructuredScalar
  | StructuredValue[]
  | { [key: string]: StructuredValue | undefined }
  | undefined;
type StructuredData = Record<string, StructuredValue>;

export type NodeUpdateHandler = (nodeId: string, updatedData: StructuredData) => void;

export interface RetryEditorConfig {
  attempts?: number;
  backoff?: 'constant' | 'fixed' | 'linear' | 'exponential';
  delay?: string;
  initial_delay?: string;
  increment?: string;
  max_delay?: string;
  multiplier?: number;
}
