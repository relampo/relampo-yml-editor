# Relampo Landing Page - Solo Landing (Sin Workbench)

## 📦 Instrucciones para extraer solo la Landing Page

Después de descargar el ZIP completo, **ELIMINA** estas carpetas y archivos:

### ❌ Eliminar - Archivos del Workbench
```
/app/                          (toda la carpeta - contiene workbench)
/components/workbench/         (toda la carpeta - componentes del workbench)
```

### ✅ Mantener - Archivos de la Landing Page

#### Componentes principales
```
/components/LandingPage.tsx
```

#### Traducciones (i18n)
```
/i18n/translations.ts
```

#### Estilos
```
/styles/globals.css
```

#### Imágenes del equipo
```
/team/delvis.jpg
/team/angel.jpg
/team/chris.jpg
/team/violena.jpg
/team/alayo.jpg
```

#### Configuración del proyecto
```
/App.tsx                       (modificar - ver abajo)
/package.json
/index.html
/tsconfig.json
/vite.config.ts               (si existe)
```

---

## 🔧 Modificar App.tsx para solo Landing

Reemplaza el contenido de `/App.tsx` con:

```tsx
import { LandingPage } from './components/LandingPage';

export default function App() {
  return <LandingPage />;
}
```

**O si quieres mantener la navegación sin el workbench:**

```tsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './components/LandingPage';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
```

---

## 📋 Dependencias necesarias

En `package.json`, asegúrate de tener estas dependencias:

```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.22.0",
    "lucide-react": "latest"
  }
}
```

---

## 🚀 Pasos finales

1. Descarga el ZIP completo del proyecto
2. Descomprime el archivo
3. **Elimina** las carpetas `/app/` y `/components/workbench/`
4. **Modifica** `/App.tsx` según las opciones de arriba
5. Ejecuta `npm install`
6. Ejecuta `npm run dev`

---

## ✨ Resultado

Tendrás una landing page completamente funcional con:
- ✅ Internacionalización EN/ES
- ✅ Sección Hero con animaciones
- ✅ Quick Start
- ✅ How it Works (workflow interactivo)
- ✅ Readable Scripts (YAML)
- ✅ Free Cloud Sandbox
- ✅ Roadmap
- ✅ Relampo League completa
- ✅ Team section con fotos correctas
- ✅ CTA final
- ✅ Footer
- ✅ Tema dark profesional (#0a0a0a)
- ✅ Colores amarillos vibrantes (#facc15)

**Sin el Workbench** ❌
