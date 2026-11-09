# QA-first WebSocket authoring

Branch: `NOJIRA-websocket-qa-first`. Runtime counterpart: the same branch in relampo-backend.

Create a WebSocket from the scenario's Add menu, or import existing recording YAML. Use the conversation timeline to edit client messages, wait for a JSON field or text condition, select a field to save as a variable, and add checks. Recorded responses are examples, not automatically generated assertions. Invalid JSON drafts are not written to the document.

Choose **Keep connection across scenario steps** to split a recording into connect/send/receive/close nodes. Move HTTP requests between those steps to exercise a single business flow. Named connections are isolated per VU. The connection-mode selector also supports wait, protocol ping and explicit reconnect. Reconnect configuration belongs to the connect step; application subscription recovery remains visible as scenario steps.

The WebSocket identity is `PlugZap` with a violet accent. Client sends align left; server receives align right. Keyboard focus uses a violet ring. Debug results show protocol operation/status, connection time, session duration, correlated response time, wire messages/bytes, timeouts and buffer overflows. Results distinguish these metrics from ordinary operation latency.

Use request IDs in matching conditions when several events can interleave. Give send and receive the same tracking name only when they refer to the same response. Variables and ordinary JSON fields do not require code. Advanced text/JSON/base64 remains available.

Validation: TypeScript, targeted lint, Vitest suite, production build, and a Chrome import/edit/export/split test. See `browser-tests/websocket.local.spec.ts`. Backend documentation in `docs/WEBSOCKET_QA_FIRST.md` contains YAML semantics, defaults, limits, test evidence and remaining POC limitations. The backend example `scenarios/websocket-auction-observer.yaml` was exercised against Ubuntu with TLS certificate verification enabled and no bids.
