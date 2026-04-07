# 🎯 Pulse YAML Editor - Hierarchy & Drag-Drop Rules

Este documento describe las reglas de jerarquía y organización de elementos, similar a cómo JMeter organiza sus componentes.

## 📊 Jerarquía Visual

```
📁 ROOT (Test Plan)
│
├── 📋 test                    [Test Metadata]
│
├── 📦 variables               [User Defined Variables]
│
├── 🗄️ data_source             [CSV Data Set Config]
│
├── ⚙️ http_defaults           [HTTP Request Defaults]
│
├── 📊 metrics                 [Listeners/Reporters]
│
└── 📂 scenarios               [Thread Groups Container]
     │
     └── 🧵 scenario           [Thread Group]
          │
          ├── ⚡ load          [Thread Properties: users, duration, ramp_up]
          │
          ├── 🍪 cookies       [HTTP Cookie Manager]
          │
          ├── 💾 cache_manager [HTTP Cache Manager]
          │
          ├── ⚠️ error_policy  [Error Handler]
          │
          └── 📋 steps         [Test Fragment Container]
               │
               ├── 🌐 request  [HTTP Sampler] ─────────────────────────┐
               │    │                                                   │
               │    ├── ⚡ spark_before  [JSR223 PreProcessor]         │
               │    ├── ⚡ spark_after   [JSR223 PostProcessor]        │
               │    ├── 🔍 extractor     [Post-Processor/Extractor]    │ Sampler
               │    ├── ✅ assertion     [Response Assertion]          │ Children
               │    └── ⏱️ think_time    [Constant Timer]              │
               │                                                        │
               ├── 📦 group    [Transaction Controller] ───────────────┤
               │    └── (puede contener requests, controllers, timers) │
               │                                                        │
               ├── 🔄 loop     [Loop Controller] ──────────────────────┤
               │    └── (puede contener requests, controllers, timers) │
               │                                                        │
               ├── ❓ if       [If Controller] ────────────────────────┤
               │    └── (puede contener requests, controllers, timers) │
               │                                                        │
               ├── 🔁 retry    [Retry Controller] ─────────────────────┤
               │    └── (puede contener requests, controllers, timers) │
               │                                                        │
               └── ⏱️ think_time [Constant Timer] ─────────────────────┘
```

---

## 📦 Categorías de Elementos

### 🔧 Config Elements (Nivel Root)

Elementos de configuración global del test.

| Elemento        | Descripción                                     | Equivalente JMeter     |
| --------------- | ----------------------------------------------- | ---------------------- |
| `test`          | Metadatos del test (name, description, version) | Test Plan              |
| `variables`     | Variables definidas por el usuario              | User Defined Variables |
| `data_source`   | Fuente de datos CSV/JSON                        | CSV Data Set Config    |
| `http_defaults` | Configuración HTTP por defecto                  | HTTP Request Defaults  |
| `metrics`       | Configuración de métricas                       | Listeners              |

### 🧵 Scenario Elements

Elementos que configuran un escenario (Thread Group).

| Elemento        | Descripción            | Equivalente JMeter      |
| --------------- | ---------------------- | ----------------------- |
| `scenario`      | Un escenario de prueba | Thread Group            |
| `load`          | Configuración de carga | Thread Group Properties |
| `cookies`       | Gestión de cookies     | HTTP Cookie Manager     |
| `cache_manager` | Gestión de caché       | HTTP Cache Manager      |
| `error_policy`  | Política de errores    | -                       |

### 🌐 HTTP Samplers

Elementos que realizan peticiones HTTP.

| Elemento  | Descripción            | Equivalente JMeter     |
| --------- | ---------------------- | ---------------------- |
| `request` | Petición HTTP completa | HTTP Request           |
| `get`     | GET shorthand          | HTTP Request (GET)     |
| `post`    | POST shorthand         | HTTP Request (POST)    |
| `put`     | PUT shorthand          | HTTP Request (PUT)     |
| `delete`  | DELETE shorthand       | HTTP Request (DELETE)  |
| `patch`   | PATCH shorthand        | HTTP Request (PATCH)   |
| `head`    | HEAD shorthand         | HTTP Request (HEAD)    |
| `options` | OPTIONS shorthand      | HTTP Request (OPTIONS) |

