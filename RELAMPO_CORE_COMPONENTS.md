# 🌪️ Los 4 Pilares de Relampo

Los componentes fundamentales que hacen a Relampo único y poderoso para pruebas de carga y performance.

---

## **1. ⚡ Spark - Programabilidad**

### *"Enciende la lógica"*

**Concepto:** Pre y post-procesamiento con código personalizado

**Variantes:**
- `spark` - Script genérico
- `spark_before` - Antes del request (preparación)
- `spark_after` - Después del request (procesamiento)

### Uso:

```yaml
# Preparación antes del request
spark_before: |
  vars.timestamp = Date.now();
  vars.signature = crypto.sign(vars.payload);
  vars.correlation_id = uuid.v4();

# Procesamiento después del request
spark_after: |
  console.log("Response time:", response.time);
  vars.processedData = parseComplexResponse(response.body);
  
  // Lógica condicional
  if (response.status !== 200) {
    vars.retry = true;
  }
```

### Características:

- ✅ **JavaScript completo** - Todo el poder de JS moderno
- ✅ **Acceso a contexto** - `vars`, `response`, `request`
- ✅ **Librerías custom** - Importa y usa tus propias funciones
- ✅ **Estado compartido** - Variables persistentes entre requests
- ✅ **Debugging** - `console.log()` para troubleshooting

### Casos de uso:

- Generar tokens de autenticación dinámicos
- Calcular checksums o firmas
- Transformar datos antes de enviarlos
- Validaciones complejas post-respuesta
- Lógica de correlación avanzada
- Implementar algoritmos custom

---

## **2. 🎯 Fetch - Extracción**

### *"Captura lo que necesitas"*

**Concepto:** Extrae datos de respuestas HTTP para reutilizar en requests posteriores

**Métodos soportados:**
- **JSONPath:** `$.data.token`
- **Regex:** `"token":"([^"]+)"`
- **XPath:** `//user/@id`
- **Headers:** `Set-Cookie`

### Uso:

```yaml
fetch:
  # Simple - JSONPath
  token: $.data.access_token
  user_id: $.user.id
  
  # Desde headers
  session: 
    from: header
    name: Set-Cookie
    regex: sessionId=([^;]+)
  
  # Con regex en body
  csrf_token:
    from: body
    regex: 'csrf_token":"([^"]+)"'
  
  # XPath (para XML/HTML)
  order_id:
    from: body
    xpath: //order/@id
```

### Características:

- ✅ **Auto-almacenamiento** - Los valores van directo a `vars`
- ✅ **Múltiples extractores** - Combina JSONPath, regex, XPath
- ✅ **Reutilización inmediata** - Usa `{{token}}` en el siguiente request
- ✅ **Fallback values** - Define valores por defecto
- ✅ **Validación automática** - Falla si no encuentra el valor (opcional)

### Casos de uso:

- Extraer tokens de autenticación
- Capturar IDs de recursos creados
- Obtener session cookies
- Parsear CSRF tokens
- Extraer datos para assertions posteriores
- Correlación de datos entre requests

---

## **3. ✓ Validate - Verificación**

### *"Asegura la calidad"*

**Concepto:** Validaciones declarativas de respuestas HTTP

**Tipos de validaciones:**
- Status codes
- Response time
- Body content (contains, matches)
- JSONPath assertions
- XPath assertions
- Headers

### Uso:

```yaml
validate:
  # Status code
  status: 200
  # O múltiples válidos
  status_in: [200, 201, 204]
  
  # Response time
  response_time_ms: <500
  response_time_ms_between: [100, 1000]
  
  # Body content
  body_contains: "success"
  body_not_contains: "error"
  body_matches: "user_\\d{4}"
  
  # JSONPath assertions
  json_path:
    $.data.items.length: ">0"
    $.status: "active"
    $.user.role: "admin"
  
  # XPath (XML/HTML)
  xpath:
    //user/@active: "true"
    count(//item): ">10"
  
  # Headers
  header_exists: Content-Type
  header_contains:
    Content-Type: "application/json"
  
  # Body size
  body_size_bytes: <10000
  
  # Custom validation
  custom: |
    response.body.data.length > 0 &&
    response.headers['x-rate-limit'] < 100
```

### Características:

- ✅ **Declarativo** - Fácil de leer y escribir
- ✅ **Fail-fast** - Detiene el test si falla (configurable)
- ✅ **Múltiples assertions** - Combina todas las que necesites
- ✅ **Expresiones** - Usa `>`, `<`, `>=`, `<=`, `==`, `!=`
- ✅ **Reporting claro** - Mensajes de error descriptivos

### Casos de uso:

- Verificar respuestas exitosas
- Validar contratos de API
- Asegurar performance (response time)
- Verificar estructura de datos
- Validar headers de seguridad
- Assertions de reglas de negocio

---

## **4. 🌬️ Breath - Ritmo Humano**

### *"Simula comportamiento real"*

**Concepto:** Pausas naturales entre acciones para simular usuarios reales

**Modos:**
- **Fijo:** `2s`
- **Rango aleatorio:** `min: 1s, max: 3s`
- **Distribución estadística:** `mean: 2s, std_dev: 0.5s`

### Uso:

