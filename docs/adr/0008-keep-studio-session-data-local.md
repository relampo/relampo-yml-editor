# 0008. Keep Studio session data local

## Context

Studio runs a local API that can execute the user's document. It also opens editor, recorder, and report tabs with different access and persistence needs.

## Decision

- Read the per-process Studio token from the launch URL at startup. Store it in memory and remove it from the address bar. Send it in a header for fetch calls. SSE and report tabs use the query parameter because those browser entry points cannot set the header. Without a token, standalone requests stay unchanged.
- Keep test server tokens in the proxy process so they stay out of browser test artifacts.
- Open a fresh Studio document in its own tab with its own draft identity. Recorder navigation can reuse a named tab and uses the trusted local route. Clipboard exchange between same-origin tabs is ephemeral. A browser that blocks that exchange can still copy within the current tab.
- Send only fixed analytics event names and limited labels. When the user opts out, turn off logging before provider shutdown so pending events get discarded. Keep consent off in memory even if storage is unavailable.

## Consequences

Documents and execution sessions keep their own lifecycle. Browser storage failures do not widen analytics collection or make same-tab copying unavailable.
