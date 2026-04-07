# 📦 Cómo descargar Relampo Landing Page en ZIP

## 🔽 Pasos para descargar

### 1. Descargar el proyecto completo

En la esquina superior derecha de Figma Make, busca el botón de **"Download"** o **"Descargar"** y haz clic para descargar todo el proyecto como archivo ZIP.

---

## 📂 Estructura del proyecto descargado

Después de descargar y descomprimir el ZIP, verás esta estructura:

```
relampo-landing/
├── /components/
│   ├── LandingPage.tsx          ✅ MANTENER
│   └── /workbench/              ❌ ELIMINAR (si solo quieres la landing)
├── /app/                        ❌ ELIMINAR (si solo quieres la landing)
├── /i18n/
│   └── translations.ts          ✅ MANTENER
├── /styles/
│   └── globals.css              ✅ MANTENER
├── /team/                       ✅ MANTENER (todas las fotos)
│   ├── delvis.jpg
│   ├── angel.jpg
│   ├── chris.jpg
│   ├── violena.jpg
│   └── alayo.jpg
├── App.tsx                      ✅ MANTENER (pero modificar)
├── package.json                 ✅ MANTENER
├── index.html                   ✅ MANTENER
└── tsconfig.json                ✅ MANTENER
```

---

## 🎯 Opción A: Landing + Workbench (Proyecto completo)

### ✅ Si quieres TODO (Landing + Workbench):

**¡No elimines NADA!** Solo:

1. Descomprime el ZIP
2. Abre la terminal en la carpeta del proyecto
3. Ejecuta:

```bash
npm install
npm run dev
```

✨ **Tendrás:**

- Landing page completa con i18n (EN/ES)
- Workbench funcional
- Navegación bidireccional entre landing y workbench
- Redes sociales en el footer (LinkedIn, GitHub, Discord, Instagram, YouTube, Docs)
- "DISPONIBLE AHORA Y PARA SIEMPRE" actualizado

---

## 🏠 Opción B: Solo Landing Page (Sin Workbench)

### ❌ Si solo quieres la Landing, ELIMINA:

```
/app/                    (toda la carpeta)
/components/workbench/   (toda la carpeta)
```

### 🔧 Luego modifica `/App.tsx`:

**Reemplaza el contenido completo de `/App.tsx` con:**

```tsx
import { LandingPage } from './components/LandingPage';

export default function App() {
  return <LandingPage />;
}
```

### 🚀 Ejecuta:

```bash
npm install
npm run dev
```

✨ **Tendrás solo:**

- Landing page completa
- Internacionalización EN/ES
- Hero section con "DISPONIBLE AHORA Y PARA SIEMPRE"
- Quick Start
- How it Works (workflow interactivo)
- Readable Scripts (YAML)
- Free Cloud Sandbox
- Roadmap con "DISPONIBLE AHORA Y PARA SIEMPRE"
- Relampo League completa
- Team section (Delvis, Angel, Violena, Alayo, Chris)
- Footer con redes sociales (LinkedIn, GitHub, Discord, Instagram, YouTube, Docs)
- CTA final
- Tema dark profesional (#0a0a0a)

**Sin el Workbench** ❌

---

## 📋 Dependencias necesarias (en package.json)

```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.22.0",
    "lucide-react": "latest",
    "motion": "latest"
  }
}
```

---

## 🆕 Cambios recientes incluidos

✅ **Textos actualizados:**

- "DISPONIBLE AHORA" → "DISPONIBLE AHORA Y PARA SIEMPRE" (EN/ES)
- En Hero section y Roadmap section

✅ **Footer con redes sociales:**

- LinkedIn (icono amarillo #facc15)
- GitHub (icono amarillo #facc15)
- Discord (icono amarillo #facc15)
- Instagram (icono amarillo #facc15)
- YouTube (icono amarillo #facc15)
- Docs/Documentación (icono amarillo #facc15)
- Efectos hover con escala y cambio de color
- Labels debajo de cada icono
- Totalmente bilingüe

✅ **Team section corregida:**

- Fotos correctas para cada miembro
- Bio de Delvis actualizada: "amante fiel de las pruebas de performance"
- Título: "Construido por ingenieros de software" (EN/ES)

---

## 🐛 Solución de problemas

### Error: "Cannot find module..."

```bash
npm install
```

### Error: "Port 5173 is already in use"

```bash
# Cierra la otra aplicación o usa otro puerto
npm run dev -- --port 3000
```

### Los iconos no aparecen

Verifica que `lucide-react` esté instalado:

```bash
npm install lucide-react
```

---

## 📧 Contacto

¿Preguntas? Escríbenos a **info@relampo.com**

---

## 🎨 Colores del tema

- **Background primario:** `#0a0a0a`
- **Background secundario:** `#111111`
- **Amarillo vibrante:** `#facc15`
- **Amarillo hover:** `#ffd93d`
- **Texto principal:** `zinc-100`
- **Texto secundario:** `zinc-400`
- **Bordes:** `white/5` y `white/10`

---

**¡Listo! Tu landing page de Relampo está lista para usar.** ⚡🚀
