# 📝 YAML Editor - Changelog & Features

Este documento describe todas las características y cambios implementados en el YAML Editor para soportar el formato Pulse.

---

## 🗓️ Versión Actual

**Fecha**: 2026-02-04  
**Versión**: 1.0.0 - Pulse Integration

---

## ✨ Nuevas Características

### 1. 🔥 Soporte para Formato Pulse

El editor ahora soporta completamente el formato YAML de **Pulse** para load testing.

#### Elementos Soportados:

```yaml
test: # Metadatos del test
variables: # Variables globales
data_source: # Fuentes de datos CSV/JSON
http_defaults: # Configuración HTTP por defecto
scenarios: # Thread Groups
  - scenario:
      load: # Configuración de carga
      cookies: # Cookie Manager
      cache_manager:
      error_policy:
      steps: # Pasos del test
        - request: # HTTP Samplers
        - group: # Transaction Controller
        - loop: # Loop Controller
        - if: # If Controller
        - retry: # Retry Controller
        - think_time:
```

---

### 2. ⚡ Spark Scripts

Scripts JavaScript que se ejecutan antes/después de cada request.

#### Formato YAML:

```yaml
- request:
    name: 'Login'
    method: POST
    url: /api/login
    spark:
      - when: before
        script: |
          vars.timestamp = Date.now();
          vars.sessionId = Math.random().toString(36);
          console.log("Starting request...");

      - when: after
        script: |
          if (response.status === 200) {
            vars.token = response.body.match(/token=(\w+)/)[1];
            console.log("Token extracted: " + vars.token);
          } else {
            console.error("Request failed: " + response.status);
          }
```

#### Variables Disponibles:

| Variable               | Disponible   | Descripción                          |
| ---------------------- | ------------ | ------------------------------------ |
| `vars`                 | before/after | Objeto para almacenar/leer variables |
| `response`             | after only   | Objeto con la respuesta              |
| `response.status`      | after only   | Código HTTP                          |
| `response.body`        | after only   | Cuerpo de la respuesta               |
| `response.headers`     | after only   | Headers de respuesta                 |
| `response.duration_ms` | after only   | Tiempo de respuesta                  |
| `console.log()`        | before/after | Para debugging                       |

---

### 3. 🎨 Editor de Código con Syntax Highlighting

El editor de Spark Scripts incluye:

#### Syntax Highlighting por Colores:

| Elemento   | Color     | Ejemplo                                            |
| ---------- | --------- | -------------------------------------------------- | --- | --- |
| Keywords   | 🟣 Purple | `const`, `let`, `if`, `else`, `return`, `function` |
| Strings    | 🟢 Green  | `"hello"`, `'world'`, `` `template` ``             |
| Numbers    | 🟠 Orange | `123`, `3.14`, `0xFF`                              |
| Built-ins  | 🔵 Cyan   | `vars`, `response`, `console`, `Math`, `JSON`      |
| Methods    | 🟡 Yellow | `.log()`, `.match()`, `.parse()`                   |
| Properties | 💗 Pink   | `vars.myVar`, `response.status`                    |
| Comments   | ⚪ Gray   | `// comment`, `/* block */`                        |
| Operators  | ⚪ Gray   | `+`, `-`, `===`, `&&`, `                           |     | `   |

#### Validación en Tiempo Real:

```
┌─────────────────────────────────────────────────┐
│  Código válido:                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ ✓ Syntax OK                    5 lines  │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Código con error:                              │
│  ┌─────────────────────────────────────────┐   │
│  │ ✗ Unexpected token '}'         Line 3   │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

#### Características del Editor:

- ✅ Números de línea
- ✅ Cursor amarillo visible
- ✅ Scroll sincronizado
- ✅ Quick Reference integrado
- ✅ Validación JavaScript en tiempo real
- ✅ Mensajes de error descriptivos
- ✅ Resaltado de línea con error

---

### 4. 🔍 Extractors (Post-Processors)

Capturan valores de las respuestas HTTP.

#### Formato Array (Recomendado):

```yaml
extractors:
  - type: regex
    var: CSRF_TOKEN
    pattern: "csrf_token='([a-f0-9]{32})'"
    match_no: 1
    default: 'NOT_FOUND'

  - type: jsonpath
    var: USER_ID
    expression: '$.data.user.id'
