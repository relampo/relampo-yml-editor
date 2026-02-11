# Pulse Design System

Sistema de diseño completo para la plataforma de testing de performance Pulse.

---

## Principios de Diseño

### 1. Profesionalismo Enterprise
Diseño limpio y minimalista para ingenieros senior, QA y SREs.

### 2. Claridad y Legibilidad
Contraste apropiado, tipografía legible, estados visuales claros.

### 3. Eficiencia
Densidad de información equilibrada, acciones accesibles, feedback inmediato.

### 4. Consistencia
Patrones repetibles, espaciado predecible, comportamientos coherentes.

---

## Sistema de Color

### Neutral Grays

```css
Neutral 50:  #FAFAFA  /* Fondos sutiles */
Neutral 100: #F5F5F5  /* Hover states */
Neutral 200: #E5E5E5  /* Bordes */
Neutral 300: #D4D4D4  /* Bordes activos */
Neutral 400: #A3A3A3  /* Texto deshabilitado */
Neutral 500: #737373  /* Iconos secundarios */
Neutral 600: #525252  /* Texto secundario */
Neutral 700: #404040  /* Texto principal */
Neutral 800: #262626  /* Texto enfático */
Neutral 900: #171717  /* Headers */
```

### Primary Blue

```css
Blue 50:  #EFF6FF  /* Selección backgrounds */
Blue 100: #DBEAFE  /* Hover selección */
Blue 500: #3B82F6  /* Iconos, links */
Blue 600: #2563EB  /* Botones primarios */
Blue 700: #1D4ED8  /* Texto seleccionado */
Blue 800: #1E40AF  /* Gradient end */
```

### Semantic Colors

**Success Green:**
```css
Green 500: #22C55E  /* Success indicators */
Green 600: #16A34A  /* Success buttons */
Green 700: #15803D
```

**Error Red:**
```css
Red 500:  #EF4444  /* Error indicators */
Red 600:  #DC2626  /* Destructive buttons */
Red 700:  #B91C1C
```

**Warning Amber:**
```css
Amber 600: #D97706
```

**Special Purple:**
```css
Purple 600: #9333EA
```

### Colores de Estatus

```css
/* Recording / Live */
Recording: #DC2626 + animate-pulse
Live:      #22C55E + animate-pulse

/* Test Status */
Passed:  #22C55E
Running: #3B82F6 + animate-pulse
Failed:  #EF4444
```

---

## Tipografía

### Font Stack
```css
font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
```

### Tamaños Base
```css
--font-size: 16px
```

### Escalas

| Clase | Tamaño | Uso |
|-------|--------|-----|
| text-xs | 12px | Labels pequeños, badges |
| text-sm | 14px | Texto secundario, listas |
| text-base | 16px | Texto principal |
| text-lg | 18px | Subtítulos (h3) |
| text-xl | 20px | Títulos sección (h2) |
| text-2xl | 24px | Títulos principales (h1) |

### Font Weights
```css
--font-weight-normal: 400
--font-weight-medium: 500
```

### Tipografía Semántica

```css
h1: text-2xl, font-medium, line-height: 1.5
h2: text-xl, font-medium, line-height: 1.5
h3: text-lg, font-medium, line-height: 1.5
h4: text-base, font-medium, line-height: 1.5

label: text-base, font-medium
button: text-base, font-medium
input: text-base, font-normal
```

---

## Espaciado

### Sistema (Tailwind)

| Clase | Valor | Uso |
|-------|-------|-----|
| gap-1 | 4px | Mínimo entre icono y texto |
| gap-2 | 8px | Elementos relacionados |
| gap-3 | 12px | Formularios |
| gap-4 | 16px | Secciones pequeñas |
| gap-6 | 24px | Secciones principales |
| p-2 | 8px | Padding mínimo |
| p-3 | 12px | Padding cards pequeños |
| p-4 | 16px | Padding estándar |
| p-6 | 24px | Padding secciones |

### Border Radius
```css
--radius: 0.625rem (10px)
--radius-sm: 6px
--radius-md: 8px
--radius-lg: 10px
--radius-xl: 14px
```

**Aplicaciones:**
- Botones: `rounded-lg` (10px)
- Cards: `rounded-lg` (10px)
- Inputs: `rounded-lg` (10px)
- Badges: `rounded-full`

### Bordes
```css
border: 1px solid rgba(0, 0, 0, 0.1)
border-neutral-200: Estándar
border-neutral-300: Activos
```

---

## Componentes

### Buttons

**Primary:**
```tsx
<button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 
                   text-white rounded-lg transition-colors">
  Action
</button>
```

