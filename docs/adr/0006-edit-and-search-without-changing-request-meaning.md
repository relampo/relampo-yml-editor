# 0006. Edit and search without changing request meaning

## Context

The Tree displays projections of request data. A request with a relative URL can inherit its host. A URL string cannot represent every intermediate state of its query editor.

## Decision

- Keep the primary host in `http_defaults.base_url`. Derive secondary hosts from absolute request URLs in first-use order. Ignore response and embedded-resource hosts. Show host badges separately from compact method and path labels. Present all hosts as editable authorities. Keep or reattach the scheme when saving.
- Renaming a host rewrites all matching authorities and preserves paths and queries. Choosing the inherited host makes a request relative again. Removing a secondary host retargets its requests to the existing primary and requires a primary host to be present.
- Preserve template braces and existing URL escaping when splitting or rejoining editable URL parts. Treat both raw and encoded text as search candidates. Escape literal regex characters and account for percent-encoded punctuation. Keep placeholders verbatim through query encoding so the runtime can interpolate them.
- Keep local row IDs and incomplete field values while users type. A URL echoed by the parent is an acknowledgement. Rebuilding rows from it can unmount the focused input and discard a blank key. Release the acknowledgement after one echo. Rebuild on an external edit or a different request. Use local synthetic row keys that also work in an insecure LAN browser context.
- Prefer a details pane's explicit search over the inherited Tree search. Header search uses body search until it has its own text. Use one traversal to build search state and keep search occurrences in replacement order. Keep field names and generated labels read-only. Count the value that will be serialized once and keep recorded responses out of replacement. Reserved request fields hold special meaning only at the request boundary.
- Translate the Go/RE2 flags and POSIX character classes used by Relampo into JavaScript regex syntax. Reject a pattern that is empty after flag translation. Use group indices for exact matching so a repeated value earlier in the text does not change the highlight. Show captures when a pattern has them.
- Keep structural labels localized for display and preserve names chosen by the user. Display request numbers in document order independently of selection, filtering, runtime ID, or enabled state. Keep a single Load placeholder per scenario and add standalone assertions after existing steps because they use a prior response.

## Consequences

Edits keep the target and the template semantics the author chose. Search results show the values users can actually change and do not rewrite a recorded response.
