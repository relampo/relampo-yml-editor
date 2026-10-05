import type { E2EConfig } from 'e2e';
import { web } from '@e2e-dev/web';

export default {
  tests: 'tests/data-source-uploads.e2e.ts',
  workers: 1,
  retries: 0,
  targets: [{
    name: 'studio-uploads',
    engine: web({ viewport: { width: 1440, height: 1000 } }),
    app: {
      url: 'http://127.0.0.1:0',
      command: {
        executable: 'bun',
        args: ['tests/helpers/studio-upload-server.ts', '{port}'],
        env: { RELAMPO_BIN: process.env.RELAMPO_BIN ?? 'relampo' },
        log: '.e2e/logs/studio-uploads.log',
        startupTimeout: 30_000,
      },
    },
  }],
} satisfies E2EConfig;