**Success:**
```tsx
<button className="px-4 py-2 bg-green-600 hover:bg-green-700 
                   text-white rounded-lg transition-colors">
  Start
</button>
```

**Destructive:**
```tsx
<button className="px-4 py-2 bg-red-600 hover:bg-red-700 
                   text-white rounded-lg transition-colors">
  Stop
</button>
```

**Disabled:**
```tsx
<button disabled className="px-4 py-2 bg-neutral-200 
                             text-neutral-500 rounded-lg 
                             cursor-not-allowed">
  Disabled
</button>
```

### Cards

**Standard:**
```tsx
<div className="bg-white border border-neutral-200 
                rounded-lg p-4">
  Content
</div>
```

**Stat Card:**
```tsx
<div className="bg-white border border-neutral-200 
                rounded-lg p-4">
  <div className="flex items-center justify-between mb-3">
    <span className="text-sm text-neutral-600">Label</span>
    <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
      <Icon className="w-4 h-4" />
    </div>
  </div>
  <p className="text-neutral-900">Value</p>
</div>
```

### Tabs

**Primary (Workbench):**
```tsx
<div className="bg-white border-b border-neutral-200">
  <div className="flex items-center px-6 gap-1">
    <button className="px-4 py-3 text-sm relative text-blue-700">
      Active Tab
      <div className="absolute bottom-0 left-0 right-0 
                      h-0.5 bg-blue-600" />
    </button>
    <button className="px-4 py-3 text-sm text-neutral-600 
                       hover:text-neutral-900">
      Inactive Tab
    </button>
  </div>
</div>
```

### Tree View

```tsx
<div className="flex items-center gap-2 px-3 py-1.5 
                cursor-pointer rounded-md bg-blue-50 
                text-blue-700">
  <button className="p-0.5 hover:bg-neutral-200 rounded">
    <ChevronDown className="w-3 h-3" />
  </button>
  <Icon className="w-4 h-4 text-blue-600" />
  <span className="text-sm flex-1 truncate">Node Name</span>
</div>
```

**Colores de íconos por tipo:**
- Test Plan: `text-blue-600`
- Scenario: `text-purple-600`
- HTTP Request: `text-blue-500`
- Cookie Manager: `text-pink-600`
- Timer: `text-cyan-600`
- Assertion: `text-green-500`

### Badges

**Method:**
```tsx
<div className="px-2 py-0.5 rounded text-xs 
                bg-blue-100 text-blue-700">
  GET
</div>
```

**Status:**
```tsx
<span className="px-3 py-1 rounded-full text-xs 
                 bg-green-100 text-green-700">
  passed
</span>
```

**Status Dot:**
```tsx
<div className="w-2 h-2 rounded-full bg-green-500" />
```

### Inputs

**Text:**
```tsx
<input
  type="text"
  className="w-full px-3 py-2 border border-neutral-300 
             rounded-lg bg-white text-neutral-900
             focus:outline-none focus:ring-2 
             focus:ring-blue-500"
  placeholder="Enter value..."
/>
```

**Textarea:**
```tsx
<textarea
  className="w-full h-32 px-3 py-2 border 
             border-neutral-300 rounded-lg font-mono 
             text-sm bg-white resize-none
             focus:outline-none focus:ring-2 
             focus:ring-blue-500"
/>
```

### Headers

**Page:**
```tsx
<div>
  <h1 className="text-neutral-900">Page Title</h1>
  <p className="text-neutral-600 mt-1">Description</p>
</div>
```

**Section:**
```tsx
<div className="px-6 py-4 border-b border-neutral-200">
  <h3 className="text-neutral-900">Section Title</h3>
</div>
```

### Code Display

**Console:**
```tsx
<div className="bg-neutral-900 p-4 rounded-lg">
  <pre className="font-mono text-xs text-neutral-100">
    {code}
  </pre>
</div>
```

**Colores de log:**
- Success: `text-green-400`
- Info: `text-blue-400`
- Warning: `text-amber-400`
- Error: `text-red-400`

### Charts (Recharts)

```tsx
<ResponsiveContainer width="100%" height="100%">
  <LineChart data={data}>
    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
    <XAxis 
      dataKey="time" 
      tick={{ fontSize: 12 }}
      stroke="#9ca3af"
    />
    <YAxis 
      tick={{ fontSize: 12 }}
      stroke="#9ca3af"
    />
    <Tooltip contentStyle={{...}} />
    <Line 
      type="monotone" 
      dataKey="value" 
      stroke="#3b82f6" 
      strokeWidth={2}
      dot={{ r: 3 }}
    />
  </LineChart>
</ResponsiveContainer>
```

