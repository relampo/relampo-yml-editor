# 0003. Keep document edits and execution in sync

## Context

Tree parsing, text serialization, draft writes, and Studio execution start asynchronously. A user can keep editing, switch tabs, replace the document, or stop a session while these operations are pending.

## Decision

- Mark the Tree outdated while code edits wait for parsing. Parse off the main thread where the worker is available. Keep the worker alive across normal edits and use the current callbacks when it replies. Treat the initial Studio probe and draft restore as one initialization. The script passed by the CLI wins over a browser draft.
- Validate an import before replacing the document. Commit Tree changes and selection together. Capture the current YAML immediately when saving or starting Debug or Run. Debounce updates to the other view only.
- Keep one active draft per Studio tab. Serialize draft writes and invalidate them when a document is discarded. A late write cannot restore discarded content. Export keeps a reloadable draft when it cancels a queued autosave.
- Leave Debug and Run mounted across tab switches. Tie each run to the YAML snapshot and Tree used at launch. Store the run ID and a fingerprint of the document in session storage. After reload, reattach only after initialization and when the document still matches. Clear obsolete sessions quietly. The runtime keeps its run data and replays it over server-sent events (SSE).
- Treat a document replacement as a new execution context. Invalidate pending starts and close the old stream. Debug Stop also closes the stream and ignores a late start response. Load Run Stop sends a cancellation request. If the start is pending, send it after the run ID arrives. Keep the load stream open for the partial summary.
- Give Debug an explicit small worker count and let a load run use the authored load. Keep a recent window for sparklines and logs. Use cumulative runtime metrics for totals. Deduplicate replayed sequence IDs and fall back to final summary rows when an older runtime omits live request totals.
- Allow brief SSE reconnects before showing a connection error. Use the runtime's time units. Metric samples have Unix seconds and latency in milliseconds. Log timestamps use Unix milliseconds and the final duration uses nanoseconds.
- Use runtime capability flags to show Studio-only views. The standalone build uses its defaults when the runtime configuration endpoint is absent. Browser file inputs supply bytes, so stage selected files in the Studio session before passing paths to CLI operations. Keep provider data scoped to its account and release closed correlation sessions.

## Consequences

Autosave and execution use the right revision during rapid edits. Runtime results remain tied to their document and survive ordinary view changes and brief connection drops.
