import React from 'react';
import { createRoot } from 'react-dom/client';
import { LanguageProvider } from '../../src/contexts/LanguageContext';
import { HTTPRecorderPage } from '../../src/components/recorder/HTTPRecorderPage';
import '../../src/styles/globals.css';

createRoot(document.getElementById('root')!).render(
  <LanguageProvider>
    <HTTPRecorderPage embedded />
  </LanguageProvider>,
);
