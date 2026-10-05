# Relampo YAML Editor

Visual editor for Relampo load testing YAML files.

## CLI Variable Overrides

The editor already supports `variables` in YAML. Those values can now be overridden at execution time from the Relampo CLI without editing the file.

```bash
relampo run scenario.yaml --var env=staging --var base_url=https://staging.example.com
relampo run scenario.yaml --vars-file env/staging.yaml --var env=staging
```

Precedence:

`CLI > env vars > variables file > YAML`

## ✅ Pulse Compatibility

**Compatible con Pulse v1.1** - Los archivos YAML generados por este editor pueden ejecutarse directamente con Pulse CLI.

> **Nota**: El load type `stages` no está soportado en la versión actual de Pulse. Use `constant` o `ramp` en su lugar.

## Development original design is available at https://www.figma.com/design/7kOoUgOQpGGiry7MRggmfg/Design-Pulse-Performance-Testing-UI--Copy-.

## Running the code

Run `bun install` to install the dependencies.

Run `bun run dev` to start the development server.

## Statsig Analytics

Set a browser-safe Statsig client SDK key before building or running the app:

```bash
VITE_STATSIG_CLIENT_KEY=client-your-key
VITE_STATSIG_ENVIRONMENT=development
```

## Error policy actions

- `continue` runs the next step.
- `next_iteration` skips the remaining steps and starts another iteration of the same virtual user.
- `stop_user` stops only the failing virtual user. Other users continue.
- Legacy `stop` keeps the same meaning as `stop_user`.

The editor labels these actions Continue, Next iteration (same user), and Stop this user.
The YAML values stay unchanged when saving or reopening a script.

Debug shows a policy decision only when the runtime applies a configured rule.
If no `on_error` rule applies, missing captures appear under Extraction diagnostics in Assertions.
They keep a successful HTTP response as Passed. HTTP errors and explicit assertion failures still appear as Failed.
