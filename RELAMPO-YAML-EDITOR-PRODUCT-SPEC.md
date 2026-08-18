# Relampo YAML Editor Product Contract

**Status:** Proposed product contract — implementation in progress  
**Scope:** Standalone Relampo YAML Editor and Relampo Studio integration  
**Language:** English  
**Last reviewed:** 2026-08-18

This document defines the accepted product baseline for the full Relampo YAML
Editor. Most behavior is implemented, while the remaining quality work is under
review in the implementation pull requests listed under **Evidence used**. It is
a product contract, not a roadmap. New behavior requires a separate
implementation decision and an update to this document. The status becomes
**Current** only after the promotion criteria at the end of this document pass.

## Problem Statement

The repository has a YAML format specification and several feature documents.
Those documents do not define the complete editor product contract.

The editor has two representations of one document:

1. YAML is the import, export, and execution format.
2. The tree is the editable representation used by the visual editor.

The product needs one contract for the complete lifecycle:

**YAML input or editor change → tree → canonical YAML → semantic validation.**

Without this contract, parser behavior, visual editing, persistence, Debug,
and Run can make different assumptions about the same document.

The contract must also state current limits. The main limits are one-scenario
authoring in Studio, unsupported `stages`, legacy YAML aliases, and incomplete
Pulse compatibility claims across versions.

## Solution

### Product principles

- The tree is the editable model for visual authoring.
- Canonical YAML is the document exchanged with files and execution services.
- The parser and serializer preserve semantic meaning across round trips.
- Semantic validation is separate from YAML syntax validation.
- Disabled nodes remain visible in the tree but do not execute.
- Debug and Run use the same validated document, with different execution rules.
- Standalone mode stays useful without a Relampo Studio backend.
- Product controls must explain errors before a destructive action or run.

### Document lifecycle

Every document operation follows this lifecycle:

1. A YAML file, initial Studio script, draft, or new document provides input.
2. The YAML parser converts the input into a tree.
3. The editor displays and edits the tree.
4. A tree mutation marks the document dirty and schedules serialization.
5. The serializer produces canonical YAML.
6. The canonical YAML is reparsed when a round-trip or boundary check is needed.
7. Semantic validation reports issues tied to tree nodes.
8. Save, Debug, and Run use the latest serialized document only.

The product must not use stale YAML after a visible tree edit. Pending
serialization must flush before save, download, Debug, Run, or draft replacement.

### YAML document structure

The top-level YAML document uses the following sections.

| Section | Meaning | Editor behavior |
| --- | --- | --- |
| `test` | Test metadata: name, description, and version | Shown as the test root metadata |
| `variables` | Global user variables | Shown as a root configuration node |
| `data_source` | Global CSV, JSON, or inline data source | Shown as a root configuration node |
| `error_policy` | Global error handling defaults | Shown as a root configuration node |
| `http_defaults` | Base URL, headers, authentication, timeout, and redirect defaults | Shown as a root configuration node |
| `scenarios` | Ordered scenario definitions | Shown as the scenarios container |
| `metrics` | Percentiles, status checks, custom metrics, and thresholds | Shown as a root configuration node |

The root is a test plan. Root nodes have a stable visual order. Requests and
controllers cannot be placed at root level.

A scenario contains these sections when present:

- `name` and optional description.
- `load` configuration.
- `cookies` configuration.
- `cache_manager` configuration.
- Scenario-level `error_policy`.
- Ordered `steps`.

The YAML format permits a list under `scenarios`. Current Relampo Studio
semantic validation supports one scenario only. A second scenario blocks
Debug and Run, even when the second scenario is disabled.

### Supported node types and hierarchy

The tree exposes the following current node types.

| Node family | Supported types | Allowed location |
| --- | --- | --- |
| Root metadata and configuration | `test`, `variables`, `data_source`, `error_policy`, `http_defaults`, `metrics` | Root |
| Scenario containers | `scenarios`, `scenario`, `load`, `cookies`, `cache_manager`, `steps` | Root or scenario as defined above |
| HTTP requests | `request`, `get`, `post`, `put`, `delete`, `patch`, `head`, `options` | `steps` or a controller that accepts steps |
| Database requests | `sql` | `steps` or a controller that accepts steps |
| Basic controllers | `simple`, `group`, `transaction`, `parallel` | `steps` or another controller |
| Flow controllers | `if`, `loop`, `retry`, `one_time`, `on_error` | `steps` or another controller |
| Load distribution | `balanced` | `steps` or a controller that accepts steps |
| Timers | `think_time` | `steps`, a controller, or a request |
| Response checks | Tree nodes `assertion`, `assert`; YAML input form `assertions` | Request or supported step scope |
| Response extraction | Tree nodes `extractor`, `extract`; YAML input form `extractors` | Request or supported step scope |
| Scripts | `spark`, `spark_before`, `spark_after` | Request or supported step scope |
| Request support | `file`, `header`, `headers` | Request |

The root, `test`, `scenarios`, and `steps` containers are structural nodes.
They cannot be dragged into arbitrary locations. A node can move inside a
container only when the target accepts that node type.

Requests can contain request support and response-processing children. A
request cannot contain a controller. Controllers can contain requests, SQL,
timers, and other permitted controllers. Leaf nodes cannot contain children.

