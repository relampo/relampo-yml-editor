import React from 'react';
import { createRoot } from 'react-dom/client';
import { GRPCWorkbench } from '../../src/components/grpc/GRPCWorkbench';
import '../../src/styles/globals.css';
createRoot(document.getElementById('root')!).render(
  <GRPCWorkbench
    open
    presentation="page"
    initialMode="record"
    browserRecordingEnabled
    onOpenChange={() => {}}
    onAdd={yaml => {
      document.getElementById('imported')!.textContent = yaml;
    }}
  />,
);
