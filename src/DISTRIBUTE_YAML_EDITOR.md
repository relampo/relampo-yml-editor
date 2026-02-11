# ⚡ Guía Completa: Distribuir Relampo YAML Editor

## 🎯 Objetivo

Crear un **ejecutable standalone del YAML Editor** que cualquier usuario pueda descargar y ejecutar con un simple comando, sin necesitar Node.js instalado.

---

## 📦 Paso 1: Generar el Bundle

```bash
# En tu máquina de desarrollo:
chmod +x build-yaml-standalone.sh
./build-yaml-standalone.sh
```

**Output:** `relampo-yaml-editor-standalone.tar.gz` (~1-2MB)

---

## 🌐 Paso 2: Subir a un Servidor

### Opción A: GitHub Releases (Recomendado) ⭐

```bash
# Instalar GitHub CLI si no lo tienes
brew install gh  # Mac
# o descarga desde: https://cli.github.com/

# Login
gh auth login

# Crear release
gh release create v1.0.0 \
  relampo-yaml-editor-standalone.tar.gz \
  --title "Relampo YAML Editor v1.0.0" \
  --notes "Standalone YAML configuration editor for performance testing"
```

**URL resultante:**
```
https://github.com/TU_USUARIO/relampo/releases/download/v1.0.0/relampo-yaml-editor-standalone.tar.gz
```

### Opción B: Tu Propio Servidor

```bash
# Subir con SCP
scp relampo-yaml-editor-standalone.tar.gz user@yourserver.com:/var/www/downloads/

# Asegurar permisos
ssh user@yourserver.com "chmod 644 /var/www/downloads/relampo-yaml-editor-standalone.tar.gz"
```

**URL resultante:**
```
https://yourserver.com/downloads/relampo-yaml-editor-standalone.tar.gz
```

### Opción C: AWS S3

```bash
# Configurar AWS CLI
aws configure

# Subir a S3
aws s3 cp relampo-yaml-editor-standalone.tar.gz \
  s3://tu-bucket/releases/relampo-yaml-editor-standalone.tar.gz \
  --acl public-read

# URL resultante
aws s3 presign s3://tu-bucket/releases/relampo-yaml-editor-standalone.tar.gz
```

### Opción D: Dropbox/Google Drive

1. Sube `relampo-yaml-editor-standalone.tar.gz`
2. Genera link público
3. Obtén URL de descarga directa

---

## 📝 Paso 3: Documentar para Usuarios

### Actualiza tu README.md principal:

```markdown
# Relampo YAML Editor

⚡ Herramienta visual para crear y editar configuraciones YAML de performance testing.

## 🚀 Instalación Rápida (Mac/Linux)

### Una Línea

\`\`\`bash
curl -L https://github.com/TU_USUARIO/relampo/releases/download/v1.0.0/relampo-yaml-editor-standalone.tar.gz | tar -xz && cd relampo-yaml-editor && ./run.sh
\`\`\`

### Manual

\`\`\`bash
# 1. Descargar
curl -L https://github.com/TU_USUARIO/relampo/releases/download/v1.0.0/relampo-yaml-editor-standalone.tar.gz -o relampo.tar.gz

# 2. Extraer
tar -xzf relampo.tar.gz

# 3. Ejecutar
cd relampo-yaml-editor
./run.sh
\`\`\`

Tu navegador se abrirá automáticamente en `http://localhost:8080`

## ✨ Features

- 📝 **Visual Editor** - Árbol interactivo con drag & drop
- 💻 **Code Editor** - Syntax highlighting para YAML
- 📤 **Import/Export** - Upload y download de archivos YAML
- 🌍 **i18n** - Soporte para Inglés y Español
- 🔒 **Offline** - Funciona 100% sin internet

## 📋 Requisitos

- Python 3 (pre-instalado en Mac/Linux)
- Navegador moderno (Chrome, Firefox, Safari, Edge)

## 🛑 Detener

Presiona `Ctrl+C` en la terminal donde ejecutaste `./run.sh`

## 🐛 Troubleshooting