### Load modes

The editor supports these current load modes:

- `constant`: fixed user count for a duration or iteration limit.
- `linear`: the editor's internal label for a ramp-style load. Canonical YAML
  uses the supported `ramp` alias when required by the current format.
- `ramp_up_down`: user or throughput ramp with ramp-up and ramp-down values.
- `throughput`: target request rate with optional ramp and stop limits.
- `intent`: target-oriented load configuration. Intent does not use the
  finite-stop validation applied to the other load modes.

The editor preserves mode-specific fields, including users, target rate,
duration, iterations, ramp values, and manual-stop state. It does not invent
values for fields that are not part of the selected mode.

`run_until_stopped` is a manual-stop contract. For finite load modes, it cannot
be combined with a positive duration or positive iteration count. A finite load
must define a positive duration or positive iterations, or explicitly enable
manual stop. An explicit zero iteration value means unlimited in this contract.

The YAML format documents `stages`, but the current editor and Pulse runtime do
not support it. The editor must preserve the distinction between a documented
example and a supported executable structure. `stages` is an unsupported
structure, not an alternative editor load mode.

### Controllers and balanced execution

Controllers define execution hierarchy.

- `group` organizes related steps.
- `transaction` groups steps and requires at least one enabled child.
- `simple` groups steps without adding a special flow rule.
- `parallel` groups steps for parallel execution where the runtime supports it.
- `if` executes children when its condition is true.
- `loop` repeats children for its configured count.
- `retry` retries children under its configured attempts and backoff policy.
- `one_time` executes its children once per applicable run or virtual user.
- `on_error` defines behavior after child errors.
- `balanced` distributes load across selected child branches.

Balanced Controller behavior is explicit:

- The controller has a distribution type of `total` or `partial`.
- It has an execution mode based on `iteraciones` or virtual users.
- Only enabled, load-bearing descendants receive a percentage.
- Requests, SQL, and controllers that can issue work are load-bearing.
- Timers, assertions, extractors, scripts, and empty containers are not
  load-bearing.
- A total distribution must sum to 100 percent.
- A partial distribution can leave percentage unassigned.
- Even distribution assigns percentages across the current load-bearing set.
- Structural edits recalculate the selected set and invalidate stale totals.
- Iteration mode requires scenario load iterations greater than zero.
- Empty controllers remain visible and editable. A transaction with no enabled
  related child is a semantic error. A balanced controller with no load-bearing
  child remains an empty draft and cannot satisfy total balancing.

### HTTP requests

The editor supports full requests and method shorthand.

- Full form uses `request` with a method and URL.
- Shorthand uses `get`, `post`, `put`, `delete`, `patch`, `head`, or `options`.
- A shorthand scalar is treated as its URL.
- A shorthand object can contain the request fields.
- The canonical tree stores the effective HTTP method.
- A URL can be relative to `http_defaults.base_url` or absolute.
- Request fields include name, method, URL, headers, query parameters, body,
  timeout, authentication, redirect behavior, files, assertions, extractors,
  and Spark scripts.
- Request values can contain variable expressions such as `{{token}}`.

Headers can be defined in `http_defaults`, a request, or an editor `headers`
child. The child is a visual projection of request headers. Serialization puts
the headers back in the request payload.

Authentication supports bearer, API key, basic, and none. API keys can be sent
in a header or query parameter. More local authentication replaces inherited
authentication at its supported scope.

Timeout and redirect settings can inherit from HTTP defaults. A request-level
setting overrides the inherited setting.

### SQL requests

SQL is a supported step type. The editor keeps SQL text and its current request
metadata in the tree. SQL can appear in steps, controllers, and balanced
branches when the target hierarchy permits it.

SQL details are edited separately from HTTP request details. The editor presents
safe read-only execution as the default SQL behavior when that control exists.
SQL response data and row counts are execution results, not authoring fields.

### Variables and data sources

Variables are string or scalar values available for interpolation. They can be
defined globally and used in URLs, headers, bodies, authentication, SQL, and
scripts.

Data sources support CSV, JSON, and inline values. A data source can define:

- A file or inline payload.
- Per-virtual-user or shared mode.
- Sequential, random, or unique access strategy.
- Column-to-variable bindings.
- Behavior when data is exhausted: stop, recycle, or fail the test.

Data source scope follows the nearest supported definition. A request-local
source overrides a broader source for that request. Global and scoped sources
remain visible in their owning tree locations.

The editor can discover Studio data-source file upload and preview capability.
It shows those controls only when the Studio capability is advertised.

### Assertions and extractors

Assertions validate response behavior. Current assertion concepts include:

- Exact or set-based status checks.
- Body contains or body does not contain.
- Regular expression checks.
- Response time maximum.
- Response size limits.
- Header checks.
- JSONPath and XPath checks.

Extractors store response values in variables. Current extractor types include
regular expression, JSONPath, XPath, and boundary extraction. Extractors can
define a target variable, pattern or expression, match number, and default.

The editor supports array forms and legacy object forms. The parser normalizes
both forms into the editor model. The serializer emits the current canonical
form without changing the meaning of the extraction rule.