### 🎛️ Logic Controllers

Elementos que controlan el flujo de ejecución.

| Elemento | Descripción                | Equivalente JMeter     |
| -------- | -------------------------- | ---------------------- |
| `group`  | Agrupa steps relacionados  | Transaction Controller |
| `simple` | Controlador simple         | Simple Controller      |
| `loop`   | Repite N veces             | Loop Controller        |
| `if`     | Ejecución condicional      | If Controller          |
| `retry`  | Reintenta en caso de error | -                      |

### ⚡ Pre-Processors

Elementos que se ejecutan ANTES del sampler.

| Elemento       | Descripción                   | Equivalente JMeter  |
| -------------- | ----------------------------- | ------------------- |
| `spark_before` | Script JavaScript pre-request | JSR223 PreProcessor |

### 🔄 Post-Processors

Elementos que se ejecutan DESPUÉS del sampler.

| Elemento      | Descripción                    | Equivalente JMeter   |
| ------------- | ------------------------------ | -------------------- |
| `spark_after` | Script JavaScript post-request | JSR223 PostProcessor |
| `extractor`   | Extrae valores de la respuesta | JSON/Regex Extractor |
| `extract`     | Formato legacy de extractor    | -                    |

### ✅ Assertions

Elementos que validan las respuestas.

| Elemento    | Descripción                 | Equivalente JMeter |
| ----------- | --------------------------- | ------------------ |
| `assertion` | Validación de respuesta     | Response Assertion |
| `assert`    | Formato legacy de assertion | -                  |

### ⏱️ Timers

Elementos que agregan pausas.

| Elemento     | Descripción          | Equivalente JMeter |
| ------------ | -------------------- | ------------------ |
| `think_time` | Pausa entre requests | Constant Timer     |

---

## 📜 Reglas de Contenimiento

### ¿Qué puede contener cada elemento?

```
┌─────────────────────┬──────────────────────────────────────────────────────┐
│ Contenedor          │ Hijos Permitidos                                     │
├─────────────────────┼──────────────────────────────────────────────────────┤
│ root                │ test, variables, data_source, http_defaults,         │
│                     │ scenarios, metrics                                   │
├─────────────────────┼──────────────────────────────────────────────────────┤
│ scenarios           │ scenario                                             │
├─────────────────────┼──────────────────────────────────────────────────────┤
│ scenario            │ load, cookies, cache_manager, error_policy, steps    │
├─────────────────────┼──────────────────────────────────────────────────────┤
│ steps               │ request, get, post, put, delete, patch, head,        │
│                     │ options, group, simple, if, loop, retry, think_time  │
├─────────────────────┼──────────────────────────────────────────────────────┤
│ request/get/post... │ spark_before, spark_after, extractor, extract,       │
│                     │ assertion, assert, think_time                        │
├─────────────────────┼──────────────────────────────────────────────────────┤
│ group/if/loop/retry │ request, get, post, put, delete, patch, head,        │
│                     │ options, group, simple, if, loop, retry, think_time  │
├─────────────────────┼──────────────────────────────────────────────────────┤
│ Leaf nodes          │ (No pueden contener hijos)                           │
│ (test, variables,   │                                                      │
│  assertion, etc.)   │                                                      │
└─────────────────────┴──────────────────────────────────────────────────────┘
```

---

## 🔄 Reglas de Drag & Drop

### Reglas de "Siblings" (Hermanos)

Elementos que pueden estar al mismo nivel y reordenarse entre sí:

| Grupo            | Elementos                                                       |
| ---------------- | --------------------------------------------------------------- |
| Root Level       | test, variables, data_source, http_defaults, scenarios, metrics |
| Scenarios        | scenario (solo entre otros scenarios)                           |
| Scenario Config  | load, cookies, cache_manager, error_policy                      |
| Steps            | request, get, post, ..., group, loop, if, retry, think_time     |
| Sampler Children | spark_before, spark_after, extractor, assertion, think_time     |

### Operaciones de Drop

| Posición | Descripción                    | Regla                       |
| -------- | ------------------------------ | --------------------------- |
| `inside` | Soltar DENTRO de un contenedor | Verificar `canContain()`    |
| `before` | Soltar ANTES de un elemento    | Verificar `canBeSiblings()` |
| `after`  | Soltar DESPUÉS de un elemento  | Verificar `canBeSiblings()` |

