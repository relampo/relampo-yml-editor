# ⚡ GUÍA COMPLETA: Instalar Relampo YAML Editor en tu Mac

## 🎯 PASO 1: Descarga el Proyecto

1. **En Figma Make**, haz clic en el botón **"Download"** (arriba a la derecha)
2. Se descargará un archivo ZIP (probablemente a `~/Downloads`)

## 📦 PASO 2: Descomprime y Navega

Abre la **Terminal** (Aplicaciones → Utilidades → Terminal) y ejecuta:

```bash
cd ~/Downloads

# Lista los archivos para encontrar el ZIP
ls -la *.zip

# Descomprime (reemplaza [nombre-archivo] con el nombre real)
unzip [nombre-archivo].zip

# Navega a la carpeta descomprimida
cd [nombre-carpeta]

# Verifica que estés en la carpeta correcta
ls -la
```

Deberías ver archivos como:

- `build-yaml-editor-only.sh`
- `AppYAMLStandalone.tsx`
- `components/`
- `styles/`
- `electron/`
- etc.

## ✅ PASO 3: Instala Node.js (si no lo tienes)

Verifica si ya tienes Node.js:

```bash
node -v
npm -v
```

Si ves versiones (ej: v18.x.x), **SALTA este paso**.

Si NO tienes Node.js:

1. Ve a: https://nodejs.org/
2. Descarga la versión **LTS** (recomendada)
3. Instala el `.pkg` descargado
4. Cierra y abre la Terminal nuevamente
5. Verifica: `node -v` y `npm -v`

## 🚀 PASO 4: Ejecuta el Script de Build

```bash
# Dale permisos de ejecución al script
chmod +x build-yaml-editor-only.sh

# Ejecuta el script
./build-yaml-editor-only.sh
```

## ⏱️ PASO 5: Espera (~10 minutos)

El script hará TODO automáticamente:

```
✓ Verificando dependencias...
✓ Creando proyecto limpio...
✓ Copiando archivos del YAML Editor...
✓ Instalando dependencias npm... (2-3 min)
✓ Compilando con Vite... (1-2 min)
✓ Configurando Electron...
✓ Empaquetando aplicación... (3-5 min)
✓ Generando binario .dmg...
```

## 📱 PASO 6: Instala la Aplicación

Cuando termine, verás:

```
🎉 Build completado exitosamente!
📦 Binario generado en: yaml-editor-releases/
```

Ahora:

```bash
# Abre la carpeta con los binarios
open yaml-editor-releases/
```

Verás un archivo `.dmg` (ejemplo: `Relampo-YAML-Editor-1.0.0-arm64.dmg`)

1. **Doble clic** en el `.dmg`
2. **Arrastra** la app a tu carpeta **Applications**
3. Ve a **Aplicaciones** y busca **"Relampo YAML Editor"**
4. **Doble clic** para abrir

### 🔒 Primer Inicio (macOS Gatekeeper)

Si ves el mensaje _"No se puede abrir porque es de un desarrollador no identificado"_:

1. Ve a **Preferencias del Sistema** → **Seguridad y Privacidad**
2. Haz clic en **"Abrir de todas formas"**
3. O usa este comando:

```bash
xattr -cr /Applications/Relampo\ YAML\ Editor.app
```

## ✨ ¡LISTO!

Ahora tienes una **aplicación nativa** en tu Mac con:

- ✅ Ventana nativa (no navegador)
- ✅ YAML Editor completo de 3 paneles
- ✅ Tema dark profesional
- ✅ Funcional y standalone

---

## 🐛 Solución de Problemas

### Error: "command not found: node"

**Solución:** Instala Node.js desde https://nodejs.org/

### Error: "Permission denied"

**Solución:**

```bash
chmod +x build-yaml-editor-only.sh
```

### Error durante el build

**Solución:** Limpia y vuelve a intentar:

```bash
rm -rf yaml-editor-project
./build-yaml-editor-only.sh
```

### El .dmg no se genera

**Solución:** Verifica que tengas espacio en disco (necesitas ~2GB libres)

---

## 📞 Estructura de Carpetas Después del Build

```
~/Downloads/[proyecto]/
├── build-yaml-editor-only.sh    ← Script que ejecutaste
├── yaml-editor-project/          ← Proyecto temporal (puedes borrarlo)
└── yaml-editor-releases/         ← AQUÍ ESTÁ TU APP
    └── Relampo-YAML-Editor-1.0.0-arm64.dmg  ← Este es tu binario
```

---

## 🎯 Comandos Completos (Copiar y Pegar)

Si quieres hacerlo todo de una vez:

```bash
# 1. Ir a Downloads
cd ~/Downloads

# 2. Listar archivos ZIP
ls -la *.zip

# 3. Descomprimir (CAMBIA el nombre del archivo)
unzip relampo-project.zip

# 4. Navegar a la carpeta (CAMBIA el nombre)
cd relampo-project

# 5. Dar permisos y ejecutar
chmod +x build-yaml-editor-only.sh
./build-yaml-editor-only.sh

# 6. Cuando termine, abrir la carpeta de releases
open yaml-editor-releases/
```

---

## ⚡ ¡Disfruta tu Relampo YAML Editor!
