/// <reference types="vite/client" />

import './monacoSetup';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/globals.css';
import { initializeAnalytics } from './utils/analytics';
import { loadRuntimeConfig } from './utils/runtimeConfig';
import { initializeStudioSession } from './utils/studioAuth';

async function bootstrap() {
  initializeStudioSession();
  await loadRuntimeConfig();
  initializeAnalytics();

  createRoot(document.getElementById('root')!).render(<App />);
}

void bootstrap();
