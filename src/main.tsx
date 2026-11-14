/// <reference types="vite/client" />

import { initializeEmbeddedTheme } from './utils/studioTheme';
import './monacoSetup';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/globals.css';
import { initializeAgentHost } from './utils/agentHost';
import { loadRuntimeConfig } from './utils/runtimeConfig';
import { initializeStudioSession } from './utils/studioAuth';

async function bootstrap() {
  initializeEmbeddedTheme();
  initializeStudioSession();
  // Before the first render: the web app answers `relampo:ready` with the machine state.
  initializeAgentHost();
  await loadRuntimeConfig();

  createRoot(document.getElementById('root')!).render(<App />);
}

void bootstrap();