```

#### Tipos Soportados:

| Tipo       | Descripción         |
| ---------- | ------------------- |
| `regex`    | Expresión regular   |
| `jsonpath` | JSONPath expression |
| `xpath`    | XPath expression    |
| `boundary` | Boundary extractor  |

#### Editor Visual:

- Dropdown para seleccionar tipo
- Input para nombre de variable (con color púrpura)
- Textarea para pattern/expression
- Inputs para match_no y default value

---

### 5. ✅ Assertions (Validaciones)

Validan que las respuestas cumplan expectativas.

#### Formato Array:

```yaml
assertions:
  - type: status
    value: 200

  - type: contains
    value: 'success'

  - type: response_time
    max_ms: 2000

  - type: regex
    pattern: "\"status\":\\s*\"ok\""
```

#### Tipos de Assertion:

| Tipo            | Propiedades              | Descripción            |
| --------------- | ------------------------ | ---------------------- |
| `status`        | `value`                  | Status code exacto     |
| `status_in`     | `value[]`                | Status en lista        |
| `contains`      | `value`                  | Body contiene texto    |
| `not_contains`  | `value`                  | Body NO contiene texto |
| `regex`         | `pattern`                | Body matches regex     |
| `response_time` | `max_ms`                 | Tiempo máximo          |
| `response_size` | `min_bytes`, `max_bytes` | Tamaño de respuesta    |
| `header`        | `name`, `value`          | Validar header         |
| `json`          | `path`, `value`          | Validar valor JSON     |

#### Editor Visual:

- Dropdown para seleccionar tipo de assertion
- Inputs editables para value, pattern, name, max_ms

---

### 6. 🎛️ Logic Controllers

#### Group Controller (Transaction Controller):

```yaml
- group:
    name: 'Login Flow'
    steps:
      - request: ...
      - request: ...
```

#### Loop Controller:

```yaml
- loop: 5
  steps:
    - request: ...
    - think_time: 1s
```

#### If Controller:

```yaml
- if: '{{isLoggedIn}} == true'
  steps:
    - request: ...
```

#### Retry Controller:

```yaml
- retry:
    attempts: 3
    backoff: exponential
  steps:
    - request: ...
```

---

### 7. 🖱️ Drag & Drop Rules (Estilo JMeter)

Sistema completo de reglas de organización similar a JMeter.

#### Jerarquía:

```
📁 ROOT (Test Plan)
├── 📋 test
├── 📦 variables
├── 🗄️ data_source
├── ⚙️ http_defaults
├── 📊 metrics
└── 📂 scenarios
     └── 🧵 scenario
          ├── ⚡ load
          ├── 🍪 cookies
          ├── 💾 cache_manager
          ├── ⚠️ error_policy
          └── 📋 steps
               ├── 🌐 request
               │    ├── </> spark_before
               │    ├── </> spark_after
               │    ├── 🔍 extractor
               │    ├── ✅ assertion
               │    └── ⏱️ think_time
               ├── 📦 group
               ├── 🔄 loop
               ├── ❓ if
               └── 🔁 retry
