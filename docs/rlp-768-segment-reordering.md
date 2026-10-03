# RLP-768 segment reordering

Stack base: [RLP-767 editor PR #211](https://github.com/relampo/relampo-yml-editor/pull/211),
branch `RLP-767-load-continuity`, head `94884b4ba75a2610a03b6a85f5b2668428b7ca97`.
Backend inspected at [RLP-767 PR #397](https://github.com/relampo/relampo-backend/pull/397),
head `1002b8684e711145a5e5be5c556a05d0a9479dcd`. Both bases were verified
draft/open and unmerged before preparation and again before publication.
Review order: RLP-765 → RLP-766 → RLP-767 → RLP-768. Earlier branches and PRs
remain unchanged. This delivery changes only the editor.

Drag a segment handle onto a row to move it to that position. Up/down buttons
provide keyboard and single-pointer alternatives. Reordering moves the existing
row keys with the segment objects, preserving DOM identity even with duplicate
names. Only a successful local drop publishes the reordered list. Self drops,
cancelled drags and unrelated drops do not alter data. Add/remove cancels pending
drag state. Malformed non-mapping imports cannot be reordered into a filtered
list that discards their entries.

The full ordered list flows through the existing RLP-767 validation, document
update, preview and YAML export. Every predecessor relationship is revalidated;
invalid transitions and targets remain unchanged for manual correction. First
VUs permit Constant or Ramp up from zero and reject Ramp down. Subsequent VUs
use the preceding configured VU Target or RPS Max. RPS keeps its own Target,
Min/Max and Constant transition. The preview relocates its dashed Target over
exactly its Duration, with the new cumulative intervals and VU trajectory.

The total duration is summed deterministically at nanosecond precision. A
reproducer showed that moving unchanged 100ms, 200ms and 300ms durations otherwise
changed the exported total from `0.6000000000000001s` to `0.6s`. Individual
Duration fields are preserved; the regression now passes.

## Validation performed for this delivery

- Official Bun 1.3.10 `bun-linux-x64.zip` verified against release
  `SHASUMS256.txt` and SHA256
  `f57bc0187e39623de716ba3a389fda5486b2d7be7131a980ba54dc7b733d2e08`.
  Installation used `bun install --frozen-lockfile`; bun.lock is unchanged.
- Final `bun run validate`: typecheck, lint (0 errors, 11 existing warnings),
  827 tests across 70 files, and production build passed. The 17 new component
  tests cover first positions, all four VU/RPS combinations, simultaneous errors
  in affected neighbors, duplicate names, stable DOM identity, invalid values,
  repeated/cancelled movements, add/remove, button focus, export and fractional
  duration invariance. The initial 14 feature tests failed on the unchanged base.
- Local system Chromium: 7/7 segment tests passed, including all four 765/766/767
  cases and three new 768 cases. Native drag, Escape cancellation, self drop,
  repeated moves, keyboard movement, initial VUs/RPS rules, affected neighbors,
  exact RPS intervals, exported order and reimport were checked. Page-error
  collectors were empty in the new cases. Form and timeline screenshots were
  inspected. Browser configuration was temporary, outside the repository.
- Go 1.27.0: engine and validator packages passed with `-race -count=1` on the
  unchanged backend base. A temporary Go test overlay outside that repository
  checked all 24 permutations of four mixed segments: valid plans retain YAML
  execution order, exact intervals, configured VU predecessors and independent
  RPS bounds; invalid unchanged transitions are rejected without mutating input.
  The probe was also run verbosely to confirm all 24 cases executed.
- Whitespace checks passed. No backend product gap was found, so no backend
  branch, commit or empty PR was created.

Early browser assertions were corrected to account for the validation banner's
`(+N)` suffix. The new fixture uses a mocked Studio initial script, avoiding a
race between document initialization and an early upload; `studio: true` is
required for that fixture. Those test setup failures are not final failures.

## Jira execution evidence

Direct SQAAdvisory reads of [RLP-768](https://sqaadvisory.atlassian.net/browse/RLP-768)
and [RLP-754](https://sqaadvisory.atlassian.net/browse/RLP-754) completed at
2026-10-03 09:27:52 UTC. Issue ID `15276`, created
`2026-10-02T18:14:52.404Z`, after cutoff `2026-10-02T17:56:44Z`; assignee
`712020:c728c305-76d1-42e8-bcb7-ab783efee8ac`; status `10038`; latest status
history `29904`, generation `history:29904:10038`. Complete current descriptions
and acceptance criteria were read. RLP-754 returned no attachments.

First test edit started at 09:29:41 UTC (109 seconds after the read). First
product source edit started at 09:30:57 UTC (185 seconds after the read).
Runkey `RLP-768:77a8996384d9312fc58a`; invocation
`cloud-stack-768-20261003T0911Z`; effect `implement-768-stack-20261003T0921Z`.
Boot ID `54c08b52-4d11-4576-863a-99622113864b`. User-authorized Git normal
exception applies to the GitButler instructions.

## Limits

Browser tests use a mocked Studio endpoint; backend-integrated browser smoke
and unrelated browser suites were not run. Backend full-suite/vet/build/
staticcheck checks from 767 were not rerun or counted as this delivery's results.
Remote CI/Codex Review is not established by local tests. Historical 767
govulncheck Forbidden and mockup 403 results were not retried or bypassed.
No distributed publishing smoke, merge, deployment, Jira writes or external
messages were performed.