Assertions and extractors can be attached to a request or represented as
supported scoped steps. A request-specific assertion configuration replaces a
broader assertion configuration where the format defines replacement.

### Spark scripts

Spark scripts run before or after a request. The editor supports the visual
`spark_before` and `spark_after` nodes and the YAML `spark` representation.

Before scripts can use `vars`, logging, and request preparation values. After
scripts can also inspect response status, body, headers, and duration.

Scripts can create or update variables for later steps. The editor preserves
script text and its before/after position during round trips.

### Redirects

Redirect handling can be set in HTTP defaults and overridden on a request.
The editor records redirect chains returned by Debug or Run as execution data.

When a debug snapshot includes a redirect chain, the editor maps the chain to
the source request and follow-up requests. It shows redirect relationships in
the tree and details view without changing the authoring YAML.

If a recorded redirect target is disabled, the source request's follow-redirect
control becomes editable again. A disabled target does not remain an active
redirect relationship.

### Cookies, cache, metrics, and error policies

Cookie configuration supports automatic, manual, and disabled modes. It can
control persistence between iterations and clearing behavior on error.

Cache configuration supports enabled state, cache size, and clearing between
iterations where the runtime supports those fields.

Metrics configuration supports percentiles, status checks, custom counters or
gauges, and thresholds such as latency and error-rate limits.

Error policies can exist at global, scenario, or controller scope where the
format permits them. They define behavior for status classes, timeouts, and
retry or stop decisions. The more local policy takes precedence at its scope.

### Legacy aliases and canonical YAML

The parser accepts current and legacy forms that the existing editor supports,
including:

- HTTP method shorthand and full request form.
- `assertions` and legacy `assert` forms.
- `extractors` and legacy `extract` forms.
- Legacy load labels that normalize to current load modes.
- Inline fields and visual child-node projections.

The serializer emits canonical YAML. Canonicalization can change spelling,
ordering, or visual-only structure while preserving semantic behavior.

Unsupported structures must not be silently treated as supported. When parsing
cannot represent a structure safely, the user receives a clear error or the
document is blocked by semantic validation.

### Visual authoring

#### Tree editing

The tree is the main authoring surface. Users can add supported nodes, edit
details, rename nodes, remove nodes, reorder siblings, wrap steps in a
transaction, and update node fields.

Containment and sibling rules are enforced before a mutation is applied. A
failed move leaves the document unchanged and explains the invalid target.

#### Selection and details

Selecting a node highlights it and opens the matching details view. Selection
must survive ordinary tree mutations when the selected node still exists.
Deleted or replaced nodes clear or move selection to a safe visible parent.

The details view edits the selected node's semantic data. It does not create a
second unsynchronized document model.

#### Search and replace

Tree search finds visible node names and supported editable values. The search
view can expand or focus matching nodes without changing document data.

Replace operates on enabled authoring values and excludes recorded response
fields. Replace reports the number of replacements and leaves the tree and
canonical YAML consistent.

#### Drag and drop

A node can be dropped inside a valid container or before or after a valid
sibling. Root, test metadata, scenarios, and steps structural containers have
restricted movement rules.

Drag and drop must reject cycles, invalid containment, and invalid sibling
groups. The rejected operation must not partially remove the source node.

#### Duplication, copy, paste, and removal

Users can duplicate eligible nodes, copy and paste supported node data, and
remove nodes. Duplicates receive a clear copy name and preserve relevant
children and semantic fields.

Scenario duplication is not offered when it would violate the one-scenario
Studio contract. Empty containers remain possible for authoring, subject to
semantic validation before execution.

#### Enable and disable

Users can enable or disable executable nodes and subtrees. Disabled nodes stay
visible, searchable, selectable, and serializable with `enabled: false`.

Disabled nodes are excluded from execution. They are excluded from semantic
checks that require executable children, except for the global one-scenario
count, which reflects the current Studio limitation.

#### Code view

Code view displays canonical YAML in a read-only editor. It is a review and
inspection view, not a second editing surface.

All changes happen through the tree and details controls. Code view updates
after tree changes and does not create dirty state by itself.

### Validation and readiness

Syntax errors prevent a YAML document from becoming an executable tree. The
editor shows the parser error and keeps the invalid input available for repair
when safe.

Semantic errors are attached to nodes and shown before Debug or Run. Current
semantic gates include:

- More than one scenario in Studio.
- A transaction with no enabled related child.
- Balanced Controller iteration mode without positive scenario iterations.
- Invalid manual-stop and finite-stop combinations.
- Invalid balanced percentages or missing load-bearing children where the
  selected distribution requires them.

Debug and Run remain unavailable while blocking syntax or semantic errors exist.
The editor must not silently run the last valid document after a newer invalid
edit.

### Import, export, and persistence

#### Import

The editor accepts YAML text and YAML files. Import parses the content into the
tree and reports syntax errors without losing the current document unless the
user confirms replacement or the flow is explicitly a new-document operation.

In Studio, an initial script supplied by the CLI has priority over a restored
draft. This allows a requested script to open predictably.

#### Export and filenames

Export produces canonical YAML with a `.yaml` filename. The filename is kept in
the active draft and used by download actions. A missing filename receives a
safe default document name.

