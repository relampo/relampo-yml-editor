#!/bin/bash

# 🔥 Relampo - Auto-installer
# Instalador automático para YAML Editor Standalone

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo -e "${YELLOW}⚡━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⚡${NC}"
echo -e "${YELLOW}   RELAMPO YAML EDITOR - AUTO INSTALLER${NC}"
echo -e "${YELLOW}⚡━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⚡${NC}"
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "run.sh" ]; then
    echo -e "${RED}❌ Error: run.sh not found${NC}"
    echo "Please run this script from the relampo directory"
    exit 1
fi

# Dar permisos de ejecución
echo -e "${BLUE}🔧 Setting permissions...${NC}"
chmod +x run.sh

# Verificar Python
echo -e "${BLUE}🔍 Checking dependencies...${NC}"

if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    echo -e "${GREEN}✅ $PYTHON_VERSION found${NC}"
elif command -v python &> /dev/null; then
    PYTHON_VERSION=$(python --version)
    echo -e "${GREEN}✅ $PYTHON_VERSION found${NC}"
else
    echo -e "${RED}❌ Python not found${NC}"
    echo ""
    echo "Please install Python 3 from:"
    echo "  Mac: https://www.python.org/downloads/macos/"
    echo "  Linux: sudo apt-get install python3"
    exit 1
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Installation complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}🚀 To start Relampo YAML Editor, run:${NC}"
echo -e "${BLUE}   ./run.sh${NC}"
echo ""