### "Permission denied"
\`\`\`bash
chmod +x run.sh
\`\`\`

### "Python not found"
\`\`\`bash
# Mac
brew install python3

# Ubuntu/Debian
sudo apt-get install python3
\`\`\`

### "Port 8080 already in use"
El script automáticamente buscará otro puerto disponible.

## 📚 Documentación

- [Especificación YAML](./docs/yaml-spec.md)
- [Guía de Usuario](./docs/user-guide.md)
- [Ejemplos](./examples/)

## 🤝 Contribuir

Pull requests son bienvenidos! Ver [CONTRIBUTING.md](./CONTRIBUTING.md)

## 📄 Licencia

MIT License - ver [LICENSE](./LICENSE)
\`\`\`

---

## 🎬 Paso 4: Crear Video Demo (Opcional)

Graba un screencast mostrando:

1. ⬇️ Descarga del archivo
2. 📂 Extracción
3. ▶️ Ejecución con `./run.sh`
4. 🎨 Demo rápida de features

Súbelo a YouTube y agrégalo al README:

```markdown
## 🎥 Video Demo

[![Relampo YAML Editor Demo](https://img.youtube.com/vi/YOUR_VIDEO_ID/0.jpg)](https://www.youtube.com/watch?v=YOUR_VIDEO_ID)
```

---

## 📣 Paso 5: Promoción

### En tu sitio web:

```html
<!-- Hero Section -->
<section class="hero">
  <h1>⚡ Relampo YAML Editor</h1>
  <p>Visual configuration tool for performance testing</p>
  <a href="https://github.com/TU_USUARIO/relampo/releases/download/v1.0.0/relampo-yaml-editor-standalone.tar.gz" 
     class="download-btn">
    Download for Mac/Linux
  </a>
  <pre><code>curl -L DOWNLOAD_URL | tar -xz && cd relampo-yaml-editor && ./run.sh</code></pre>
</section>
```

### En redes sociales:

**Twitter/X:**
```
🚀 Lanzamos Relampo YAML Editor!

✨ Editor visual para configuraciones de performance testing
📦 Instalación en una línea
🔒 100% offline
⚡ Zero dependencies (solo Python)

Descarga gratis:
https://github.com/TU_USUARIO/relampo

#PerformanceTesting #DevTools #OpenSource
```

**LinkedIn:**
```
Excited to announce the release of Relampo YAML Editor - a visual configuration tool for performance testing!

Features:
• Visual tree editor with drag & drop
• Syntax-highlighted code editor
• Import/Export YAML files
• Bilingual support (EN/ES)
• Works completely offline

Try it with a single command:
curl -L [download-url] | tar -xz && cd relampo-yaml-editor && ./run.sh

Perfect for QA engineers and performance testers! 🚀

Download: [github-url]

#PerformanceTesting #QA #DevTools #OpenSource
```

---

## 📊 Paso 6: Analytics (Opcional)

### Track descargas con GitHub:

```bash
# Ver estadísticas de releases
gh release view v1.0.0

# Ver número de descargas
curl -s https://api.github.com/repos/TU_USUARIO/relampo/releases | \
  jq '.[0].assets[] | {name: .name, downloads: .download_count}'
```

### Añadir analytics en el editor:

Si quieres saber cuántos usuarios activos tienes, puedes agregar un ping opcional (con consentimiento):

```typescript
// En AppYAMLStandalone.tsx (opcional)
useEffect(() => {
  // Solo si usuario acepta
  if (analyticsConsent) {
    fetch('https://api.yourserver.com/ping', {
      method: 'POST',
      body: JSON.stringify({ 
        version: '1.0.0',
        timestamp: Date.now() 
      })
    }).catch(() => {}); // Silencioso
  }
}, []);
```

---

## 🔄 Paso 7: Actualizaciones

### Crear una nueva versión:

```bash
# 1. Actualizar versión en package.json
npm version patch  # o minor, o major

# 2. Rebuild
./build-yaml-standalone.sh

# 3. Crear nuevo release
gh release create v1.0.1 \
  relampo-yaml-editor-standalone.tar.gz \
  --title "Relampo YAML Editor v1.0.1" \
  --notes "### Changes
- Fixed drag & drop auto-expand
- Improved performance
- Updated Spanish translations"
```

### Notificar usuarios:

En el editor, puedes agregar un check de actualizaciones:

```typescript
// utils/updateChecker.ts
export async function checkForUpdates() {
  try {
    const response = await fetch(
      'https://api.github.com/repos/TU_USUARIO/relampo/releases/latest'
    );
    const latest = await response.json();
    const currentVersion = '1.0.0';
    
    if (latest.tag_name > `v${currentVersion}`) {
      return {
        available: true,
        version: latest.tag_name,
        url: latest.html_url
      };
    }
  } catch {
    return { available: false };
  }
}
```

---

## 🧪 Paso 8: Testing de Distribución

Antes de anunciar públicamente, prueba el proceso completo:

### En una Mac limpia:

```bash
# 1. Descargar
curl -L YOUR_GITHUB_URL -o test.tar.gz

# 2. Verificar checksum (opcional)
sha256sum test.tar.gz

# 3. Extraer
tar -xzf test.tar.gz

# 4. Verificar contenido
ls -la relampo-yaml-editor/

# 5. Ejecutar
cd relampo-yaml-editor
./run.sh

# 6. Verificar funcionalidades:
# - Upload YAML ✓
# - Edit en árbol ✓
# - Edit en código ✓
# - Drag & drop ✓
# - Download YAML ✓
# - Toggle EN/ES ✓
```

### En Ubuntu/Linux:

```bash
# Similar, pero verificar:
# - Dependencias de Python
# - Comportamiento de xdg-open
# - Permisos de archivos
```

---

## 📋 Checklist Final

Antes de anunciar públicamente:

- [ ] ✅ Bundle generado exitosamente
- [ ] ✅ Subido a GitHub Releases (o servidor)
- [ ] ✅ README.md actualizado con instrucciones
- [ ] ✅ Probado en Mac limpia
- [ ] ✅ Probado en Linux (Ubuntu/Debian)
- [ ] ✅ Todas las features funcionan
- [ ] ✅ Drag & drop funciona correctamente
- [ ] ✅ Upload/Download YAML funciona
- [ ] ✅ Toggle idioma funciona
- [ ] ✅ Video demo creado (opcional)
- [ ] ✅ CHANGELOG.md actualizado
- [ ] ✅ LICENSE file incluido
- [ ] ✅ CONTRIBUTING.md creado
- [ ] ✅ Issue templates configurados en GitHub
- [ ] ✅ GitHub Actions para CI/CD (opcional)

---

## 🚀 Paso 9: Automatizar con GitHub Actions

Crea `.github/workflows/release.yml`:

```yaml
name: Build and Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build bundle
      run: |
        chmod +x build-yaml-standalone.sh
        ./build-yaml-standalone.sh
    
    - name: Create Release
      uses: softprops/action-gh-release@v1
      with:
        files: relampo-yaml-editor-standalone.tar.gz
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Ahora cada vez que hagas un tag:

```bash
git tag v1.0.2
git push origin v1.0.2
```

GitHub automáticamente:
1. Ejecuta el build
2. Genera el bundle
3. Crea el release
4. Sube el archivo

---

## 🎯 Comandos Rápidos de Referencia

```bash
# Build
./build-yaml-standalone.sh

# Test local
tar -xzf relampo-yaml-editor-standalone.tar.gz && cd relampo-yaml-editor && ./run.sh

# Release en GitHub
gh release create v1.0.0 relampo-yaml-editor-standalone.tar.gz

# Ver descargas
gh release view v1.0.0

# Subir a servidor propio
scp relampo-yaml-editor-standalone.tar.gz user@server:/var/www/downloads/

# Generar checksum
sha256sum relampo-yaml-editor-standalone.tar.gz > checksum.txt
```

---

## 🎉 ¡Ya está!

Ahora tienes un **YAML Editor standalone completamente distribuible** que:

✅ Funciona en Mac y Linux  
✅ No necesita Node.js  
✅ Se instala con un comando  
✅ Abre solo el editor (sin landing page)  
✅ Es super ligero (~1-2MB)  
✅ Funciona offline  

**Para distribuir:**

```bash
# URL para usuarios
https://github.com/TU_USUARIO/relampo/releases/download/v1.0.0/relampo-yaml-editor-standalone.tar.gz

# Comando de instalación
curl -L [URL] | tar -xz && cd relampo-yaml-editor && ./run.sh
```

🔥 **¡A distribuir y que lo disfruten tus usuarios!** 🔥