Runtime response fields are not authoring configuration. Download and export
can remove response fields so recorded response bodies, headers, and binary
payloads do not become part of the saved test unless the current export option
explicitly requests them.

#### Autosave and draft restore

The active draft stores YAML, filename, and update time in browser persistence.
Autosave runs after document changes and uses an ordered write model.

Save and download flush pending serialization before writing or downloading.

Draft restore loads the most recent valid active draft. A stale delayed save
from an older document must not overwrite a newer document or a New Document
state.

#### Dirty state

The editor is dirty when the current semantic document differs from its last
saved or accepted baseline. Tree edits, field edits, reorder operations,
enablement changes, and response-removal choices update dirty state.

Selection, expansion, search, and Code view changes do not mark the document
dirty. Failed mutations do not mark it dirty.

#### New Document

New Document creates a valid empty authoring baseline with default test
metadata. It clears the active content, resets the filename, and invalidates
older persistence writes before any new autosave can run.

The flow warns about unsaved changes when the current product surface supports
that confirmation. After confirmation, the old document cannot reappear through
a delayed draft write.

### Standalone and Studio behavior

The editor sends `GET /api/studio/info` to discover Studio mode and advertised
capabilities.

The backend owns capability availability. The editor consumes the response and
must not infer support from a visible component, an older response shape, or a
configured default view. The discovery response uses this compatible shape:

```json
{
  "studio": true,
  "capabilities": {
    "debug": true,
    "loadRun": true,
    "dataSourceFiles": true
  }
}
```

Each capability is optional and enabled only when its JSON value is exactly
`true`.

| Capability | Backend guarantee when `true` | Editor behavior |
| --- | --- | --- |
| `debug` | The Debug start API and Debug SSE stream are available. | Show and enable the Debug view. |
| `loadRun` | The full load-run start, stop, report, and SSE APIs are available. | Show and enable the Run view. |
| `dataSourceFiles` | Studio data-source upload and preview APIs are available. | Show file upload, browse, and preview controls. |

If `capabilities` or one of its fields is absent, malformed, or false, that
optional feature is unavailable. The editor ignores unknown capability fields.
Older editors can ignore newly added fields, so adding a capability remains
backward compatible. Removing or changing the meaning of a capability is a
Studio API contract change and requires coordinated backend and editor review.

Standalone mode:

- Provides local YAML authoring, validation, import, export, and persistence.
- Does not require a runtime agent.
- Hides Studio-only runtime controls when no Studio backend is available.
- Keeps Code view available as a read-only representation.

Studio mode:

- Uses the Studio backend on the same origin.
- Accepts a CLI-supplied initial script.
- Can expose Debug, Run, data-source upload, and data-source preview according
  to advertised capabilities.
- Uses the Studio session token for API requests, SSE streams, and report links.
- Applies the advertised default view when one is provided.

### Debug

Debug is a single-pass execution path for inspecting a document.

- It uses the validated YAML document.
- It accepts one or two explicit virtual users.
- It does not use the scenario's full duration or iteration load profile.
- It starts through the Debug API and receives per-request events over SSE.
- It maps events to stable tree steps using request identity and step paths.
- It shows request method, path, status, latency, errors, variables, assertions,
  SQL row information, redirect hops, request data, and response data when
  returned by the backend.
- It supports filtering and searching the debug timeline.
- It shows disabled steps as skipped or excluded where the event model permits,
  without treating them as executed requests.

Debug connection behavior is explicit:

- A failed initial fetch shows an actionable local-agent message.
- A temporary SSE loss allows the browser reconnect grace period.
- A terminal SSE failure shows a connection error and stops live updates.
- A `done` event closes the stream and records the final outcome.
- Closing a Debug view stops client-side consumption without changing YAML.

Binary response bodies use base64 data when the backend provides it. The UI
decodes displayable content when safe and offers a download for binary content.
Response display never changes the authoring document.

### Full Load Run

Run is the full Scenario Load path.

- It is available only in Studio when `loadRun` is advertised.
- It uses the scenario's actual load configuration.
- It starts through `/api/run` with the current YAML script.
- It receives state, approximately one-second metrics snapshots, logs, and a
  terminal summary over SSE.
- It shows active users, request rate, latency, failures, errors, and per-request
  aggregates when provided.
- It maps request statistics and redirect identity back to tree steps where
  the backend provides stable identifiers.
- Stop requests the backend to cancel the run and displays the partial stopped
  summary.
- A completed run exposes the generated report URL.

Run SSE uses reconnect grace for transient connection loss. A permanent loss
shows an error and does not claim a successful run. A refreshed or reattached
view can reconnect to an active run when the run identity and document
fingerprint match the current document.

Debug and Run are separate products. Debug is small and inspectable. Run is
load-oriented and uses the real load profile.

### Authentication and error handling

Studio passes a per-process session token to the editor at launch. The editor
removes the token from the visible URL after reading it.

- Fetch requests send the token in `X-Relampo-Studio-Token`.
- EventSource streams and report links carry the token as a query parameter.
- Standalone mode sends no Studio token.
- Network failures are translated into actionable messages.
- HTTP errors keep the backend error when available.
- Abort and user cancellation remain distinct from unreachable-agent errors.
- Authentication failures must not be retried as successful operations.

