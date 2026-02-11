# Guía para Exportar Pulse a Figma

Guía completa paso a paso para recrear Pulse en Figma.

---

## Índice

1. [Preparación](#preparación)
2. [Método 1: Plugin HTML to Figma](#método-1-plugin-html-to-figma)
3. [Método 2: Recreación Manual (Recomendado)](#método-2-recreación-manual)
4. [Método 3: Screenshots + Recreación](#método-3-screenshots--recreación)
5. [Setup del Design System](#setup-del-design-system)
6. [Estructura Recomendada](#estructura-recomendada)

---

## Preparación

### Documentos Necesarios

1. DESIGN_SYSTEM.md - Tokens y componentes
2. COMPONENT_LIBRARY.md - Código de componentes
3. COLOR_PALETTE.md - Referencia de colores
4. Este documento - Guía de proceso

### Herramientas

- Figma Desktop o Web
- Plugins recomendados:
  - HTML to Figma (método automático)
  - Iconify (iconos Lucide)
  - Figma Tokens (design tokens)
  - Content Reel (mock data)

---

## Método 1: Plugin HTML to Figma

### Ventajas
✅ Rápido  
✅ Mantiene estructura  
✅ Bueno para iteraciones

### Desventajas
❌ Requiere limpieza  
❌ No perfecto

### Pasos

#### 1.1 Ejecutar App

```bash
npm install
npm run dev
# Abre http://localhost:5173
```

#### 1.2 Instalar Plugin

1. Figma > Plugins > Browse plugins
2. Busca "HTML to Figma"
3. Install

#### 1.3 Capturar HTML

**Opción A: Browser Extension**
1. Instala extensión Chrome/Firefox
2. Abre app en localhost:5173
3. Selecciona `<div id="root">`
4. "Send to Figma"

**Opción B: Desde Figma**
1. Plugins > HTML to Figma
2. Pega URL o HTML source
3. Import

#### 1.4 Limpieza

1. Convertir divs a frames
2. Renombrar capas descriptivamente
3. Añadir Auto Layout (Shift + A)
4. Crear text styles
5. Crear color styles

---

## Método 2: Recreación Manual

### Recomendado para:
✅ Control total  
✅ Componentes limpios  
✅ Design system optimizado

### Fase 1: Setup de Design System

#### 2.1 Crear Variables de Color

1. Nuevo archivo: "Pulse Design System"
2. Variables > Create collection: "Pulse Colors"
3. Mode: Light

**Variables a crear:**

```
Pulse/Colors
├─ Neutral/50: #FAFAFA
├─ Neutral/100: #F5F5F5
├─ Neutral/200: #E5E5E5
├─ Neutral/300: #D4D4D4
├─ Neutral/600: #525252
├─ Neutral/700: #404040
├─ Neutral/900: #171717
├─ Blue/50: #EFF6FF
├─ Blue/600: #2563EB
├─ Blue/700: #1D4ED8
├─ Green/500: #22C55E
├─ Green/600: #16A34A
├─ Red/500: #EF4444
├─ Red/600: #DC2626
├─ Purple/600: #9333EA
└─ Amber/600: #D97706
```

#### 2.2 Crear Text Styles

```
Pulse/
├─ Heading/
│  ├─ H1: 24px, Medium (500), 1.5 line
│  ├─ H2: 20px, Medium (500), 1.5 line
│  ├─ H3: 18px, Medium (500), 1.5 line
│  └─ H4: 16px, Medium (500), 1.5 line
├─ Body/
│  ├─ Regular: 16px, Regular (400), 1.5 line
│  ├─ Medium: 16px, Medium (500), 1.5 line
│  └─ Small: 14px, Regular (400), 1.5 line
└─ Label/
   ├─ Regular: 16px, Medium (500)
   └─ Small: 12px, Regular (400)
```

**Font:** Inter, SF Pro, o system-ui

#### 2.3 Crear Effect Styles

```
Pulse/Shadow/
├─ SM: 0px 1px 2px rgba(0,0,0,0.05)
├─ MD: 0px 4px 6px rgba(0,0,0,0.07)
└─ LG: 0px 10px 15px rgba(0,0,0,0.1)
```

---

### Fase 2: Componentes Base

#### 2.4 Button/Primary

1. Frame: 120px × 40px
2. Auto Layout (Shift + A)
3. Config:
   - Padding: 16px horizontal, 8px vertical
   - Item spacing: 8px
   - Hug contents
   - Corner radius: 10px
   - Fill: Blue/600
4. Añade texto: "Button" (Body/Medium, White)
5. Component (Cmd/Ctrl + Alt + K)
6. Nombre: "Button/Primary"

**Crear variantes:**
1. Add variant
2. Propiedad "State":
   - Default
   - Hover (Blue/700)
   - Disabled (Neutral/200)

**Repetir para:**
- Button/Success (Green/600)
- Button/Destructive (Red/600)
- Button/Special (Purple/600)
- Button/Icon (32×32)

#### 2.5 Input Component

1. Frame: 320px × 40px
2. Auto Layout
3. Config:
   - Padding: 12px / 8px
   - Radius: 10px
   - Stroke: 1px Neutral/300
   - Fill: White
4. Texto placeholder
5. Variantes:
   - Default
   - Focus (stroke 2px Blue/500)
   - Error (stroke Red/500)
   - Disabled (fill Neutral/50)

#### 2.6 Card Component

1. Frame: 400px × 200px
2. Auto Layout vertical
3. Config:
   - Padding: 16px
   - Item spacing: 16px
   - Radius: 10px
   - Stroke: Neutral/200
   - Fill: White
   - Shadow: SM
4. Contenido ejemplo
5. Component

---

### Fase 3: Layout Components

#### 2.7 TopBar

1. Frame: 1440px × 56px
2. Auto Layout horizontal
3. Config:
   - Padding: 0px 24px
   - Space between
   - Fill: White
   - Bottom stroke: Neutral/200
   - Shadow: SM

**Elementos:**
- Logo + Project selector (left)
- Environment selector
- Notifications + Avatar (right)

#### 2.8 Sidebar

1. Frame: 224px × Full height
2. Auto Layout vertical
3. Config:
   - Padding: 12px
   - Item spacing: 4px
   - Fill: White
   - Right stroke: Neutral/200
   - Shadow: SM

**Elementos:**
- Logo section
- Nav items
- Settings (bottom)

#### 2.9 Script Tree

1. Frame: 320px × Full height
2. Auto Layout vertical
3. Config:
   - Padding: 8px
   - Item spacing: 2px
   - Fill: White
   - Right stroke: Neutral/200

**Elementos:**
- Header
- Tree nodes con indent

---

### Fase 4: Crear Screens

#### 2.10 Dashboard

1. Página: "📊 Dashboard"
2. Frame: 1440px × 1024px
3. Estructura:

```
Dashboard
├─ TopBar (instance)
├─ Main Content
│  ├─ Sidebar (instance)
│  └─ Content Area
│     ├─ Page Header
│     ├─ Stats Grid (4 cols)
│     └─ Recent Tests
```

#### 2.11 Workbench

1. Página: "🔧 Workbench"
2. Frame: 1440px × 1024px
3. Estructura:

```
Workbench
├─ TopBar
├─ Main Content
│  ├─ Sidebar
│  └─ Workbench Area
│     ├─ Tabs Bar
│     └─ Split View
│        ├─ Script Tree
│        └─ Detail Panel
```

---

## Método 3: Screenshots + Recreación

### Ventajas
✅ Referencia visual exacta  
✅ Bueno para QA  
✅ Combina velocidad y control

### Pasos

#### 3.1 Capturar Screenshots

**Herramientas:**
- Mac: Cmd + Shift + 4
- Windows: Win + Shift + S
- Chrome: Cmd/Ctrl + Shift + P > "Screenshot"

**Capturas necesarias:**

1. Vista completa de cada pantalla
2. Componentes individuales
3. Estados (hover, focus, selected)

#### 3.2 Importar a Figma

1. Archivo nuevo: "Pulse - Screenshots"
2. Arrastra imágenes
3. Organiza en páginas

#### 3.3 Recrear sobre Screenshots

1. Coloca screenshot
2. Reduce opacidad 50%
3. Bloquea capa
4. Dibuja componentes encima
5. Compara y ajusta
6. Elimina screenshot

---

## Setup del Design System

### Estructura de Archivo

```
Pulse Design System.fig
├─ 🎨 Foundation
│  ├─ Colors
│  ├─ Typography
│  ├─ Spacing
│  └─ Effects
├─ 🧩 Components
│  ├─ Buttons
│  ├─ Inputs
│  ├─ Cards
│  ├─ Badges
│  └─ Icons
├─ 🏗️ Patterns
│  ├─ TopBar
│  ├─ Sidebar
│  └─ Script Tree
└─ 📖 Documentation
```

### Publicar Design System

1. Click derecho en componentes
2. Publish
3. Añade descripción
4. Publish changes

En otros archivos:
- Assets panel (Cmd/Ctrl + Shift + O)
- Team Library
- Enable "Pulse Design System"

---

## Estructura Recomendada

### Archivo: Pulse.fig

```
Pulse.fig
├─ 🏠 Cover
├─ 📊 Dashboard
├─ 🔧 Workbench
│  ├─ Recording Tab
│  ├─ Scripting Tab
│  ├─ Debugging Tab
│  ├─ Generation Tab
│  ├─ Correlation AI
│  └─ Monitoring Tab
├─ 📁 Projects
├─ ⚙️ Settings
├─ ❓ Help
└─ 🎨 Components
```

### Nomenclatura

```
[Screen] / [Variant] / [State]

Ejemplos:
Dashboard / Desktop / Default
Workbench / Recording / Active
Button / Primary / Hover
```

---

## Checklist de Componentes

### Buttons
- [ ] Primary
- [ ] Success
- [ ] Destructive
- [ ] Special
- [ ] Icon

### Forms
- [ ] Input/Text
- [ ] Input/Number
- [ ] Textarea
- [ ] Checkbox
- [ ] Select

### Navigation
- [ ] Sidebar Nav Item
- [ ] Tab Primary
- [ ] Tab Secondary

### Data Display
- [ ] Card/Base
- [ ] Card/Stat
- [ ] Badge/Method
- [ ] Badge/Status
- [ ] Status Dot
- [ ] Avatar

### Layout
- [ ] TopBar
- [ ] Sidebar
- [ ] Script Tree
- [ ] Script Tree Node

---

## Best Practices

### Auto Layout

**Siempre usar** para componentes flexibles

**Buttons:**
- Horizontal, Hug contents
- Padding: 16px/8px
- Spacing: 8px

**Cards:**
- Vertical, Hug height
- Padding: 16px
- Spacing: 16px

**Lists:**
- Vertical, Fill container
- Spacing: 0px (con dividers)

### Nombrado

```
[Categoría] / [Nombre] / [Variante]

Button / Primary / Default
Card / Stat / With Icon
Input / Text / Focus
```

### Constraints

**TopBar:**
- Left & Right: constrain
- Top: pin

**Sidebar:**
- Left: pin
- Top & Bottom: constrain

**Main:**
- All sides: constrain

---

## Workflow Recomendado

### Semana 1: Setup
- Día 1-2: Design system base
- Día 3-4: Componentes básicos
- Día 5: Review

### Semana 2: Layouts
- Día 1: TopBar + Sidebar
- Día 2: Dashboard
- Día 3: Workbench base
- Día 4: Script Tree + Detail
- Día 5: Review

### Semana 3: Vistas
- Día 1: Recording
- Día 2: Monitoring
- Día 3: Debugging
- Día 4: Generation
- Día 5: Polish

### Semana 4: Refinamiento
- Día 1-2: Estados
- Día 3: Prototyping
- Día 4-5: QA + handoff

---

## Checklist de Calidad

### Diseño
- [ ] Auto Layout en componentes
- [ ] Spacing consistente (4px/8px)
- [ ] Colores usan variables
- [ ] Typography usa styles
- [ ] Shadows usan effects
- [ ] Radius consistente

### Componentes
- [ ] Componentes reutilizables
- [ ] Variantes apropiadas
- [ ] Nombres descriptivos
- [ ] Properties correctas
- [ ] Documentación

### Screens
- [ ] Todas las screens principales
- [ ] Estados importantes
- [ ] Responsive configurado
- [ ] Constraints correctos

### Handoff
- [ ] Annotations
- [ ] Dev notes
- [ ] Flows prototipados
- [ ] Assets exportables
- [ ] README/guía

---

## Plugins Útiles

### Esenciales

1. **Iconify** - Iconos Lucide
2. **Content Reel** - Mock data
3. **Autoflow** - Flechas de flujo
4. **Figma Tokens** - Design tokens

### Útiles

5. **Stark** - Accesibilidad
6. **Figma Measure** - Medir spacing
7. **Sorter** - Organizar capas
8. **A11y** - Contrast checker

---

## FAQ

### ¿Qué resolución usar?

Desktop: 1440px × 1024px (default)  
Laptop: 1280px × 800px (optional)

### ¿Cómo manejo charts?

Opciones:
1. Placeholder con texto
2. Screenshot del chart real
3. Dibuja manualmente
4. Plugin "Chart"

### ¿Debo crear responsive?

Fase 1: Desktop (1440px)  
Fase 2: Tablet/mobile (futuro)

### ¿Cómo documento interacciones?

1. Annotations con flechas
2. Prototype con links
3. Overlay para modals
4. Comments con @ mentions

---

## Recursos

### Tutoriales
- [Figma Auto Layout](https://help.figma.com/hc/en-us/articles/360040451373)
- [Figma Components](https://help.figma.com/hc/en-us/articles/360038662654)
- [Figma Variables](https://help.figma.com/hc/en-us/articles/15339657135383)

### Inspiración
- Material Design
- Ant Design
- Atlassian Design

### Íconos
- [Lucide Icons](https://lucide.dev/icons/)
- Plugin "Iconify" en Figma

---

**Versión:** 1.0.0  
**Tiempo estimado:** 2-3 semanas  
**Fecha:** Enero 2026
