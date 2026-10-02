import { test } from '@e2e-dev/web';
import { expect } from 'e2e';

test(
  'ChatGPT authentication supports a live AI assertion',
  {
    tags: ['local', 'ai', 'chatgpt-auth'],
    agent: 'default',
    retries: 0,
    skip: Boolean(process.env.CI && !['0', 'false'].includes(process.env.CI)),
  },
  async ({ app, screen, agent }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'RELAMPO', { level: 1 })).toBeVisible();
    await agent.assert('The page shows a heading named RELAMPO.');
  },
);
