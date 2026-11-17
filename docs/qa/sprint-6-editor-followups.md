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

- RLP-823: replace the loaded YAML after Debug and Run; inspect reset and late events.
- RLP-809: verify Segment Load Pattern in execution results, including cumulative time and transitions.
- RLP-819: verify resolved variable names and values from captured requests, without re-evaluating built-ins.
- RLP-689: architecture investigation; do not implement unapproved inheritance rules.

The exported report selector (RLP-817) and report redesign (RLP-800) belong to the
backend. Queued items are not claimed resolved by this PR.

## Validation outcome

Typecheck and lint pass (15 pre-existing size warnings); all 151 test files /
1506 tests passed on the second full run. The first concurrent run had two
failures in existing load/distributed tests; both passed when rerun individually.
`bun run build` and the Chrome smoke pass. No deployment was performed.