---

## Estados e Interacciones

### Hover
```css
hover:bg-neutral-50    /* Lista, cells */
hover:bg-neutral-100   /* Botones ghost */
hover:bg-blue-700      /* Botones primarios */
```

### Selección/Activo
```css
bg-blue-50 text-blue-700  /* Seleccionado */
bg-blue-600 text-white    /* Botón activo */
```

### Disabled
```css
bg-neutral-200 text-neutral-500 cursor-not-allowed
```

### Focus
```css
focus:outline-none 
focus:ring-2 
focus:ring-blue-500
```

### Transiciones
```css
transition-colors
```

### Animaciones
```css
animate-pulse  /* Live, recording */
```

---

## Layout Structure

```
┌─────────────────────────────────────────┐
│ TopBar (h-14)                           │
├──────┬──────────────────────────────────┤
│      │ Workbench Tabs                   │
│ Side │ ─────────────────────────────── │
│ bar  ├────────┬─────────────────────────┤
│(w-56)│ Script │ Detail Panel            │
│      │ Tree   │                         │
│      │ (w-80) │                         │
└──────┴────────┴─────────────────────────┘
```

### Dimensiones Fijas
- TopBar Height: 56px (h-14)
- Sidebar Width: 224px (w-56)
- Script Tree Width: 320px (w-80)

---

## Iconografía

### Librería
**Lucide React** - Iconos modernos y consistentes

### Tamaños

| Contexto | Clase | Tamaño |
|----------|-------|--------|
| Navegación | w-4 h-4 | 16px |
| Botones | w-4 h-4 | 16px |
| Tree | w-4 h-4 | 16px |
| Chevrons | w-3 h-3 | 12px |
| Avatar | w-8 h-8 | 32px |

### Iconos Principales

**Navegación:**
- LayoutDashboard - Dashboard
- FlaskConical - Workbench
- FolderKanban - Projects
- Settings - Settings
- HelpCircle - Help

**Acciones:**
- Play - Start
- Square - Stop
- ChevronDown/Right - Expand
- Bell - Notifications

**Script Tree:**
- FileText - Test Plan
- Folder - Scenario
- Globe - HTTP Request
- Cookie - Cookie Manager
- Clock - Timer

---

## Patrones de Uso

### Split View
```tsx
<div className="flex flex-1 overflow-hidden">
  <div className="w-80 bg-white border-r">
    Tree
  </div>
  <div className="flex-1 bg-white">
    Details
  </div>
</div>
```

### Live Indicator
```tsx
<div className="flex items-center gap-2">
  <div className="w-2 h-2 bg-green-500 rounded-full 
                  animate-pulse" />
  <span className="text-sm">Live</span>
</div>
```

### Card Grid
```tsx
<div className="grid grid-cols-4 gap-4">
  {items.map(item => <Card {...item} />)}
</div>
```

---

## Accesibilidad

### Contraste
- Textos principales: ≥ 4.5:1 (AA)
- Textos grandes: ≥ 3:1
- Iconos funcionales: ≥ 3:1

### Focus
Todos los elementos interactivos tienen `focus:ring-2`

### Semántica
- Headers jerárquicos (h1 > h2 > h3)
- Labels asociados a inputs
- Botones con texto descriptivo

---

## Best Practices

### DO ✅

1. Usa espaciado consistente (gap-2, gap-4, p-4)
2. Mantén jerarquía de color (blue primario, neutral estructura)
3. Usa truncate para texto largo
4. Añade transition-colors a hover
5. Mantén iconos w-4 h-4

### DON'T ❌

1. No uses múltiples botones primarios
2. No mezcles tamaños de padding
3. No uses colores arbitrarios
4. No abuses de animate-pulse
5. No uses sombras complejas (flat con bordes)

---

## Implementación

### Importaciones Comunes

```tsx
// Icons
import { Play, Square, ChevronDown } from 'lucide-react';

// Charts
import { 
  LineChart, Line, XAxis, YAxis, 
  CartesianGrid, Tooltip 
} from 'recharts';
```

### Clases Utility Comunes

```tsx
// Contenedores
"h-full flex flex-col bg-neutral-50"

// Cards
"bg-white border border-neutral-200 rounded-lg p-4"

// Botones
"px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white 
 rounded-lg transition-colors"

// Grid stats
"grid grid-cols-4 gap-4"
```

---

## Referencias

- Tailwind CSS v4: https://tailwindcss.com
- Lucide Icons: https://lucide.dev
- Recharts: https://recharts.org

---

**Versión:** 1.0.0  
**Fecha:** Enero 2026  
**Equipo:** Pulse Design
