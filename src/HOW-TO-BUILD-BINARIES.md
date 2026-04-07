# 🚀 Cómo Generar los Binarios de Relampo YAML Editor

## ⚠️ IMPORTANTE: Los binarios NO existen todavía

Los archivos ejecutables (.dmg, .AppImage, etc.) **se generan cuando ejecutas el script de build**.

---

## 📋 Pasos para Generar los Binarios

### 1️⃣ Preparar Íconos (Opcional pero recomendado)

Crea un ícono con un rayo amarillo para la app:

**Para macOS:**

```bash
# Coloca un archivo icon.icns en:
/electron/icon.icns
```

**Para Linux:**

```bash
# Coloca un archivo icon.png en:
/electron/icon.png
```

📌 **Si no tienes íconos:** El build funcionará igual, usará el ícono por defecto de Electron.

---

### 2️⃣ Ejecutar el Script de Build

```bash
# Dar permisos de ejecución
chmod +x build-yaml-desktop.sh

# Ejecutar el builder (toma ~5-10 minutos la primera vez)
./build-yaml-desktop.sh
```

---

### 3️⃣ Esperar a que Termine

El script hará:

```
⚡━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⚡
   RELAMPO YAML EDITOR - DESKTOP APP BUILDER
⚡━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⚡

🖥️  Platform: macOS (o Linux)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Step 1: Checking dependencies...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Node.js v20.x.x
✓ npm 10.x.x

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 Step 2: Backing up original App.tsx...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Backup created

... (continúa con todos los pasos)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Desktop app build completed successfully!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### 4️⃣ Encontrar tus Binarios

Después del build, los ejecutables estarán en:

```
relampo-desktop-releases/
├── Relampo-YAML-Editor-1.0.0.dmg       # macOS installer (si estás en Mac)
├── Relampo-YAML-Editor-1.0.0-mac.zip  # macOS portable (si estás en Mac)
├── Relampo-YAML-Editor-1.0.0.AppImage # Linux portable (si estás en Linux)
└── relampo-yaml-editor-1.0.0.tar.gz   # Linux archive (si estás en Linux)
```

**Nota:** Solo se generarán los binarios para tu sistema operativo actual:

- En **macOS** → genera .dmg y .zip
- En **Linux** → genera .AppImage y .tar.gz

---

## 🎯 Usar los Binarios

### En macOS:

```bash
# Opción 1: Usar el DMG (recomendado)
open relampo-desktop-releases/Relampo-YAML-Editor-1.0.0.dmg
# → Arrastrar a Applications
# → Abrir desde Applications

# Opción 2: Usar el ZIP
unzip relampo-desktop-releases/Relampo-YAML-Editor-1.0.0-mac.zip
mv "Relampo YAML Editor.app" /Applications/
open -a "Relampo YAML Editor"
```

### En Linux:

```bash
# Opción 1: AppImage (más fácil)
cd relampo-desktop-releases
chmod +x Relampo-YAML-Editor-1.0.0.AppImage
./Relampo-YAML-Editor-1.0.0.AppImage

# Opción 2: tar.gz
tar -xzf relampo-yaml-editor-1.0.0.tar.gz
cd relampo-yaml-editor
./relampo-yaml-editor
```

---

## 📤 Distribuir a Usuarios

Una vez que tienes los binarios, puedes:

### Opción 1: Subir a GitHub Releases

```bash
# Crear release en GitHub
gh release create v1.0.0 \
  relampo-desktop-releases/*.dmg \
  relampo-desktop-releases/*.AppImage \
  --title "Relampo YAML Editor v1.0.0" \
  --notes "Aplicación de escritorio nativa"
```

Los usuarios descargan desde:

```
https://github.com/tu-usuario/relampo/releases/download/v1.0.0/Relampo-YAML-Editor-1.0.0.dmg
```

### Opción 2: Google Drive / Dropbox

1. Sube los archivos a tu carpeta compartida
2. Obtén el link público
3. Comparte el link con tus usuarios

### Opción 3: Tu Propio Servidor

```bash
# Subir al servidor
scp relampo-desktop-releases/* user@server.com:/var/www/downloads/

# Los usuarios descargan desde:
# https://tuserver.com/downloads/Relampo-YAML-Editor-1.0.0.dmg
```

---

## 🐛 Problemas Comunes

### "Node.js not found"

**Solución:**

```bash
# Instalar Node.js
# macOS:
brew install node

# Linux (Ubuntu/Debian):
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### "Build failed" en macOS

**Solución:**

```bash
# Instalar Xcode Command Line Tools
xcode-select --install
```

### "Build failed" en Linux

**Solución:**

```bash
# Ubuntu/Debian
sudo apt-get install build-essential libssl-dev

# Fedora
sudo dnf install gcc gcc-c++ make openssl-devel
```

### El build toma mucho tiempo (primera vez)

**Es normal!** La primera vez descarga:

- Electron binaries (~80 MB)
- Node modules (~100 MB)

**Builds posteriores** serán mucho más rápidos (1-2 minutos).

---

## ⚙️ Opciones Avanzadas

### Cambiar la Versión

Edita `/package.electron.json`:

```json
{
  "version": "2.0.0" // Cambia esto
}
```

### Build para Múltiples Arquitecturas (solo macOS)

Por defecto genera para Intel (x64) y Apple Silicon (arm64).

Para solo Apple Silicon:

```bash
# Editar package.electron.json:
"target": [
  {
    "target": "dmg",
    "arch": ["arm64"]  // Solo Apple Silicon
  }
]
```

### Habilitar DevTools en la App

Edita `/electron/main.js`:

```javascript
// Descomentar esta línea:
mainWindow.webContents.openDevTools();
```

---

## 📊 Tamaños de los Binarios

Aproximadamente:

- **macOS DMG:** ~150 MB
- **macOS ZIP:** ~145 MB
- **Linux AppImage:** ~160 MB
- **Linux tar.gz:** ~140 MB

**¿Por qué son tan grandes?**
Incluyen Chromium completo + Node.js + tu app. Pero a cambio:

- ✅ Los usuarios no necesitan instalar NADA
- ✅ Funciona 100% offline
- ✅ Es una app nativa de verdad

---

## 🔥 Resumen

1. ✅ **Ejecutar:** `./build-yaml-desktop.sh`
2. ✅ **Esperar:** ~5-10 minutos (primera vez)
3. ✅ **Encontrar:** binarios en `relampo-desktop-releases/`
4. ✅ **Distribuir:** GitHub Releases / Drive / tu servidor
5. ✅ **Usuarios:** Solo descargar y ejecutar (sin dependencias)

---

**¿Preguntas?** Lee el archivo `DESKTOP-BUILD-README.md` para más detalles.

**Built with ⚡ by Relampo Team**
