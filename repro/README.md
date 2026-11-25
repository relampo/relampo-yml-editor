# Same-test comparison: stable vs current editor

Date: 2026-11-25. Branch: `NOJIRA-compare-latest-comma`.

| Frontend | Runtime control | Untouched YAML | After editing query fields |
| --- | --- | --- | --- |
| Official embedded v0.3.114, `f53a7f6` | Official CLI 2.11.0 Studio API | All 3 literal-comma URLs preserved | All 3 converted commas to `%2C`; flag queries also gain `=` |
| Current develop `7c9128d4e9f233c803f924f0c3086623c735fc35` | Same official CLI 2.11.0 Studio API | All 3 literal-comma URLs preserved | Same mutation for all 3 URLs |

The same local target, YAML, clicks and final parameter values are used in both runs. Only the browser frontend is changed. Current develop is built from its exact checkout; Playwright serves its built static files over the official Studio origin, leaving `/api/` requests routed to the unchanged official binary. This is a controlled frontend comparison, not a complete test of the latest relay-agent deployment.

Run on macOS with Chrome. No Windows execution was performed. Local target deliberately returns 403 for `%2C` and 200 for literal commas; the proven defect is URL mutation, not an independently verified rejection by the customer's GeneXus application.

## Repeat

```sh
bun install --frozen-lockfile
bun run build
RELAMPO_EDITOR_BUILD="$PWD/build" RELAMPO_EDITOR_LABEL=develop-7c9128d node repro/genexus-comma.cjs /absolute/path/to/relampo-2.11.0
```

Evidence includes the raw target RequestURI, submitted Debug YAML and before/after screenshots. The test intentionally characterizes the existing defect; it does not fix it.

## Published channels checked

GitHub's latest stable CLI release remains `v2.11.0`. The public develop download pointer reports `develop-2026.11.21.6`. That archive was downloaded separately and its version verified; it has no `studio` command and was not substituted into the controlled standalone test. The user's installed `develop-2026.11.21.2` was not changed or restarted.

## Baseline conclusion

The PR #447 runtime correction does not fix this UI path. `QueryParamsEditor` still rebuilds the entire query through `buildRequestUrlWithQuery`, applying `encodeURIComponent` to literal commas and introducing equals signs to flags. The current editor still exhibits the defect. This describes the unpatched baseline; the local correction below has not been published.


## Local correction and Debug/Run verification

`QueryParamsEditor` now retains each original raw query segment. Editing one field preserves the original spelling of all unchanged fields, commas, semicolons, duplicated keys, flag parameters without `=`, percent escapes, spaces and fragments. Restoring an edited value restores its original serialization. New fields still use normal component encoding. No global decoding of `%2C` and no runtime/PR #447 changes were introduced.

The real browser parity harness exercises both `/api/debug/runs` and `/api/run` against current backend develop `3738f9fc`, with test-scoped entitlements. It uses the actual engine and a synthetic local target; it does not activate or replace the user's installed agent.

| Input | Before: Debug / Run | After: Debug / Run |
| --- | --- | --- |
| Original script | 3/3 raw-comma requests, 200 / 200 | 3/3 raw-comma requests, 200 / 200 |
| Query fields edited and restored | 3/3 encoded-comma requests, synthetic 403 / 403 | 3/3 raw-comma requests, 200 / 200 |

Twelve target requests per browser run were checked, with exact raw RequestURI and submitted YAML in `parity-before/evidence.json` and `parity-after/evidence.json`. Debug and Run submitted identical YAML. After the fix, editing and restoring also produces the exact original YAML.

This proves a shared editor serialization defect. It does not establish why the customer observed only Debug failing, nor reproduce their remote authentication or Windows environment. Tests ran in Chrome on macOS.

Repeat against the opt-in backend fixture on branch `NOJIRA-studio-query-fidelity`:

```sh
# In backend checkout:
go test -c ./internal/studio -o /private/tmp/studio-query-fixture.test
# In this editor checkout:
bun run build
node repro/debug-run-parity.cjs /private/tmp/studio-query-fixture.test "$PWD/build" fixed
```

The fixture is skipped in normal Go tests. Browser artifacts are written to a new temporary directory. The script starts and closes only its own target, test API and headless browser.


## Validation of local correction

- Editor `bun run validate`: passed typecheck, lint, all 1,671 tests in 175 files, and build. Existing lint/build warnings remain.
- Browser parity: passed 12 raw target requests after the fix; baseline reproduction also checked 12.
- Backend `go fix ./...` and `go fmt ./...` executed; unrelated automatic cleanup in `internal/licensing/ci.go` was excluded from this change.
- Backend `go vet ./...` and `go build ./...`: passed. The opt-in fixture compiles; normal invocation skips it; browser invocation exercises real handlers and engine.
- Full backend `go test ./...` was attempted but is not green: the CLI test process was interrupted after 158 seconds to collect its stack; quality publisher tests fail because this Mac lacks `sha256sum`. The Studio and runtime packages passed in that run. This is not a claim that the full backend suite passes.

Both correction and fixture are local checkpoint commits only. No PR, push, deploy, CLI installation or user agent restart was performed.