### Elementos Inmovibles

Los siguientes elementos NO pueden ser arrastrados:

- `root` - El nodo raíz del test
- `test` - Metadatos del test (siempre primero)
- `scenarios` - Contenedor de scenarios
- `steps` - Contenedor de steps dentro de scenario

---

## 📝 Ejemplos de Organización Válida

### ✅ Correcto: Request con children

```yaml
- request:
    name: 'Login'
    method: POST
    url: /api/login
    spark: # ⚡ Pre/Post processors
      - when: before
        script: |
          vars.timestamp = Date.now();
      - when: after
        script: |
          vars.token = response.body.match(/token=(\w+)/)[1];
    extractors: # 🔍 Extractors
      - type: regex
        var: TOKEN
        pattern: 'token=([a-f0-9]+)'
    assertions: # ✅ Assertions
      - type: status
        value: 200
    think_time: '3s' # ⏱️ Timer
```

### ✅ Correcto: Controllers anidados

```yaml
steps:
  - group:
      name: 'Authentication'
      steps:
        - request:
            name: 'Get Token'
            method: GET
            url: /token

        - loop: 3
          steps:
            - request:
                name: 'Retry Login'
                method: POST
                url: /login
            - think_time: 1s

        - if: '{{loginSuccess}} == true'
          steps:
            - request:
                name: 'Dashboard'
                method: GET
                url: /dashboard
```

### ❌ Incorrecto: Controller dentro de Request

```yaml
# ❌ ESTO NO ES VÁLIDO
- request:
    name: "Login"
    method: POST
    url: /login
    # ❌ Los requests NO pueden contener loops
    - loop: 3
      steps:
        - request: ...
```

### ❌ Incorrecto: Request a nivel de root

```yaml
# ❌ ESTO NO ES VÁLIDO
test:
  name: "My Test"

# ❌ Los requests deben estar dentro de scenarios > steps
- request:
    method: GET
    url: /api
```

---

## 🔍 Validación de Estructura

El editor incluye validación automática que detecta:

1. **Hijos inválidos**: Elementos colocados en contenedores incorrectos
2. **Estructura rota**: Elementos faltantes o mal organizados
3. **Ciclos**: Referencias circulares (no permitidas)

### API de Validación

```typescript
import { validateTreeStructure } from './utils/yamlDragDropRules';

const result = validateTreeStructure(tree);
// result.valid: boolean
// result.errors: string[]  - Lista de errores encontrados
```

---

## 🎨 Indicadores Visuales en el Editor

El editor usa colores para identificar categorías:

| Categoría     | Color      | Icono |
| ------------- | ---------- | ----- |
| Root/Test     | 🟠 Orange  | 📋    |
| Variables     | ⚪ Neutral | 📦    |
| Data Source   | 🟢 Emerald | 🗄️    |
| HTTP Defaults | ⚪ Neutral | ⚙️    |
| Scenarios     | 🟣 Purple  | 📂    |
| Scenario      | 🟡 Yellow  | ⚡    |
| Load          | 🟢 Green   | 📊    |
| Steps         | 🟠 Orange  | 📋    |
| Request       | 🟢 Emerald | 🌐    |
| Group         | 🔵 Indigo  | 📦    |
| Loop          | 🟣 Violet  | 🔄    |
| If            | 💗 Pink    | ❓    |
| Retry         | 🟡 Amber   | 🔁    |
| Spark Before  | 🟠 Orange  | ⚡    |
| Spark After   | 🟡 Amber   | ⚡    |
| Extractor     | 🔵 Blue    | 🔍    |
| Assertion     | 🟢 Green   | ✅    |
| Think Time    | 🔵 Cyan    | ⏱️    |
| Cookies       | 💗 Pink    | 🍪    |

---

## 📚 Referencias

- [JMeter Test Plan Elements](https://jmeter.apache.org/usermanual/test_plan.html)
- [JMeter Controller Reference](https://jmeter.apache.org/usermanual/component_reference.html#logic_controllers)
- [Pulse YAML Format](./PULSE_FORMAT_SUPPORT.md)
