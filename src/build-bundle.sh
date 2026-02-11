#!/bin/bash

# 🔥 Relampo Bundle Builder
# Este script genera un bundle standalone para Mac/Linux

set -e

echo "🚀 Building Relampo Standalone Bundle..."

# 1. Build de producción
echo "📦 Building production assets..."
npm run build

# 2. Crear directorio temporal
BUNDLE_DIR="relampo-bundle"
rm -rf $BUNDLE_DIR
mkdir -p $BUNDLE_DIR

# 3. Copiar assets build
echo "📁 Copying build files..."
cp -r dist/* $BUNDLE_DIR/

# 4. Crear script ejecutable
echo "✍️  Creating run script..."
cat > $BUNDLE_DIR/run.sh << 'RUNSCRIPT'
#!/bin/bash

# 🔥 Relampo - Performance Testing Platform
# Standalone Launcher

echo "⚡ Starting Relampo..."

# Detectar puerto disponible
PORT=3456
while lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; do
    PORT=$((PORT + 1))
done

echo "🌐 Server will run on port $PORT"

# Función para limpiar al salir
cleanup() {
    echo ""
    echo "🛑 Stopping Relampo..."
    if [ ! -z "$SERVER_PID" ]; then
        kill $SERVER_PID 2>/dev/null
    fi
    exit 0
}

trap cleanup INT TERM

# Detectar sistema operativo
OS="$(uname -s)"

# Levantar servidor simple con Python (viene preinstalado en Mac/Linux)
echo "🔧 Starting local server..."

if command -v python3 &> /dev/null; then
    cd "$(dirname "$0")"
    python3 -m http.server $PORT --bind 127.0.0.1 > /dev/null 2>&1 &
    SERVER_PID=$!
elif command -v python &> /dev/null; then
    cd "$(dirname "$0")"
    python -m SimpleHTTPServer $PORT > /dev/null 2>&1 &
    SERVER_PID=$!
else
    echo "❌ Error: Python not found. Please install Python 3"
    exit 1
fi

# Esperar a que el servidor esté listo
sleep 2

# Verificar que el servidor está corriendo
if ! ps -p $SERVER_PID > /dev/null 2>&1; then
    echo "❌ Failed to start server"
    exit 1
fi

# Abrir navegador
URL="http://localhost:$PORT"

echo "✅ Relampo is running!"
echo "🌐 Opening browser at $URL"
echo ""
echo "Press Ctrl+C to stop"

case "$OS" in
    Darwin)  # macOS
        open "$URL"
        ;;
    Linux)
        if command -v xdg-open &> /dev/null; then
            xdg-open "$URL"
        elif command -v gnome-open &> /dev/null; then
            gnome-open "$URL"
        else
            echo "Please open $URL in your browser"
        fi
        ;;
    *)
        echo "Please open $URL in your browser"
        ;;
esac

# Mantener el script corriendo
wait $SERVER_PID
RUNSCRIPT

chmod +x $BUNDLE_DIR/run.sh

# 5. Crear README
echo "📝 Creating README..."
cat > $BUNDLE_DIR/README.txt << 'README'
⚡ RELAMPO - Performance Testing Platform
==========================================

🚀 QUICK START (Mac/Linux):

1. Open Terminal
2. Navigate to this folder:
   cd /path/to/relampo-bundle

3. Run:
   ./run.sh

4. Browser will open automatically at http://localhost:3456

🛑 To stop: Press Ctrl+C in the terminal


📋 REQUIREMENTS:

- Python 3 (pre-installed on Mac/Linux)
- Modern web browser (Chrome, Firefox, Safari, Edge)


💡 TROUBLESHOOTING:

- "Permission denied": Run `chmod +x run.sh` first
- "Port in use": The script will auto-select another port
- Browser doesn't open: Manually open http://localhost:3456


📚 DOCUMENTATION:

Visit: https://github.com/yourusername/relampo

README

# 6. Crear archivo de versión
echo "📌 Creating version file..."
cat > $BUNDLE_DIR/VERSION << VERSION
Relampo v1.0.0
Build date: $(date +"%Y-%m-%d %H:%M:%S")
Platform: Universal (Mac/Linux)
VERSION

# 7. Comprimir todo
echo "🗜️  Compressing bundle..."
tar -czf relampo-standalone-mac-linux.tar.gz $BUNDLE_DIR

# 8. Limpiar
rm -rf $BUNDLE_DIR

# 9. Info final
BUNDLE_SIZE=$(du -h relampo-standalone-mac-linux.tar.gz | cut -f1)
echo ""
echo "✅ Bundle created successfully!"
echo "📦 File: relampo-standalone-mac-linux.tar.gz"
echo "💾 Size: $BUNDLE_SIZE"
echo ""
echo "🎯 To distribute:"
echo "   1. Upload relampo-standalone-mac-linux.tar.gz to your server"
echo "   2. Users download and extract:"
echo "      tar -xzf relampo-standalone-mac-linux.tar.gz"
echo "   3. Run:"
echo "      cd relampo-bundle && ./run.sh"
echo ""
echo "🔥 Ready to ship!"
