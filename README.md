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
  
