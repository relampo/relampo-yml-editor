# Component configuration

The editor supports component configuration version 1 with backend contract 1.0.11.
The backend must advertise each required feature before the editor enables its controls or starts Run or Debug.

Use **Adopt version 1** in the test details to add `component_configuration_version: 1` at script root.
This explicitly activates request-level `auth`. Without this marker, legacy request auth remains ignored and receives a warning.
Adoption keeps existing datasource and timer steps in their current positions.

Write inherited configuration in `defaults` at script, scenario, or stable container scope.
Supported containers are group, controller, transaction, one_time, parallel, balanced, if, loop, and retry.
Use `defaults.data_source` and `defaults.think_time` for common configuration.
Use `defaults.http` and `defaults.sql` for protocol configuration.
SQL connection, query, params, write authorization, and timeout remain local.

The details panel shows the authored value, effective value, and origin.
Displaying an inherited value does not add it to YAML.
Select **Inherit** to remove that local declaration, or **Local** to write a value.
Structured values use JSON in the details panel. Invalid JSON does not replace the saved declaration.

| Setting                                            | Explicit disable       |
| -------------------------------------------------- | ---------------------- |
| Auth                                               | `{ "type": "none" }`   |
| Assertions                                         | `[]`                   |
| Scoped datasource or timer                         | `{ "enabled": false }` |
| Cookies, cache, redirect flags, embedded resources | `false`                |

Headers merge by name without case. Empty header values remain explicit.
Assertion lists replace inherited lists. Error policies inherit each authored key.
Error policies offer Inherit and Local. `enabled: false` ignores that policy block and retains inherited policy.
SQL assertions use rows_returned for query, rows_affected for exec, and duration in milliseconds.
Values support equality or min/max bounds, including existing numeric interpolation.

New defaults are unavailable on experimental protocol nodes.
HTTP children inside WebRTC can inherit settings from supported ancestors.
Unknown fields remain in saved YAML and receive warnings. Known illegal scopes stop Run and Debug.
Disabled branches still require structural validity and advertised features.
File preparation and actual worker capability checks remain backend responsibilities.

Validation commands use Bun:

```sh
bun run validate
bun run test:browser -- browser-tests/component-configuration.local.spec.ts browser-tests/editor.local.spec.ts
```
