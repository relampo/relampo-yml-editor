# ⚡ FUNCIONALIDADES COMPLETAS DEL YAML EDITOR

## 🎯 ¿Qué incluye el YAML Editor Standalone?

El binario de escritorio contiene **TODAS** las funcionalidades del YAML Editor:

### ✅ PANEL IZQUIERDO - Vista de Árbol

- 🌳 Vista jerárquica navegable de todo el documento YAML
- 🖱️ **Click derecho (Context Menu)** con opciones:
  - ➕ Agregar nuevo nodo (request, group, if, loop, etc)
  - ❌ Eliminar nodo
  - 📋 Opciones contextuales según el tipo de nodo
- 🎯 **Drag & Drop completo**:
  - Arrastra steps para reordenar
  - Auto-expansión de nodos al mantener el cursor
  - Indicadores visuales de drop zones (before/after/inside)
  - Validación de reglas de drag & drop según tipos
- 🔍 Selección de nodos para ver detalles
- 📁 Expandir/colapsar nodos con hijos
- 🎨 Iconos específicos por tipo de nodo

### ✅ PANEL CENTRAL - Editor de Código YAML

- 💻 Editor de código con syntax highlighting
- ⚡ Edición manual directa del YAML
- 🔄 Sincronización bidireccional con el árbol
- 📝 Formateo automático
- ⚠️ Validación en tiempo real
- 🎨 Theme dark profesional

### ✅ PANEL DERECHO - Detalles del Nodo

- 📋 Propiedades editables del nodo seleccionado
- 🎛️ Formularios dinámicos según el tipo:
  - **Request**: method, URL, headers, body, assertions
  - **Group**: nombre, descripción
  - **If**: condiciones
  - **Loop**: iteraciones, variables
  - **Retry**: intentos, delays
  - **Think Time**: duración
- 💾 Guardado automático al editar
- ✨ Validación de campos

### ✅ BARRA SUPERIOR - Herramientas

