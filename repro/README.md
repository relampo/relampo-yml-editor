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

## Conclusion

The PR #447 runtime correction does not fix this UI path. `QueryParamsEditor` still rebuilds the entire query through `buildRequestUrlWithQuery`, applying `encodeURIComponent` to literal commas and introducing equals signs to flags. The current editor still exhibits the defect. No product changes or deployments were made.
