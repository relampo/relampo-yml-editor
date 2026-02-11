import { Download } from 'lucide-react';

export function LogoDownloadsTab() {
  const downloadSVG = (svgElement: SVGSVGElement | null, filename: string) => {
    if (!svgElement) {
      console.error('SVG element not found');
      return;
    }
    
    try {
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      const svgUrl = URL.createObjectURL(svgBlob);
      const downloadLink = document.createElement("a");
      downloadLink.href = svgUrl;
      downloadLink.download = filename;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(svgUrl);
    } catch (error) {
      console.error('Error downloading SVG:', error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-8 py-12">
      <h1 className="text-4xl font-bold mb-2 text-neutral-900">Logos de Relampo</h1>
      <p className="text-neutral-600 mb-12">Haz clic en "Descargar SVG" para obtener cada logo en formato vectorial</p>

      <div className="space-y-12">
        {/* Logo completo - Fondo oscuro */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-neutral-900">Logo completo - Fondo oscuro</h2>
          <div className="bg-neutral-900 rounded-2xl p-12 border border-neutral-700 inline-block">
            <svg
              id="logo-full-dark"
              width="400"
              height="100"
              viewBox="0 0 400 100"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="bgGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fde047" />
                  <stop offset="50%" stopColor="#facc15" />
                  <stop offset="100%" stopColor="#eab308" />
                </linearGradient>
              </defs>
              {/* Fondo con gradiente amarillo */}
              <rect x="0" y="12" width="76" height="76" rx="16" fill="url(#bgGradient1)"/>
              {/* Rayo blanco - usando el path oficial del Sidebar */}
              <svg x="19" y="23" width="36" height="44" viewBox="0 0 18 22">
                <path d="M10.5 0L0 12.5H7.5L6 22L18 9H10.5V0Z" fill="white"/>
              </svg>
              <text x="96" y="55" fontFamily="system-ui, -apple-system, sans-serif" fontSize="36" fontWeight="900" fill="white" letterSpacing="6.5">
                RELAMPO
              </text>
              <text x="96" y="75" fontFamily="system-ui, -apple-system, sans-serif" fontSize="14" fill="#a1a1aa">
                Performance testing made simple.
              </text>
            </svg>
          </div>
          <button
            onClick={() => {
              const svg = document.getElementById("logo-full-dark") as SVGSVGElement;
              downloadSVG(svg, "relampo-logo-full-dark.svg");
            }}
            className="ml-4 px-4 py-2 bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500 text-black rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity shadow-lg"
          >
            <Download className="inline w-4 h-4 mr-2" />
            Descargar SVG
          </button>
        </div>

        {/* Logo completo - Fondo claro */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-neutral-900">Logo completo - Fondo claro</h2>
          <div className="bg-white rounded-2xl p-12 border-2 border-neutral-200 inline-block">
            <svg
              id="logo-full-light"
              width="400"
              height="100"
              viewBox="0 0 400 100"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="bgGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fde047" />
                  <stop offset="50%" stopColor="#facc15" />
                  <stop offset="100%" stopColor="#eab308" />
                </linearGradient>
              </defs>
              {/* Fondo con gradiente amarillo */}
              <rect x="0" y="12" width="76" height="76" rx="16" fill="url(#bgGradient2)"/>
              {/* Rayo blanco - usando el path oficial del Sidebar */}
              <svg x="19" y="23" width="36" height="44" viewBox="0 0 18 22">
                <path d="M10.5 0L0 12.5H7.5L6 22L18 9H10.5V0Z" fill="white"/>
              </svg>
              <text x="96" y="55" fontFamily="system-ui, -apple-system, sans-serif" fontSize="36" fontWeight="900" fill="black" letterSpacing="6.5">
                RELAMPO
              </text>
              <text x="96" y="75" fontFamily="system-ui, -apple-system, sans-serif" fontSize="14" fill="#52525b">
                Performance testing made simple.
              </text>
            </svg>
          </div>
          <button
            onClick={() => {
              const svg = document.getElementById("logo-full-light") as SVGSVGElement;
              downloadSVG(svg, "relampo-logo-full-light.svg");
            }}
            className="ml-4 px-4 py-2 bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500 text-black rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity shadow-lg"
          >
            <Download className="inline w-4 h-4 mr-2" />
            Descargar SVG
          </button>
        </div>

        {/* Solo icono - Fondo oscuro */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-neutral-900">Solo icono - Fondo oscuro</h2>
          <div className="bg-neutral-900 rounded-2xl p-12 border border-neutral-700 inline-block">
            <svg
              id="icon-dark"
              width="120"
              height="120"
              viewBox="0 0 120 120"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="bgGradient3" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fde047" />
                  <stop offset="50%" stopColor="#facc15" />
                  <stop offset="100%" stopColor="#eab308" />
                </linearGradient>
              </defs>
              {/* Fondo con gradiente amarillo */}
              <rect x="0" y="0" width="120" height="120" rx="24" fill="url(#bgGradient3)"/>
              {/* Rayo blanco centrado - usando el path oficial del Sidebar */}
              <svg x="30" y="27" width="60" height="73.33" viewBox="0 0 18 22">
                <path d="M10.5 0L0 12.5H7.5L6 22L18 9H10.5V0Z" fill="white"/>
              </svg>
            </svg>
          </div>
          <button
            onClick={() => {
              const svg = document.getElementById("icon-dark") as SVGSVGElement;
              downloadSVG(svg, "relampo-icon-dark.svg");
            }}
            className="ml-4 px-4 py-2 bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500 text-black rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity shadow-lg"
          >
            <Download className="inline w-4 h-4 mr-2" />
            Descargar SVG
          </button>
        </div>

        {/* Solo icono - Fondo claro */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-neutral-900">Solo icono - Fondo claro</h2>
          <div className="bg-white rounded-2xl p-12 border-2 border-neutral-200 inline-block">
            <svg
              id="icon-light"
              width="120"
              height="120"
              viewBox="0 0 120 120"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="bgGradient4" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fde047" />
                  <stop offset="50%" stopColor="#facc15" />
                  <stop offset="100%" stopColor="#eab308" />
                </linearGradient>
              </defs>
              {/* Fondo con gradiente amarillo */}
              <rect x="0" y="0" width="120" height="120" rx="24" fill="url(#bgGradient4)"/>
              {/* Rayo blanco centrado - usando el path oficial del Sidebar */}
              <svg x="30" y="27" width="60" height="73.33" viewBox="0 0 18 22">
                <path d="M10.5 0L0 12.5H7.5L6 22L18 9H10.5V0Z" fill="white"/>
              </svg>
            </svg>
          </div>
          <button
            onClick={() => {
              const svg = document.getElementById("icon-light") as SVGSVGElement;
              downloadSVG(svg, "relampo-icon-light.svg");
            }}
            className="ml-4 px-4 py-2 bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500 text-black rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity shadow-lg"
          >
            <Download className="inline w-4 h-4 mr-2" />
            Descargar SVG
          </button>
        </div>

        {/* Solo icono - Transparente */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-neutral-900">Solo icono - Fondo transparente</h2>
          <div className="bg-gradient-to-br from-neutral-700 to-neutral-800 rounded-2xl p-12 border border-neutral-600 inline-block">
            <svg
              id="icon-transparent"
              width="120"
              height="120"
              viewBox="0 0 120 120"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="bgGradient5" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fde047" />
                  <stop offset="50%" stopColor="#facc15" />
                  <stop offset="100%" stopColor="#eab308" />
                </linearGradient>
              </defs>
              {/* Rayo con gradiente amarillo - sin fondo */}
              <svg x="30" y="27" width="60" height="73.33" viewBox="0 0 18 22">
                <path d="M10.5 0L0 12.5H7.5L6 22L18 9H10.5V0Z" fill="url(#bgGradient5)"/>
              </svg>
            </svg>
          </div>
          <button
            onClick={() => {
              const svg = document.getElementById("icon-transparent") as SVGSVGElement;
              downloadSVG(svg, "relampo-icon-transparent.svg");
            }}
            className="ml-4 px-4 py-2 bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500 text-black rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity shadow-lg"
          >
            <Download className="inline w-4 h-4 mr-2" />
            Descargar SVG
          </button>
        </div>

        {/* Logo horizontal compacto - Fondo oscuro */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-neutral-900">Logo horizontal compacto - Fondo oscuro</h2>
          <div className="bg-neutral-900 rounded-2xl p-8 border border-neutral-700 inline-block">
            <svg
              id="logo-compact-dark"
              width="300"
              height="60"
              viewBox="0 0 300 60"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="bgGradient6" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fde047" />
                  <stop offset="50%" stopColor="#facc15" />
                  <stop offset="100%" stopColor="#eab308" />
                </linearGradient>
              </defs>
              {/* Fondo con gradiente amarillo */}
              <rect x="0" y="6" width="48" height="48" rx="12" fill="url(#bgGradient6)"/>
              {/* Rayo blanco - usando el path oficial del Sidebar */}
              <svg x="12" y="13" width="24" height="29.33" viewBox="0 0 18 22">
                <path d="M10.5 0L0 12.5H7.5L6 22L18 9H10.5V0Z" fill="white"/>
              </svg>
              <text x="64" y="40" fontFamily="system-ui, -apple-system, sans-serif" fontSize="28" fontWeight="900" fill="white" letterSpacing="5">
                RELAMPO
              </text>
            </svg>
          </div>
          <button
            onClick={() => {
              const svg = document.getElementById("logo-compact-dark") as SVGSVGElement;
              downloadSVG(svg, "relampo-logo-compact-dark.svg");
            }}
            className="ml-4 px-4 py-2 bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500 text-black rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity shadow-lg"
          >
            <Download className="inline w-4 h-4 mr-2" />
            Descargar SVG
          </button>
        </div>

        {/* Logo horizontal compacto - Fondo claro */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-neutral-900">Logo horizontal compacto - Fondo claro</h2>
          <div className="bg-white rounded-2xl p-8 border-2 border-neutral-200 inline-block">
            <svg
              id="logo-compact-light"
              width="300"
              height="60"
              viewBox="0 0 300 60"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="bgGradient7" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fde047" />
                  <stop offset="50%" stopColor="#facc15" />
                  <stop offset="100%" stopColor="#eab308" />
                </linearGradient>
              </defs>
              {/* Fondo con gradiente amarillo */}
              <rect x="0" y="6" width="48" height="48" rx="12" fill="url(#bgGradient7)"/>
              {/* Rayo blanco - usando el path oficial del Sidebar */}
              <svg x="12" y="13" width="24" height="29.33" viewBox="0 0 18 22">
                <path d="M10.5 0L0 12.5H7.5L6 22L18 9H10.5V0Z" fill="white"/>
              </svg>
              <text x="64" y="40" fontFamily="system-ui, -apple-system, sans-serif" fontSize="28" fontWeight="900" fill="black" letterSpacing="5">
                RELAMPO
              </text>
            </svg>
          </div>
          <button
            onClick={() => {
              const svg = document.getElementById("logo-compact-light") as SVGSVGElement;
              downloadSVG(svg, "relampo-logo-compact-light.svg");
            }}
            className="ml-4 px-4 py-2 bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500 text-black rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity shadow-lg"
          >
            <Download className="inline w-4 h-4 mr-2" />
            Descargar SVG
          </button>
        </div>

        {/* Solo texto */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-neutral-900">Solo texto - Grande</h2>
          <div className="bg-neutral-900 rounded-2xl p-12 border border-neutral-700 inline-block">
            <svg
              id="text-only"
              width="500"
              height="100"
              viewBox="0 0 500 100"
              xmlns="http://www.w3.org/2000/svg"
            >
              <text x="0" y="55" fontFamily="system-ui, -apple-system, sans-serif" fontSize="48" fontWeight="900" fill="white" letterSpacing="8.5">
                RELAMPO
              </text>
              <text x="0" y="80" fontFamily="system-ui, -apple-system, sans-serif" fontSize="18" fill="#a1a1aa">
                Performance testing made simple.
              </text>
            </svg>
          </div>
          <button
            onClick={() => {
              const svg = document.getElementById("text-only") as SVGSVGElement;
              downloadSVG(svg, "relampo-text-only.svg");
            }}
            className="ml-4 px-4 py-2 bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500 text-black rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity shadow-lg"
          >
            <Download className="inline w-4 h-4 mr-2" />
            Descargar SVG
          </button>
        </div>

        {/* Solo icono sin fondo - Rayo amarillo */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-neutral-900">Solo icono - Rayo con gradiente (sin fondo)</h2>
          <div className="bg-neutral-900 rounded-2xl p-12 border border-neutral-700 inline-block">
            <svg
              id="icon-bolt-only"
              width="120"
              height="147"
              viewBox="0 0 120 147"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="boltGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fde047" />
                  <stop offset="50%" stopColor="#facc15" />
                  <stop offset="100%" stopColor="#eab308" />
                </linearGradient>
              </defs>
              {/* Rayo con gradiente amarillo - sin fondo, centrado */}
              <svg x="30" y="10" width="60" height="73.33" viewBox="0 0 18 22">
                <path d="M10.5 0L0 12.5H7.5L6 22L18 9H10.5V0Z" fill="url(#boltGradient)"/>
              </svg>
            </svg>
          </div>
          <button
            onClick={() => {
              const svg = document.getElementById("icon-bolt-only") as SVGSVGElement;
              downloadSVG(svg, "relampo-icon-bolt-only.svg");
            }}
            className="ml-4 px-4 py-2 bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500 text-black rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity shadow-lg"
          >
            <Download className="inline w-4 h-4 mr-2" />
            Descargar SVG
          </button>
        </div>
      </div>

      <div className="mt-16 p-6 bg-neutral-50 border-2 border-neutral-200 rounded-xl">
        <h3 className="font-semibold text-neutral-900 mb-2">Información del logo:</h3>
        <div className="space-y-1 text-sm text-neutral-600">
          <p><strong className="text-yellow-600">Gradiente oficial:</strong> #fde047 → #facc15 → #eab308</p>
          <p><strong className="text-yellow-600">Path del rayo (oficial del Sidebar):</strong> M10.5 0L0 12.5H7.5L6 22L18 9H10.5V0Z</p>
          <p><strong className="text-yellow-600">ViewBox del rayo:</strong> 0 0 18 22</p>
          <p><strong className="text-yellow-600">Fuente:</strong> System UI (sans-serif), font-weight: 900</p>
          <p><strong className="text-yellow-600">Letter spacing:</strong> 0.18em para "RELAMPO"</p>
          <p><strong className="text-yellow-600">Formato:</strong> Todos los logos se descargan en SVG (vector escalable)</p>
        </div>
      </div>
    </div>
  );
}