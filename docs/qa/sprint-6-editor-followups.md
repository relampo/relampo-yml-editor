# Sprint 6: editor QA follow-ups

PR base: main, a5d549d. Only RLP-822, RLP-823 and RLP-819 are included.
Original reproduction and validation below were performed on develop, d99498a;
the final main-based validation is recorded at the end of this document.

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

No backend changes, deployment or Jira transition.

## Main-based PR validation — RLP-822, RLP-823, RLP-819

The review branch starts from main rather than develop so it does not include
the unrelated SaaS, relay, gRPC or SQL changes pending between those branches.
Conflict resolution keeps main's document lifecycle and existing component APIs;
only the three QA corrections are applied. The document replacement browser
test uses main's visible result DOM rather than a panel marker added in develop.

All five Chrome flows pass: Cache Manager add/edit/save, Debug and Run document
replacement (including tab retention and invalid imports), and Variables with
inline built-in or direct values. Tests use local API fixtures.

An existing distributed-run test had a timing-sensitive assertion failure in the
first full run; its unchanged file passes in isolation (15 tests). Final full
validation passes: typecheck, lint (15 existing size warnings), all 122 test
files / 1223 tests, and build. No unrelated test behavior was changed to mask
the failure.


## Integration with SaaS QA and gRPC-Web

PR #255 is combined locally with the SaaS QA editor and gRPC-Web #246 on
`NOJIRA-app-dev-editor-integration`. Integration preserves SQL/gRPC defaults
context-menu restrictions, native sampler evidence, SaaS controller replacement,
and the existing local/distributed Run layout and Clear actions.

| Issue | Observable criterion | Verification |
| --- | --- | --- |
| RLP-822 | Cache Manager can be added, edited, saved and reopened without an unsupported enabled field | Add-menu, OpsDetails and context-menu tests; Chrome add/edit/save |
| RLP-823 | Replacing a document clears Debug/Run results; switching views and invalid imports preserve them | Deferred-start tests; Chrome Debug/Run replacement; SaaS controller replacement regression |
| RLP-819 | Variables uses request field names and captured values without evaluating built-ins again | debugRequests/inspector tests; Chrome direct-value and built-in requests |

The additional controller test checks that replacing a script through the SaaS
controller clears current execution IDs while preserving an unrelated plan key.
Browser runs use deterministic API fixtures; they do not trigger real provider
runs or publish anything. No Jira status changes or live-agent restart.

Integration validation: `bun run validate` passed (163 files / 1574 tests,
16 pre-existing lint size warnings, zero lint errors, build passed). Five Chrome
flows passed via `bun run test:browser browser-tests/cache-manager.local.spec.ts
browser-tests/document-execution-reset.local.spec.ts browser-tests/debug-variables.local.spec.ts`.
The SaaS controller regression also passed in the full unit suite. Evidence logs
are saved under `/private/tmp/relampo-integration/editor-255-*`.
