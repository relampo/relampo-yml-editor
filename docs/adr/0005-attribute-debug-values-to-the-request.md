# 0005. Attribute Debug values to the request

## Context

A Debug event can carry variables accumulated across the run. The selected request's inputs and outputs are a narrower set. Native protocols can report an aggregate of several messages.

## Decision

- Keep the Debug timeline at request level. Pacing, embedded traffic, and general engine messages belong outside request counts. Attach error policy and skip information to the relevant request. Consume matching Spark Before and After messages once, because the engine emits them before the request and can execute the same step again.
- In the Variables tab, include named references, local data source bindings, and extractors for the selected request. Include modeled header and body children. Stop at nested request boundaries. Show extractors first and deduplicate names. Mark use as REQ and extraction as RES. A name that does both gets both tags.
- Keep built-in invocations in their own tab. A variable reference inside an invocation still belongs in Variables. An explicitly declared variable name takes priority. Keep ambiguous reverse matches unresolved. A malformed URL provides no reliable attribution.
- Prefer exact values sent or captured during execution. Avoid re-evaluating built-ins and using current YAML to fill gaps in recorded evidence. Complete placeholders can map directly to values. Decode JSON and URL-encoded fields where the payload supports it. Native captures come from the runtime because it knows the message or row that produced them.
- Treat an unmatched event as having no request-scoped variables. Keep request input values when merging results from redirect extractors and keep the latest or closest real capture, depending on traversal direction. A missing capture cannot erase a value found elsewhere in the chain.
- Share response regex translation between extractor preview and search. Keep dot-all matching for extractor previews over a whole response body. Respect the runtime's existing event field casing, including capitalized assertion result fields.

## Consequences

The inspector can explain a request without showing unrelated data source values or inventing values that the runtime did not report.

Connection failures show Studio startup guidance. Keep HTTP errors and explicit aborts distinct so a user can see what happened.