```yaml
# Modo simple - pausa fija
breath: 2s

# Modo realista - rango aleatorio
breath:
  min: 1s
  max: 5s

# Modo avanzado - distribución normal
breath:
  mean: 3s
  std_dev: 1s
  distribution: normal

# Distribución uniforme (default)
breath:
  min: 2s
  max: 8s
  distribution: uniform

# Distribución Poisson
breath:
  mean: 4s
  distribution: poisson
```

### Características:

- ✅ **Think time realista** - No todos los usuarios son iguales
- ✅ **Distribuciones estadísticas** - Normal, uniforme, Poisson
- ✅ **Variabilidad natural** - Evita patrones predecibles
- ✅ **Performance real** - Simula lectura, decisiones, etc.
- ✅ **Configuración simple** - Desde fijo hasta avanzado

### Casos de uso:

- Simular tiempo de lectura de contenido
- Pausas entre navegación de páginas
- Tiempo de decisión del usuario
- Comportamiento de usuario real en e-commerce
- Tests de carga más realistas
- Evitar detección de bots

---

## **💫 Flujo Completo de Ejemplo**

```yaml
test:
  name: E-commerce Checkout Flow
  
scenarios:
  - name: Complete Purchase
    load:
      type: ramp
      start_users: 1
      end_users: 100
      duration: 5m
    
    steps:
      # 1. Browse products
      - get: /api/products
        fetch:
          product_id: $.products[0].id
          price: $.products[0].price
          product_name: $.products[0].name
        validate:
          status: 200
          response_time_ms: <500
          json_path:
            $.products.length: ">0"
            $.products[0].in_stock: "true"
        breath: 
          min: 2s
          max: 5s
      
      # 2. Add to cart
      - post: /api/cart
        spark_before: |
          vars.cart_payload = {
            productId: vars.product_id,
            quantity: 1,
            timestamp: Date.now(),
            session: vars.session_id
          };
          console.log("Adding to cart:", vars.product_name);
        
        body: "{{cart_payload}}"
        
        fetch:
          cart_id: $.cart.id
          cart_total: $.cart.total
        
        validate:
          status: 201
          body_contains: "{{product_id}}"
          json_path:
            $.cart.items.length: "1"
            $.cart.total: "{{price}}"
        
        spark_after: |
          console.log("Cart created:", vars.cart_id);
          vars.checkout_ready = true;
        
        breath:
          mean: 4s
          std_dev: 1s
          distribution: normal
      
      # 3. Checkout
      - post: /api/checkout
        spark_before: |
          vars.checkout_payload = {
            cartId: vars.cart_id,
            paymentMethod: "credit_card",
            correlationId: uuid.v4()
          };
        
        body: "{{checkout_payload}}"
        
        fetch:
          order_id: $.order.id
          order_status: $.order.status
        
        validate:
          status: 200
          response_time_ms: <2000
          json_path:
            $.order.status: "confirmed"
            $.order.total: "{{cart_total}}"
        
        spark_after: |
          console.log("Order completed:", vars.order_id);
          metrics.increment("orders_completed");
        
        breath: 1s
```

---

## **🎯 Resumen de Roles**

| Componente   | Momento          | Propósito                       | Tipo         | Uso Principal                |
|--------------|------------------|---------------------------------|--------------|------------------------------|
| **Spark**    | Antes/Después    | Lógica custom, transformaciones | Programático | Preparación y procesamiento  |
| **Fetch**    | Durante response | Capturar datos para reusar      | Declarativo  | Correlación entre requests   |
| **Validate** | Durante response | Verificar calidad               | Declarativo  | Assertions y contratos       |
| **Breath**   | Entre requests   | Simular usuario real            | Declarativo  | Think time realista          |

---

## **🚀 Orden de Ejecución**

```
1. spark_before     → Preparación
2. HTTP Request     → Envío
3. fetch            → Extracción (en paralelo con validate)
4. validate         → Verificación (en paralelo con fetch)
5. spark_after      → Post-procesamiento
6. breath           → Pausa antes del siguiente step
```

---

## **💡 Best Practices**

### Spark:
- Usa `spark_before` para preparación de datos
- Usa `spark_after` para validaciones complejas
- Mantén los scripts cortos y enfocados
- Usa `console.log()` para debugging

### Fetch:
- Extrae solo lo necesario
- Usa nombres descriptivos para variables
- Define fallbacks para datos opcionales
- Valida que los datos fueron extraídos

### Validate:
- Siempre valida el status code
- Incluye validación de response time
- Usa assertions específicas, no genéricas
- Combina múltiples validaciones cuando tenga sentido

### Breath:
- Usa rangos aleatorios para mayor realismo
- Ajusta según el tipo de acción del usuario
- Acciones rápidas: 1-3s
- Lectura de contenido: 5-15s
- Decisiones complejas: 10-30s

---

## **📚 Recursos Adicionales**

- [Spark Scripting Reference](./SPARK_REFERENCE.md)
- [JSONPath Quick Reference](./JSONPATH_GUIDE.md)
- [Validation Rules Complete List](./VALIDATION_REFERENCE.md)
- [Statistical Distributions Guide](./DISTRIBUTIONS_GUIDE.md)

---

**Versión:** 1.0  
**Última actualización:** 2026-02-05  
**Relampo Performance Testing Framework**
