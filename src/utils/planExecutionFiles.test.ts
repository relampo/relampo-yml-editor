import { afterEach, expect, it, vi } from 'vitest';
import { startDebugRun } from './debugApi';
import { startLoadRun } from './runApi';
const project = vi.hoisted(() => vi.fn());
const request = vi.hoisted(() => vi.fn());
vi.mock('./executionProject', () => ({ requestExecutionProject: project }));
vi.mock('./agentTransport', async importOriginal => ({
  ...(await importOriginal<typeof import('./agentTransport')>()),
  agentRequest: request,
}));
afterEach(() => {
  vi.clearAllMocks();
});
for (const mode of ['debug', 'run'] as const) {
  it(`${mode} sends the selected CSV bytes with the current plan snapshot`, async () => {
    const workspace = {
      scriptPath: 'Scripts/flow.yaml',
      files: [{ path: 'Data/usuarios_prueba.csv', data: btoa('user\nselected-file\n') }],
    };
    project.mockResolvedValue(workspace);
    request.mockResolvedValue(Response.json({ id: 'run-files' }, { status: 201 }));
    const yaml = 'data_source: {type: csv, file: Data/usuarios_prueba.csv}';
    await (mode === 'debug' ? startDebugRun(yaml) : startLoadRun(yaml));
    expect(JSON.parse(request.mock.calls[0][1].body)).toMatchObject({ yaml, workspace });
  });
  it(`${mode} does not launch without the requested plan files`, async () => {
    project.mockRejectedValue(Error('Cannot read Test Plan files'));
    await expect(mode === 'debug' ? startDebugRun('test: {}') : startLoadRun('test: {}')).rejects.toThrow(
      'Cannot read Test Plan files',
    );
    expect(request).not.toHaveBeenCalled();
  });
}
