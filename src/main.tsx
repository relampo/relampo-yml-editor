/// <reference types="vite/client" />

import { initializeEmbeddedTheme } from './utils/studioTheme';
import './monacoSetup';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/globals.css';
import { loadRuntimeConfig } from './utils/runtimeConfig';
import { initializeStudioSession } from './utils/studioAuth';

async function bootstrap() {
  initializeEmbeddedTheme();
  initializeStudioSession();
  await loadRuntimeConfig();

  createRoot(document.getElementById('root')!).render(<App />);
}

void bootstrap();
