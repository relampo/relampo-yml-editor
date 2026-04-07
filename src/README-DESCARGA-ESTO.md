# ⚡ RELAMPO YAML EDITOR - Build de Escritorio

## 🎯 INSTRUCCIONES SIMPLES

### 1. Descarga este ZIP desde Figma Make

Haz clic en el botón **"Download"** arriba a la derecha

### 2. Descomprime el archivo

```bash
cd ~/Downloads
unzip relampo-[nombre-del-archivo].zip
cd [nombre-de-la-carpeta]
```

### 3. Ejecuta el script

```bash
chmod +x build-yaml-editor-only.sh
./build-yaml-editor-only.sh
```

### 4. Encuentra tu aplicación

Los binarios estarán en: **`yaml-editor-releases/`**

- **macOS**: Abre el `.dmg` y arrastra a Applications
- **Linux**: Ejecuta el `.AppImage`

---

## ✅ TODO YA ESTÁ CORREGIDO

El script `build-yaml-editor-only.sh` ya tiene todas las correcciones necesarias para encontrar los archivos en `src/`.

---

## 📦 ¿Qué construye este script?

Una aplicación de **escritorio nativa** que contiene SOLO el YAML Editor de Relampo:

✅ Sin landing page  
✅ Sin workbench  
✅ Sin Relampo League  
✅ Solo el editor YAML con sus 3 paneles

---

## 🛠️ Requisitos

- Node.js v18 o superior
- npm v9 o superior

Descarga desde: https://nodejs.org/

---

## ⏱️ Tiempo estimado

- **Instalación de dependencias**: 2-3 minutos
- **Build de React**: 1-2 minutos
- **Empaquetado con Electron**: 3-5 minutos
- **Total**: ~10 minutos

---

## 🐛 ¿Problemas?

Si el script falla, verifica:

1. ¿Tienes Node.js instalado? → `node -v`
2. ¿Tienes npm instalado? → `npm -v`
3. ¿Estás en la carpeta correcta? → Debe tener el archivo `build-yaml-editor-only.sh`

---

## 🚀 ¡Listo para descargar y ejecutar!
