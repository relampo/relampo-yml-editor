# Especificación YAML de Relampo

**Versión**: 1.1  
**Fecha**: 2026-02-13  
**Estado**: Vigente  
**Compatible con**: Pulse CLI

---

## Tabla de Contenidos

1. [Estructura General](#estructura-general)
2. [Configuración del Test](#configuración-del-test)
3. [Variables y Data Sources](#variables-y-data-sources)
4. [HTTP Defaults](#http-defaults)
5. [Scenarios y Load Configuration](#scenarios-y-load-configuration)
6. [Steps y Requests](#steps-y-requests)
7. [Headers](#headers)
8. [Think Time](#think-time)
9. [Assertions](#assertions)
10. [Extractors](#extractors)
11. [Spark Scripts](#spark-scripts)
12. [Controllers](#controllers)
13. [Data Source](#data-source)
14. [Lógica de Herencia (JMeter-style)](#lógica-de-herencia-jmeter-style)
15. [Files](#files)
16. [Cookies y Cache](#cookies-y-cache)
17. [Métricas y Thresholds](#métricas-y-thresholds)
18. [Ejemplos Completos](#ejemplos-completos)

---

## Estructura General

```yaml
test:
  name: "Nombre del Test"
  description: "Descripción opcional"
  version: "1.0"

variables:
  key: value

data_source:
  type: csv
  file: data.csv
  bind:
    var_name: column_name

http_defaults:
  base_url: "https://api.example.com"
  timeout: "30s"
  headers:
    Accept: "application/json"

scenarios:
  - name: "Scenario Name"
    load:
      type: constant
      users: 10
      duration: 5m
    steps:
      - request: ...
      - think_time: ...
```

---

## Configuración del Test

### Metadatos del Test

```yaml
test:
  name: "Mi Test de Carga"
  description: "Test de API de usuarios"
  version: "1.0"
  author: "Team QA"
  tags:
    - api
    - users
```

**Propiedades**:
- `name` (requerido): Nombre descriptivo del test
- `description` (opcional): Descripción extendida
- `version` (opcional): Versión del script
- `author` (opcional): Autor o equipo
- `tags` (opcional): Lista de etiquetas

---

## Variables y Data Sources

### Variables Globales

```yaml
variables:
  base_url: "https://api.example.com"
  api_key: "secret-key-123"
  timeout: "30s"
  max_retries: 3
```

Las variables se referencian con `{{variable_name}}` en cualquier parte del YAML.

### Data Source Global

```yaml
data_source:
  type: csv
  file: "data/users.csv"
  mode: per_vu          # per_vu | shared
  strategy: sequential  # sequential | random
  bind:
    email: email_column
    password: pass_column
  on_exhausted: recycle # recycle | stop | error
```

**Propiedades**:
- `type`: Tipo de fuente (`csv`, `json`, `inline`)
- `file`: Ruta al archivo
- `mode`: 
  - `per_vu`: Cada usuario virtual tiene su propia iteración
  - `shared`: Todos comparten el data source
- `strategy`:
  - `sequential`: Lee líneas en orden
  - `random`: Lee líneas aleatoriamente
- `bind`: Mapeo de variables a columnas
- `on_exhausted`: Qué hacer cuando se acaban los datos

---

## HTTP Defaults

Configuración HTTP aplicada a todos los requests (a menos que se override).

```yaml
http_defaults:
  base_url: "https://api.example.com"
  timeout: "30s"
  follow_redirects: true
  max_redirects: 5
  headers:
    Accept: "application/json"
    User-Agent: "Relampo/2.0"
    Authorization: "Bearer {{token}}"
```

---

## Scenarios y Load Configuration

### Scenario Básico

```yaml
scenarios:
  - name: "User Flow"
    load:
      type: constant
      users: 10
      duration: "5m"
    steps:
      - request: ...
```

### Tipos de Load

#### Constant Load
```yaml
load:
  type: constant
  users: 50
  duration: "10m"
  ramp_up: "30s"  # Opcional: tiempo de ramp-up
```

#### Ramp Load
```yaml
load:
  type: ramp
  start_users: 1
  end_users: 100
  duration: "10m"
  step_users: 10
  step_duration: "1m"
```

#### Stages Load

> [!WARNING]
> El load type `stages` **NO está soportado actualmente en Pulse v1.1**.  
> Use `constant` o `ramp` en su lugar. Esta feature puede ser implementada en futuras versiones.

```yaml
load:
  type: stages
  stages:
    - users: 10
      duration: "2m"
    - users: 50
      duration: "5m"
    - users: 10
      duration: "2m"
```

### Configuración Adicional del Scenario

```yaml
scenarios:
  - name: "Complete Scenario"
    load:
      type: constant
      users: 10
      duration: "5m"
    
    cookies:
      mode: auto                      # auto | manual | disabled
      persist_across_iterations: true
    
    cache_manager:
      enabled: true
      max_size_mb: 50
    
    error_policy:
      on_4xx: continue  # continue | stop | retry
      on_5xx: retry
      on_timeout: stop
    
    steps:
      - request: ...
```

---

## Steps y Requests

### Request - Forma Corta

```yaml
steps:
  - get: /api/users
  - post: /api/users
  - put: /api/users/123
  - delete: /api/users/123
  - patch: /api/users/123
```

### Request - Forma Completa

```yaml
steps:
  - request:
      name: "Get Users"
      method: GET
      url: /api/users
      headers:
        Authorization: "Bearer {{token}}"
        Content-Type: "application/json"
      params:
        page: 1
        limit: 50
      body:
        name: "John Doe"
        email: "john@example.com"
      timeout: "10s"
      follow_redirects: true
```

**Propiedades del Request**:
- `name` (opcional): Nombre descriptivo
- `method`: GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS
- `url`: Path relativo (si hay base_url) o URL completa
- `headers` (opcional): Headers específicos del request
- `params` (opcional): Query parameters
- `body` (opcional): Cuerpo del request (string, object, array)
- `timeout` (opcional): Override del timeout global
- `follow_redirects` (opcional): Override de follow_redirects

---

## Headers

Los headers se pueden definir de múltiples formas:

### Headers Globales (HTTP Defaults)

```yaml
http_defaults:
  headers:
    Accept: "application/json"
    User-Agent: "Relampo/2.0"
```

### Headers en el Request

```yaml
steps:
  - request:
      method: POST
      url: /api/login
      headers:
        Content-Type: "application/json"
        X-Request-ID: "{{request_id}}"
      body:
        email: "user@example.com"
```

### Headers como Nodo Hijo (Editor)

En el editor visual, los headers de un request se manejan como un nodo contenedor:

```yaml
steps:
  - request:
      method: POST
      url: /api/data
      # Headers se muestra como nodo hijo en el árbol
      # pero en YAML se serializa dentro del request
```

**Características**:
- Nodo tipo `headers` en el árbol
- Color: rojo (`red-400`/`red-500`)
- Icono: Tag
- Badge muestra cantidad de headers
- Edición vía `EditableList` en details panel
- Se posiciona primero en los hijos del request

**Formato en YAML**:
```yaml
headers:
  Content-Type: "application/json"
  Authorization: "Bearer {{token}}"
  X-Custom-Header: "value"
```

---

## Think Time

**Think Time** simula el tiempo que un usuario real esperaría entre acciones.

### Sintaxis

#### Forma Simple
```yaml
steps:
  - think_time: 3s
  - think_time: 500ms
```

#### Dentro de un Request (inline)
```yaml
steps:
  - request:
      method: GET
      url: /api/data
      think_time: 2s    # Se aplica DESPUÉS del request
```

#### Rango Aleatorio
```yaml
steps:
  - think_time:
      min: 1s
      max: 5s
      distribution: uniform  # uniform | normal | poisson
```

#### Distribución Normal
```yaml
steps:
  - think_time:
      mean: 3s
      std_dev: 1s
      distribution: normal
```

### Lógica de Herencia (JMeter-style)

#### Think Time Global
Cuando se define a nivel de `steps` o `scenario`, se aplica **antes de cada request hijo**:

```yaml
scenarios:
  - name: "User Flow"
    steps:
      - think_time: 2s          # GLOBAL: aplica a TODOS los requests
      
      - request:
          method: GET
          url: /api/users       # Espera 2s antes de ejecutar
      
      - request:
          method: POST
          url: /api/data        # Espera 2s antes de ejecutar
```

#### Think Time Específico (Override)
Un request puede override el think_time global:

```yaml
scenarios:
  - name: "User Flow"
    steps:
      - think_time: 2s          # Global
      
      - request:
          method: GET
          url: /api/users       # Usa global: 2s
      
      - request:
          method: POST
          url: /api/checkout
          think_time: 10s       # Override: 10s (usuario piensa más)
      
      - request:
          method: GET
          url: /api/products    # Usa global: 2s
```

**Precedencia**: Request específico > Global

---

## Assertions

**Assertions** validan que las respuestas cumplan con las expectativas.

### Formato Array (Recomendado)

```yaml
steps:
  - request:
      method: GET
      url: /api/products
      assertions:
        - type: status
          value: 200
        
        - type: status_in
          value: [200, 201, 204]
        
        - type: body_contains
          value: "success"
        
        - type: body_not_contains
          value: "error"
        
        - type: regex
          pattern: "\"status\":\\s*\"ok\""
        
        - type: response_time_ms_max
          value: 2000
        
        - type: response_size
          min_bytes: 100
          max_bytes: 50000
        
        - type: header
          name: "Content-Type"
          value: "application/json"
        
        - type: jsonpath
          path: "$.data.status"
          value: "active"
```

### Tipos de Assertion

| Tipo | Descripción | Propiedades |
|------|-------------|-------------|
| `status` | Código de estado exacto | `value: 200` |
| `status_in` | Código en lista | `value: [200, 201]` |
| `body_contains` | Body contiene texto | `value: "texto"` |
| `body_not_contains` | Body no contiene texto | `value: "error"` |
| `regex` | Body coincide con regex | `pattern: "..."` |
| `response_time_ms_max` | Tiempo máximo en ms | `value: 2000` |
| `response_size` | Tamaño de respuesta | `min_bytes`, `max_bytes` |
| `header` | Validar header | `name`, `value` |
| `jsonpath` | Validar valor JSON | `path`, `value` |
| `xpath` | Validar valor XML | `path`, `value` |

### Formato Legacy (Object)

```yaml
steps:
  - request:
      method: GET
      url: /api/data
      assert:
        status: 200
        response_time_ms_max: 1000
        body_contains: "success"
```

### Lógica de Herencia (JMeter-style)

#### Assertions Globales
Cuando se define a nivel de `steps`, valida **todos los requests**:

```yaml
scenarios:
  - name: "User Flow"
    steps:
      - assertions:               # GLOBAL: valida TODOS
          - type: status
            value: 200
          - type: response_time_ms_max
            value: 3000
      
      - request:
          method: GET
          url: /api/users         # Validado con assertions globales
      
      - request:
          method: POST
          url: /api/data          # Validado con assertions globales
```

#### Assertions Específicas (Override)
Un request puede tener sus propias assertions (reemplaza las globales):

```yaml
scenarios:
  - name: "User Flow"
    steps:
      - assertions:               # Global
          - type: status
            value: 200
      
      - request:
          method: GET
          url: /api/users         # Usa globales
      
      - request:
          method: POST
          url: /api/login
          assertions:             # Override completo
            - type: status
              value: 201
            - type: body_contains
              value: "token"
```

**Precedencia**: Request específico REEMPLAZA global (no merge)

---

## Extractors

**Extractors** capturan valores de las respuestas y los guardan en variables.

### Formato Array (Recomendado)

```yaml
steps:
  - request:
      method: POST
      url: /api/login
      extractors:
        - type: regex
          var: CSRF_TOKEN
          pattern: "csrf_token='([a-f0-9]{32})'"
          match_no: 1
          default: "NOT_FOUND"
        
        - type: jsonpath
          var: USER_ID
          expression: "$.data.user.id"
          default: "0"
        
        - type: xpath
          var: TITLE
          expression: "//title/text()"
        
        - type: boundary
          var: SESSION_ID
          left: "sessionId="
          right: ";"
```

### Tipos de Extractor

| Tipo | Descripción | Propiedades |
|------|-------------|-------------|
| `regex` | Expresión regular | `pattern`, `match_no`, `default` |
| `jsonpath` | JSONPath expression | `expression`, `default` |
| `xpath` | XPath expression | `expression`, `default` |
| `boundary` | Extracción por delimitadores | `left`, `right`, `default` |

### Formato Legacy (Object)

```yaml
steps:
  - request:
      method: GET
      url: /api/data
      extract:
        TOKEN: "regex(\"token=([a-f0-9]+)\")"
        USER_ID: "jsonpath(\"$.user.id\")"
```

---

## Spark Scripts

**Spark Scripts** son bloques de JavaScript que se ejecutan antes o después de cada request.

### Sintaxis

```yaml
steps:
  - request:
      name: "My Request"
      method: GET
      url: /api/endpoint
      spark:
        - when: before
          script: |
            vars.timestamp = Date.now();
            vars.requestId = Math.random().toString(36).substring(7);
            console.log("Starting request: " + vars.requestId);
        
        - when: after
          script: |
            if (response.status === 200) {
              console.log("✓ Request successful");
              vars.responseTime = response.duration_ms;
            } else {
              console.error("✗ Request failed: " + response.status);
            }
```

### Variables Disponibles

| Variable | Disponible | Descripción |
|----------|------------|-------------|
| `vars` | before/after | Objeto para variables custom |
| `response` | after only | Objeto con la respuesta |
| `response.status` | after only | Código HTTP |
| `response.body` | after only | Cuerpo de la respuesta |
| `response.headers` | after only | Headers de respuesta |
| `response.duration_ms` | after only | Tiempo en ms |
| `console.log()` | before/after | Logging |

### Casos de Uso

#### Generar UUID
```yaml
spark:
  - when: before
    script: |
      vars.uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0;
        return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
      });
```

#### Validar Respuesta
```yaml
spark:
  - when: after
    script: |
      const data = JSON.parse(response.body);
      if (data.users.length === 0) {
        console.error("No users returned!");
      }
      vars.userCount = data.users.length;
```

#### Extraer Token con Regex
```yaml
spark:
  - when: after
    script: |
      const match = response.body.match(/token=([a-f0-9]+)/);
      if (match) {
        vars.authToken = match[1];
        console.log("Token: " + vars.authToken.substring(0, 8) + "...");
      }
```

---

## Controllers

### Group Controller

Agrupa steps relacionados para mejor organización:

```yaml
steps:
  - group:
      name: "Login Flow"
      steps:
        - request:
            method: GET
            url: /login
        - request:
            method: POST
            url: /api/auth/login
```

### Loop Controller

Repite steps N veces:

```yaml
steps:
  - loop: 5
    steps:
      - request:
          method: GET
          url: /api/item/{{__counter}}
      - think_time: 1s
```

**Variables disponibles**:
- `{{__counter}}`: Índice actual del loop (1-based)
- `{{loop_index}}`: Índice actual (0-based)

### If Controller

Ejecuta steps condicionalmente:

```yaml
steps:
  - if: "{{isLoggedIn}} == true"
    steps:
      - request:
          method: GET
          url: /api/dashboard
```

**Operadores soportados**:
- `==`, `!=`
- `>`, `<`, `>=`, `<=`
- `&&`, `||`
- `contains`, `!contains`

### Retry Controller

Reintenta requests en caso de error:

```yaml
steps:
  - retry:
      attempts: 3
      on: [500, 502, 503]
      backoff: exponential
      initial_delay: 1s
      max_delay: 10s
    steps:
      - request:
          method: POST
          url: /api/payment
```

**Estrategias de backoff**:
- `fixed`: Delay fijo
- `exponential`: Delay exponencial (1s, 2s, 4s, 8s...)
- `linear`: Incremento lineal (1s, 2s, 3s...)

### On Error Controller

Define comportamiento en caso de error:

```yaml
steps:
  - on_error:
      action: continue  # continue | stop | retry
    steps:
      - request:
          method: DELETE
          url: /api/cleanup
```

---

## Data Source

Además del data source global, se puede definir un data source específico para un request o grupo de requests.

### Lógica de Herencia (JMeter-style)

#### Data Source Global
```yaml
scenarios:
  - name: "User Flow"
    steps:
      - data_source:          # GLOBAL: disponible para todos
          type: csv
          file: users.csv
          bind:
            email: email
            password: password
      
      - request:
          method: POST
          url: /api/login
          body:
            email: "{{email}}"      # Usa data source global
            password: "{{password}}"
      
      - request:
          method: GET
          url: /api/profile         # También puede usar las variables
```

#### Data Source Específico (Override)
```yaml
scenarios:
  - name: "User Flow"
    steps:
      - data_source:          # Global
          type: csv
          file: users.csv
          bind:
            email: email
      
      - request:
          method: GET
          url: /api/public      # Usa global
      
      - request:
          method: POST
          url: /api/admin/action
          data_source:          # Override
            type: csv
            file: admin_users.csv
            bind:
              admin_email: email
          body:
            email: "{{admin_email}}"
```

**Precedencia**: Request específico > Global

---

## Lógica de Herencia (JMeter-style)

Relampo adopta la lógica de herencia de JMeter para `think_time`, `assertions` y `data_source`:

### Principio General

**Elementos definidos a nivel de `steps` (o `scenario`/`group`) se aplican a TODOS los requests hijos.**

**Elementos definidos dentro de un `request` específico override (reemplazan) la configuración global para ese request.**

### Resumen de Precedencia

| Elemento | Global (steps) | Específico (request) | Comportamiento |
|----------|----------------|----------------------|----------------|
| `think_time` | Aplica antes de todos | Override para ese request | Específico > Global |
| `assertions` | Valida todos | Override (reemplaza) | Específico REEMPLAZA Global |
| `data_source` | Variables para todos | Override | Específico > Global |

### Alcance por Nivel

```yaml
scenarios:
  - name: "User Flow"
    steps:
      - think_time: 2s          # Alcance: todos los requests en este scenario
      
      - group:
          name: "Login Flow"
          steps:
            - think_time: 1s    # Alcance: solo requests en este group (override)
            
            - request:
                method: POST
                url: /api/login
                think_time: 5s  # Alcance: solo este request (override)
```

### Compatibilidad hacia Atrás

**El formato actual (elementos inline en request) sigue funcionando:**

```yaml
steps:
  - request:
      method: GET
      url: /api/users
      think_time: 2s
      assertions:
        - type: status
          value: 200
```

**El nuevo formato (herencia) también es válido:**

```yaml
steps:
  - think_time: 2s
  - assertions:
      - type: status
        value: 200
  
  - request:
      method: GET
      url: /api/users
```

**Ambos son válidos y se pueden mezclar.**

---

## Files

Permite adjuntar archivos en requests multipart/form-data:

```yaml
steps:
  - request:
      method: POST
      url: /api/upload
      headers:
        Content-Type: "multipart/form-data"
      files:
        - field: "avatar"
          path: "data/avatar.png"
          mime: "image/png"
        
        - field: "document"
          path: "data/doc.pdf"
          mime: "application/pdf"
```

**Propiedades**:
- `field`: Nombre del campo en el form
- `path`: Ruta al archivo
- `mime`: Tipo MIME (opcional, se detecta automáticamente)

---

## Cookies y Cache

### Cookie Manager

```yaml
scenarios:
  - name: "User Flow"
    cookies:
      mode: auto                      # auto | manual | disabled
      persist_across_iterations: true
      clear_on_error: false
```

**Modos**:
- `auto`: Manejo automático de cookies (como navegador)
- `manual`: Control manual vía Spark Scripts
- `disabled`: Sin cookies

### Cache Manager

```yaml
scenarios:
  - name: "User Flow"
    cache_manager:
      enabled: true
      max_size_mb: 50
      clear_each_iteration: false
```

---

## Métricas y Thresholds

### Configuración de Métricas

```yaml
metrics:
  percentiles: [50, 90, 95, 99]
  error_policy: continue
  check_status: true
  custom_metrics:
    - name: login_success_rate
      type: counter
    - name: cart_value
      type: gauge
```

### Thresholds

```yaml
metrics:
  thresholds:
    response_time_p95: 1000      # P95 < 1000ms
    response_time_p99: 3000      # P99 < 3000ms
    error_rate: 0.01             # Error rate < 1%
    http_req_duration: 500       # Media < 500ms
```

---

## Ejemplos Completos

### Ejemplo 1: E-Commerce Flow con Herencia

```yaml
test:
  name: "E-Commerce User Journey"
  version: "2.0"

data_source:
  type: csv
  file: data/users.csv
  bind:
    user_email: email
    user_password: password

http_defaults:
  base_url: "https://shop.example.com"
  timeout: "10s"
  headers:
    Accept: "application/json"

scenarios:
  - name: "Browse and Buy"
    load:
      type: constant
      users: 50
      duration: "10m"
    
    cookies:
      mode: auto
    
    steps:
      # Configuración global para todo el scenario
      - data_source:
          type: csv
          file: users.csv
          bind:
            email: email
            password: password
      
      - think_time: 2s
      
      - assertions:
          - type: status
            value: 200
          - type: response_time_ms_max
            value: 3000
      
      # Login
      - request:
          name: "Login"
          method: POST
          url: /api/login
          headers:
            Content-Type: "application/json"
          body:
            email: "{{user_email}}"
            password: "{{user_password}}"
          extractors:
            - type: jsonpath
              var: TOKEN
              expression: "$.token"
          assertions:
            - type: status
              value: 201
            - type: body_contains
              value: "token"
      
      # Browse products (hereda think_time: 2s y assertions globales)
      - request:
          name: "Browse Products"
          method: GET
          url: /api/products
          headers:
            Authorization: "Bearer {{TOKEN}}"
      
      # View product detail
      - request:
          name: "View Product"
          method: GET
          url: /api/products/123
          headers:
            Authorization: "Bearer {{TOKEN}}"
      
      # Add to cart
      - request:
          name: "Add to Cart"
          method: POST
          url: /api/cart
          headers:
            Authorization: "Bearer {{TOKEN}}"
            Content-Type: "application/json"
          body:
            product_id: 123
            quantity: 1
      
      # Checkout (usuario piensa más)
      - request:
          name: "Checkout"
          method: POST
          url: /api/checkout
          think_time: 10s         # Override: 10s en lugar de 2s
          headers:
            Authorization: "Bearer {{TOKEN}}"
            Content-Type: "application/json"
          assertions:
            - type: status
              value: 201          # Override assertions
            - type: body_contains
              value: "order_id"
          body:
            payment_method: "credit_card"
```

### Ejemplo 2: API Test con Spark Scripts

```yaml
test:
  name: "API Integration Test"
  version: "2.0"

variables:
  base_url: "https://api.example.com"

http_defaults:
  base_url: "{{base_url}}"
  timeout: "30s"

scenarios:
  - name: "API Flow"
    load:
      type: constant
      users: 10
      duration: "5m"
    
    steps:
      # Global config
      - assertions:
          - type: status_in
            value: [200, 201, 204]
          - type: response_time_ms_max
            value: 5000
      
      - think_time:
          min: 1s
          max: 3s
          distribution: normal
      
      # Get CSRF Token
      - request:
          name: "Get CSRF"
          method: GET
          url: /login
          spark:
            - when: before
              script: |
                vars.sessionStart = Date.now();
                console.log("Starting session...");
            
            - when: after
              script: |
                if (response.status !== 200) {
                  console.error("Failed to get CSRF token");
                }
          extractors:
            - type: regex
              var: CSRF_TOKEN
              pattern: "csrf_token='([a-f0-9]+)'"
              default: "NO_TOKEN"
      
      # Submit Login
      - request:
          name: "Login"
          method: POST
          url: /api/auth/login
          headers:
            Content-Type: "application/json"
          body: |
            {
              "email": "test@example.com",
              "password": "secret123",
              "csrf": "{{CSRF_TOKEN}}"
            }
          spark:
            - when: after
              script: |
                const duration = Date.now() - vars.sessionStart;
                console.log("Login completed in " + duration + "ms");
                
                if (response.body.includes("Welcome")) {
                  vars.loginSuccess = true;
                } else {
                  vars.loginSuccess = false;
                  console.error("Login failed!");
                }
          extractors:
            - type: jsonpath
              var: AUTH_TOKEN
              expression: "$.data.token"
          assertions:
            - type: status
              value: 200
            - type: body_contains
              value: "Welcome"
      
      # Fetch data (con retry)
      - retry:
          attempts: 3
          on: [500, 502, 503]
          backoff: exponential
          initial_delay: 1s
        steps:
          - request:
              name: "Fetch Data"
              method: GET
              url: /api/data
              headers:
                Authorization: "Bearer {{AUTH_TOKEN}}"
```

### Ejemplo 3: Multi-Group Flow

```yaml
test:
  name: "Complex Multi-Group Test"
  version: "2.0"

scenarios:
  - name: "User Journey"
    load:
      type: ramp
      start_users: 1
      end_users: 100
      duration: "15m"
    
    steps:
      # Global config
      - think_time: 2s
      - assertions:
          - type: status
            value: 200
      
      # Group 1: Authentication
      - group:
          name: "Authentication"
          steps:
            - request:
                name: "Login"
                method: POST
                url: /api/login
                body:
                  email: "user@example.com"
                  password: "secret"
                extractors:
                  - type: jsonpath
                    var: TOKEN
                    expression: "$.token"
      
      # Group 2: User Operations
      - group:
          name: "User Operations"
          steps:
            - loop: 5
              steps:
                - request:
                    name: "List Items"
                    method: GET
                    url: /api/items?page={{__counter}}
                    headers:
                      Authorization: "Bearer {{TOKEN}}"
                
                - think_time: 1s
            
            - request:
                name: "Create Item"
                method: POST
                url: /api/items
                headers:
                  Authorization: "Bearer {{TOKEN}}"
                  Content-Type: "application/json"
                body:
                  name: "New Item"
                  price: 99.99
      
      # Conditional: Only if logged in
      - if: "{{TOKEN}} != null"
        steps:
          - request:
              name: "Access Dashboard"
              method: GET
              url: /api/dashboard
              headers:
                Authorization: "Bearer {{TOKEN}}"
```

---

## Notas Finales

### Compatibilidad

Esta especificación mantiene **100% compatibilidad hacia atrás** con scripts existentes. Los formatos legacy (object) y nuevos (array) se pueden mezclar.

### Mejores Prácticas

1. **Usa herencia para DRY**: Define configuración global (think_time, assertions) a nivel steps
2. **Override cuando sea necesario**: Solo requests especiales necesitan configuración custom
3. **Usa Spark Scripts para lógica compleja**: Mejor que múltiples extractors/assertions
4. **Agrupa requests relacionados**: Usa `group` para mejor organización
5. **Usa variables**: No hardcodees valores, usa `{{variables}}`
6. **Valida respuestas**: Siempre define assertions para detectar fallos

### Estado de Implementación

- ✅ **Especificación**: Completa y vigente
- ✅ **Parser (Editor)**: Implementado
- ✅ **Editor Visual**: Implementado
- ⏳ **Motor de Ejecución**: Herencia JMeter pendiente en backend
- ⏳ **Validación avanzada**: En desarrollo

---

**Autor**: Relampo Team  
**Última actualización**: 2026-02-12  
**Versión**: 2.0
