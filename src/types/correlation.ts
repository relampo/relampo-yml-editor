export interface CorrelationCandidate {
  id: string;
  variable: string;
  type: 'session_id' | 'auth_token' | 'csrf_token' | 'cursor' | 'user_id' | 'api_key' | 'uuid' | 'timestamp' | 'dynamic_value';
  valueExample: string;
  source: string;
  usedIn: string[];
  confidence: number;
  explanation: string;
  technicalDetails: {
    format: string;
    entropy: number;
    timesUsed: number;
    encodings: string[];
  };
  extractor: {
    fromStep: string;
    fromLocation: string;
    path: string;
    variable: string;
  };
  diff: string;
  fullValue: string; // Valor completo para reemplazo y tooltip
  // Metadata del request source
  sourceRequest?: {
    method: string;
    path: string;
    index: number;
  };
  // Metadata de los usos
  usedInRequests?: Array<{
    method: string;
    path: string;
    index: number;
    location: string;
  }>;
}