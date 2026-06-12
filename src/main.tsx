/// <reference types="vite/client" />

import './monacoSetup';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/globals.css';
import { initializeAnalytics } from './utils/analytics';

initializeAnalytics();

createRoot(document.getElementById('root')!).render(<App />);
