# 0009. Keep editor controls and test state stable

## Context

The same controls can render for different nodes. Browser widgets also have restrictions that differ from the unit test environment.

## Decision

- Keep the narrow-viewport dialog modal until the viewport is wide enough. Escape cannot dismiss it. Keep the pointer context menu on hybrid devices with a fine pointer. Clamp it for short viewports. Suppress it only for touch-only input.
- Open a popup during the user gesture and navigate after the project is persisted. Keep menus that open a modal non-modal so closing the menu cannot restore a stale pointer lock over the dialog. Read the active drag node from shared state during dragover when the browser restricts transfer data.
- Buffer field edits that need to survive typing. Sync a reused field to its new owner during render so users never see the previous node's value. Use one sync for Monaco decorations and reveal. Reopen a collapsed section when search first activates and let users close it again.
- Keep selection controlled by the editor. Filtered Tree selection can change after search, paste, a parent Tree update, or an update in a second view. Reconcile after any of these origins and clear a dead Tree search when its view remounts.
- Keep long variable names readable in their own cells. Give each destructive host button its own accessible name. Use row descriptions for issue status so badges do not alter names. Focus the original field for a search result. Number inputs do not support text selection ranges.
- Stub browser layout and download APIs where the test DOM does not provide them. Test actual UI behavior where layout, focus, or browser API timing matters. Prefer clear filter and map steps for small query parameter lists.

## Consequences

Edits, selections, and focus remain predictable when users switch nodes or views. The browser-specific cases have distinct coverage.

The Spark browser test uses a real Studio server and the two-request fixture in `browser-tests/fixtures/spark-logs.yaml`. Set `RELAMPO_STUDIO_URL` to that server's session URL. The test checks the engine's event order. The local multi-tab browser test waits for the independent IndexedDB draft before reloading. The agent-driven E2E runner uses ChatGPT OAuth through `e2e login openai`.