- 📤 **Upload YAML**: Cargar archivo desde tu Mac
- ⬇️ **Download YAML**: Guardar archivo editado
- ✅ **Validate**: Validar sintaxis YAML
- 🌐 **Language Toggle**: Cambiar entre Inglés/Español
- 🎨 Theme dark (#0a0a0a, #111111) con acentos amarillos (#facc15)

---

## 🔧 Especificación YAML Soportada (Relampo v1)

### ✅ Elementos Top-Level

```yaml
version: 1 # Versión de la spec
test_metadata: # Metadatos del test
  name: '...'
  description: '...'
  author: '...'
  tags: [...]

variables: # Variables globales
  - name: '...'
    value: '...'

data_sources: # CSV data sources
  - name: '...'
    path: '...'
    delimiter: ','

http_defaults: # Config HTTP por defecto
  base_url: '...'
  headers: { ... }
  timeout: 30s
  follow_redirects: true

scenarios: # Lista de escenarios
  - name: '...'
    load: { ... }
    steps: [...]
```

### ✅ Tipos de Load (Carga)

- `constant` - Carga constante
- `ramp_up` - Rampa incremental
- `steady` - Carga sostenida
- `spike` - Picos de carga
- `step` - Carga en escalones
- `stress` - Prueba de estrés

### ✅ Tipos de Steps (Pasos)

1. **request** - HTTP request con assertions
   - GET, POST, PUT, DELETE, PATCH, etc
   - Headers, body, query params
   - Extractors (JSONPath, regex, headers)
   - Assertions (status, body, headers, time)

2. **group** - Agrupar steps lógicamente
   - Nombre y descripción
   - Steps anidados

3. **if** - Condicional
   - Condition (expresión)
   - then/else branches

4. **loop** - Bucle
   - count (número de iteraciones)
   - over (iterar sobre array)
   - while (condición)

5. **retry** - Reintentos
   - max_attempts
   - delay entre intentos
   - backoff strategy

6. **think_time** - Tiempo de espera
   - duration (fijo)
   - min/max (aleatorio)

---

## 🎮 FUNCIONALIDADES DE DRAG & DROP

### ✅ Reglas Implementadas

El drag & drop tiene validación completa según tipos:

#### Puedes arrastrar:

- ✅ **Steps** dentro de `scenarios.steps[]`
- ✅ **Steps** dentro de `group.steps[]`
- ✅ **Steps** dentro de `if.then[]` o `if.else[]`
- ✅ **Steps** dentro de `loop.steps[]`
- ✅ **Steps** dentro de `retry.steps[]`
- ✅ **Variables** dentro de `variables[]`
- ✅ **Data Sources** dentro de `data_sources[]`
- ✅ **Headers** dentro de `http_defaults.headers{}`

#### No puedes arrastrar:

- ❌ Un `scenario` dentro de otro `scenario`
- ❌ Un step fuera de un contenedor válido
- ❌ Metadata fields a lugares incorrectos
- ❌ Tipos incompatibles

### ✅ Auto-Expansión

- Mantén un nodo sobre un grupo cerrado por 800ms
- Se expandirá automáticamente para mostrar sus hijos
- Útil para drag & drop en estructuras anidadas

### ✅ Indicadores Visuales

- 🟡 **Línea amarilla arriba** = Drop before
- 🟡 **Línea amarilla abajo** = Drop after
- 🟡 **Fondo amarillo** = Drop inside
- 🚫 **Cursor prohibido** = Drop no permitido

---

## 🖱️ CONTEXT MENU (Click Derecho)

### ✅ Opciones Disponibles

#### En `scenarios`:

- ➕ Add Scenario

#### En `scenario.steps[]`:

- ➕ Add Step → Request
- ➕ Add Step → Group
- ➕ Add Step → If/Else
- ➕ Add Step → Loop
- ➕ Add Step → Retry
- ➕ Add Step → Think Time

#### En `variables[]`:

- ➕ Add Variable
- ❌ Remove Variable

#### En `data_sources[]`:

- ➕ Add Data Source
- ❌ Remove Data Source

#### En `http_defaults.headers`:

- ➕ Add Header
- ❌ Remove Header

#### En cualquier step:

- 📋 Duplicate
- ❌ Remove
- 🔼 Move Up
- 🔽 Move Down

---

## 🌐 INTERNACIONALIZACIÓN (i18n)

### ✅ Idiomas Soportados

- 🇺🇸 **English** (EN)
- 🇪🇸 **Español** (ES)

### ✅ Traducción Completa

- ✅ Todos los labels de la UI
- ✅ Nombres de tipos de nodos
- ✅ Mensajes de error
- ✅ Tooltips
- ✅ Context menu
- ✅ Validaciones

### Cambiar Idioma

Click en el botón de idioma en la barra superior (EN/ES)

---

## 💾 UPLOAD & DOWNLOAD

### ✅ Upload YAML

1. Click en "Upload YAML"
2. Selecciona archivo `.yaml` o `.yml`
3. Se parsea y muestra en árbol + código
4. Si hay errores, se muestra mensaje

### ✅ Download YAML

1. Edita tu YAML (árbol o código)
2. Click en "Download YAML"
3. Se descarga como `relampo-script.yaml`
4. Formato limpio y válido

---

## 🎨 THEME & DISEÑO

### ✅ Paleta de Colores

```
Backgrounds:  #0a0a0a, #111111
Text:         zinc-100, zinc-400, zinc-300
Primary:      #facc15 (yellow-400)
Accent:       #fde047 (yellow-300)
Borders:      white/5, white/10
Hover:        white/10
Selected:     yellow-400/10
```

### ✅ Iconos (Lucide React)

- ⚡ Bolt - Logo/marca
- 📄 FileText - YAML files
- 🌐 Globe - HTTP
- 📦 Package - Scenarios
- 🔄 RefreshCw - Loop
- ⏱️ Clock - Think time
- 🔁 Repeat - Retry
- 🎯 Target - Request
- 📁 Folder - Group
- 🔀 GitBranch - If/Else
- Y más...

---

## 🚀 RESUMEN

El YAML Editor standalone NO es una versión recortada. Contiene:

✅ **TODOS** los componentes del editor  
✅ **TODAS** las funcionalidades de drag & drop  
✅ **TODO** el context menu  
✅ **TODOS** los tipos de nodos soportados  
✅ **TODA** la internacionalización  
✅ **TODA** la validación

Lo ÚNICO que NO incluye:

- ❌ Landing page de Relampo
- ❌ Workbench de proyectos
- ❌ Relampo League
- ❌ Navegación entre secciones

Es una **aplicación de escritorio focalizada 100% en editar YAML**.

---

## 📝 Notas Técnicas

### Stack Completo Incluido

- React 18
- TypeScript
- Tailwind CSS v4
- Vite (build tool)
- Electron (desktop wrapper)
- js-yaml (parser)
- Lucide React (icons)

### Archivos Copiados

```
✓ YAMLEditor.tsx           - Componente principal
✓ YAMLTreeView.tsx         - Vista de árbol
✓ YAMLTreeNode.tsx         - Nodo individual (drag & drop)
✓ YAMLCodeEditor.tsx       - Editor de código
✓ YAMLNodeDetails.tsx      - Panel de detalles
✓ YAMLRequestDetails.tsx   - Detalles de request
✓ YAMLContextMenu.tsx      - Context menu
✓ yamlParser.ts            - Parser YAML ↔ Tree
✓ yamlDragDropRules.ts     - Reglas de validación drag & drop
✓ translations.ts          - i18n EN/ES
✓ yaml.ts                  - TypeScript types
✓ LanguageContext.tsx      - Contexto de idioma
✓ UI components            - Button, Input, Select, etc
```

**NO SE ELIMINÓ NINGUNA FUNCIONALIDAD DEL YAML EDITOR**. 🎉
