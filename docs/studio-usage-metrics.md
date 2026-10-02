# Studio usage metrics (RLP-685)

Studio uses the existing public Statsig client key. The standalone web editor and CLI do not send these events.

Users must enable **Share usage metrics**. The default is off. The setting survives reloads on the same origin. Turning it off disables SDK logging before shutdown, drops pending run tracking, and deletes the anonymous visitor ID. The SDK does not store queued events locally. No autocapture plugin runs. SDK diagnostics and exception reports are filtered before transmission.

| Event                                         | Source                                                                                     |
| --------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `studio_session_started`                      | One analytics SDK instance after opt-in; anonymous visitor ID supports active-user counts. |
| `studio_document_opened`                      | Initial or restored document, or successful file upload.                                   |
| `studio_validation_completed`                 | Completed semantic validation, success or failure.                                         |
| `studio_debug_started`, `studio_load_started` | Backend accepts the run and returns its ID.                                                |
| `studio_debug_completed`                      | Terminal Debug SSE message, success or failure.                                            |
| `studio_load_completed`                       | Terminal load SSE message, completed, stopped, or errored.                                 |
| `studio_document_exported`                    | YAML download succeeds.                                                                    |

Only fixed event names and bounded labels reach the provider: `mode=studio`, editor `version`, `outcome`, and `duration_bucket`. Duration buckets are under 1 second, 1–10 seconds, 10–60 seconds, 1–5 minutes, and over 5 minutes. Run IDs remain in memory for correlation and are never transmitted as event metadata.

Script contents, request URLs, file names, variables, emails, error messages, and the current page URL are excluded. SDK storage and device Stable ID are disabled. The anonymous random visitor ID is created only after consent.

Events before consent are discarded. Enabling consent during an existing run does not create a synthetic start or completion. Terminal replay for the same run cannot double-count a completion.

## Provider setup

The retention target is 90 days. Statsig project retention and metric/dashboard definitions must be configured in the provider. The SDK does not enforce or claim that retention. Verify the project setting before reporting 90 days as active. This repository has no Statsig administration credentials or project-retention API configuration.

Use daily and weekly unique anonymous IDs for active-user metrics. Count the explicit events for action metrics. Filter by bounded outcome/version labels when needed. Do not enable autocapture or enrich the anonymous user with account data.

SDK reference: https://docs.statsig.com/client/javascript-sdk
