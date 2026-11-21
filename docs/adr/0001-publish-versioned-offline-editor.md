# 0001. Publish a versioned offline editor

## Context

The Relampo CLI serves Studio from an editor bundled into the binary. A release needs a stable artifact that the backend build can fetch and verify.

## Decision

- Build and bundle Monaco locally so Studio can run without a CDN. YAML, SQL, and JavaScript use syntax highlighting. JSON also gets its own language worker. The bundle omits the JavaScript language worker to limit bundle size.
- Use the Git tag as the release boundary. A build-impacting change on main advances the patch version. A manual major or minor tag sets the starting point for the next patch.
- Publish `editor/<tag>/dist.tar.gz` and its SHA-256 file to the releases bucket. The backend fetches the archive for embedding in the CLI. Set a fixed archive timestamp, sort the file list, and run gzip without its usual timestamp and filename so the same build produces the same bytes.
- Put `index.html` at the root of the archive. Vite outputs to `build/`, but the backend extracts the archive straight into `internal/studio/assets/dist`.
- Give the publishing workflow an existing AWS role through GitHub OIDC. The role needs read and write access to the editor objects. The existing Ed25519 KMS key signs the editor catalog. The workflow uses the key for signing and verification.
- Keep React Doctor advisory. Compare pull requests against their merge base using full Git history. Scan pushes to main for a trend. Cancel older runs on the same branch or PR. The job can write comments and statuses, so its third-party actions use fixed commits. At the time of this decision, the checkout pins correspond to v5 for React Doctor and v6.0.3 for the release and validation workflows. The React Doctor action pin corresponds to v2.
- Use `@warp-agent` in a PR or issue comment to request interactive assistance when that workflow is configured. The workflow authenticates with `WARP_API_KEY`. Code changes requested through it can become commits on the PR branch.

## Consequences

The CLI can serve a verified editor offline. Changes to archive paths or signing need coordination with the CLI release pipeline. React Doctor feedback remains separate from the repository validation gate.
