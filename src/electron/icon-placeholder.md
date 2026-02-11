# 🎨 App Icons Required

Para que el build funcione, necesitas agregar íconos de la aplicación:

## Archivos Requeridos

### macOS
- **File:** `/electron/icon.icns`
- **Format:** ICNS (macOS icon format)
- **Size:** 512x512px
- **Tool:** Puedes usar https://cloudconvert.com/png-to-icns

### Linux
- **File:** `/electron/icon.png`
- **Format:** PNG
- **Size:** 512x512px

## Diseño Sugerido

Crea un ícono con:
- ⚡ Rayo amarillo (#facc15)
- Fondo oscuro circular (#0a0a0a)
- Estilo moderno y minimalista

## Quick Fix (Para Testing)

Si solo quieres probar el build sin íconos personalizados, puedes:

1. Usar el ícono por defecto de Electron (se usará automáticamente si no existen los archivos)
2. O crear un placeholder simple con ImageMagick:

```bash
# Crear ícono placeholder simple
convert -size 512x512 xc:#facc15 \
  -gravity center \
  -pointsize 200 \
  -fill black \
  -annotate +0+0 "⚡" \
  electron/icon.png
```

## Dónde Aparece el Ícono

- 🖥️ **Dock/Taskbar** cuando la app está corriendo
- 📁 **Finder/File Explorer** para el archivo .app
- 🪟 **Ventana** (barra de título en algunos sistemas)
- 📦 **Instalador DMG** para macOS
