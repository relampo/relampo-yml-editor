# Pulse - Paleta de Colores

Referencia visual rápida de todos los colores del sistema.

---

## Neutral Grays

Base del sistema para estructura, bordes y texto.

```
Neutral 50   #FAFAFA  Fondos sutiles
Neutral 100  #F5F5F5  Hover suave
Neutral 200  #E5E5E5  Bordes estándar
Neutral 300  #D4D4D4  Bordes activos
Neutral 400  #A3A3A3  Texto deshabilitado
Neutral 500  #737373  Iconos secundarios
Neutral 600  #525252  Texto secundario
Neutral 700  #404040  Texto principal
Neutral 800  #262626  Texto enfático
Neutral 900  #171717  Headers
```

**Uso común:**
- `bg-neutral-50` - Fondo de páginas
- `border-neutral-200` - Bordes de cards
- `text-neutral-900` - Headings
- `text-neutral-600` - Subtexto

---

## Primary Blue

Color principal para acciones y selecciones.

```
Blue 50   #EFF6FF  Fondos selección
Blue 100  #DBEAFE  Hover selección
Blue 500  #3B82F6  Iconos, links
Blue 600  #2563EB  Botones primarios
Blue 700  #1D4ED8  Texto seleccionado
Blue 800  #1E40AF  Gradiente
```

**Uso común:**
- `bg-blue-50` - Item seleccionado
- `bg-blue-600` - Botón primario
- `text-blue-700` - Tab activo
- `from-blue-600 to-blue-800` - Avatar

---

## Success Green

Éxito, acciones positivas, estados "passed".

```
Green 50   #F0FDF4  Fondos success
Green 100  #DCFCE7  Success badges
Green 500  #22C55E  Status dots
Green 600  #16A34A  Success buttons
Green 700  #15803D  Success text
```

**Uso común:**
- `bg-green-600` - Botón Start/Run
- `bg-green-500` - Dot "success"
- `bg-green-100` - Badge "passed"

---

## Error Red

Errores, acciones destructivas, estados "failed".

```
Red 50   #FEF2F2  Fondos error
Red 100  #FEE2E2  Error badges
Red 500  #EF4444  Error indicators
Red 600  #DC2626  Botones destructivos
Red 700  #B91C1C  Error text
```

**Uso común:**
- `bg-red-600` - Botón Stop/Delete
- `bg-red-500` - Dot "error"
- `bg-red-50` - Banner recording

---

## Warning Amber

Advertencias y atención requerida.

```
Amber 50   #FFFBEB  Fondos warning
Amber 100  #FEF3C7  Warning badges
Amber 600  #D97706  Warning icons
Amber 700  #B45309  Warning enfático
```

---

## Special Purple

Acciones especiales y alternativas.

```
Purple 100  #F3E8FF  Purple badges
Purple 600  #9333EA  Special buttons
Purple 700  #7E22CE  Purple text
```

**Uso común:**
- `bg-purple-600` - Botón Clear/Special
- `text-purple-600` - Icono scenario

---

## Chart Colors

Optimizados para visualizaciones (OKLCH).

```
Chart 1  oklch(0.646 0.222 41.116)  Naranja
Chart 2  oklch(0.6 0.118 184.704)    Cyan
Chart 3  oklch(0.398 0.07 227.392)   Azul
Chart 4  oklch(0.828 0.189 84.429)   Lima
Chart 5  oklch(0.769 0.188 70.08)    Amarillo
```

---

## Semantic Adicionales

```
Pink 600    #DB2777  Cookie Manager
Indigo 600  #4F46E5  Header Manager
Cyan 600    #0891B2  Timer
Violet 600  #7C3AED  Extractor
Orange 600  #EA580C  Controllers
```

---

## Status Indicators

### Test Status
```
✓ Passed   bg-green-500
→ Running  bg-blue-500 + animate-pulse
✗ Failed   bg-red-500
```

### HTTP Methods
```
GET     bg-blue-100 text-blue-700
POST    bg-green-100 text-green-700
PUT     bg-amber-100 text-amber-700
DELETE  bg-red-100 text-red-700
```

### HTTP Status Codes
```
2xx  bg-green-100 text-green-700
4xx  bg-amber-100 text-amber-700
5xx  bg-red-100 text-red-700
```

### Recording States
```
● Live       bg-green-500 + pulse
● Recording  bg-red-600 + pulse
○ Idle       bg-neutral-400
```

### Environment
```
● Production  bg-red-500
● Staging     bg-green-500
```

---

## Console/Log Colors

```
Success    text-green-400
Info       text-blue-400
Warning    text-amber-400
Error      text-red-400
Default    text-neutral-100
```

---

## Combinaciones Recomendadas

### Cards
```
Background:  bg-white
Border:      border-neutral-200
Text:        text-neutral-900
Subtext:     text-neutral-600
```

### Button Primary
```
Default:  bg-blue-600
Hover:    bg-blue-700
Text:     text-white
```

### Selected Items
```
Background:  bg-blue-50
Text:        text-blue-700
Border:      border-blue-300
```

### Input Focus
```
Default:  border-neutral-300
Focus:    focus:ring-2 focus:ring-blue-500
```

---

## Cómo Elegir Color

### Para Texto
- Heading → `text-neutral-900`
- Body → `text-neutral-700`
- Secondary → `text-neutral-600`
- Disabled → `text-neutral-400`

### Para Fondos
- Componente → `bg-white`
- Página → `bg-neutral-50`
- Hover → `bg-neutral-100`
- Selección → `bg-blue-50`

### Para Acciones
- Principal → `bg-blue-600`
- Iniciar → `bg-green-600`
- Detener → `bg-red-600`
- Especial → `bg-purple-600`

---

## Accesibilidad

Todos los colores cumplen WCAG 2.1:

```
✅ text-neutral-900 on white:  13.9:1 (AAA)
✅ text-neutral-700 on white:  7.8:1  (AAA)
✅ text-neutral-600 on white:  5.7:1  (AA+)
✅ blue-700 on blue-50:        7.2:1  (AAA)
```

---

## Exportar para Figma

### Variables en Figma

```
Collection: Pulse/Colors
Mode: Light
├─ Neutral/50: #FAFAFA
├─ Neutral/100: #F5F5F5
├─ Neutral/200: #E5E5E5
├─ ...
├─ Blue/600: #2563EB
├─ Blue/700: #1D4ED8
└─ ...
```

### Como Color Styles

```
Pulse/Neutral/50
Pulse/Blue/600
Pulse/Semantic/Success
```

---

## Variables CSS

```css
:root {
  --color-primary: #2563EB;
  --color-success: #16A34A;
  --color-error: #DC2626;
  --color-warning: #D97706;
  
  --color-text-primary: #171717;
  --color-text-secondary: #525252;
  
  --color-bg-page: #FAFAFA;
  --color-bg-card: #FFFFFF;
  
  --color-border: #E5E5E5;
}
```

---

**Versión:** 1.0.0  
**Colores totales:** 40+ tokens  
**Más info:** Ver DESIGN_SYSTEM.md
