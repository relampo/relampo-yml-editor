# ⚡ Relampo YAML Editor - Standalone Distribution

## 🎯 Qué es esto?

Un **ejecutable standalone del YAML Editor** que se distribuye como un archivo `.tar.gz` y cuando lo ejecutas **SOLO abre el YAML Editor** (sin landing page, sin workbench, sin menús).

---

## 🚀 Build del Standalone

```bash
# 1. Dar permisos al script
chmod +x build-yaml-standalone.sh

# 2. Generar el bundle
./build-yaml-standalone.sh
```

✅ Genera: **`relampo-yaml-editor-standalone.tar.gz`**

---

## 📦 Qué incluye el Bundle

```
relampo-yaml-editor/
├── run.sh              # ⚡ Ejecutable principal
├── install.sh          # Setup rápido
├── README.txt          # Instrucciones para usuarios
├── VERSION             # Info de versión
├── index.html          # YAML Editor (standalone)
├── assets/             # CSS, JS, etc.
└── imports/            # Imágenes, SVGs
```

---

## 👤 Instrucciones para Usuarios Finales

### Mac/Linux

```bash
# 1. Descargar
curl -L https://your-server.com/relampo-yaml-editor-standalone.tar.gz -o relampo.tar.gz

# 2. Extraer
tar -xzf relampo.tar.gz

# 3. Ejecutar
cd relampo-yaml-editor
./run.sh
```

### ⚡ Una sola línea:

```bash
curl -L https://your-server.com/relampo-yaml-editor-standalone.tar.gz | tar -xz && cd relampo-yaml-editor && ./run.sh
```

---

## 🔥 Qué pasa cuando ejecutas `./run.sh`

1. ✅ Detecta un puerto disponible (empieza en 8080)
2. ✅ Levanta servidor HTTP local con Python
3. ✅ Abre el navegador automáticamente
4. ✅ Muestra **SOLO el YAML Editor** (fullscreen, sin otros menús)

```
⚡━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⚡
   RELAMPO YAML EDITOR
   Performance Testing Configuration Tool
⚡━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⚡

🔧 Starting server on port 8080...

✅ Relampo YAML Editor is running!

🌐 URL: http://localhost:8080
📝 Features:
   • Upload/Download YAML files
   • Visual tree editor
   • Code editor with syntax highlighting
   • Drag & drop reordering
   • English/Spanish support

⚡ Opening browser...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Press Ctrl+C to stop the server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 📤 Dónde Distribuir

### Opción 1: GitHub Releases ⭐ (Recomendado)

```bash
# Crear release con GitHub CLI
gh release create v1.0.0 relampo-yaml-editor-standalone.tar.gz \
  --title "Relampo YAML Editor v1.0.0" \
  --notes "Standalone YAML Editor for performance testing configuration"

# URL resultante:
# https://github.com/tu-usuario/relampo/releases/download/v1.0.0/relampo-yaml-editor-standalone.tar.gz
```

### Opción 2: Tu Servidor

```bash
# Subir con SCP
scp relampo-yaml-editor-standalone.tar.gz user@yourserver.com:/var/www/downloads/

# URL: https://yourserver.com/downloads/relampo-yaml-editor-standalone.tar.gz
```

### Opción 3: Cloud Storage

- Subir a Dropbox/Google Drive
- Obtener link público
- Compartir

---

## 📝 Ejemplo para tu README

````markdown
# Relampo YAML Editor

## 🚀 Quick Install

### Mac/Linux (One Line)

\`\`\`bash
curl -L https://github.com/tu-usuario/relampo/releases/download/v1.0.0/relampo-yaml-editor-standalone.tar.gz | tar -xz && cd relampo-yaml-editor && ./run.sh
\`\`\`

### Manual Download

1. Download: [relampo-yaml-editor-standalone.tar.gz](https://github.com/tu-usuario/relampo/releases/download/v1.0.0/relampo-yaml-editor-standalone.tar.gz)
2. Extract: `tar -xzf relampo-yaml-editor-standalone.tar.gz`
3. Run: `cd relampo-yaml-editor && ./run.sh`

## Requirements

- Python 3 (pre-installed on Mac/Linux)
- Modern browser

## Features

⚡ **YAML Editor** for performance testing configurations

- Visual tree editor with drag & drop
- Code editor with syntax highlighting
- Upload/Download YAML files
- English/Spanish support
- Works 100% offline
  \`\`\`

---

## 🧪 Testing Local

Después de generar el bundle:

```bash
# Extraer
tar -xzf relampo-yaml-editor-standalone.tar.gz

# Probar
cd relampo-yaml-editor
./run.sh