### Accessibility, localization, and responsive behavior

The editor supports English and Spanish translations for product controls,
validation messages, runtime status, and accessibility labels. New user-visible
strings must use the translation system.

The tree and controls must be operable with keyboard input. Interactive nodes
have accessible names, selected state, expanded state, disabled state, and
visible focus. Drag and drop has a keyboard or menu alternative.

Status and validation messages use text and state, not color alone. Error text
is associated with the affected control when possible.

The layout has a minimum supported viewport. Below that viewport, the product
shows the mobile-blocking surface instead of rendering unusable editor panels.
At supported widths, panels can be resized without losing tree selection or
document data.

Large documents remain usable. The editor reports character and line metrics,
marks large documents as informational, and does not reject a file solely
because it crosses the informational threshold. Tree operations must preserve
semantic data and avoid accidental response expansion for large payloads.

## User Stories

The following stories define the observable contract. They use the format
required by the product-spec workflow and cover one stable behavior at a time.

### Authoring

1. As a user, I want to import valid YAML, so that I can see its document tree.
2. As a user, I want to start with an empty document, so that I can create a test without preparing YAML first.
3. As a user, I want to edit test name, description, and version, so that I can identify the test.
4. As a user, I want to see root variables, data sources, policies, defaults, scenarios, and metrics, so that I can manage the complete test plan.
5. As a Studio user, I want to author one supported scenario, so that execution is not blocked by hidden extra scenarios.
6. As a user, I want to edit every supported load mode and its fields, so that I can model the intended workload.
7. As a user, I want manual-stop conflicts to produce an error, so that I can correct the load configuration before execution.
8. As a user, I want to edit GET, POST, PUT, DELETE, PATCH, HEAD, and OPTIONS shorthand, so that I can create common requests quickly.
9. As a user, I want to edit full request settings, so that I can control method, URL, headers, parameters, body, timeout, authentication, and redirects.
10. As a user, I want to create and edit SQL steps in supported locations, so that I can include database work in a scenario.
11. As a user, I want to edit request headers as a visual child, so that headers serialize correctly inside the request.
12. As a user, I want to configure bearer, API key, basic, or no authentication, so that requests use the required credentials.
13. As a user, I want to define reusable variables, so that requests and scripts can share values.
14. As a user, I want to configure CSV, JSON, or inline data sources, so that test data can drive request values.
15. As a user, I want to override a broader data source locally, so that a request can use its own data context.
16. As a user, I want to add status, body, regular expression, time, size, header, JSONPath, or XPath assertions, so that I can verify responses.
17. As a user, I want to extract response values with supported extractor types, so that later steps can reuse those values.
18. As a user, I want to run a Spark script before a request, so that I can prepare request data.
19. As a user, I want to run a Spark script after a request, so that I can process response values.
20. As a user, I want to add think-time steps or request-level think time, so that I can model user pauses.
21. As a user, I want to add supported controllers, so that I can model grouping, conditions, loops, retries, parallel work, and error flow.
22. As a user, I want to nest supported controllers, so that I can organize complex flow without creating an invalid hierarchy.
23. As a user, I want to choose total or partial balancing and iteration or virtual-user mode, so that I can distribute controller work correctly.
24. As a user, I want to assign percentages only to enabled load-bearing children, so that balancing matches executable work.
25. As a user, I want to distribute a total balance evenly, so that I do not need to calculate each percentage manually.
26. As a user, I want to see balanced-controller errors, so that I can correct missing children, invalid percentages, or invalid totals.
27. As a user, I want disabled nodes to remain visible, searchable, selectable, and exportable, so that I can retain optional test work.
28. As a user, I want disabled subtrees excluded from execution, so that I can control which work runs.
29. As a user, I want to rename eligible nodes, so that the tree remains understandable without changing node meaning.
30. As a user, I want to add nodes only where their parent permits them, so that every edit produces a valid hierarchy.
31. As a user, I want to remove a node with its owned descendants, so that I can delete a complete subtree in one change.
32. As a user, I want to duplicate eligible nodes with their fields and children, so that I can reuse existing configuration.
33. As a user, I want to copy and paste supported node data safely, so that I can speed up authoring without shared mutable state.
34. As a user, I want to reorder valid siblings, so that I can control execution order.
35. As a user, I want to move nodes inside valid containers, so that I can change their execution scope.
36. As a user, I want invalid drops to fail without partial removal, so that a failed move cannot damage the document.
37. As a user, I want to wrap compatible steps in a transaction or controller, so that I can group related work.
38. As a user, I want to search node names and supported values, so that I can find content in a large tree.
39. As a user, I want search to reveal and focus matching nodes without changing data, so that navigation remains safe.
40. As a user, I want to replace matching enabled authoring values, so that I can update repeated values efficiently.
41. As a user, I want replace to exclude recorded responses, so that runtime data is not changed accidentally.
42. As a user, I want to inspect canonical YAML in read-only Code view, so that I can review the execution payload.
43. As a user, I want Code view to remain read-only, so that YAML text and tree state cannot diverge.
44. As a user, I want selection to survive non-destructive tree updates, so that I can continue editing in context.
45. As a user, I want blocking semantic errors shown next to affected nodes, so that I can fix them before execution.

