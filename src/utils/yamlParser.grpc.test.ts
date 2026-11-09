import { describe, it, expect } from 'vitest';
import { load } from 'js-yaml';
import { parseYAMLToTree, treeToYAML } from './yamlParser';
import { collectRequests, matchDebugEventTarget } from '../components/debugRequests';
import { canContain } from './yamlDragDropRules';
const source = `test:
  name: Native gRPC recording
grpc_defaults:
  target: localhost:50051
  protoset: ../api/service.protoset
  reflection: true
scenarios:
  - name: Booking
    steps:
      - grpc:
          name: Login
          method: /practice.reservations.v1.Reservations/Login
          metadata:
            x-tags: [training, grpc]
          message:
            username: user001
            password: "***"
          expected_status: OK
          response_template:
            message_type: practice.Shop.LoginReply
            message: {token: "", expiresIn: 0}
          response:
            status: OK
            message: {token: "***"}
          vendor_future_field: preserve
      - grpc:
          method: /practice.reservations.v1.Reservations/Reserve
          enabled: false
          payload_base64: AQID
`;
describe('native gRPC requests', () => {
  it('imports grpc requests with protocol identity and preserves defaults and unknown fields', () => {
    const tree = parseYAMLToTree(source)!;
    expect(tree.children!.find(n => n.type === 'grpc_defaults')?.data?.target).toBe('localhost:50051');
    expect(tree.unknownData?.grpc_defaults).toBeUndefined();
    const scenario = tree.children!.find(n => n.type === 'scenarios')!.children![0];
    const requests = scenario.children!.find(n => n.type === 'steps')!.children!;
    expect(requests.map(n => n.type)).toEqual(['grpc', 'grpc']);
    expect(requests[0].name).toBe('Login');
    expect(requests[1].name).toBe('/practice.reservations.v1.Reservations/Reserve');
    expect(load(treeToYAML(tree))).toEqual(load(source));
  });
  it('collects enabled RPCs for debugging and associates events by step path', () => {
    const tree = parseYAMLToTree(source)!;
    const requests = collectRequests(tree);
    expect(requests).toHaveLength(1);
    expect(
      matchDebugEventTarget(
        {
          method: 'GRPC',
          name: 'Login',
          path: 'localhost:50051/practice.reservations.v1.Reservations/Login',
          step_path: 'scenarios[0].steps[0]',
        },
        requests,
      )?.id,
    ).toBe(requests[0].id);
  });
  it('allows gRPC requests inside the scenario steps container', () => {
    expect(canContain('steps', 'grpc')).toBe(true);
  });
});
