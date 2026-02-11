# 🔥 Pulse YAML Format Support

Este documento describe el soporte del YAML Editor para el formato de **Pulse** - la herramienta de load testing con Spark Scripts.

## Tabla de Contenidos
- [Estructura General](#estructura-general)
- [Spark Scripts](#spark-scripts)
- [Extractors](#extractors)
- [Assertions](#assertions)
- [Controllers](#controllers)
- [Ejemplos Completos](#ejemplos-completos)

---

## Estructura General

El formato Pulse YAML tiene la siguiente estructura:

```yaml
test:
  name: "Nombre del Test"
  description: "Descripción"
  version: "1.0"

variables:
  key: value

data_source:
  type: csv
  file: data/users.csv
  bind:
    email: email_column

http_defaults:
  base_url: "https://api.example.com"
  timeout: 30s
  headers:
    User-Agent: "Pulse/1.0"

scenarios:
  - name: "Scenario Name"
    load:
      type: constant
      users: 10
      duration: 5m
    steps:
      - request: ...
```

---

## ⚡ Spark Scripts

Spark Scripts son bloques de JavaScript que se ejecutan **antes** o **después** de cada request.

### Sintaxis

```yaml
- request:
    name: "My Request"
    method: GET
    url: /api/endpoint
    spark:
      - when: before
        script: |
          // Código JavaScript ejecutado ANTES del request
          vars.timestamp = Date.now();
          vars.requestId = Math.random().toString(36).substring(7);
          console.log("Starting request: " + vars.requestId);
      
      - when: after
        script: |
          // Código JavaScript ejecutado DESPUÉS del request
          if (response.status === 200) {
            console.log("✓ Request successful");
            vars.responseTime = response.duration_ms;
          } else {
            console.error("✗ Request failed: " + response.status);
          }
```

### Variables Disponibles en Spark

| Variable | Disponible | Descripción |
|----------|------------|-------------|
| `vars` | before/after | Objeto para almacenar/leer variables |
| `response` | after only | Objeto con la respuesta del request |
| `response.status` | after only | Código de estado HTTP |
| `response.body` | after only | Cuerpo de la respuesta |
| `response.headers` | after only | Headers de la respuesta |
| `response.duration_ms` | after only | Tiempo de respuesta en ms |
| `console.log()` | before/after | Función para logging |

### Casos de Uso Comunes

#### 1. Generar datos dinámicos
```yaml
spark:
  - when: before
    script: |
      vars.uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0;
        return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
      });
```

#### 2. Validar respuestas
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

#### 3. Extraer tokens dinámicamente
```yaml
spark:
  - when: after
    script: |
      const match = response.body.match(/token=([a-f0-9]+)/);
      if (match) {
        vars.authToken = match[1];
        console.log("Token extracted: " + vars.authToken.substring(0, 8) + "...");
      }
```

---

## 🔍 Extractors

Los extractors permiten capturar valores de las respuestas y guardarlos en variables.

### Formato Array (Recomendado)

```yaml
- request:
    method: GET
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
```

### Propiedades del Extractor

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `type` | string | Tipo: `regex`, `jsonpath`, `xpath`, `boundary` |
| `var` | string | Nombre de la variable a crear |
| `pattern` | string | Patrón de extracción (para regex) |
| `expression` | string | Expresión (para jsonpath/xpath) |
| `match_no` | number | Número de coincidencia (1 = primera) |
| `default` | string | Valor por defecto si no se encuentra |

### Formato Legacy (Object)

También se soporta el formato objeto para compatibilidad:

```yaml
- request:
    method: GET
    url: /api/data
    extract:
      TOKEN: "regex(\"token=([a-f0-9]+)\")"
      USER_ID: "jsonpath(\"$.user.id\")"
```

---

## ✅ Assertions

Las assertions validan que las respuestas cumplan con las expectativas.

### Formato Array (Recomendado)

```yaml
- request:
    method: GET
    url: /api/products
    assertions:
      - type: status
        value: 200
      
      - type: status_in
        value: [200, 201, 204]
      
      - type: contains
        value: "success"
      
      - type: not_contains
        value: "error"
      
      - type: regex
        pattern: "\"status\":\\s*\"ok\""
      
      - type: response_time
        max_ms: 2000
      
      - type: response_size
        min_bytes: 100
        max_bytes: 50000
      
      - type: header
        name: Content-Type
        value: "application/json"
      
      - type: json
        path: "$.data.status"
        value: "active"
```

### Tipos de Assertion

| Tipo | Descripción | Propiedades |
|------|-------------|-------------|
| `status` | Código de estado exacto | `value: 200` |
| `status_in` | Código en lista | `value: [200, 201]` |
| `contains` | Body contiene texto | `value: "texto"` |
| `not_contains` | Body no contiene texto | `value: "error"` |
| `regex` | Body coincide con regex | `pattern: "..."` |
| `response_time` | Tiempo máximo de respuesta | `max_ms: 2000` |
| `response_size` | Tamaño de respuesta | `min_bytes`, `max_bytes` |
| `header` | Validar header | `name`, `value` |
| `json` | Validar valor JSON | `path`, `value` |

### Formato Legacy (Object)

```yaml
- request:
    method: GET
    url: /api/data
    assert:
      status: 200
      contains: "success"
```

---

## 🎛️ Controllers

### Group Controller
Agrupa steps relacionados:

```yaml
- group:
    name: "Login Flow"
    steps:
      - request: ...
      - request: ...
```

### Loop Controller
Repite steps N veces:

```yaml
- loop: 5
  steps:
    - request:
        method: GET
        url: /api/item/${__counter}
    - think_time: 1s
```

### If Controller
Ejecuta steps condicionalmente:

```yaml
- if: "{{isLoggedIn}} == true"
  steps:
    - request:
        method: GET
        url: /api/dashboard
```

### Think Time
Pausa entre requests:

```yaml
# Forma simple
- think_time: 3s

# Dentro de un request
- request:
    method: GET
    url: /api/data
    think_time: "2s"

# Rango aleatorio
- think_time:
    min: 2s
    max: 5s
```

---

## Ejemplos Completos

### Ejemplo 1: Login con Spark Scripts

```yaml
test:
  name: "Login Test with Spark"
  version: "1.0"

variables:
  email: "test@example.com"
  password: "secret123"

http_defaults:
  base_url: "https://api.example.com"
  headers:
    Accept: "application/json"

scenarios:
  - name: "User Login"
    load:
      users: 10
      duration: 5m
    cookies:
      mode: auto
    steps:
      - request:
          name: "01 - Get CSRF Token"
          method: GET
          url: /login
          spark:
            - when: before
              script: |
                vars.sessionStart = Date.now();
                console.log("Starting login flow...");
            - when: after
              script: |
                if (response.status !== 200) {
                  console.error("Failed to load login page");
                }
          extractors:
            - type: regex
              var: CSRF_TOKEN
              pattern: "csrf_token='([a-f0-9]+)'"
              default: "NO_TOKEN"
          assertions:
            - type: status
              value: 200

      - think_time: 2s

      - request:
          name: "02 - Submit Login"
          method: POST
          url: /api/auth/login
          headers:
            Content-Type: "application/json"
          body: |
            {
              "email": "{{email}}",
              "password": "{{password}}",
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
            - type: contains
              value: "Welcome"
            - type: response_time
              max_ms: 3000
```

### Ejemplo 2: E-commerce Flow

```yaml
test:
  name: "E-commerce User Journey"
  version: "1.0"

data_source:
  type: csv
  file: data/users.csv
  bind:
    email: email
    password: password

scenarios:
  - name: "Browse and Buy"
    load:
      type: ramp
      start_users: 1
      end_users: 50
      duration: 10m
    steps:
      - group:
          name: "Authentication"
          steps:
            - request:
                name: "Login"
                method: POST
                url: /api/login
                body: '{"email":"{{email}}","password":"{{password}}"}'
                extractors:
                  - type: jsonpath
                    var: TOKEN
                    expression: "$.token"
                assertions:
                  - type: status
                    value: 200

      - think_time: 3s

      - group:
          name: "Shopping"
          steps:
            - loop: 5
              steps:
                - request:
                    name: "Browse Products"
                    method: GET
                    url: /api/products?page={{__counter}}
                    headers:
                      Authorization: "Bearer {{TOKEN}}"
                    assertions:
                      - type: status
                        value: 200
                - think_time: 2s

            - request:
                name: "Add to Cart"
                method: POST
                url: /api/cart/add
                headers:
                  Authorization: "Bearer {{TOKEN}}"
                body: '{"product_id": 123, "quantity": 1}'
                spark:
                  - when: after
                    script: |
                      if (response.status === 200) {
                        vars.cartItems = (vars.cartItems || 0) + 1;
                        console.log("Cart items: " + vars.cartItems);
                      }
                assertions:
                  - type: status
                    value: 200
```

---

## Visualización en el Editor

El YAML Editor muestra los elementos de Pulse de forma visual:

- ⚡ **Spark Scripts** - Nodos naranjas/ámbar (before/after)
- 🔍 **Extractors** - Nodos azules con el nombre de variable
- ✅ **Assertions** - Nodos verdes con el tipo de validación
- ⏱️ **Think Time** - Nodos cyan con la duración
- 📦 **Groups** - Nodos índigo contenedores
- 🔄 **Loops** - Nodos violeta con contador

Al seleccionar un nodo, el panel de detalles muestra todas sus propiedades editables.

---

## Compatibilidad

El editor soporta tanto el formato **Pulse** (arrays) como el formato **legacy** (objetos):

| Feature | Formato Pulse | Formato Legacy |
|---------|---------------|----------------|
| Extractors | `extractors: [{...}]` | `extract: {key: value}` |
| Assertions | `assertions: [{...}]` | `assert: {key: value}` |
| Spark | `spark: [{when, script}]` | N/A |

Ambos formatos se pueden mezclar y el editor los parseará correctamente.

---

## Recursos Adicionales

- [Pulse Documentation](../../../Documents/pulse/README.md)
- [Spark Scripts Guide](../../../Documents/pulse/docs/SPARK_SCRIPTS_IMPLEMENTATION.md)
- [Load Testing Best Practices](../../../Documents/pulse/docs/PREPROCESADORES_Y_FUNCIONES_BUILTIN.md)
