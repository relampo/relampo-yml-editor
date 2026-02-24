# 🚀 Tutorial: Scripting con Relampo YAML Editor

Bienvenido al tutorial completo para crear pruebas de carga con el Relampo YAML Editor. Este editor visual te permite crear scripts de pruebas de carga de forma intuitiva, sin necesidad de escribir YAML manualmente.

## 📋 Tabla de Contenidos

1. [Introducción](#introducción)
2. [Interfaz del Editor](#interfaz-del-editor)
3. [Creando tu Primera Prueba](#creando-tu-primera-prueba)
4. [Trabajando con Requests](#trabajando-con-requests)
5. [Variables y Extracción de Datos](#variables-y-extracción-de-datos)
6. [Validaciones con Assertions](#validaciones-con-assertions)
7. [Controladores de Flujo](#controladores-de-flujo)
8. [Spark Scripts (JavaScript)](#spark-scripts-javascript)
9. [Configuración de Carga](#configuración-de-carga)
10. [Ejemplos Completos](#ejemplos-completos)

---

## Introducción

El Relampo YAML Editor es una herramienta visual inspirada en JMeter que te permite crear pruebas de carga mediante una interfaz drag-and-drop. Los scripts creados se exportan como archivos YAML compatibles con frameworks de pruebas de carga.

### ¿Qué puedes hacer?

✅ Crear requests HTTP con headers, body y query params  
✅ Extraer datos de respuestas (tokens, IDs, etc.)  
✅ Validar respuestas con assertions  
✅ Controlar el flujo con loops, condiciones y reintentos  
✅ Ejecutar código JavaScript personalizado con Spark  
✅ Configurar carga de usuarios y duración  

---

## Interfaz del Editor

La interfaz consta de 3 paneles principales:

```
┌─────────────────────────────────────────────────┐
│  🔝 Top Bar (Actions)                           │
├──────────────┬──────────────────┬───────────────┤
│              │                  │               │
│  Tree View   │   Canvas         │   Details     │
│  (Árbol)     │   (Vista)        │   (Edición)   │
│              │                  │               │
└──────────────┴──────────────────┴───────────────┘
```

### 1. **Tree View** (Izquierda)
- Árbol jerárquico de tu prueba
- Drag & drop para reorganizar elementos
- Click derecho para menú contextual

### 2. **Canvas** (Centro)
- Visualización gráfica del árbol
- Vista general de la estructura

### 3. **Details Panel** (Derecha)
- Edición de propiedades del elemento seleccionado
- Campos específicos según el tipo de elemento

---

## Creando tu Primera Prueba

### Paso 1: Crear un Test

1. Abre el editor
2. Por defecto verás un nodo `test` en el árbol
3. Click en el nodo `test` para ver sus detalles
4. Edita:
   - **Name**: Nombre de tu prueba
   - **Description**: Descripción detallada
   - **Version**: Versión del script

### Paso 2: Agregar un Scenario

1. Click derecho en el nodo `test`
2. Selecciona **Add > Scenario**
3. Se crea un nuevo scenario
4. Dale un nombre descriptivo (ej: "Login Flow")

### Paso 3: Agregar tu Primer Request

1. Click derecho en el `scenario`
2. Selecciona **Add > Request**
3. Configura el request en el panel de detalles

---

## Trabajando con Requests

### Configuración Básica

Cuando seleccionas un **Request**, verás el panel de detalles con dos tabs: **Request** y **Response**.

#### Tab Request

##### 1. **Method**
Dropdown con todos los métodos HTTP:
- `GET` (verde)
- `POST` (azul)
- `PUT` (amarillo)
- `DELETE` (rojo)
- `PATCH`, `HEAD`, `OPTIONS`

##### 2. **URL con Query Parameters**

El editor separa automáticamente la URL base de los query params:

```
Base URL: https://api.example.com/users
```

**Query Parameters:**
| Enabled | Name | Value |
|---------|------|-------|
| ✓ | page | 1 |
| ✓ | limit | 10 |

- Puedes habilitar/deshabilitar params individualmente
- Auto-parsing: pega una URL completa y se separa automáticamente
- Validación suave: te avisa si la URL parece incorrecta

##### 3. **Headers**

Lista editable de headers HTTP:

```
Content-Type: application/json
Authorization: Bearer ${TOKEN}
Accept: application/json
```

**Botón "Add Common Header"**: dropdown con 21 headers comunes:
- Content-Type
- Authorization
- Accept
- User-Agent
- Cache-Control
- ... y más

##### 4. **Body**

Selector de tipo de body:

**🔘 None** - Sin body (para GET, DELETE)

**🔘 JSON** - Formato JSON con validación automática
```json
{
  "username": "test@example.com",
  "password": "secret123"
}
```
- ✅ Validación en tiempo real
- 🎨 Syntax highlighting
- ⚠️ Alertas de errores

**🔘 Form Data** - Datos de formulario
```
username=test
password=secret123
```

**🔘 Raw Text** - Texto plano
```
Plain text content
```

##### 5. **Buscador** 🔍

El panel de Request tiene un buscador integrado:
- Busca en todos los campos (URL, headers, body, etc.)
- Highlighting amarillo en coincidencias
- Navegación prev/next
- Contador de matches (ej: 3/15)

#### Tab Response

En este tab puedes **crear una respuesta esperada** o **editar respuestas grabadas**:

##### 1. **Status Code**
```
Status Code: 200
[✓ Success]  (visual con color verde/rojo según código)
```

##### 2. **Response Time**
```
Response Time (ms): 150
⏱ 150ms
```

##### 3. **Response Headers**
Lista editable de headers de respuesta:
```
content-type: application/json
x-request-id: abc-123
```

##### 4. **Response Body**
Editor con formato JSON/Text:
```json
{
  "data": {
    "token": "eyJhbGc...",
    "user_id": 12345
  }
}
```
- Botones para cambiar formato (JSON/Text)
- Validación JSON automática
- ✓ Valid JSON / ⚠ Plain text

---

## Variables y Extracción de Datos

### Variables Globales

1. Click derecho en el nodo `test`
2. **Add > Variables**
3. Define variables iniciales:

```
BASE_URL: https://api.example.com
API_KEY: your-api-key-here
USERNAME: test@example.com
```

### Extractor: Capturar Datos de Respuestas

Los **extractors** capturan datos de las respuestas para usarlos en requests posteriores.

#### Crear un Extractor

1. Click derecho en un `request`
2. **Add > Extractor**
3. Selecciona el **tipo de extractor**

#### Tipos de Extractors

##### 1. **Regex** - Expresiones regulares

```
Type: regex
Variable Name: TOKEN
Pattern: "token":"([a-zA-Z0-9._-]+)"
Match Number: 1 (primera coincidencia)
Template: $1$ (opcional)
Default: NOT_FOUND
```

Extrae usando grupos de captura `()`.

**Ejemplo de respuesta:**
```json
{"token":"abc123xyz"}
```
**Variable creada:** `${TOKEN}` = `abc123xyz`

##### 2. **JSONPath** - Para respuestas JSON

```
Type: jsonpath
Variable Name: USER_ID
Expression: $.data.user.id
Default: 0
```

**Ejemplos de expresiones:**
- `$.data.id` - Campo directo
- `$.users[0].name` - Primer elemento de array
- `$.data[*].id` - Todos los IDs
- `$..price` - Buscar recursivamente

##### 3. **XPath** - Para XML/HTML

```
Type: xpath
Variable Name: TITLE
Expression: //div[@class='title']/text()
Namespace: (opcional)
Default: ""
```

##### 4. **Boundary** - Entre delimitadores

```
Type: boundary
Variable Name: SESSION_ID
Left Boundary: session_id=
Right Boundary: &
Match Number: 1
Default: ""
```

Útil para extraer valores entre strings conocidos.

#### Usar Variables Extraídas

Una vez extraídas, usa las variables en requests posteriores:

```
URL: ${BASE_URL}/users/${USER_ID}
Header: Authorization: Bearer ${TOKEN}
Body: {"session": "${SESSION_ID}"}
```

---

## Validaciones con Assertions

Los **assertions** validan que las respuestas cumplan ciertos criterios.

### Crear un Assertion

1. Click derecho en un `request`
2. **Add > Assertion**
3. Selecciona el **tipo de assertion**

### Tipos de Assertions

#### 1. **Status** - Validar código de estado

```
Type: status
Expected Status Code: 200
```

#### 2. **Status In** - Múltiples códigos válidos

```
Type: status_in
Expected Status Codes: 200, 201, 204
```

#### 3. **Contains** - Texto en respuesta

```
Type: contains
Text to Find: "success"
☑ Ignore case
```

#### 4. **Not Contains** - Texto NO debe estar

```
Type: not_contains
Text to Not Find: "error"
☑ Ignore case
```

#### 5. **Regex** - Patrón en respuesta

```
Type: regex
Pattern: "token":"[a-f0-9]{32}"
Match Number: (opcional)
```

#### 6. **Response Time** - Validar tiempo

```
Type: response_time
Max Time (ms): 500
```
Falla si la respuesta tarda más de 500ms.

#### 7. **Response Size** - Validar tamaño

```
Type: response_size
Size (bytes): 1024
```

#### 8. **Header** - Validar header específico

```
Type: header
Header Name: content-type
Expected Value: application/json
```

#### 9. **JSON** - Validar campo JSONPath

```
Type: json
JSONPath Expression: $.status
Expected Value: success
```

---

## Controladores de Flujo

Los controladores modifican el flujo de ejecución de tu prueba.

### 1. **Group** - Agrupar elementos

Agrupa requests relacionados para mejor organización:

1. Click derecho en un scenario
2. **Add > Group**
3. Nombra el grupo (ej: "Authentication")
4. Arrastra requests dentro del grupo

### 2. **Loop** - Repetir ejecución

Repite los elementos hijos N veces:

```
Loop Count: 5  (puede usar variables: ${LOOPS})
Break Condition: ${STATUS} == "done"  (opcional)
```

**Visual Stats:**
```
📊 5 steps inside
📊 Total: 25 iterations (5 × 5)
```

**Ejemplo:**
```
Loop (count: 3)
  ├─ Request: Get Page 1
  ├─ Request: Get Page 2
  └─ Request: Get Page 3
```
Se ejecutan 9 requests en total (3 loops × 3 requests).

### 3. **If** - Ejecución condicional

Ejecuta elementos hijos solo si se cumple la condición:

```
Condition: ${STATUS_CODE} == 200
```

**Expresiones soportadas:**
```javascript
${VAR} == "value"
${COUNT} > 10
${FLAG} == true
${TOKEN} != null
```

**Visual Stats:**
```
📊 3 conditional steps
```

### 4. **Retry** - Reintentar en caso de fallo

Reintenta la ejecución si falla, con diferentes estrategias de backoff:

#### Backoff: Constant

```
Backoff Type: constant
Delay: 1000ms
Retry Count: 3
```

**Visual Stats:**
```
📊 Retries: 3
📊 Steps: 1 → Max 4 attempts
```

#### Backoff: Linear

```
Backoff Type: linear
Initial Delay: 1000ms
Increment: 500ms
Retry Count: 3
```

Delays: 1000ms, 1500ms, 2000ms

#### Backoff: Exponential

```
Backoff Type: exponential
Initial Delay: 1000ms
Multiplier: 2
Max Delay: 10000ms  (opcional)
Retry Count: 3
```

Delays: 1000ms, 2000ms, 4000ms (con max 10s)

### 5. **Think Time** - Pausas entre requests

Simula el tiempo que un usuario real espera entre acciones:

#### Modo Fixed

```
Mode: Fixed
Duration: 2s
```
Pausa fija de 2 segundos.

#### Modo Variable

```
Mode: Variable
Min: 1s
Max: 5s
```
Pausa aleatoria entre 1 y 5 segundos.

**Visual Stats:**
```
⏱ Fixed: 2s
⏱ Variable: 1s - 5s
```

---

## Spark Scripts (JavaScript)

**Spark** te permite ejecutar código JavaScript personalizado para lógica compleja.

### Crear un Spark Script

1. Click derecho en un request
2. **Add > Spark Before** (ejecuta antes del request)
   o **Add > Spark After** (ejecuta después del request)

### Editor de Código

El editor incluye:
- ✅ Syntax highlighting para JavaScript
- 📝 Monaco Editor (mismo de VS Code)
- 🎨 Theme oscuro

### API Disponible

Dentro de un Spark script tienes acceso a:

#### Variables

```javascript
// Leer variables
const token = vars.get("TOKEN");
const userId = vars.get("USER_ID");

// Escribir variables
vars.set("NEW_VAR", "value");
vars.set("COUNTER", parseInt(vars.get("COUNTER") || 0) + 1);
```

#### Props (propiedades del request)

```javascript
// Modificar request antes de enviarlo (spark_before)
props.setUrl("https://api.example.com/v2/users");
props.setMethod("POST");
props.setHeader("X-Custom-Header", "value");
props.setBody(JSON.stringify({ 
  user: userId,
  timestamp: Date.now() 
}));
```

#### Response (solo en spark_after)

```javascript
// Leer respuesta
const status = response.status;
const body = response.body;
const headers = response.headers;

// Procesar respuesta JSON
if (status === 200) {
  const data = JSON.parse(body);
  vars.set("RESULT", data.result);
}
```

#### Log

```javascript
// Logging
log.info("Request completed successfully");
log.warn("Unexpected status: " + status);
log.error("Failed to parse response");
```

### Ejemplos de Spark Scripts

#### 1. Generar timestamp dinámico

```javascript
// spark_before
const timestamp = Date.now();
vars.set("TIMESTAMP", timestamp.toString());
log.info("Generated timestamp: " + timestamp);
```

#### 2. Modificar request basado en variables

```javascript
// spark_before
const userType = vars.get("USER_TYPE");

if (userType === "admin") {
  props.setHeader("X-Admin-Token", vars.get("ADMIN_TOKEN"));
} else {
  props.setHeader("Authorization", "Bearer " + vars.get("USER_TOKEN"));
}
```

#### 3. Procesar respuesta compleja

```javascript
// spark_after
const body = JSON.parse(response.body);

if (body.status === "success" && body.data) {
  // Extraer múltiples valores
  vars.set("USER_ID", body.data.userId);
  vars.set("SESSION_ID", body.data.sessionId);
  vars.set("EXPIRES_AT", body.data.expiresAt);
  
  log.info("User authenticated: " + body.data.userId);
} else {
  log.error("Authentication failed");
  vars.set("AUTH_FAILED", "true");
}
```

#### 4. Contador de iteraciones

```javascript
// spark_before
let counter = parseInt(vars.get("ITERATION") || "0");
counter++;
vars.set("ITERATION", counter.toString());

log.info("Iteration #" + counter);

// Modificar URL con el contador
const baseUrl = vars.get("BASE_URL");
props.setUrl(baseUrl + "/page/" + counter);
```

#### 5. Generar UUID

```javascript
// spark_before
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const requestId = generateUUID();
vars.set("REQUEST_ID", requestId);
props.setHeader("X-Request-ID", requestId);
```

---

## Configuración de Carga

Define cómo se ejecutará tu prueba de carga.

### Load Configuration

1. Click derecho en el nodo `test`
2. **Add > Load**

### Parámetros

```
Users: 100              # Número de usuarios virtuales
Duration: 5m            # Duración de la prueba
Ramp-up: 30s           # Tiempo para llegar al máximo de usuarios
```

**Formatos soportados:**
- `10s` - 10 segundos
- `5m` - 5 minutos
- `1h` - 1 hora

### Ejemplo Visual

```
Users
  ^
100|        _______________
   |       /
 50|      /
   |     /
  0|____/
     0s   30s          5m30s  → Time
         (ramp-up)   (duration)
```

---

## Ejemplos Completos

### Ejemplo 1: Login Simple

```
test: API Login Test
├─ variables
│  ├─ BASE_URL: https://api.example.com
│  └─ EMAIL: test@example.com
├─ scenario: User Login
│  ├─ request: POST /login
│  │  ├─ Body: {"email": "${EMAIL}", "password": "secret"}
│  │  ├─ assertion: status = 200
│  │  ├─ assertion: json $.token exists
│  │  └─ extractor: TOKEN from $.token
│  └─ request: GET /profile
│     ├─ Header: Authorization: Bearer ${TOKEN}
│     └─ assertion: status = 200
└─ load: 10 users, 1m
```

### Ejemplo 2: Búsqueda con Paginación

```
test: Search with Pagination
├─ variables
│  ├─ BASE_URL: https://api.example.com
│  └─ PAGES: 5
├─ scenario: Search Flow
│  └─ loop: count = ${PAGES}
│     ├─ spark_before: Set page number
│     │  └─ vars.set("PAGE", vars.get("ITERATION") || "1")
│     ├─ request: GET /search?page=${PAGE}
│     │  ├─ assertion: status = 200
│     │  └─ extractor: TOTAL_PAGES from $.pagination.total
│     └─ think_time: 1s - 3s (variable)
└─ load: 50 users, 5m
```

### Ejemplo 3: E-commerce Flow Completo

```
test: E-commerce Purchase Flow
├─ http_defaults
│  ├─ base_url: https://shop.example.com
│  └─ headers
│     ├─ Content-Type: application/json
│     └─ User-Agent: LoadTest/1.0
├─ scenario: Purchase Journey
│  ├─ group: Authentication
│  │  ├─ request: POST /auth/login
│  │  │  ├─ body: {"email": "${EMAIL}", "password": "${PASSWORD}"}
│  │  │  └─ extractor: AUTH_TOKEN from $.token
│  │  └─ assertion: status in [200, 201]
│  │
│  ├─ think_time: 2s - 5s
│  │
│  ├─ group: Browse Products
│  │  ├─ request: GET /products
│  │  │  ├─ header: Authorization: Bearer ${AUTH_TOKEN}
│  │  │  └─ extractor: PRODUCT_ID from $.products[0].id
│  │  ├─ think_time: 3s
│  │  └─ request: GET /products/${PRODUCT_ID}
│  │     └─ assertion: response_time < 500ms
│  │
│  ├─ think_time: 5s - 10s
│  │
│  ├─ group: Add to Cart
│  │  ├─ request: POST /cart/items
│  │  │  ├─ body: {"productId": "${PRODUCT_ID}", "quantity": 1}
│  │  │  └─ extractor: CART_ID from $.cart.id
│  │  └─ assertion: status = 201
│  │
│  ├─ think_time: 2s - 4s
│  │
│  └─ group: Checkout with Retry
│     └─ retry: exponential, 3 times
│        ├─ request: POST /orders
│        │  ├─ body: {"cartId": "${CART_ID}", "paymentMethod": "card"}
│        │  ├─ assertion: status = 201
│        │  └─ extractor: ORDER_ID from $.order.id
│        └─ spark_after: Log order
│           └─ log.info("Order created: " + vars.get("ORDER_ID"))
│
└─ load: 100 users, 10m, ramp-up 1m
```

### Ejemplo 4: Conditional Flow

```
test: Conditional User Actions
├─ scenario: User Behavior
│  ├─ request: GET /user/status
│  │  └─ extractor: USER_TYPE from $.type
│  │
│  ├─ if: ${USER_TYPE} == "premium"
│  │  └─ request: GET /premium/dashboard
│  │     └─ assertion: status = 200
│  │
│  ├─ if: ${USER_TYPE} == "free"
│  │  ├─ request: GET /free/dashboard
│  │  └─ request: GET /upgrade-prompt
│  │
│  └─ spark_after: Log user type
│     └─ log.info("User type: " + vars.get("USER_TYPE"))
│
└─ load: 50 users, 5m
```

---

## Tips y Mejores Prácticas

### 🎯 Organización

1. **Usa Groups** para agrupar requests relacionados
2. **Nombra descriptivamente** todos los elementos
3. **Estructura jerárquica clara**: Test > Scenario > Groups > Requests

### 🔍 Debugging

1. Usa el **buscador** (🔍) para encontrar rápidamente campos
2. **Spark scripts con log.info()** para debugging
3. **Assertions** para validar respuestas paso a paso

### ⚡ Performance

1. **Think Time** realista para simular usuarios reales
2. **Ramp-up gradual** en Load config
3. **Retry con exponential backoff** para manejar fallos temporales

### 🔐 Seguridad

1. **No hardcodees** credenciales - usa variables
2. **Extrae tokens** y úsalos dinámicamente
3. **Variables globales** para configuraciones sensibles

### 📊 Validación

1. **Assertions múltiples**: status + contenido + tiempo
2. **Valida estructura JSON** con jsonpath
3. **Response time assertions** para SLA

---

## Atajos de Teclado

| Acción | Atajo |
|--------|-------|
| Buscar en detalles | `Ctrl/Cmd + F` |
| Guardar | `Ctrl/Cmd + S` |
| Deshacer | `Ctrl/Cmd + Z` |
| Rehacer | `Ctrl/Cmd + Shift + Z` |

---

## Recursos Adicionales

- **JSONPath**: https://goessner.net/articles/JsonPath/
- **XPath**: https://www.w3.org/TR/xpath/
- **Regex**: https://regex101.com/

---

## Soporte

¿Preguntas? ¿Encontraste un bug?
- 📧 Email: support@relampo.io
- 🐛 Issues: https://github.com/relampo/relampo-yml-editor/issues
- 📚 Docs: https://docs.relampo.io

---

**¡Feliz scripting con Relampo! 🚀**
