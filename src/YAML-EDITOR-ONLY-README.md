# ⚡ Relampo YAML Editor - Desktop App (SOLO Editor)

## 🎯 ¿Qué incluye?

Este build genera **SOLO el YAML Editor**, sin:

- ❌ Landing page
- ❌ Workbench
- ❌ Dashboard
- ❌ Relampo League
- ❌ Projects

Solo incluye:

- ✅ YAML Editor con vista de código y árbol
- ✅ Drag & Drop para reorganizar nodos
- ✅ Panel de detalles para cada nodo
- ✅ Toggle de idioma EN/ES
- ✅ Upload/Download de archivos YAML
- ✅ Syntax highlighting

---

## 📦 PASO A PASO - Generar el Binario

### 1. Descargar el Proyecto desde Figma Make

1. En Figma Make, click en **"Export"** o **"Download"**
2. Descarga el proyecto como ZIP
3. Descomprime el archivo

```bash
cd ~/Downloads
unzip relampo-project.zip
cd relampo-project
```

---

### 2. Verificar que tienes Node.js

```bash
node -v   # Debe mostrar v18.x o v20.x
npm -v    # Debe mostrar 9.x o 10.x
```

**Si no tienes Node.js:**

```bash
# macOS:
brew install node

# Linux Ubuntu/Debian:
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

---

### 3. (Opcional) Crear Ícono de la App

**Para testing puedes saltarte este paso.** Electron usará su ícono por defecto.

Si quieres un ícono personalizado:

```bash
# Linux - crear placeholder simple:
cd electron
curl -o icon.png "https://via.placeholder.com/512/facc15/000000?text=%E2%9A%A1"
cd ..

# macOS - necesitas convertir PNG a ICNS:
# 1. Crea un PNG de 512x512 con un rayo amarillo
# 2. Súbelo a: https://cloudconvert.com/png-to-icns
# 3. Descarga el .icns y colócalo en electron/icon.icns
```

---

### 4. Dar Permisos al Script

```bash
chmod +x build-yaml-editor-only.sh
```

---

### 5. Ejecutar el Build (5-10 minutos)

```bash
./build-yaml-editor-only.sh
```

**Lo que hace el script:**

```
⚡━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⚡
     RELAMPO YAML EDITOR ONLY - BUILDER
⚡━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⚡

🖥️  Platform: macOS
📦 Building: YAML Editor Only (no landing, no workbench)

Step 1: Checking dependencies... ✓
Step 2: Creating clean YAML Editor project... ✓
Step 3: Copying YAML Editor files only... ✓
Step 4: Installing dependencies... ✓
Step 5: Building production bundle... ✓
Step 6: Setting up Electron... ✓
Step 7: Installing Electron... ✓
Step 8: Building desktop app... ✓
Step 9: Moving binaries... ✓

✅ YAML Editor desktop app completed!
```

---

### 6. Encontrar tus Binarios

```bash
ls -lh yaml-editor-releases/
```

**En macOS:**

```
Relampo-YAML-Editor-1.0.0.dmg       (~150 MB)
Relampo-YAML-Editor-1.0.0-mac.zip  (~145 MB)
```

**En Linux:**

```
Relampo-YAML-Editor-1.0.0.AppImage  (~160 MB)
relampo-yaml-editor-1.0.0.tar.gz    (~140 MB)
```

---

### 7. Probar la App

**macOS:**

```bash
open yaml-editor-releases/Relampo-YAML-Editor-1.0.0.dmg
# Arrastra a Applications
# Abre desde Applications (primera vez: click derecho → Abrir)
```

**Linux:**

```bash
cd yaml-editor-releases
chmod +x Relampo-YAML-Editor-1.0.0.AppImage
./Relampo-YAML-Editor-1.0.0.AppImage
```

**✅ Debe abrir una ventana nativa con SOLO el YAML Editor**

---

## 🗂️ Estructura de lo que se incluye

El script crea un proyecto limpio con SOLO estos archivos:

```
yaml-editor-standalone/
├── App.tsx                        (AppYAMLStandalone.tsx renombrado)
├── components/
│   ├── YAMLEditor.tsx            ← Componente principal
│   ├── YAMLCodeEditor.tsx        ← Editor de código con syntax highlighting
│   ├── YAMLTreeView.tsx          ← Vista de árbol
│   ├── YAMLTreeNode.tsx          ← Nodos del árbol
│   ├── YAMLNodeDetails.tsx       ← Panel de detalles
│   ├── YAMLRequestDetails.tsx    ← Detalles de requests
│   ├── YAMLContextMenu.tsx       ← Menú contextual
│   ├── LanguageToggle.tsx        ← Toggle EN/ES
│   ├── DetailPanel.tsx           ← Panel lateral
│   └── ui/                       ← Componentes UI básicos
├── contexts/
│   └── LanguageContext.tsx       ← Internacionalización
├── i18n/
│   └── translations.ts           ← Traducciones EN/ES
├── types/
│   └── yaml.ts                   ← TypeScript types
├── utils/
│   ├── yamlParser.ts             ← Parser de YAML
│   └── yamlDragDropRules.ts      ← Lógica de drag & drop
├── styles/
│   └── globals.css               ← Estilos globales
└── electron/
    ├── main.js                   ← Ventana de Electron
    └── preload.js                ← Script de seguridad
