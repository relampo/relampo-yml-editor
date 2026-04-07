# ⚡ RELAMPO YAML EDITOR - Build para Desktop

## 📦 Instrucciones Simples

### 1️⃣ Descarga este proyecto desde Figma Make

Haz clic en el botón de **descarga** en Figma Make y guarda el ZIP.

### 2️⃣ Descomprime el archivo

```bash
cd ~/Downloads
unzip relampo-yaml-editor.zip
cd relampo-yaml-editor
```

### 3️⃣ Ejecuta el script de build

```bash
chmod +x build-yaml-editor-only.sh
./build-yaml-editor-only.sh
```

### 4️⃣ Encuentra tu aplicación

El binario estará en: `yaml-editor-releases/`

Para macOS: abre el archivo `.dmg` y arrastra a Applications
Para Linux: ejecuta el `.AppImage`

---

## 🎯 ¿Qué hace el script?

1. ✅ Crea un proyecto limpio con SOLO el YAML Editor
2. ✅ Compila la aplicación React con Vite
3. ✅ Empaqueta con Electron
4. ✅ Genera binarios nativos para tu sistema operativo

---

## 🐛 ¿Problemas?

Si el script falla, asegúrate de tener:

- Node.js v18 o superior
- npm v9 o superior

Instala desde: https://nodejs.org/
