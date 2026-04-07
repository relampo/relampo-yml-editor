# ⚡ Relampo YAML Editor - Aplicación de Escritorio

Aplicación nativa de escritorio para editar archivos YAML de configuración de testing de performance.

## 🎯 ¿Qué es esto?

Este es el **YAML Editor standalone** de Relampo - una versión de escritorio que contiene **SOLO** el editor YAML con sus 3 paneles:

- 🌳 **Panel Izquierdo**: Vista de árbol navegable del YAML
- 💻 **Panel Central**: Editor de código YAML con syntax highlighting
- 📋 **Panel Derecho**: Detalles y propiedades del nodo seleccionado

### ✨ Características

- ✅ Aplicación nativa (no navegador)
- ✅ Tema dark profesional (#0a0a0a, #111111)
- ✅ Colores amarillos vibrantes (#facc15, #fde047)
- ✅ Soporte completo de Relampo YAML v1 spec
- ✅ **Drag & Drop completo** para reorganizar elementos
- ✅ **Context Menu (click derecho)** con todas las opciones
- ✅ **Auto-expansión de nodos** al arrastrar
- ✅ Internacionalización (EN/ES)
- ✅ Upload/Download de archivos YAML
- ✅ Validación en tiempo real
- ✅ Edición bidireccional (árbol ↔ código)

**🔥 IMPORTANTE**: Esta versión contiene **TODAS** las funcionalidades del YAML Editor. Solo se removió la landing page, el workbench de proyectos y Relampo League. El editor en sí está 100% completo.

📖 **Ver documentos completos**:

- [`FUNCIONALIDADES-YAML-EDITOR.md`](FUNCIONALIDADES-YAML-EDITOR.md) - Lista detallada de funcionalidades
- [`VERIFICACION-FUNCIONALIDADES.md`](VERIFICACION-FUNCIONALIDADES.md) - Checklist completo de verificación

## 📥 Instalación en Mac

### Opción 1: Descarga el Binario Pre-compilado

1. Ve a la carpeta `yaml-editor-releases/`
2. Descarga el `.dmg`
3. Abre el `.dmg` y arrastra a Applications
4. Listo! 🚀

### Opción 2: Compila desde el Código Fuente

**Lee el archivo:** `GUIA-INSTALACION-MAC.md` para instrucciones detalladas.

**Resumen rápido:**

```bash
cd ~/Downloads
unzip [archivo-descargado].zip
cd [carpeta]
chmod +x build-yaml-editor-only.sh
./build-yaml-editor-only.sh
```

**Requisitos:**

- macOS 10.13 o superior
- Node.js v18+ (https://nodejs.org/)
- ~2GB de espacio libre

**Tiempo de build:** ~10 minutos

## 📚 Documentación

- 📖 **GUIA-INSTALACION-MAC.md** - Guía completa paso a paso
- ⚡ **QUICK-START-MAC.txt** - Referencia rápida
- 🔧 **BUILD-YAML-DESKTOP.md** - Detalles técnicos del build
- 🐛 **ERRORES-CORREGIDOS-v2.md** - Historial de fixes

## 🛠️ Stack Tecnológico

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS v4** - Styling
- **Vite** - Build tool
- **Electron** - Desktop wrapper
- **js-yaml** - YAML parsing
- **Lucide React** - Iconos

## 🎨 Paleta de Colores

```
Backgrounds:  #0a0a0a, #111111
Text:         zinc-100, zinc-400
Primary:      #facc15 (yellow-400)
Accent:       #fde047 (yellow-300)
Borders:      white/5
```

## 📂 Estructura del Proyecto

```
/
├── build-yaml-editor-only.sh   ← Script de build principal
├── App.tsx                      ← App completa (con landing/workbench)
├── AppYAMLStandalone.tsx        ← App standalone (solo YAML editor)
├── components/
│   ├── YAMLEditor.tsx           ← Componente principal del editor
│   ├── YAMLTreeView.tsx         ← Panel de árbol
│   ├── YAMLCodeEditor.tsx       ← Panel de código
│   ├── YAMLNodeDetails.tsx      ← Panel de detalles
│   └── ui/                      ← Componentes UI reutilizables
├── types/
│   └── yaml.ts                  ← TypeScript types para YAML spec
├── utils/
│   ├── yamlParser.ts            ← Parser YAML ↔ Tree
│   └── yamlDragDropRules.ts     ← Reglas de drag & drop
├── i18n/
│   └── translations.ts          ← Traducciones EN/ES
└── styles/
    └── globals.css              ← Estilos globales Tailwind v4
```

## 🚀 Uso

1. **Abrir archivo:** Click en "Upload YAML" o arrastra un archivo
2. **Editar:**
   - Usa el panel de código para edición manual
   - Usa el árbol para navegación visual
   - Usa el panel de detalles para editar propiedades
3. **Descargar:** Click en "Download YAML"

### Especificación YAML Soportada

El editor soporta la especificación completa de **Relampo v1**:

- `version` - Versión de la spec (1)
- `test_metadata` - Metadatos del test (name, description, author, etc)
- `variables` - Variables globales
- `data_sources` - CSV data sources
- `http_defaults` - Configuración HTTP por defecto
- `scenarios` - Escenarios de carga
  - `load` - Tipos: ramp_up, steady, spike, stress, step
  - `steps` - Steps del test
    - Tipos: request, group, if, loop, retry, think_time

### Overrides desde CLI

Las variables definidas en el editor también pueden sobrescribirse al ejecutar el escenario desde Relampo CLI:

```bash
relampo run scenario.yaml --var env=staging --var base_url=https://staging.example.com
relampo run scenario.yaml --vars-file env/staging.yaml --var env=staging
```

Precedencia:

`CLI > env vars > archivo > YAML`

## 🔒 Seguridad macOS

Si macOS bloquea la app:

```bash
xattr -cr /Applications/Relampo\ YAML\ Editor.app
```

O ve a: **Preferencias del Sistema** → **Seguridad y Privacidad** → **Abrir de todas formas**

## 🐛 Troubleshooting

### "command not found: node"

Instala Node.js: https://nodejs.org/

### Build falla

```bash
rm -rf yaml-editor-project
./build-yaml-editor-only.sh
```

### App no abre

```bash
xattr -cr /Applications/Relampo\ YAML\ Editor.app
```

## 📝 Licencia

Propiedad de **SQA Advisory** - Proyecto interno

## 👥 Equipo

Desarrollado por el equipo de Relampo @ SQA Advisory

---

## 🎯 Próximos Pasos

1. **Descarga** este proyecto desde Figma Make
2. **Lee** `GUIA-INSTALACION-MAC.md`
3. **Ejecuta** `./build-yaml-editor-only.sh`
4. **Disfruta** tu editor YAML nativo! 🚀

---

**¿Preguntas?** Consulta `GUIA-INSTALACION-MAC.md` para la guía completa.