### Execution

46. As a user, I want syntax errors to block Debug, so that invalid YAML cannot start an execution.
47. As a user, I want syntax errors to block Run, so that invalid YAML cannot start a load test.
48. As a user, I want semantic errors to block Debug, so that known-invalid documents cannot run.
49. As a user, I want semantic errors to block Run, so that known-invalid documents cannot start a load test.
50. As a user, I want Debug to run one small pass without the full load profile, so that I can inspect a flow safely.
51. As a user, I want to choose one or two Debug virtual users, so that I can inspect concurrency at a controlled size.
52. As a user, I want to see Debug request events, status, latency, errors, assertions, variables, and SQL results, so that I can understand the flow.
53. As a user, I want to see Debug redirect hops and their source relationship, so that I can understand redirect behavior.
54. As a user, I want to download binary Debug responses when base64 data is available, so that I can inspect non-text results.
55. As a user, I want to filter and search the Debug timeline, so that I can find important events quickly.
56. As a user, I want a clear error when Debug SSE cannot recover, so that I know the live result is incomplete.
57. As a user, I want temporary Debug SSE loss to recover during the grace period, so that short network interruptions do not end the session.
58. As a user, I want to distinguish Debug success, backend error, cancellation, and connection failure, so that I understand the final outcome.
59. As a Studio user, I want Run shown only when Studio advertises load-run support, so that unavailable controls do not mislead me.
60. As a user, I want Run to use the scenario's real load configuration, so that the test represents the configured workload.
61. As a user, I want live Run state, rates, users, latency, failures, errors, logs, and snapshots, so that I can monitor the load test.
62. As a user, I want to stop an active Run and see its partial summary, so that I can end an unsafe or unnecessary load test safely.
63. As a user, I want temporary Run SSE loss to recover without ending the run falsely, so that monitoring survives short interruptions.
64. As a user, I want to open the generated Run report, so that I can review the completed load test.
65. As a user, I want reattachment to require matching run identity and document state, so that results cannot attach to the wrong test.
66. As a user, I want an actionable message when the local agent is unavailable, so that I know how to restore execution access.
67. As a user, I want cancellation kept separate from an outage, so that the final status describes what actually happened.
68. As a Studio user, I want API, SSE, and report requests to use the Studio session token, so that runtime access remains authenticated.
69. As a standalone user, I want authoring, validation, import, export, and persistence without Studio, so that the editor remains useful on its own.
70. As a Studio user, I want the CLI-supplied initial script to open before a restored draft, so that the requested script is the document I see.

### Persistence

71. As a user, I want import to protect unsaved content, so that a new file cannot replace work without the required confirmation.
72. As a user, I want Save to serialize the latest tree edit first, so that the saved document includes what I can see.
73. As a user, I want Download to write canonical YAML with the active filename, so that the exported file is ready to use.
74. As a user, I want a safe `.yaml` filename when no name exists, so that every download has a usable name.
75. As a user, I want to export without runtime response fields, so that the saved document remains authoring configuration.
76. As a user, I want to restore the latest valid active draft, so that I can continue work after reopening the editor.
77. As a user, I want dirty state to reflect semantic document changes, so that I know when the saved baseline is outdated.
78. As a user, I want selection, expansion, search, and Code view changes excluded from dirty state, so that navigation does not imply unsaved content.
79. As a user, I want New Document to reset content, filename, selection, and baseline, so that I can start cleanly.
80. As a user, I want stale autosaves blocked after New Document, so that old content cannot reappear later.
81. As a user, I want failed parses and invalid mutations to preserve my current document, so that an error does not cause silent data loss.
82. As a user, I want parse and serialize cycles to preserve executable meaning, so that canonical formatting changes remain safe.

### Accessibility

83. As a keyboard user, I want to move through the tree and controls without a pointer, so that I can author the document independently.
84. As a keyboard user, I want to expand, collapse, select, enable, disable, and act on nodes, so that tree operations are available without drag input.
85. As a keyboard user, I want a menu or action alternative to drag and drop, so that I can reorder nodes accessibly.
86. As an assistive-technology user, I want selected, expanded, disabled, invalid, and loading states exposed, so that I can understand the editor state.
87. As a keyboard user, I want visible focus on every interactive control, so that I can see where input will go.
88. As a user, I want validation and runtime errors communicated with text and state, so that color is not my only source of meaning.
89. As a user, I want import, New Document, and destructive dialogs to have accessible names and focus order, so that I can complete them safely.
90. As a user, I want a clear message below the supported viewport, so that I understand why the editor is blocked on a small screen.

### Localization

91. As an English user, I want editor, validation, persistence, Debug, and Run labels in English, so that I can understand the product.
92. As a Spanish user, I want the supported product surfaces in Spanish, so that I can use the editor in my language.
93. As a user, I want dynamic validation and runtime messages translated, so that errors remain understandable in the active language.
94. As a user, I want YAML keys, API names, and code identifiers to remain stable across languages, so that language changes do not alter the contract.
95. As a user, I want changing language to leave the tree and canonical YAML unchanged, so that localization remains a view concern.

### Responsive layout

