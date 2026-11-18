import React from 'react';
import { createRoot } from 'react-dom/client';
import { GRPCNativeRecorder } from '../../src/components/grpc/GRPCNativeRecorder';
import '../../src/styles/globals.css';
createRoot(document.getElementById('root')!).render(
  <GRPCNativeRecorder
    recording={{
      active: false,
      pending: true,
      calls: [
        {
          id: 0,
          method: '/orders.Order/Watch',
          type: 'server_streaming',
          status: 'OK',
          messages: 2,
          durationMs: 20,
          truncated: false,
        },
      ],
    }}
    listen="127.0.0.1:50052"
    onListenChange={() => {}}
    onStart={() => {}}
    onStop={() => {}}
    canStart={false}
    busy={false}
  />,
);
