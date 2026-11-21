# 0004. Use stable redirect chain identity

## Context

A recording can contain redirect hops and a final response. A run can rewrite query values, produce a different landing URL, or stop before a recorded redirect. HTTP status and URL equality alone cannot match these results to Tree nodes.

## Decision

- Use chain metadata and position to match recorded children, including a final 2xx response. The engine can reuse the parent's request ID for every hop. Use the matched child's Tree number. Keep fallbacks for partial runtime metadata, including step paths and a compatible parent ID with position. Leave the Tree unselected when the evidence cannot identify a child.
- For older recordings, resolve a relative Location against the source request URL and match nearby requests. Correlation can replace a literal with a placeholder. In that case match one URL value within its existing delimiters and keep the recorded response intact.
- Keep detected links across a Tree restructure when the source still redirects to the target. Retain the last committed result while parsing has no Tree. Refresh the relationship after a status, Location, or target change.
- Count executed follow-ups, including the final landing. The parent's first event, standalone 302s, and 304s are outside that count. Display recorded children skipped by a chain that did run as read-only placeholders after its last event. Group by chain and virtual user so one user's events cannot fill another user's gap.
- Group live Run results by stable step path. For a redirect with no recorded child, show the executed method and URL. Landing URLs can differ by iteration and still belong to the same hop. In Debug, the displayed executed request comes from the event. The redirect history is separate from the response's own status.
- Keep `redirect_automatically` and `follow_redirects` mutually exclusive. For older YAML with both flags set, keep `redirect_automatically`. Preserve explicit per-request overrides, including `follow_redirects: false` when the HTTP default is `true`. Disabling a recorded follow-up enables `follow_redirects` on its source. Re-enabling the explicit step restores the recorded behavior. Apply that rule to all affected children of a toggled controller.

## Consequences

Tree badges, Debug counts, and Run results can agree even when runtime URLs change. Older payloads keep useful context without guessing a match from an unrelated request.

The current cache can also keep an inferred link after its source is deleted. [RLP-840](https://sqaadvisory.atlassian.net/browse/RLP-840) tracks that case.
