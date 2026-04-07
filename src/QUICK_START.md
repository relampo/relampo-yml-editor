# ⚡ Relampo - Quick Start

## 🎯 Dos Opciones Disponibles

### Opción A: YAML Editor Standalone (Recomendado para distribución)

Solo el **YAML Editor** como aplicación independiente.

```bash
# 1. Dar permisos
chmod +x build-yaml-standalone.sh

# 2. Crear bundle
./build-yaml-standalone.sh

# ✅ Genera: relampo-yaml-editor-standalone.tar.gz
```

📚 **Ver:** [YAML_STANDALONE_README.md](./YAML_STANDALONE_README.md) para más detalles

---

### Opción B: Bundle Completo (Toda la plataforma)

Incluye Landing Page, Workbench, Dashboard, YAML Editor, etc.

```bash
# 1. Dar permisos
chmod +x build-bundle.sh

# 2. Crear bundle
./build-bundle.sh

# ✅ Genera: relampo-standalone-mac-linux.tar.gz
```

---

## 🎯 Para Desarrolladores (Crear el Bundle)

### YAML Editor Standalone

```bash
# 1. Dar permisos
chmod +x build-yaml-standalone.sh

# 2. Crear bundle
./build-yaml-standalone.sh

# ✅ Genera: relampo-yaml-editor-standalone.tar.gz
```

### Bundle Completo

```bash
# 1. Dar permisos
chmod +x build-bundle.sh

# 2. Crear bundle
./build-bundle.sh

# ✅ Genera: relampo-standalone-mac-linux.tar.gz
```

---

## 👥 Para Usuarios Finales (Ejecutar la App)

### YAML Editor Standalone

### Opción 1: Descargar y Ejecutar

```bash
# 1. Descargar desde tu URL
curl -L https://tu-url.com/relampo-yaml-editor-standalone.tar.gz -o relampo.tar.gz

# 2. Extraer
tar -xzf relampo.tar.gz

# 3. Entrar
cd relampo-yaml-editor

# 4. Ejecutar
./run.sh
```

### Opción 2: Una Sola Línea 🔥

```bash
curl -L https://tu-url.com/relampo-yaml-editor-standalone.tar.gz | tar -xz && cd relampo-yaml-editor && ./run.sh
```

---

## 🖥️ Qué Hace el Script

### YAML Editor Standalone

1. ✅ Detecta puerto disponible (empieza en 8080)
2. ✅ Levanta servidor HTTP local con Python
3. ✅ Abre navegador automáticamente
4. ✅ Muestra **SOLO el YAML Editor** (fullscreen, sin menús de navegación)

**Para detener:** `Ctrl+C`

---

## 📋 Requisitos

- **Mac/Linux** con Python 3 (viene pre-instalado)
- **Navegador moderno** (Chrome, Firefox, Safari, Edge)

---

## 🎯 Ejemplo de Distribución

### YAML Editor Standalone en tu README.md:

```markdown
# Instalación Rápida

## Mac/Linux

\`\`\`bash
curl -L https://github.com/tu-usuario/relampo/releases/download/v1.0.0/relampo-yaml-editor-standalone.tar.gz | tar -xz
cd relampo-yaml-editor
./run.sh
\`\`\`

## Windows

Descargar `relampo-yaml-editor-windows.zip` y ejecutar `run.bat`
```

---

## 📦 Estructura del Bundle

### YAML Editor Standalone

```
relampo-yaml-editor-standalone.tar.gz
└── relampo-yaml-editor/
    ├── run.sh           # Script ejecutable
    ├── install.sh       # Setup rápido
    ├── README.txt       # Instrucciones
    ├── VERSION          # Info de versión
    ├── index.html       # YAML Editor (standalone)
    ├── assets/          # CSS, JS, imágenes
    └── ...              # Resto de archivos build
```

---

## 🔥 Testing Local

### YAML Editor Standalone

```bash
# Después de generar el bundle
tar -xzf relampo-yaml-editor-standalone.tar.gz
cd relampo-yaml-editor
./run.sh

# Debería abrir: http://localhost:8080
# Solo muestra el YAML Editor
```

---

## ⚡ Comandos Útiles

```bash
# Ver qué está corriendo en el puerto
lsof -i :8080

# Matar proceso en puerto
kill $(lsof -t -i:8080)

# Re-dar permisos si es necesario
chmod +x run.sh

# Ver tamaño del bundle
du -h relampo-yaml-editor-standalone.tar.gz
```

---

## 🚀 Ya está!

Ahora tienes:

- ✅ Script de build (`build-yaml-standalone.sh`)
- ✅ Bundle distribuible (`.tar.gz`)
- ✅ Ejecutable simple (`run.sh`)
- ✅ Funciona offline
- ✅ No necesita Node.js

**Distribúyelo y disfruta! 🎉**
