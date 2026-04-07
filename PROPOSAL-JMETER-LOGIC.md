# Propuesta: Lógica JMeter para Elementos Globales en Relampo

## Resumen

Implementar herencia de configuración similar a JMeter para `think_time`, `assertions` y `data_source`, donde elementos definidos a nivel de scenario/group se aplican a todos los requests hijos.

## Motivación

- **Más DRY (Don't Repeat Yourself)**: Un solo elemento global en lugar de repetirlo en cada request
- **Más flexible**: Configuración base + overrides específicos
- **Más intuitivo**: Coincide con el modelo mental de JMeter
- **Mejor simulación**: Patrones de comportamiento realistas (pace global con variaciones)

## Sintaxis Propuesta

### Think Time

#### Global (aplica a todos los requests)

```yaml
steps:
  - think_time: 2s # Se aplica ANTES de cada request hijo

  - request:
      method: GET
      url: /api/users # Espera 2s antes de ejecutar

  - request:
      method: POST
      url: /api/data # Espera 2s antes de ejecutar
```

#### Específico (override)

```yaml
steps:
  - think_time: 2s # Global

  - request:
      method: GET
      url: /api/users
      think_time: 5s # Override: 5s en lugar de 2s

  - request:
      method: POST
      url: /api/data # Usa global: 2s
```

### Assertions

#### Global (valida todos los requests)

```yaml
steps:
  - assertions: # Se aplica a TODOS los requests
      - type: status
        value: 200
      - type: response_time_ms_max
        value: 1000

  - request:
      method: GET
      url: /api/users # Validado con assertions globales

  - request:
      method: POST
      url: /api/data # Validado con assertions globales
```

#### Específico (override/adicional)

```yaml
steps:
  - assertions: # Global
      - type: status
        value: 200

  - request:
      method: POST
      url: /api/login
      assertions: # Override completo
        - type: status
          value: 201
        - type: body_contains
          value: 'token'
```

### Data Source

#### Global (variables para todos)

```yaml
steps:
  - data_source: # Variables disponibles para todos
      type: csv
      file: users.csv
      mode: per_vu
      strategy: sequential
      bind:
        email: email
        password: password

  - request:
      method: POST
      url: /api/login
      body:
        email: '{{email}}' # Usa data source global
        password: '{{password}}'

  - request:
      method: GET
      url: /api/profile # También puede usar las variables
```

#### Específico (override)

```yaml
steps:
  - data_source: # Global: regular users
      type: csv
      file: users.csv

  - request:
      method: GET
      url: /api/public # Usa data source global

  - request:
      method: POST
      url: /api/admin/action
      data_source: # Override: admin users
        type: csv
        file: admin_users.csv
        bind:
          admin_email: email
```

## Compatibilidad hacia atrás

### Formato actual (sigue funcionando)

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

### Nuevo formato (herencia)

```yaml
steps:
  - think_time: 2s # Nuevo: aplica a todos
  - assertions: # Nuevo: aplica a todos
      - type: status
        value: 200

  - request:
      method: GET
      url: /api/users
```

**Ambos son válidos** ✅

## Precedencia (cuando hay conflicto)

1. **Think Time**: Request específico > Global
2. **Assertions**: Request específico REEMPLAZA global (no merge)
3. **Data Source**: Request específico > Global

## Alcance por nivel

```yaml
scenarios:
  - name: 'User Flow'
    steps:
      - think_time: 2s # Alcance: todos los requests en este scenario

      - group:
          name: 'Login Flow'
          steps:
            - think_time: 1s # Alcance: solo requests en este group (override)

            - request:
                method: POST
                url: /api/login
                think_time: 5s # Alcance: solo este request (override)
```

## Ejemplo completo

```yaml
scenarios:
  - name: 'E-Commerce User Flow'
    steps:
      # Configuración global para todo el scenario
      - data_source:
          type: csv
          file: users.csv
          bind:
            user_email: email
            user_password: password

      - think_time: 2s

      - assertions:
          - type: status
            value: 200
          - type: response_time_ms_max
            value: 3000

      # Todos los requests heredan la configuración
      - request:
          method: POST
          url: /api/login
          body:
            email: '{{user_email}}'
            password: '{{user_password}}'

      - request:
          method: GET
          url: /api/products

      - request:
          method: GET
          url: /api/cart

      # Override para operación especial
      - request:
          method: POST
          url: /api/checkout
          think_time: 10s # Usuario piensa más en checkout
          assertions:
            - type: status
              value: 201 # Código diferente esperado
            - type: body_contains
              value: 'order_id'
```

## Implementación

### Fase 1: Editor (Visual) ✅

- Parser reconoce elementos globales
- Árbol visual muestra herencia (ej: icono especial)
- Details panel indica si usa configuración global o override

### Fase 2: Ejecución (Backend/CLI) ⏳

- Motor de ejecución aplica herencia
- Merge de configuración global + específica
- Tests de compatibilidad

### Fase 3: Validación ⏳

- Validador detecta conflictos
- Warnings para overrides innecesarios
- Documentación actualizada

## Beneficios vs Esfuerzo

| Beneficio                                 | Impacto     |
| ----------------------------------------- | ----------- |
| Menos repetición de código                | Alto ⭐⭐⭐ |
| Mejor organización                        | Alto ⭐⭐⭐ |
| Más cercano a JMeter (facilita migración) | Medio ⭐⭐  |
| Scripts más mantenibles                   | Alto ⭐⭐⭐ |

| Esfuerzo                  | Nivel      |
| ------------------------- | ---------- |
| Parser (visual en editor) | Bajo ⭐    |
| Motor de ejecución        | Medio ⭐⭐ |
| Testing & validación      | Medio ⭐⭐ |
| Documentación             | Bajo ⭐    |

## Estado

- 📝 **Propuesta**: Documentada
- ⏸️ **Implementación**: Pendiente de aprobación
- 🔄 **Compatibilidad**: 100% retrocompatible

## Notas

Esta propuesta no rompe YAML existente. Scripts actuales seguirán funcionando. La implementación completa requiere cambios en el motor de ejecución de Relampo (CLI/backend).

---

**Autor**: Relampo Team  
**Fecha**: 2026-02-12  
**Versión**: 1.0
