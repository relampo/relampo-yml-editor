export type StringMap = Record<string, string>;

export type NodeUpdateHandler = (nodeId: string, updatedData: unknown) => void;

export interface RetryEditorConfig {
  attempts?: number;
  backoff?: 'constant' | 'fixed' | 'linear' | 'exponential';
  delay?: string;
  initial_delay?: string;
  increment?: string;
  max_delay?: string;
  multiplier?: number;
}
