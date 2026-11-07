import { describe, it, expect } from 'vitest';
import { load } from 'js-yaml';
import { appendGRPCScenario } from './grpcProject';
describe('gRPC scenario authoring integration', () => {
  it('preserves existing steps and gRPC defaults when adding a new contract', () => {
    const current =
      'test: {name: Existing}\ngrpc_defaults: {target: old:443, protoset: old.protoset}\nscenarios:\n - name: Existing\n   steps:\n    - get: /health\n';
    const added =
      'test: {name: Generated}\ngrpc_defaults: {target: new:443, protoset: new.protoset}\nscenarios:\n - name: Generated\n   steps:\n    - grpc: {method: /new.API/Call, message: {}}\n';
    const root = load(appendGRPCScenario(current, added)) as any;
    expect(root.grpc_defaults.target).toBe('old:443');
    expect(root.scenarios[0].steps[0]).toEqual({ get: '/health' });
    expect(root.scenarios[0].steps[1].grpc).toMatchObject({ target: 'new:443', protoset: 'new.protoset' });
  });
});
