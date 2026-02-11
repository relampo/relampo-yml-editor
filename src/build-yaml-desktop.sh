#!/bin/bash

# 🔥 Relampo Desktop App Builder
# Este script genera aplicaciones de escritorio nativas para Mac/Linux

set -e

# Colores para terminal (todos visibles en fondo oscuro)
RED='\033[0;91m'      # Rojo brillante
GREEN='\033[0;92m'    # Verde brillante
YELLOW='\033[0;93m'   # Amarillo brillante
BLUE='\033[0;96m'     # Cyan brillante
CYAN='\033[0;96m'     # Cyan brillante (alias)
PURPLE='\033[0;95m'   # Magenta brillante
WHITE='\033[1;97m'    # Blanco brillante
NC='\033[0m'          # Sin color

clear
echo ""
echo -e "${YELLOW}⚡━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⚡${NC}"
echo -e "${YELLOW}   RELAMPO YAML EDITOR - DESKTOP APP BUILDER${NC}"
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
        echo -e "${WHITE}This script only works on macOS and Linux${NC}"
        exit 1
        ;;
esac

echo -e "${CYAN}🖥️  Platform: ${WHITE}$PLATFORM${NC}"
echo ""

# 1. Verificar Node.js y npm
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📋 Step 1: Checking dependencies...${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found${NC}"
    echo -e "${WHITE}Please install Node.js from: https://nodejs.org/${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm not found${NC}"
    exit 1
fi

NODE_VERSION=$(node -v)
NPM_VERSION=$(npm -v)
echo -e "${GREEN}✓ Node.js ${NODE_VERSION}${NC}"
echo -e "${GREEN}✓ npm ${NPM_VERSION}${NC}"

# 2. Backup del App.tsx original
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📦 Step 2: Backing up original App.tsx...${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
cp App.tsx App.tsx.backup
echo -e "${GREEN}✓ Backup created${NC}"

# 3. Reemplazar App.tsx con versión standalone
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔧 Step 3: Switching to standalone YAML Editor...${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
cp AppYAMLStandalone.tsx App.tsx
echo -e "${GREEN}✓ Standalone version activated${NC}"

# 4. Build de producción
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🏗️  Step 4: Building production React app...${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
npm run build
echo -e "${GREEN}✓ React build completed${NC}"

# 5. Restaurar App.tsx original
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}↩️  Step 5: Restoring original App.tsx...${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
mv App.tsx.backup App.tsx
echo -e "${GREEN}✓ Original App.tsx restored${NC}"

# 6. Preparar directorio temporal de build
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📁 Step 6: Preparing Electron build directory...${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

BUILD_DIR="electron-build"
rm -rf $BUILD_DIR
mkdir -p $BUILD_DIR

# Copiar archivos necesarios
cp -r dist $BUILD_DIR/
cp -r electron $BUILD_DIR/
cp package.electron.json $BUILD_DIR/package.json

echo -e "${GREEN}✓ Build directory prepared${NC}"

# 7. Instalar dependencias de Electron
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📦 Step 7: Installing Electron dependencies...${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

cd $BUILD_DIR
npm install --production
npm install --save-dev electron-builder

echo -e "${GREEN}✓ Dependencies installed${NC}"

# 8. Build de Electron
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}⚡ Step 8: Building Electron app for $PLATFORM...${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ "$PLATFORM" = "macOS" ]; then
    npx electron-builder --mac --x64 --arm64
    OUTPUT_TYPE="DMG and ZIP"
else
    npx electron-builder --linux --x64
    OUTPUT_TYPE="AppImage and tar.gz"
fi

echo -e "${GREEN}✓ Electron build completed${NC}"

cd ..

# 9. Mover archivos de salida
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📤 Step 9: Moving build artifacts...${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

RELEASE_DIR="relampo-desktop-releases"
rm -rf $RELEASE_DIR
mkdir -p $RELEASE_DIR

if [ -d "$BUILD_DIR/release" ]; then
    cp -r $BUILD_DIR/release/* $RELEASE_DIR/
    echo -e "${GREEN}✓ Build artifacts moved to $RELEASE_DIR${NC}"
else
    echo -e "${RED}⚠️  Release directory not found${NC}"
fi

# 10. Limpiar directorio temporal
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🧹 Step 10: Cleaning up temporary files...${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
rm -rf $BUILD_DIR
echo -e "${GREEN}✓ Cleanup completed${NC}"

# 11. Resultados finales
echo ""
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Desktop app build completed successfully!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${WHITE}📦 Output directory: ${YELLOW}$RELEASE_DIR${NC}"
echo ""
echo -e "${CYAN}📱 Build artifacts:${NC}"
ls -lh $RELEASE_DIR/

echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎯 INSTALLATION INSTRUCTIONS${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ "$PLATFORM" = "macOS" ]; then
    echo -e "${WHITE}For macOS:${NC}"
    echo -e "  ${CYAN}1. Double-click the .dmg file${NC}"
    echo -e "  ${CYAN}2. Drag Relampo YAML Editor to Applications${NC}"
    echo -e "  ${CYAN}3. Launch from Applications folder${NC}"
    echo ""
    echo -e "${WHITE}Or use the .zip file:${NC}"
    echo -e "  ${CYAN}1. Unzip the file${NC}"
    echo -e "  ${CYAN}2. Move .app to Applications${NC}"
else
    echo -e "${WHITE}For Linux:${NC}"
    echo -e "  ${CYAN}1. Make the AppImage executable:${NC}"
    echo -e "     ${WHITE}chmod +x Relampo-YAML-Editor-*.AppImage${NC}"
    echo -e "  ${CYAN}2. Run it:${NC}"
    echo -e "     ${WHITE}./Relampo-YAML-Editor-*.AppImage${NC}"
    echo ""
    echo -e "${WHITE}Or extract the tar.gz:${NC}"
    echo -e "  ${CYAN}tar -xzf relampo-yaml-editor-*.tar.gz${NC}"
fi

echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🔥 Ready to distribute!${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
