# RLP-767 segment continuity

Stack base: RLP-766 editor PR #210 at
`145c54f1d187f99b8b0d6bb03bc54945af48fc8e`, branch
`RLP-766-segment-transitions`. Companion backend base: PR #396 at
`8f086cd88ac07af91736d4dc90be53b4aba3497b`. Review 765 → 766 → 767.

VU transitions are validated using the previous configured VU Target or
RPS VUs Max: increasing Target requires Ramp up, decreasing Target requires
Ramp down, equal Target requires Constant. Changes to Target, Max, type or
the segment list trigger revalidation. Invalid imported values remain visible
until corrected. RLP-766 first-segment restrictions are preserved.

The preview shows VU capacity, shaded RPS Min/Max bands and a separate RPS
scale. Each RPS segment has its own dashed constant Target line, limited to
its exact Duration. VU ramps start at the configured predecessor reference.
Fractional total durations are displayed without rounding to whole seconds.
A numbered legend identifies each segment and its interval. This is a
configuration preview; live RPS VUs remain adaptive within their own bounds.

Immutable contract 1.0.9 is synced from backend v9 with verified fixture and
manifest checksums. Existing bundles and bun.lock are unchanged.

Validation: official Bun 1.3.10 verified against SHASUMS256.txt and archive
SHA256 `f57bc0187e39623de716ba3a389fda5486b2d7be7131a980ba54dc7b733d2e08`;
frozen-lockfile installation; final `bun run validate` passed typecheck,
lint (0 errors, 11 existing warnings), 810 tests across 69 files and build.
Four local Chromium segment tests passed, including the three existing
765/766 cases. The new browser case revalidates all three VU directions after
RPS, checks changes to the preceding Max, verifies three independently bounded
RPS lines and exports the resulting 1.125-second configuration. Unit tests
also check that changing VU bounds leaves the RPS objective unchanged.
The new reproducer failed on RLP-766 (18 failures, 8 passes), then passed.

The first product edit followed a direct read of both RLP-767 and RLP-753
at 2026-10-03 08:28:49 UTC. Issue 15275 was created
2026-10-02T18:14:50.329Z, after the 17:56:44Z cutoff, assigned to
`712020:c728c305-76d1-42e8-bcb7-ab783efee8ac`, status `10038`, generation
`history:29902:10038`. First product edit started at 08:30:39 UTC and was
confirmed at 08:30:43 UTC. Runkey: `RLP-767:9b2f2916816eb9826626`;
effect: `implement-767-stack-20261003T0818Z`.

The story mockup attachment 14575 returned HTTP 403. Complete textual criteria
were read; no alternative authentication was attempted. Backend-integrated
browser smoke and unrelated browser tests were not run. The previously
reported search/replace mismatch was not changed or revalidated. Remote
Codex Review is not established by local checks. No merge, deployment, Jira
writes or RLP-768 reordering work was performed.
