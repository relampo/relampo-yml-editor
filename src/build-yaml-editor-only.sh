#!/bin/bash

# 🔥 Relampo YAML Editor ONLY - Desktop App Builder
# Este script genera SOLO el YAML Editor, sin landing page ni workbench

set -e

# Colores para terminal
RED='\033[0;91m'
GREEN='\033[0;92m'
YELLOW='\033[0;93m'
BLUE='\033[0;96m'
CYAN='\033[0;96m'
PURPLE='\033[0;95m'
WHITE='\033[1;97m'
NC='\033[0m'

clear
echo ""
echo -e "${YELLOW}⚡━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⚡${NC}"
echo -e "${YELLOW}     RELAMPO YAML EDITOR ONLY - BUILDER${NC}"
echo -e "${YELLOW}⚡━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⚡${NC}"
echo ""

# Detectar OS
OS="$(uname -s)"
case "$OS" in
    Darwin)
        PLATFORM="macOS"
        ;;
    Linux)
        PLATFORM="Linux"
        ;;
    *)
        echo -e "${RED}❌ Unsupported OS: $OS${NC}"
        exit 1
        ;;
esac

echo -e "${CYAN}🖥️  Platform: ${WHITE}$PLATFORM${NC}"
echo -e "${CYAN}📦 Building: ${WHITE}YAML Editor Only (no landing, no workbench)${NC}"
echo ""

# 1. Verificar dependencias
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE} Step 1: Checking dependencies...${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found${NC}"
    echo -e "${WHITE}Install from: https://nodejs.org/${NC}"
    exit 1
fi

NODE_VERSION=$(node -v)
NPM_VERSION=$(npm -v)
echo -e "${GREEN}✓ Node.js ${NODE_VERSION}${NC}"
echo -e "${GREEN}✓ npm ${NPM_VERSION}${NC}"

# 2. Crear directorio limpio para YAML Editor
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📁 Step 2: Creating clean YAML Editor project...${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

YAML_PROJECT="yaml-editor-standalone"
rm -rf $YAML_PROJECT
mkdir -p $YAML_PROJECT

echo -e "${GREEN}✓ Clean directory created${NC}"

# 3. Copiar SOLO archivos necesarios para YAML Editor
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📦 Step 3: Copying YAML Editor files only...${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# App principal (standalone)
cp AppYAMLStandalone.tsx $YAML_PROJECT/App.tsx
echo -e "${CYAN}  ✓ App.tsx (YAML Editor)${NC}"

# Componentes del YAML Editor
mkdir -p $YAML_PROJECT/components
cp components/YAMLEditor.tsx $YAML_PROJECT/components/
cp components/YAMLCodeEditor.tsx $YAML_PROJECT/components/
cp components/YAMLTreeView.tsx $YAML_PROJECT/components/
cp components/YAMLTreeNode.tsx $YAML_PROJECT/components/
cp components/YAMLNodeDetails.tsx $YAML_PROJECT/components/
cp components/YAMLRequestDetails.tsx $YAML_PROJECT/components/
cp components/YAMLContextMenu.tsx $YAML_PROJECT/components/
cp components/LanguageToggle.tsx $YAML_PROJECT/components/
cp components/DetailPanel.tsx $YAML_PROJECT/components/
echo -e "${CYAN}  ✓ YAML Editor components${NC}"

# Componentes UI necesarios
mkdir -p $YAML_PROJECT/components/ui
cp components/ui/button.tsx $YAML_PROJECT/components/ui/ 2>/dev/null || true
cp components/ui/input.tsx $YAML_PROJECT/components/ui/ 2>/dev/null || true
cp components/ui/select.tsx $YAML_PROJECT/components/ui/ 2>/dev/null || true
cp components/ui/dialog.tsx $YAML_PROJECT/components/ui/ 2>/dev/null || true
cp components/ui/dropdown-menu.tsx $YAML_PROJECT/components/ui/ 2>/dev/null || true
cp components/ui/scroll-area.tsx $YAML_PROJECT/components/ui/ 2>/dev/null || true
echo -e "${CYAN}  ✓ UI components${NC}"

# Contextos
mkdir -p $YAML_PROJECT/contexts
cp contexts/LanguageContext.tsx $YAML_PROJECT/contexts/
echo -e "${CYAN}  ✓ Contexts${NC}"

# i18n
mkdir -p $YAML_PROJECT/i18n
cp i18n/translations.ts $YAML_PROJECT/i18n/
echo -e "${CYAN}  ✓ Translations${NC}"

# Types
mkdir -p $YAML_PROJECT/types
cp types/yaml.ts $YAML_PROJECT/types/
echo -e "${CYAN}  ✓ Types${NC}"

# Utils
mkdir -p $YAML_PROJECT/utils
cp utils/yamlParser.ts $YAML_PROJECT/utils/ 2>/dev/null || true
cp utils/yamlDragDropRules.ts $YAML_PROJECT/utils/ 2>/dev/null || true
echo -e "${CYAN}  ✓ Utils${NC}"

# Estilos
mkdir -p $YAML_PROJECT/styles
cp styles/globals.css $YAML_PROJECT/styles/
echo -e "${CYAN}  ✓ Styles${NC}"

# package.json mínimo
cat > $YAML_PROJECT/package.json << 'EOF'
{
  "name": "relampo-yaml-editor",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "lucide-react": "^0.263.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.1",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.4",
    "typescript": "^5.6.3",
    "vite": "^6.0.3",
    "@tailwindcss/postcss": "^4.0.0",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^4.0.0"
  }
}
EOF
echo -e "${CYAN}  ✓ package.json${NC}"

# index.html
cat > $YAML_PROJECT/index.html << 'EOF'
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>⚡ Relampo YAML Editor</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
EOF
echo -e "${CYAN}  ✓ index.html${NC}"

# main.tsx
mkdir -p $YAML_PROJECT/src
cat > $YAML_PROJECT/src/main.tsx << 'EOF'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from '../App.tsx'
import '../styles/globals.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
EOF
echo -e "${CYAN}  ✓ main.tsx${NC}"

# vite.config.ts
cat > $YAML_PROJECT/vite.config.ts << 'EOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  base: './',
})
EOF
echo -e "${CYAN}  ✓ vite.config.ts${NC}"

