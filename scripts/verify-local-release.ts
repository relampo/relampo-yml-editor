import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

type EvidenceStep = {
  command: string;
  cwd: string;
  status: 'passed' | 'failed';
  exitCode: number;
};

const editorDir = path.resolve(import.meta.dir, '..');
const backendDir = process.env.RELAMPO_BACKEND_DIR
  ? path.resolve(process.env.RELAMPO_BACKEND_DIR)
  : path.resolve(editorDir, '..', 'relampo-backend');
const backendE2EDir = path.join(backendDir, 'e2e');
const embeddedEditorDir = path.join(backendDir, 'internal', 'studio', 'assets', 'dist');
const evidencePath = path.join(editorDir, 'output', 'local-release-evidence.json');
const evidence: EvidenceStep[] = [];

async function run(command: string[], cwd: string) {
  const printable = command.join(' ');
  console.log(`\n[local-release] ${printable}`);
  const process = Bun.spawn(command, {
    cwd,
    env: { ...globalThis.process.env },
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit',
  });
  const exitCode = await process.exited;
  evidence.push({ command: printable, cwd, status: exitCode === 0 ? 'passed' : 'failed', exitCode });
  await persistEvidence();
  if (exitCode !== 0) throw new Error(`${printable} failed with exit code ${exitCode}`);
}

async function persistEvidence() {
  await mkdir(path.dirname(evidencePath), { recursive: true });
  await writeFile(
    evidencePath,
    `${JSON.stringify({ generatedAt: new Date().toISOString(), steps: evidence }, null, 2)}\n`,
  );
}

await run(['bun', 'run', 'typecheck'], editorDir);
await run(['bun', 'run', 'lint'], editorDir);
await run(['bun', 'run', 'test'], editorDir);
await run(['bun', 'run', 'build'], editorDir);
await run(['bun', 'run', 'test:browser'], editorDir);
await run(['mkdir', '-p', embeddedEditorDir], editorDir);
await run(['cp', '-R', `${path.join(editorDir, 'build')}/.`, `${embeddedEditorDir}/`], editorDir);
await run(['bun', 'run', 'test'], backendE2EDir);

console.log(`\n[local-release] All gates passed. Evidence: ${evidencePath}`);
