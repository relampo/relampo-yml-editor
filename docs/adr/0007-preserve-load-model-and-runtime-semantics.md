# 0007. Preserve load model and runtime semantics

## Context

The load designer previews and validates the authored profile. The runtime decides how to execute it. Some values are inherited, and a long planned duration can end early.

## Decision

- Keep an unselected Load in the Tree when YAML omits it. This gives the author a control and lets the runtime use its default of one user and one iteration. Use the schema spelling `ramp` for the internally named `linear` shape.
- Recompute each segment's previous configured boundary after reorder. Keep the configured values and report any invalid transitions. Live throughput is feedback and does not set the starting value for a later segment. Keep unsupported imported stages visible for validation.
- Include only enabled, executable work in a Balanced Controller's distribution. A disabled container excludes its descendants. Timers, processors, and empty controllers receive no load share. Use largest remainder with the minimum decimal precision needed to give each child a nonzero, nearly equal share. Add authored decimal values exactly before comparing totals.
- Treat duration as an upper bound when a Balanced Controller can finish after its iteration budget. Show that early finish is possible in the planned profile. A manual-stop load has no finite limit. Omit the cleared duration and iteration fields and apply this rule only to load models that support manual stop. A configured zero iteration count means unlimited.
- Use the Go duration syntax for HTTP timeouts and inherited timers. Display configured capacity in the distributed Run UI. The CLI independently verifies the execution entitlement during preflight and before worker dispatch.

## Consequences

The preview explains expected runtime behavior without rewriting imported values. Validation can block an unsupported or inconsistent test plan while keeping it editable.
