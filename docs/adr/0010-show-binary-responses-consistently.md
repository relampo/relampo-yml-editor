# 0010. Show binary responses consistently

## Context

A recorded response can contain a byte-indexed object. A live response can arrive as text with invalid byte sequences already replaced with U+FFFD by the runtime. Those forms can look unrelated even when they came from the same response.

## Decision

Use one compact binary notice for recorded responses and live Debug. Include the byte count when it is known and preserve the content type. Offer a download only when original bytes are available. A text conversion can lose the original byte count and content.

## Consequences

Users can compare recorded and live responses without inspecting a raw byte dump. The current format heuristics can misclassify valid content and are tracked in [RLP-837](https://sqaadvisory.atlassian.net/browse/RLP-837).
