export type StringMap = Record<string, string>;
type StructuredData = Record<string, unknown>;

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
