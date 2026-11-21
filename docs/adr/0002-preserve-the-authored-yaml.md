# 0002. Preserve the authored YAML

## Context

The editor projects a Relampo YAML file into a Tree. Tree controls can show defaults and names that the author never wrote. Files can also come from newer runtime versions or older recorders.

## Decision

- Preserve unrecognized and recorder-only fields on save. Use backend contract snapshots for known fields. Add gRPC scopes from the gRPC contract when the primary snapshot lacks them. Keep recording provenance, captured response bodies, and editor load profiles as document data.
- Parse YAML binary tags and preserve date-like scalars as strings. Reject cycles and unsupported values before they reach the Tree. Keep imported contract fixtures byte-for-byte identical to their manifests. Keep intentionally malformed YAML fixtures out of formatting passes.
- Track original sampler input and compare it with the displayed fields. Focus alone leaves an omitted payload absent. Clearing an inherited gRPC field removes the override. Explicit `payload_base64` selects binary mode. An explicit URL edit owns the authored query parameters.
- Scope modeled configuration to documented fields and child flows. Payloads, headers, and variable values can contain arbitrary keys. Show unrecognized fields as information. Use the Tree node and its document path to find the owner and display the value.
- Use the same containment rules for the menu, paste, and drag and drop. Keep the root fixed because it has no parent from which it can be removed. Allow one data source per serialized scope because YAML has a single field there. Preserve malformed imported load entries during reorder.
- Attach native response processors to the receive step that owns the response. Preserve processors already attached to binary receives and existing SQL components. Serialize child Tree edits back into the native fields consumed by the runtime. Native request admission is independent of an optional defaults block.
- Append operations to the requested project without rewriting existing defaults or load. Preserve legacy scalar conditions and scoped conditions in their respective shapes. Accept supported legacy extractor, assertion, and error-policy forms. Migrate the old SQL connectivity field to `sql.validate_connectivity` on save.
- Store Spark phase explicitly from the Tree node type. The engine defaults an omitted phase to after the request, which would make a before-script miss the request it prepares.
- Keep file type checks scoped to the file and its CSV/TXT extension. Validate content at the consumer. Keep validator messages in English and translate them at display time, including the message portion of a field-specific error.
- Use a separate named interface per `gdp-ts` proof so TypeScript infers each proof separately. The proof files allow empty interfaces with a single parent for this purpose.

## Consequences

A save after a small edit preserves the rest of the document. An older editor can keep fields it cannot edit. A later runtime or editor can still use them.