# Debería abrir: http://localhost:8080
# Solo con el YAML Editor visible
```
````

---

## 🔧 Cómo Funciona Internamente

### Durante el Build

1. **Backup** de `App.tsx` original
2. **Reemplaza** `App.tsx` con `AppYAMLStandalone.tsx` (que solo renderiza `<YAMLEditor />`)
3. **Build** de producción con Vite/npm
4. **Restaura** `App.tsx` original
5. **Empaqueta** todo en `.tar.gz`

### Durante la Ejecución

1. `run.sh` levanta servidor Python HTTP simple
2. Sirve el `index.html` que carga `AppYAMLStandalone`
3. `AppYAMLStandalone` solo renderiza `<YAMLEditor />` fullscreen
4. Usuario ve **solo el editor YAML**, nada más

---

## ✨ Ventajas

- ✅ **Sin Node.js** necesario (solo Python pre-instalado)
- ✅ **Ultra ligero** (~1-2MB comprimido)
- ✅ **Funciona offline** completamente
- ✅ **Una sola app** enfocada (YAML Editor)
- ✅ **Fácil distribución** (un solo archivo)
- ✅ **Cross-platform** (Mac/Linux)
- ✅ **Auto-detección** de puertos
- ✅ **Auto-abre navegador**

---

## 🎯 Diferencias con el Bundle Completo

| Feature          | Bundle Completo     | YAML Editor Standalone |
| ---------------- | ------------------- | ---------------------- |
| **Landing Page** | ✅ Sí               | ❌ No                  |
| **Workbench**    | ✅ Sí               | ❌ No                  |
| **Dashboard**    | ✅ Sí               | ❌ No                  |
| **YAML Editor**  | ✅ Sí               | ✅ **Sí (solo esto)**  |
| **Sidebar Nav**  | ✅ Sí               | ❌ No                  |
| **Tamaño**       | ~5-10MB             | ~1-2MB                 |
| **Uso**          | Plataforma completa | Editor enfocado        |

---

## 🚀 Para Crear el Bundle de Windows

Si quieres soportar Windows, necesitas crear `run.bat`:

```batch
@echo off
title Relampo YAML Editor

echo ⚡ Starting Relampo YAML Editor...
echo.

cd /d "%~dp0"

:: Detectar puerto disponible (simplificado para Windows)
set PORT=8080

:: Levantar servidor
python -m http.server %PORT%

pause
```

Luego comprimir como `.zip` en lugar de `.tar.gz`:

```bash
zip -r relampo-yaml-editor-windows.zip relampo-yaml-editor/
```

---

## 📊 Tamaños Esperados

```
Comprimido:     ~1-2 MB
Descomprimido:  ~3-5 MB
Runtime Memory: ~50-100 MB (en navegador)
```

---

## 🔥 Siguiente Nivel: Ejecutable Verdadero

Si quieres un ejecutable **verdadero** (`.app` para Mac, `.exe` para Windows) sin necesidad de Python:

### Con Tauri (Recomendado):

- ✅ Binario nativo (~5-10MB)
- ✅ No necesita Python
- ✅ Icono personalizado
- ✅ Instalador `.dmg`/`.exe`

### Con Electron:

- ✅ Más maduro
- ❌ Más pesado (~100MB)

¿Te interesa explorar Tauri para crear ejecutables verdaderos?

---

## 🆘 Troubleshooting

### "Permission denied"

```bash
chmod +x run.sh
```

### "Python not found"

```bash
# Mac
brew install python3

# Linux
sudo apt-get install python3
```

### "Port already in use"

El script automáticamente busca otro puerto disponible.

### "Browser doesn't open"

Abrir manualmente: `http://localhost:8080`

---

## ✅ Checklist de Distribución

- [ ] Build exitoso: `./build-yaml-standalone.sh`
- [ ] Probado localmente: `tar -xzf ... && cd ... && ./run.sh`
- [ ] Solo se ve YAML Editor (sin landing/workbench)
- [ ] Drag & drop funciona
- [ ] Upload/Download YAML funciona
- [ ] Toggle EN/ES funciona
- [ ] README.txt incluido en bundle
- [ ] Subido a GitHub/servidor
- [ ] Link de descarga funcional
- [ ] Documentación actualizada

---

## 🎉 ¡Listo!

Ahora tienes un **YAML Editor standalone distribuible** que funciona como un ejecutable simple.

**Para generar:**

```bash
chmod +x build-yaml-standalone.sh
./build-yaml-standalone.sh
```

**Para distribuir:**

```bash
# Subir a GitHub
gh release create v1.0.0 relampo-yaml-editor-standalone.tar.gz

# O tu servidor
scp relampo-yaml-editor-standalone.tar.gz user@server:/downloads/
```

**Para usuarios:**

```bash
curl -L YOUR_URL | tar -xz && cd relampo-yaml-editor && ./run.sh
```

🔥 **¡A distribuir!**