```

#### Categorías de Nodos:

| Categoría      | Elementos                      | Color            |
| -------------- | ------------------------------ | ---------------- |
| Config         | test, variables, http_defaults | 🟠 Orange        |
| Scenario       | scenario, load, cookies        | 🟡 Yellow/Green  |
| Sampler        | request, get, post, etc.       | 🟢 Emerald       |
| Controller     | group, loop, if, retry         | 🔵 Indigo/Violet |
| Pre-Processor  | spark_before                   | 🟠 Orange        |
| Post-Processor | spark_after, extractor         | 🟡 Amber/Blue    |
| Assertion      | assertion, assert              | 🟢 Green         |
| Timer          | think_time                     | 🔵 Cyan          |

---

### 8. 📖 Panel de Detalles

#### Request (Editable):

- Method (dropdown)
- URL (input)
- Headers (editable key-value)
- Body (textarea)
- Spark Scripts (vista resumida)
- Extractors (vista resumida)
- Assertions (vista resumida)
- Think Time

#### Response (Read-Only):

- Status code
- Response time
- Headers
- Body
- **Búsqueda** con:
  - Input de búsqueda
  - Navegación ⬆️⬇️
  - Texto marcado en **amarillo**
  - Auto-scroll al match actual

---

## 🎨 Iconos y Colores

### Iconos Actualizados:

| Tipo                 | Icono Anterior | Icono Nuevo |
| -------------------- | -------------- | ----------- |
| Spark (before/after) | ⚡ Zap         | `</>` Code  |

### Colores por Tipo de Nodo:

```typescript
const colors = {
  root: 'text-orange-400',
  test: 'text-orange-400',
  variables: 'text-neutral-400',
  data_source: 'text-emerald-400',
  scenario: 'text-yellow-400',
  request: 'text-emerald-400',
  group: 'text-indigo-400',
  loop: 'text-violet-400',
  if: 'text-pink-400',
  spark_before: 'text-orange-400',
  spark_after: 'text-amber-400',
  extractor: 'text-blue-400',
  assertion: 'text-green-400',
  think_time: 'text-cyan-400',
};
```

---

## 📁 Archivos Modificados/Creados

### Nuevos Archivos:

| Archivo                              | Descripción                              |
| ------------------------------------ | ---------------------------------------- |
| `src/components/SparkCodeEditor.tsx` | Editor de código con syntax highlighting |
| `docs/PULSE_FORMAT_SUPPORT.md`       | Documentación del formato Pulse          |
| `docs/HIERARCHY_RULES.md`            | Reglas de jerarquía y drag-drop          |
| `docs/CHANGELOG.md`                  | Este documento                           |

### Archivos Modificados:

| Archivo                                 | Cambios                                              |
| --------------------------------------- | ---------------------------------------------------- |
| `src/types/yaml.ts`                     | Nuevos tipos: `spark`, `spark_before`, `spark_after` |
| `src/utils/yamlParser.ts`               | Parser bidireccional YAML ↔ Tree                     |
| `src/utils/yamlDragDropRules.ts`        | Reglas completas estilo JMeter                       |
| `src/components/YAMLTreeNode.tsx`       | Iconos y colores para nuevos tipos                   |
| `src/components/YAMLNodeDetails.tsx`    | Detalles editables para Spark/Assertion/Extractor    |
| `src/components/YAMLRequestDetails.tsx` | Vista de Spark, Extractors, Assertions               |
| `src/components/YAMLEditor.tsx`         | YAML de ejemplo actualizado                          |

---

## 🔧 API de Utilidades

### yamlDragDropRules.ts

```typescript
// Verificar si se puede soltar un nodo
canDrop(draggedType, targetType, position): boolean

// Verificar contenimiento
canContain(containerType, childType): boolean

// Verificar si un nodo se puede mover
canMove(nodeType): boolean

// Obtener targets válidos para drag
getValidDropTargets(draggedType): { containers, siblings }

// Obtener categoría del nodo
getNodeCategory(nodeType): string

// Validar estructura del árbol
validateTreeStructure(tree): { valid, errors }
```

### yamlParser.ts

```typescript
// Parsear YAML a árbol
parseYAMLToTree(yamlString): YAMLNode

// Convertir árbol a YAML
treeToYAML(tree): string
```

---

## 🚀 Uso

### Iniciar el Editor:

```bash
cd "/Users/delvisecheverria/Downloads/YAML EDITOR"
npm install
npm run dev
```

### Build para Producción:

```bash
npm run build
```

---

## 📚 Documentación Relacionada

- [Formato Pulse YAML](./PULSE_FORMAT_SUPPORT.md)
- [Reglas de Jerarquía](./HIERARCHY_RULES.md)
- [Pulse Documentation](../../../Documents/pulse/README.md)
- [Spark Scripts Guide](../../../Documents/pulse/docs/SPARK_SCRIPTS_IMPLEMENTATION.md)
