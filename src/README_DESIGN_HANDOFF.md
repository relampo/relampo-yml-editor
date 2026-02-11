# Pulse - Documentación de Diseño

Paquete completo de diseño para recrear Pulse en Figma y mantener consistencia en desarrollo.

---

## Contenido del Paquete

1. **DESIGN_SYSTEM.md** - Sistema de diseño completo
2. **COMPONENT_LIBRARY.md** - Catálogo de componentes
3. **FIGMA_EXPORT_GUIDE.md** - Guía de exportación a Figma
4. **COLOR_PALETTE.md** - Referencia rápida de colores
5. **Este README** - Índice y overview

---

## Quick Start

### Para Diseñadores

**Tiempo:** 2-3 semanas para versión completa

1. Lee DESIGN_SYSTEM.md (principios y tokens)
2. Revisa FIGMA_EXPORT_GUIDE.md (elige método)
3. Consulta COMPONENT_LIBRARY.md (durante trabajo)

### Para Developers

**Tiempo:** 30-45 min lectura + referencia continua

1. Lee DESIGN_SYSTEM.md (tokens y patrones)
2. Busca componentes en COMPONENT_LIBRARY.md
3. Usa COLOR_PALETTE.md para colores rápidos

---

## Estado Actual de Pulse

### Estructura Global
- TopBar con selector de proyecto y ambiente
- Sidebar de navegación (5 secciones)
- Layout responsivo de 3 columnas

### Vistas Principales
- **Dashboard** - Métricas y tests recientes
- **Workbench** - 6 tabs de trabajo
- **Projects** - Grid de proyectos
- **Settings** - Configuración
- **Help** - Ayuda

### Workbench Tabs
- **Recording** - Captura de tráfico HTTP
- **Scripting** - Editor con tree y panels
- **Debugging** - Ejecución con AI insights
- **Generation** - Configuración de carga
- **Correlation AI** - IA placeholder
- **Monitoring** - Métricas en tiempo real

### Componentes Core
- Script Tree (9 tipos de nodos)
- Detail Panels para cada elemento
- Sistema de tabs multinivel
- Badges de estado
- Log console
- Cards de métricas

### Stack Técnico
- React + TypeScript
- Tailwind CSS v4
- Lucide Icons
- Recharts
- Mock data completo

---

## Características del Sistema de Diseño

### Principios
1. **Profesionalismo Enterprise** - Diseño limpio
2. **Claridad** - Jerarquía visual clara
3. **Eficiencia** - Densidad equilibrada
4. **Consistencia** - Patrones predecibles

### Paleta
- **Neutral Grays** - 10 tonos (50-900)
- **Primary Blue** - Acciones y selecciones
- **Semantic** - Green, Red, Amber, Purple
- **Charts** - 5 colores optimizados

### Tipografía
- Base: 16px
- Font: System-ui, SF Pro, Inter
- Escalas: 12px → 24px
- Weights: Regular (400), Medium (500)
- Line Height: 1.5

### Componentes
60+ variantes en 8 categorías:
- Buttons (6 tipos)
- Forms (7 tipos)
- Navigation (5 tipos)
- Data Display (15+ tipos)
- Visualizations (3 tipos)
- Feedback (5 tipos)

---

## Estructura de Archivos

```
pulse/
├── DESIGN_SYSTEM.md
├── COMPONENT_LIBRARY.md
├── FIGMA_EXPORT_GUIDE.md
├── COLOR_PALETTE.md
├── README_DESIGN_HANDOFF.md
├── components/
│   ├── Dashboard.tsx
│   ├── Workbench.tsx
│   ├── ScriptTree.tsx
│   ├── TopBar.tsx
│   ├── Sidebar.tsx
│   └── details/
│       ├── RecordingView.tsx
│       ├── MonitoringView.tsx
│       └── ... (10+ más)
├── styles/
│   └── globals.css
└── types/
    └── script.ts
```

---

## Casos de Uso

### "Necesito un color para botón primario"
→ COLOR_PALETTE.md → Primary Blue → `bg-blue-600`

### "¿Cómo implementar un Badge?"
→ COMPONENT_LIBRARY.md → Search "Badge" → Copia código

### "¿Qué spacing usar?"
→ DESIGN_SYSTEM.md → Espaciado → `gap-4` (16px)

### "¿Cómo exportar a Figma?"
→ FIGMA_EXPORT_GUIDE.md → Elige método → Sigue pasos

---

## Índice Rápido

### Colores Más Usados

```css
/* Backgrounds */
bg-white            /* Componentes */
bg-neutral-50       /* Páginas */
bg-blue-50          /* Selección */

/* Borders */
border-neutral-200  /* Standard */

/* Text */
text-neutral-900    /* Headings */
text-neutral-700    /* Body */
text-blue-700       /* Selected */

/* Buttons */
bg-blue-600         /* Primary */
bg-green-600        /* Success */
bg-red-600          /* Destructive */
```

### Spacing

```css
gap-2     /* 8px - Relacionados */
gap-4     /* 16px - Secciones */
p-4       /* 16px - Cards */
p-6       /* 24px - Páginas */
```

---

## Estadísticas

```
Documentos:     5 archivos
Páginas:        350+ secciones
Componentes:    60+ variantes
Colores:        40+ tokens
Tiempo lectura: 2-3 horas
Snippets:       150+ ejemplos
```

---

## FAQ

**P: ¿Dónde está el código de un componente?**  
R: COMPONENT_LIBRARY.md → Busca el componente → Archivo en /components/

**P: ¿Qué color usar?**  
R: COLOR_PALETTE.md o DESIGN_SYSTEM.md → Sistema de Color

**P: ¿Necesito Figma?**  
R: No obligatorio. El código React es la fuente de verdad.

**P: ¿Puedo modificar el sistema?**  
R: Sí, pero documenta cambios y actualiza componentes.

---

## Próximos Pasos

### Diseñador
1. Lee DESIGN_SYSTEM.md (30 min)
2. Lee FIGMA_EXPORT_GUIDE.md (20 min)
3. Comienza Fase 1 (setup Figma)

### Developer
1. Ejecuta `npm run dev`
2. Explora vistas (15 min)
3. Lee DESIGN_SYSTEM.md tokens (15 min)

### PM/QA
1. Ejecuta `npm run dev`
2. Lee este README (15 min)
3. Browse COMPONENT_LIBRARY.md

---

## Documentos Relacionados

- DESIGN_SYSTEM.md - Sistema completo
- COMPONENT_LIBRARY.md - Catálogo
- FIGMA_EXPORT_GUIDE.md - Exportación
- COLOR_PALETTE.md - Colores

---

**Versión:** 1.0.0  
**Fecha:** Enero 2026  
**Estado:** Production Ready  
**Equipo:** Pulse Design