```

**NO incluye:**

- ❌ LandingPage
- ❌ Workbench
- ❌ Dashboard
- ❌ RelampoLeague
- ❌ Projects
- ❌ Settings
- ❌ Sidebar de navegación

---

## 📤 Distribuir el Binario

Los archivos en `yaml-editor-releases/` son los que entregas a tus usuarios.

### Opción 1: GitHub Releases (Recomendado)

```bash
gh release create v1.0.0 \
  yaml-editor-releases/Relampo-YAML-Editor-1.0.0.dmg \
  yaml-editor-releases/Relampo-YAML-Editor-1.0.0.AppImage \
  --title "Relampo YAML Editor v1.0.0" \
  --notes "Editor YAML standalone para performance testing"
```

### Opción 2: Google Drive / Dropbox

1. Sube los archivos a tu carpeta compartida
2. Comparte el link público
3. Los usuarios descargan directamente

### Opción 3: Tu Servidor

```bash
scp yaml-editor-releases/* user@server.com:/var/www/downloads/
```

---

## 👥 Instrucciones para Usuarios

### macOS

1. Descarga `Relampo-YAML-Editor-1.0.0.dmg`
2. Doble-click en el DMG
3. Arrastra "Relampo YAML Editor" a Applications
4. Abre desde Applications
5. (Primera vez) Si dice "damaged": Click derecho → Abrir → Abrir

### Linux

```bash
# Descargar
wget https://tu-url/Relampo-YAML-Editor-1.0.0.AppImage

# Dar permisos
chmod +x Relampo-YAML-Editor-1.0.0.AppImage

# Ejecutar
./Relampo-YAML-Editor-1.0.0.AppImage
```

**✅ La app abre en una ventana nativa, sin navegador**

---

## 🧹 Limpiar Archivos Temporales

Después de que el build termine, se crea la carpeta `yaml-editor-standalone/` con el proyecto temporal.

Puedes eliminarla después de probar la app:

```bash
rm -rf yaml-editor-standalone
```

**Los binarios en `yaml-editor-releases/` se mantienen.**

---

## 🐛 Troubleshooting

### Error: "Permission denied"

```bash
chmod +x build-yaml-editor-only.sh
```

### Error: "Node.js not found"

Instala Node.js:

```bash
# macOS:
brew install node

# Linux:
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Error en macOS: "xcode-select"

```bash
xcode-select --install
```

### Error en Linux: "build-essential"

```bash
sudo apt-get install build-essential libssl-dev
```

### La app no abre en macOS

**Primera vez:** Click derecho → Abrir → Abrir

**Para distribuir sin este problema:** Necesitas firmar la app con Apple Developer Account.

---

## ⚙️ Personalizar la App

### Cambiar el Título de la Ventana

Edita `electron/main.js` después de generar el proyecto:

```javascript
mainWindow.setTitle('Mi Editor YAML');
```

Luego rebuild.

### Cambiar la Versión

Edita `package.electron.json`:

```json
{
  "version": "2.0.0"
}
```

### Cambiar el Tamaño de la Ventana

Edita `electron/main.js`:

```javascript
const mainWindow = new BrowserWindow({
  width: 1600, // Cambiar
  height: 1000, // Cambiar
  // ...
});
```

---

## 📊 Comparación: Web vs Desktop

| Feature             | Web Bundle              | Desktop App      |
| ------------------- | ----------------------- | ---------------- |
| **Instalación**     | Python + npm install    | Solo descargar   |
| **Ejecución**       | Terminal + Browser      | Doble-click      |
| **Tamaño**          | ~5 MB                   | ~150 MB          |
| **Offline**         | Necesita servidor local | 100% offline     |
| **Actualizaciones** | Manual                  | Manual           |
| **Distribución**    | .tar.gz con scripts     | .dmg / .AppImage |
| **User Experience** | Tab del navegador       | Ventana nativa   |

---

## 🔥 Ventajas del Desktop App

✅ **Cero dependencias** - Los usuarios no instalan nada  
✅ **Una ventana dedicada** - No es un tab del navegador  
✅ **100% offline** - No requiere servidor  
✅ **Multiplataforma** - Mac y Linux  
✅ **Distribución simple** - Un solo archivo  
✅ **Look & feel nativo** - Como cualquier app de escritorio

---

## 📝 Resumen de Comandos

```bash
# 1. Dar permisos
chmod +x build-yaml-editor-only.sh

# 2. Build (5-10 min)
./build-yaml-editor-only.sh

# 3. Probar
# macOS:
open yaml-editor-releases/Relampo-YAML-Editor-1.0.0.dmg

# Linux:
cd yaml-editor-releases
chmod +x Relampo-YAML-Editor-1.0.0.AppImage
./Relampo-YAML-Editor-1.0.0.AppImage

# 4. Limpiar (opcional)
rm -rf yaml-editor-standalone
```

---

**Built with ⚡ by Relampo Team**