96. As a user, I want to resize supported editor panels, so that I can set a useful working layout without losing data.
97. As a user, I want tree, details, status, and action controls reachable at supported widths, so that the editor remains usable.
98. As a user, I want resizing to preserve selection, expansion, and edits, so that layout changes do not interrupt authoring.
99. As a user, I want long serialization, import, and runtime transitions to show busy state, so that I do not repeat actions accidentally.
100. As a user, I want dirty, invalid, running, stopped, and connection states visible at supported widths, so that I can monitor the editor.

### Large-document handling

101. As a user, I want document character and line metrics, so that I can understand document size.
102. As a user, I want large-document status to remain informational, so that size alone does not reject my file.
103. As a user, I want tree edits on large documents to preserve fields and children, so that scale does not cause data loss.
104. As a user, I want autosave and download to preserve large canonical documents, so that scale does not change persistence behavior.
105. As a user, I want large response bodies kept out of authoring state during inspection, so that debugging does not expand the saved document.
106. As a user, I want search to remain useful on large documents without mutating content, so that I can find work at scale.
107. As a user, I want Debug and Run to use the complete latest document or show a clear failure, so that execution is never based on stale content.

## Implementation Decisions

### Decision 1: Use the document lifecycle as the main seam

Parser, tree operations, serializer, and semantic validation define the central
product boundary. A visible editor action is complete only when its canonical
YAML still represents the intended semantics.

### Decision 2: Keep one editable model

The tree is the editable model. Code view is read-only. This prevents YAML text,
tree state, dirty state, and execution payloads from diverging.

### Decision 3: Normalize at the parser boundary

Legacy aliases and visual projections are normalized when YAML enters the tree.
The serializer emits a stable canonical form. Tests compare semantic structure,
not whitespace or incidental key order.

### Decision 4: Treat disabled nodes as visible authoring state

Disablement is part of the document contract. The editor keeps disabled nodes
in YAML and the tree, while execution and executable-child validation exclude
them according to the rules above.

### Decision 5: Keep Studio limits explicit

One-scenario support is a current Studio constraint. The YAML array shape is
retained for compatibility, but extra scenarios block execution. Supporting
multiple scenarios requires a separate product decision.

### Decision 6: Separate Debug from Run

Debug is a bounded, inspectable single-pass run. Run is a full load execution.
They use different APIs, payload rules, event models, and completion surfaces.

### Decision 7: Discover optional runtime features

The editor probes Studio and honors advertised capabilities. It does not infer
support from the presence of a frontend component or from an older API shape.

### Decision 8: Make persistence ordered and replaceable

Autosave, save, import, and New Document share a versioned ordering model. A
later document identity invalidates earlier delayed writes.

### Decision 9: Keep runtime responses out of authoring state

Debug and Run can display response data. Export can strip response fields.
Inspection does not mutate the test document.

### Decision 10: Keep user-visible behavior accessible and translated

Accessibility state, focus, keyboard alternatives, and localized messages are
part of the product contract. They are not optional presentation work.

## Testing Decisions

### Primary test seam

Tests must prefer this external-behavior path:

1. Parse YAML input into a tree.
2. Apply a tree or editor operation.
3. Serialize the tree to canonical YAML.
4. Parse the serialized YAML again.
5. Run semantic validation.
6. Assert semantic fields, hierarchy, enablement, and execution readiness.

Formatting differences are not failures when semantic YAML behavior is intact.
Tests must not depend on private component structure when a parser, serializer,
editor, or client boundary can observe the behavior.

### Existing seams to prefer

The repository already provides behavior seams for:

- YAML parser and serializer round trips.
- HTTP extractors, Spark, SQL, data-source scope, redirects, and aliases.
- Semantic validation.
- Balanced Controller validation and round trips.
- Tree containment, drag and drop, node factory, and tree operations.
- Editor interactions, details panels, context actions, and status behavior.
- Draft storage, persistence ordering, dirty state, and document limits.
- Studio capability discovery and authentication.
- Debug API, Debug request mapping, search, timeline, redirects, and binary bodies.
- Run API, snapshots, logs, stop, reports, and SSE connection behavior.

### Required behavior coverage

The test suite must cover at least these cases:

| Area | Required assertions |
| --- | --- |
| Invalid YAML | Syntax errors are reported; the current valid document is not silently replaced |
| Semantic errors | Multiple scenarios, empty transactions, invalid balanced iteration mode, and stop-policy conflicts block execution |
| Unsupported structures | `stages` and other unrepresentable structures are not treated as executable load modes |
| Disabled nodes | Disabled subtrees remain visible and serializable but do not execute or satisfy enabled-child requirements |
| Balanced Controller | Empty selection, non-load-bearing children, invalid totals, partial totals, and structural rebalance behavior |
| Legacy aliases | Shorthand requests, assertion aliases, extractor aliases, and load aliases preserve semantics after round trips |
| Response stripping | Export removes response fields when selected and does not alter authoring fields |
| Persistence races | A stale delayed autosave cannot overwrite New Document or a newer draft |
| Large files | Character and line thresholds are informational; round trips preserve large content |
| Debug | VU limits, single-pass behavior, event mapping, filters, redirect chains, binary response download, and gating |
| Run | Full load payload, metric snapshots, stop summaries, report links, reconnect grace, and gating |
| SSE failures | Temporary loss can recover; permanent loss becomes a clear error; terminal events close the stream |
| Studio discovery | Initial script precedence, capability flags, default view, and token transport |
| Accessibility | Keyboard operation, focus visibility, state labels, dialog semantics, and non-color error communication |
| Localization | English and Spanish product strings, dynamic errors, and stable YAML identifiers |
| Responsive layout | Minimum viewport behavior, panel resizing, and state preservation |