# tsconfig.json
cat > $YAML_PROJECT/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src", "App.tsx", "components", "contexts", "types", "utils", "i18n"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
EOF
echo -e "${CYAN}  ✓ tsconfig.json${NC}"

# tsconfig.node.json
cat > $YAML_PROJECT/tsconfig.node.json << 'EOF'
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
EOF
echo -e "${CYAN}  ✓ tsconfig.node.json${NC}"

# tailwind.config.js
cat > $YAML_PROJECT/tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./App.tsx",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
EOF
echo -e "${CYAN}  ✓ tailwind.config.js${NC}"

# postcss.config.js
cat > $YAML_PROJECT/postcss.config.js << 'EOF'
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
EOF
echo -e "${CYAN}  ✓ postcss.config.js${NC}"

echo -e "${GREEN}✓ All YAML Editor files copied${NC}"

# 4. Instalar dependencias
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📦 Step 4: Installing dependencies...${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

cd $YAML_PROJECT
npm install
echo -e "${GREEN}✓ Dependencies installed${NC}"

# 5. Build de producción
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🏗️  Step 5: Building production bundle...${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

npm run build
echo -e "${GREEN}✓ Production build completed${NC}"

cd ..

# 6. Preparar Electron
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}⚡ Step 6: Setting up Electron...${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Copiar archivos de Electron
cp -r electron $YAML_PROJECT/
echo -e "${CYAN}  ✓ Electron files${NC}"

# Copiar package.electron.json
cp package.electron.json $YAML_PROJECT/package.electron.json
echo -e "${CYAN}  ✓ Electron config${NC}"

# Preparar build de Electron
cd $YAML_PROJECT
mv package.json package.vite.json
mv package.electron.json package.json

echo -e "${GREEN}✓ Electron setup completed${NC}"

# 7. Instalar Electron
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📦 Step 7: Installing Electron...${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

npm install --production
npm install --save-dev electron-builder

echo -e "${GREEN}✓ Electron installed${NC}"

# 8. Build desktop app
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🖥️  Step 8: Building desktop app for $PLATFORM...${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ "$PLATFORM" = "macOS" ]; then
    npx electron-builder --mac --x64 --arm64
else
    npx electron-builder --linux --x64
fi

echo -e "${GREEN}✓ Desktop app built${NC}"

cd ..

# 9. Mover binarios
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📤 Step 9: Moving binaries...${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

RELEASE_DIR="yaml-editor-releases"
rm -rf $RELEASE_DIR
mkdir -p $RELEASE_DIR

if [ -d "$YAML_PROJECT/release" ]; then
    cp -r $YAML_PROJECT/release/* $RELEASE_DIR/
    echo -e "${GREEN}✓ Binaries moved to $RELEASE_DIR${NC}"
fi

# 10. Resultados
echo ""
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ YAML Editor desktop app completed!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${WHITE}📦 Binaries: ${YELLOW}$RELEASE_DIR${NC}"
echo ""
echo -e "${CYAN}📱 Files:${NC}"
ls -lh $RELEASE_DIR/

echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎯 INSTALLATION${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ "$PLATFORM" = "macOS" ]; then
    echo -e "${WHITE}macOS:${NC}"
    echo -e "  ${CYAN}1. Open the .dmg file${NC}"
    echo -e "  ${CYAN}2. Drag to Applications${NC}"
    echo -e "  ${CYAN}3. Launch from Applications${NC}"
else
    echo -e "${WHITE}Linux:${NC}"
    echo -e "  ${CYAN}1. chmod +x Relampo-YAML-Editor-*.AppImage${NC}"
    echo -e "  ${CYAN}2. ./Relampo-YAML-Editor-*.AppImage${NC}"
fi

echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${WHITE}📁 Source project: ${CYAN}$YAML_PROJECT${NC}"
echo -e "${WHITE}💡 You can delete it after testing${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""