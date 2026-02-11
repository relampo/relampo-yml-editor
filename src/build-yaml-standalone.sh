#!/bin/bash

# 🔥 Relampo Bundle Builder
# Este script genera un bundle standalone para Mac/Linux

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

echo ""
echo -e "${YELLOW}⚡━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⚡${NC}"
echo -e "${YELLOW}   RELAMPO YAML EDITOR - STANDALONE BUILDER${NC}"
echo -e "${YELLOW}⚡━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⚡${NC}"
echo ""

# 1. Backup del App.tsx original
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📦 Step 1: Backing up original App.tsx...${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
cp App.tsx App.tsx.backup
echo -e "${GREEN}✓ Backup created${NC}"

# 2. Reemplazar App.tsx temporalmente con la versión standalone
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔧 Step 2: Switching to standalone YAML Editor...${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
cp AppYAMLStandalone.tsx App.tsx
echo -e "${GREEN}✓ Standalone version activated${NC}"

# 3. Build de producción
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🏗️  Step 3: Building production assets...${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
npm run build
echo -e "${GREEN}✓ Build completed${NC}"

# 4. Restaurar App.tsx original
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}↩️  Step 4: Restoring original App.tsx...${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
mv App.tsx.backup App.tsx
echo -e "${GREEN}✓ Original App.tsx restored${NC}"

# 5. Crear directorio del bundle
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📁 Step 5: Creating bundle directory...${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
BUNDLE_DIR="relampo-yaml-editor"
rm -rf $BUNDLE_DIR
mkdir -p $BUNDLE_DIR
echo -e "${GREEN}✓ Directory created: $BUNDLE_DIR${NC}"

# 6. Copiar assets build
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📋 Step 6: Copying build files...${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
cp -r dist/* $BUNDLE_DIR/
echo -e "${GREEN}✓ Build files copied${NC}"

# 7. Crear script ejecutable run.sh
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}✍️  Step 7: Creating launcher script...${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
cat > $BUNDLE_DIR/run.sh << 'RUNSCRIPT'
#!/bin/bash

# ⚡ Relampo YAML Editor - Standalone Launcher
# Performance Testing YAML Configuration Tool

# Colores (todos visibles en fondo oscuro)
GREEN='\033[0;92m'
YELLOW='\033[0;93m'
CYAN='\033[0;96m'
WHITE='\033[1;97m'
RED='\033[0;91m'
NC='\033[0m'

clear
echo -e "${YELLOW}⚡━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⚡${NC}"
echo -e "${YELLOW}   RELAMPO YAML EDITOR${NC}"
echo -e "${YELLOW}   Performance Testing Configuration Tool${NC}"
echo -e "${YELLOW}⚡━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⚡${NC}"
echo ""

# Detectar puerto disponible (empieza en 8080)
PORT=8080
while lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; do
    PORT=$((PORT + 1))
done

echo -e "${CYAN}🔧 Starting server on port $PORT...${NC}"

# Función para limpiar al salir
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Stopping Relampo YAML Editor...${NC}"
    if [ ! -z "$SERVER_PID" ]; then
        kill $SERVER_PID 2>/dev/null
    fi
    exit 0
}

trap cleanup INT TERM

# Detectar sistema operativo
OS="$(uname -s)"

# Verificar Python
if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
    echo -e "${RED}❌ Error: Python not found${NC}"
    echo -e "${WHITE}Please install Python 3 from:${NC}"
    echo -e "${WHITE}  Mac: https://www.python.org/downloads/macos/${NC}"
    echo -e "${WHITE}  Linux: sudo apt-get install python3${NC}"
    exit 1
fi

# Levantar servidor HTTP con Python
cd "$(dirname "$0")"

if command -v python3 &> /dev/null; then
    python3 -m http.server $PORT --bind 127.0.0.1 > /dev/null 2>&1 &
    SERVER_PID=$!
else
    python -m SimpleHTTPServer $PORT > /dev/null 2>&1 &
    SERVER_PID=$!
fi

# Esperar a que el servidor esté listo
sleep 1.5

# Verificar que el servidor está corriendo
if ! ps -p $SERVER_PID > /dev/null 2>&1; then
    echo -e "${RED}❌ Failed to start server${NC}"
    exit 1
fi

# URL del editor
URL="http://localhost:$PORT"

echo ""
echo -e "${GREEN}✅ Relampo YAML Editor is running!${NC}"
echo ""
echo -e "${CYAN}🌐 URL: ${WHITE}$URL${NC}"
echo -e "${CYAN}📝 Features:${NC}"
echo -e "${WHITE}   • Upload/Download YAML files${NC}"
echo -e "${WHITE}   • Visual tree editor${NC}"
echo -e "${WHITE}   • Code editor with syntax highlighting${NC}"
echo -e "${WHITE}   • Drag & drop reordering${NC}"
echo -e "${WHITE}   • English/Spanish support${NC}"
echo ""
echo -e "${YELLOW}⚡ Opening browser...${NC}"
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${WHITE}Press Ctrl+C to stop the server${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Abrir navegador según OS
case "$OS" in
    Darwin)  # macOS
        open "$URL" 2>/dev/null
        ;;
    Linux)
        if command -v xdg-open &> /dev/null; then
            xdg-open "$URL" 2>/dev/null
        elif command -v gnome-open &> /dev/null; then
            gnome-open "$URL" 2>/dev/null
        else
            echo -e "${YELLOW}⚠️  Please open $URL in your browser${NC}"
        fi
        ;;
    *)
        echo -e "${YELLOW}⚠️  Please open $URL in your browser${NC}"
        ;;
esac

# Mantener el script corriendo
wait $SERVER_PID
RUNSCRIPT

chmod +x $BUNDLE_DIR/run.sh
echo -e "${GREEN}✓ Launcher script created${NC}"

# 8. Crear README específico para YAML Editor
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📝 Step 8: Creating README...${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
cat > $BUNDLE_DIR/README.txt << 'README'
⚡ RELAMPO YAML EDITOR - Standalone
====================================

🎯 QUICK START:

1. Open Terminal (Mac) or Terminal (Linux)

2. Navigate to this folder:
   cd /path/to/relampo-yaml-editor

3. Run:
   ./run.sh

4. Your browser will open automatically


⚙️ WHAT IS THIS?

Relampo YAML Editor is a visual configuration tool for 
performance testing. Create and edit test configurations 
with an intuitive drag-and-drop interface.

Features:
  ✅ Upload/Download YAML files
  ✅ Visual tree editor with drag & drop
  ✅ Code editor with syntax highlighting
  ✅ Detailed node inspection
  ✅ English/Spanish support
  ✅ Works 100% offline


📋 REQUIREMENTS:

- Python 3 (pre-installed on Mac/Linux)
- Modern web browser (Chrome, Firefox, Safari, Edge)


💡 TROUBLESHOOTING:

"Permission denied"
  → Run: chmod +x run.sh

"Port already in use"
  → Script will auto-select another port

"Browser doesn't open"
  → Manually open: http://localhost:8080


📚 YAML SPECIFICATION:

Relampo v1 supports:
  • Test metadata (name, description)
  • Variables and data sources
  • HTTP defaults (protocol, domain, headers)
  • Multiple load scenarios (ramp-up, steady, spike, stress)
  • Test steps: HTTP requests, groups, loops, conditions
  • Think times, retries, and control flow


🔥 EXAMPLES:

Check the example YAML files included in the /examples folder
(if available), or create a new test from scratch!


📞 SUPPORT:

Issues/Questions: https://github.com/yourusername/relampo
Documentation: https://relampo.dev/docs

README

echo -e "${GREEN}✓ README created${NC}"

# 9. Crear archivo de versión
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📌 Step 9: Creating version info...${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
cat > $BUNDLE_DIR/VERSION << VERSION
Relampo YAML Editor - Standalone v1.0.0
Build: $(date +"%Y-%m-%d %H:%M:%S")
Platform: Mac/Linux
Type: Standalone YAML Editor Only

Components:
- YAML Tree Editor
- Code Editor (Monaco-style)
- Drag & Drop Support
- i18n (EN/ES)
- Offline Mode
VERSION

echo -e "${GREEN}✓ Version file created${NC}"

# 10. Crear instalador simple
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}⚙️  Step 10: Creating installer script...${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
cat > $BUNDLE_DIR/install.sh << 'INSTALLER'
#!/bin/bash

# Colores
GREEN='\033[0;92m'
YELLOW='\033[0;93m'
RED='\033[0;91m'
WHITE='\033[1;97m'
NC='\033[0m'

echo -e "${YELLOW}⚡ Relampo YAML Editor - Quick Setup${NC}"
echo -e "${YELLOW}====================================${NC}"
echo ""

# Verificar permisos
if [ ! -f "run.sh" ]; then
    echo -e "${RED}❌ Error: Please run from relampo-yaml-editor directory${NC}"
    exit 1
fi

# Dar permisos
chmod +x run.sh

# Verificar Python
if command -v python3 &> /dev/null; then
    echo -e "${GREEN}✅ Python 3 found${NC}"
elif command -v python &> /dev/null; then
    echo -e "${GREEN}✅ Python found${NC}"
else
    echo -e "${RED}❌ Python not found - please install Python 3${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo -e "${WHITE}🚀 Run:  ${YELLOW}./run.sh${NC}"
echo ""
INSTALLER

chmod +x $BUNDLE_DIR/install.sh
echo -e "${GREEN}✓ Installer script created${NC}"

# 11. Comprimir bundle
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🗜️  Step 11: Compressing bundle...${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
tar -czf relampo-yaml-editor-standalone.tar.gz $BUNDLE_DIR
echo -e "${GREEN}✓ Bundle compressed${NC}"

# 12. Limpiar directorio temporal
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🧹 Step 12: Cleaning up temporary files...${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
rm -rf $BUNDLE_DIR
echo -e "${GREEN}✓ Cleanup completed${NC}"

# 13. Info final
BUNDLE_SIZE=$(du -h relampo-yaml-editor-standalone.tar.gz | cut -f1)
echo ""
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Bundle created successfully!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${WHITE}📦 File: ${YELLOW}relampo-yaml-editor-standalone.tar.gz${NC}"
echo -e "${WHITE}💾 Size: ${YELLOW}$BUNDLE_SIZE${NC}"
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎯 DISTRIBUTION INSTRUCTIONS${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${WHITE}1️⃣  Upload to your server:${NC}"
echo -e "   ${CYAN}scp relampo-yaml-editor-standalone.tar.gz user@server:/downloads/${NC}"
echo ""
echo -e "${WHITE}2️⃣  Or create GitHub Release:${NC}"
echo -e "   ${CYAN}gh release create v1.0.0 relampo-yaml-editor-standalone.tar.gz${NC}"
echo ""
echo -e "${WHITE}3️⃣  Users install with:${NC}"
echo -e "   ${CYAN}curl -L YOUR_URL/relampo-yaml-editor-standalone.tar.gz | tar -xz${NC}"
echo -e "   ${CYAN}cd relampo-yaml-editor && ./run.sh${NC}"
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🧪 TEST LOCALLY${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "   ${CYAN}tar -xzf relampo-yaml-editor-standalone.tar.gz${NC}"
echo -e "   ${CYAN}cd relampo-yaml-editor${NC}"
echo -e "   ${CYAN}./run.sh${NC}"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🔥 Ready to distribute!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""