When an existing parser, serializer, editor, or client boundary cannot observe
a required behavior, add the smallest new behavior seam. Do not add a seam only
to test internal component layout.

### Acceptance method

For each feature, acceptance must identify:

- The input YAML or user operation.
- The expected tree or observable view state.
- The expected canonical YAML semantics.
- The expected semantic validation result.
- The expected Debug, Run, persistence, or error outcome.

## Out of Scope

- Publishing or synchronizing this contract to an external tracker.
- Implementing the unsupported `stages` load type.
- Removing the YAML `scenarios` array for compatibility reasons.
- Supporting multiple scenarios in Studio without a separate product decision.
- Making Code view an independent editable YAML source.
- Adding a new execution engine or changing backend runtime semantics.
- Adding collaborative editing, remote document storage, or user accounts.
- Making runtime response data part of the canonical authoring model.
- Replacing the existing YAML format with a new document language.
- Creating a glossary or ADR set as part of this contract.
- Rewriting existing supporting documents when this product contract can state
  the current rule clearly.

## Further Notes

### Evidence used

This contract is based on the current parser and serializer, tree model and
operations, semantic validation, persistence implementation, Studio clients,
Debug and Run views, and their existing tests. It also uses the existing YAML
format, hierarchy, and Pulse support documents as supporting evidence.

The following sources are the current evidence for the Studio capability
contract:

- [`src/utils/debugApi.ts`](src/utils/debugApi.ts) defines the editor probe,
  exact-`true` capability parsing, and compatibility fallback.
- [`src/utils/debugApi.test.ts`](src/utils/debugApi.test.ts) protects capability
  parsing, missing fields, and older Studio responses.
- [Relampo Backend PR #324](https://github.com/relampo/relampo-backend/pull/324)
  added the backend-owned `debug` advertisement and regression assertion. It
  merged into backend `develop` as `12b014ed`.

The proposed baseline is being completed through these editor pull requests:

| Pull request | Last reviewed head | Contract area |
| --- | --- | --- |
| [#167](https://github.com/relampo/relampo-yml-editor/pull/167) | `2ef0b6d6` | Core editor contract and deterministic gates |
| [#168](https://github.com/relampo/relampo-yml-editor/pull/168) | `090139e8` | Compatibility, fidelity, validation, and capability gaps |
| [#170](https://github.com/relampo/relampo-yml-editor/pull/170) | `909a2ffc` | Local editor and packaged Studio browser journeys |

These heads are evidence snapshots, not permanent version requirements. Review
the final merged commits before promoting this document to **Current**.

The strongest seam is the document lifecycle because it observes both visual
authoring and execution readiness without coupling tests to component internals.

### Current constraints and contradictions

1. **One scenario versus a scenario list.** YAML allows `scenarios` as a list,
   while current Studio validation allows one scenario only.
2. **`stages` is documented but unsupported.** The existing format document
   includes a `stages` example and marks it unsupported. The editor must keep
   this distinction visible.
3. **Load naming differs by layer.** The editor uses `linear` in its internal
   load model while the YAML contract can use `ramp` as the canonical alias.
4. **Legacy aliases remain necessary.** `assert` and `extract` forms coexist
   with current array forms for compatibility.
5. **Pulse compatibility is version-sensitive.** Existing support documents use
   broad compatibility language, while runtime capabilities and API versions
   can differ. Studio discovery is the current authority for optional runtime
   features.
6. **Runtime response data has two roles.** Debug and Run need response data for
   inspection, but response fields are not stable authoring configuration.
7. **Standalone and Studio have different execution surfaces.** The same tree
   can be authored standalone, but runtime controls depend on Studio discovery.

### Missing project foundations

The project does not yet have a complete shared glossary for terms such as
scenario, step, sampler, controller, load-bearing child, Debug, Run, and draft.
It also does not have a complete ADR set that records the choices in this
contract. These gaps make future changes harder to compare.

### Change control

This document describes the accepted product baseline. A proposed behavior
change must state:

- The user-visible contract that changes.
- The YAML and tree semantics that change.
- The affected persistence and execution boundaries.
- The test seam and regression cases.
- Whether the change affects standalone mode, Studio, or both.

After implementation, update this document and the supporting evidence so the
product contract remains aligned with the code.

### Promotion to Current

Change the status from **Proposed** to **Current** only when all of these checks
pass:

1. Editor PRs #167, #168, and #170 are merged.
2. Their final merged commits still implement the behavior described here.
3. The editor unit, build, standalone browser, and packaged Studio release gates
   pass against the merged sources.
4. The backend and editor descriptions of `/api/studio/info` capabilities agree.
5. The evidence table is updated from reviewed PR heads to final merged commits.
