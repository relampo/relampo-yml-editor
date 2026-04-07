# 📦 Relampo - Guía de Distribución

## 🎯 Crear Bundle Standalone

### Paso 1: Generar el Bundle

```bash
# Dar permisos al script
chmod +x build-bundle.sh

# Ejecutar build
./build-bundle.sh
```

Esto genera: `relampo-standalone-mac-linux.tar.gz`

---

## 📤 Distribuir

### Opción A: Subir a tu servidor

```bash
# Ejemplo con SCP
scp relampo-standalone-mac-linux.tar.gz user@yourserver.com:/downloads/

# URL pública:
# https://yourserver.com/downloads/relampo-standalone-mac-linux.tar.gz
```

### Opción B: GitHub Releases

1. Ir a tu repo en GitHub
2. Click en "Releases" → "Create new release"
3. Upload `relampo-standalone-mac-linux.tar.gz`
4. Publicar

URL ejemplo: `https://github.com/tu-usuario/relampo/releases/download/v1.0.0/relampo-standalone-mac-linux.tar.gz`

### Opción C: Dropbox / Google Drive

Subir el archivo y compartir link público.

---

## 👥 Instrucciones para Usuarios

### Mac/Linux

```bash
# 1. Descargar
curl -L https://tu-url.com/relampo-standalone-mac-linux.tar.gz -o relampo.tar.gz

# 2. Extraer
tar -xzf relampo.tar.gz

# 3. Entrar al directorio
cd relampo-bundle

# 4. Ejecutar
./run.sh
```

### Una línea (para tu README):

```bash
curl -L https://tu-url.com/relampo-standalone-mac-linux.tar.gz | tar -xz && cd relampo-bundle && ./run.sh
```

---

## 🖥️ Windows (Requiere ajustes adicionales)

Para Windows necesitas crear un `.bat` script en lugar de `.sh`:

**run.bat:**

```batch
@echo off
echo Starting Relampo...
python -m http.server 3456
```

Luego crear un bundle separado: `relampo-standalone-windows.zip`

---

## 🔥 Script de Instalación Automática

Puedes crear un instalador con una sola línea:

```bash
curl -fsSL https://tu-url.com/install.sh | bash
```

Donde `install.sh` es:

```bash
#!/bin/bash
set -e

# Descargar
curl -L https://tu-url.com/relampo-standalone-mac-linux.tar.gz -o /tmp/relampo.tar.gz

# Extraer
mkdir -p ~/Applications/Relampo
tar -xzf /tmp/relampo.tar.gz -C ~/Applications/Relampo

# Permisos
chmod +x ~/Applications/Relampo/relampo-bundle/run.sh

# Cleanup
rm /tmp/relampo.tar.gz

echo "✅ Relampo installed at ~/Applications/Relampo"
echo "Run: cd ~/Applications/Relampo/relampo-bundle && ./run.sh"
```

---

## 📊 Tamaños Esperados

- **Bundle comprimido:** ~500KB - 2MB (depende de assets)
- **Bundle descomprimido:** ~2-5MB
- **Requisitos:** Python 3 (pre-instalado en Mac/Linux)

---

## 🎨 Personalizar

### Cambiar puerto por defecto

Editar en `build-bundle.sh`, línea del `run.sh`:

```bash
PORT=3456  # Cambiar este número
```

### Agregar icono (Mac)

Para crear un `.app` verdadero con icono:

1. Crear estructura:

```
Relampo.app/
├── Contents/
│   ├── MacOS/
│   │   └── relampo (script)
│   ├── Resources/
│   │   └── icon.icns
│   └── Info.plist
```

2. Info.plist:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>relampo</string>
    <key>CFBundleIconFile</key>
    <string>icon</string>
    <key>CFBundleName</key>
    <string>Relampo</string>
</dict>
</plist>
```

---

## 🔒 Firmar para Mac (Opcional)

Para evitar el mensaje "Unidentified Developer":

```bash
# Requiere Apple Developer Account
codesign --force --deep --sign "Developer ID" Relampo.app
```

---

## 🚀 Testing

Antes de distribuir, prueba en una Mac limpia:

```bash
# Simular descarga
cd /tmp
curl -L file:///ruta/a/relampo-standalone-mac-linux.tar.gz -o test.tar.gz
tar -xzf test.tar.gz
cd relampo-bundle
./run.sh
```

---

## 📝 Checklist de Distribución

- [ ] Build exitoso con `./build-bundle.sh`
- [ ] Probado en Mac limpia
- [ ] Probado en Linux (Ubuntu/Debian)
- [ ] README.txt incluido
- [ ] VERSION file actualizado
- [ ] Subido a servidor/GitHub
- [ ] Instrucciones de instalación documentadas
- [ ] Link de descarga funcional

---

## 🆘 Soporte

Si usuarios reportan problemas:

1. **"Permission denied"**: `chmod +x run.sh`
2. **"Python not found"**: Instalar Python 3
3. **"Port in use"**: El script debería auto-seleccionar otro puerto
4. **Browser no abre**: Abrir manualmente `http://localhost:3456`

---

## 🎯 Next Steps

Para un ejecutable verdadero (sin necesitar Python):

1. **Tauri**: Crea binarios nativos (5-10MB)
2. **Electron**: Más pesado pero incluye todo (~100MB)
3. **Go + embed**: Compilar un servidor Go con assets embebidos

¿Quieres explorar alguna de estas opciones?
