import type { YAMLValue } from '../../types/yaml';
const input = 'w-full rounded border border-white/15 bg-zinc-950 p-2 text-xs text-zinc-200';
function list(value: unknown): Record<string, YAMLValue>[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is Record<string, YAMLValue> =>
          item !== null && typeof item === 'object' && !Array.isArray(item) && !(item instanceof Uint8Array),
      )
    : [];
}
export function GRPCChecksEditor({
  extractors,
  assertions,
  onExtractorsChange,
  onAssertionsChange,
}: {
  extractors: unknown;
  assertions: unknown;
  onExtractorsChange: (items: YAMLValue) => void;
  onAssertionsChange: (items: YAMLValue) => void;
}) {
  const extractions = list(extractors),
    checks = list(assertions);
  return (
    <section className="space-y-4 rounded border border-white/10 p-3">
      <div className="space-y-2">
        <h4 className="text-xs text-cyan-300">Extract response values</h4>
        {extractions.map((extractor, index) => {
          const edit = (key: string, value: YAMLValue) =>
            onExtractorsChange(extractions.map((old, i) => (i === index ? { ...old, [key]: value } : old)));
          return (
            <div
              key={index}
              className="space-y-2 border-b border-white/10 pb-3"
            >
              <div className="flex gap-2">
                <label className="flex-1 text-xs text-zinc-400">
                  Variable
                  <input
                    aria-label={`Extraction variable ${index + 1}`}
                    className={input}
                    value={String(extractor.var ?? extractor.variable ?? '')}
                    onChange={event => edit('var', event.target.value)}
                  />
                </label>
                <label className="flex-1 text-xs text-zinc-400">
                  Source
                  <select
                    aria-label={`Extraction source ${index + 1}`}
                    className={input}
                    value={String(extractor.type || 'jsonpath')}
                    onChange={event => {
                      const type = event.target.value;
                      onExtractorsChange(
                        extractions.map((old, i) =>
                          i === index ? { ...old, type, from: type === 'header' ? 'headers' : 'body' } : old,
                        ),
                      );
                    }}
                  >
                    <option value="jsonpath">Response message (JSONPath)</option>
                    <option value="header">Metadata or trailers</option>
                    <option value="regex">Regular expression</option>
                  </select>
                </label>
                <button
                  type="button"
                  aria-label={`Remove extractor ${index + 1}`}
                  onClick={() => onExtractorsChange(extractions.filter((_, i) => i !== index))}
                >
                  ×
                </button>
              </div>
              <label className="block text-xs text-zinc-400">
                {extractor.type === 'header' ? 'Metadata name' : extractor.type === 'regex' ? 'Pattern' : 'JSONPath'}
                <input
                  aria-label={`Extraction path ${index + 1}`}
                  className={input}
                  value={String(
                    extractor.type === 'header'
                      ? extractor.header || ''
                      : extractor.type === 'regex'
                        ? extractor.pattern || ''
                        : extractor.expression || extractor.path || '',
                  )}
                  onChange={event =>
                    edit(
                      extractor.type === 'header' ? 'header' : extractor.type === 'regex' ? 'pattern' : 'expression',
                      event.target.value,
                    )
                  }
                />
              </label>
            </div>
          );
        })}
        <button
          type="button"
          className="text-xs text-cyan-300"
          onClick={() => onExtractorsChange([...extractions, { type: 'jsonpath', var: '', expression: '$' }])}
        >
          Add extractor
        </button>
      </div>
      <div className="space-y-2">
        <h4 className="text-xs text-cyan-300">Validate responses</h4>
        {checks.map((check, index) => {
          const edit = (key: string, value: YAMLValue) =>
            onAssertionsChange(checks.map((old, i) => (i === index ? { ...old, [key]: value } : old)));
          return (
            <div
              key={index}
              className="space-y-2 border-b border-white/10 pb-3"
            >
              <div className="flex gap-2">
                <select
                  aria-label={`Assertion type ${index + 1}`}
                  className={input}
                  value={String(check.type || 'body_contains')}
                  onChange={event => edit('type', event.target.value)}
                >
                  <option value="body_contains">Message contains</option>
                  <option value="jsonpath">JSONPath value</option>
                  <option value="response_time_ms">Maximum duration (ms)</option>
                  <option value="response_size">Response size (bytes)</option>
                </select>
                <button
                  type="button"
                  aria-label={`Remove assertion ${index + 1}`}
                  onClick={() => onAssertionsChange(checks.filter((_, i) => i !== index))}
                >
                  ×
                </button>
              </div>
              {check.type === 'jsonpath' && (
                <input
                  aria-label={`Assertion path ${index + 1}`}
                  className={input}
                  placeholder="$.state"
                  value={String(check.path || '')}
                  onChange={event => edit('path', event.target.value)}
                />
              )}
              <input
                aria-label={`Assertion value ${index + 1}`}
                className={input}
                placeholder="Expected value or {{variable}}"
                value={String(
                  check.type === 'response_time_ms'
                    ? (check.max_ms ?? check.value ?? '')
                    : check.type === 'response_size'
                      ? (check.size ?? check.value ?? '')
                      : (check.value ?? ''),
                )}
                onChange={event =>
                  edit(
                    check.type === 'response_time_ms' ? 'max_ms' : check.type === 'response_size' ? 'size' : 'value',
                    event.target.value,
                  )
                }
              />
            </div>
          );
        })}
        <button
          type="button"
          className="text-xs text-cyan-300"
          onClick={() => onAssertionsChange([...checks, { type: 'body_contains', value: '' }])}
        >
          Add assertion
        </button>
      </div>
    </section>
  );
}
