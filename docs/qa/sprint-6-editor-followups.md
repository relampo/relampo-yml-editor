# Sprint 6: editor QA follow-ups

Base: develop, d99498a. Changes remain isolated from the existing local checkouts.

## RLP-822 — reproduced, corrected

Before changing product code, the add-menu regression inserted Cache Manager into
an editable scenario and inspected its unknown fields. It failed with `["enabled"]`.
The factory and form offered `enabled`, but the current backend CacheManager
contract only supports clear_each_iteration and max_elements.

New Cache Managers no longer emit the unsupported field. The details form and
context menu no longer offer an enable/disable action which the runtime ignores.
Existing imported unknown fields remain preserved and reported; the fix does not
silence forward-compatibility warnings.

Verified behavior:

- Add Cache Manager, serialize and reopen without unknown fields.
- Edit max_elements without introducing enabled.
- Chrome: add from the scenario context menu, edit to 250, save YAML and inspect
  the actual downloaded file; no false warning or unsupported toggle.
- 36 focused tests pass across add-menu, OpsDetails, unknown fields and context menu.

Commands:

- `bun run test src/components/yaml-tree-view/addableItems.test.tsx src/components/yaml-node-details/OpsDetails.test.tsx src/utils/unknownYamlFields.test.ts src/components/YAMLContextMenu.test.tsx`
- `bun run test:browser browser-tests/cache-manager.local.spec.ts`
- `bun run validate`

## Queue: reproduce before changing code

- RLP-809: verify Segment Load Pattern in execution results, including cumulative time and transitions.
- RLP-689: architecture investigation; do not implement unapproved inheritance rules.

The exported report selector (RLP-817) and report redesign (RLP-800) belong to the
backend. Queued items are not claimed resolved by this PR.

## Validation outcome

Typecheck and lint pass (15 pre-existing size warnings); all 151 test files /
1506 tests passed on the second full run. The first concurrent run had two
failures in existing load/distributed tests; both passed when rerun individually.
`bun run build` and the Chrome smoke pass. No deployment was performed.

## RLP-823 — reproduced, corrected

Before changing product code, Chrome loaded a first YAML, displayed a completed
Debug or Run session, switched tabs (preserving that session), then imported a
second YAML. Both tests failed: old Debug request details and the old Run table
remained visible. Separate deferred-start tests also failed: resolving a start
request after unmount still stored and subscribed to the discarded document.

A document replacement now clears scoped stored Debug/Run IDs and remounts the
execution/details sessions using a document generation key. This happens on valid
file import, New confirmation, and controller/correlation replacement. Ordinary
edits and tab changes retain their existing session. Invalid YAML imports retain
the current document and its results. Unmount invalidates pending start tokens
and disconnects the previous event stream without stopping a server-side run.

Regression commands:

- `bun run test src/components/YAMLDebugView.test.tsx src/components/YAMLRunView.test.tsx -t RLP-823`
- `bun run test:browser browser-tests/document-execution-reset.local.spec.ts`

Both deferred-start tests and both Chrome flows pass. Browser execution responses
are deterministic local API fixtures; these tests verify UI lifecycle, not engine
execution. No backend or Jira changes, no push and no new PR for this checkpoint.

Final RLP-823 validation: `bun run validate` passes typecheck, lint (existing size
warnings only), all 151 files / 1508 tests, and build. The combined Chrome run
passes all three flows (RLP-822 plus Debug and Run document replacement).

## RLP-819 — reproduced, corrected

The current branch still labeled an inline built-in by its expression
(`_randomInt(1,10)`) instead of the request field (`password`). Changing that
field to a direct value removed it from Variables. Three new regression cases
failed before the fix, reproducing both QA screenshots and direct JSON scalars.

Variables now labels inline built-in and captured literal body values by their
request field name. Explicit variable references keep their declared names.
The value comes from the captured request, never from another built-in evaluation
or a literal in the currently edited YAML. Missing captured literal fields are
not fabricated. Zero, false, empty strings and repeated form fields are retained.
The Built-ins tab continues to show the original invocation and its result.
Existing expectations that required the expression as the Variables row label
were updated to the corrected RLP-819 behavior.

Validation:

- Focused debug mapping/inspector suite: 97 tests pass.
- Chrome: both inline built-in and direct-value form requests show password
  with the captured value, retain the user variable, and keep the Built-ins trace.
  Events are deterministic local API fixtures; this verifies the UI, not a fresh
  engine execution. Screenshots saved in output/playwright/results.
- `bun run validate`: typecheck, lint (15 existing warnings), all 151 files /
  1511 tests, and build pass. Existing bundle-size warning remains.

No backend changes, push, PR, deployment or Jira transition.
