import { useState } from 'react';
import { CertificateBackendGuide } from './CertificateBackendGuide';
import { FrontendImplementationDoc } from './FrontendImplementationDoc';
import { ComponentsShowcase } from './ComponentsShowcase';
import { LogoDownloadsTab } from './LogoDownloads';

export function DesignDoc() {
  const [activeTab, setActiveTab] = useState<'design' | 'backend' | 'frontend' | 'components' | 'logos'>('design');

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Tabs Header */}
      <div className="border-b border-neutral-200 bg-white sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('design')}
              className={`px-6 py-3 text-sm font-semibold transition-colors ${
                activeTab === 'design'
                  ? 'text-blue-700 border-b-2 border-blue-600'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Design System
            </button>
            <button
              onClick={() => setActiveTab('backend')}
              className={`px-6 py-3 text-sm font-semibold transition-colors ${
                activeTab === 'backend'
                  ? 'text-blue-700 border-b-2 border-blue-600'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Certificate Backend Guide
            </button>
            <button
              onClick={() => setActiveTab('frontend')}
              className={`px-6 py-3 text-sm font-semibold transition-colors ${
                activeTab === 'frontend'
                  ? 'text-blue-700 border-b-2 border-blue-600'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Frontend Implementation
            </button>
            <button
              onClick={() => setActiveTab('components')}
              className={`px-6 py-3 text-sm font-semibold transition-colors ${
                activeTab === 'components'
                  ? 'text-blue-700 border-b-2 border-blue-600'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Relampo League
            </button>
            <button
              onClick={() => setActiveTab('logos')}
              className={`px-6 py-3 text-sm font-semibold transition-colors ${
                activeTab === 'logos'
                  ? 'text-blue-700 border-b-2 border-blue-600'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Logo Downloads
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'backend' ? (
          <CertificateBackendGuide />
        ) : activeTab === 'frontend' ? (
          <FrontendImplementationDoc />
        ) : activeTab === 'components' ? (
          <ComponentsShowcase />
        ) : activeTab === 'logos' ? (
          <LogoDownloadsTab />
        ) : (
          <div className="max-w-7xl mx-auto px-8 py-12">
            <div className="mb-16 pb-16 border-b-2 border-neutral-200">
              <h1 className="text-4xl font-bold text-neutral-900 mb-4">RELAMPO Design System</h1>
              <p className="text-xl text-neutral-700 mb-6 max-w-2xl">
                Modern, enterprise-grade performance testing platform
              </p>
              <div className="flex flex-wrap gap-3 mb-8">
                <span className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">React + TypeScript</span>
                <span className="px-4 py-2 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium">Tailwind CSS v4</span>
                <span className="px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium">Lucide React Icons</span>
                <span className="px-4 py-2 bg-yellow-50 text-yellow-700 rounded-lg text-sm font-medium">Vite</span>
              </div>
            </div>

            {/* Logo Section */}
            <section className="mb-16">
              <h2 className="text-2xl font-bold text-neutral-900 mb-6">Logo & Brand Identity</h2>
              
              <div className="bg-neutral-50 border-2 border-neutral-200 rounded-xl p-8">
                <div className="grid grid-cols-2 gap-6">
                  {/* Logo on dark */}
                  <div className="bg-neutral-900 rounded-xl p-8 flex items-center justify-center">
                    <div className="flex items-center gap-2.5">
                      <div className="relative w-9 h-9 bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500 rounded-lg flex items-center justify-center shadow-xl shadow-yellow-400/40">
                        <svg width="18" height="22" viewBox="0 0 18 22" fill="none">
                          <path d="M10.5 0L0 12.5H7.5L6 22L18 9H10.5V0Z" fill="white" className="drop-shadow-lg"/>
                        </svg>
                      </div>
                      <span className="text-xl font-black tracking-tight text-white">RELAMPO</span>
                    </div>
                  </div>

                  {/* Logo on light */}
                  <div className="bg-white border-2 border-neutral-200 rounded-xl p-8 flex items-center justify-center">
                    <div className="flex items-center gap-2.5">
                      <div className="relative w-9 h-9 bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500 rounded-lg flex items-center justify-center shadow-xl shadow-yellow-400/40">
                        <svg width="18" height="22" viewBox="0 0 18 22" fill="none">
                          <path d="M10.5 0L0 12.5H7.5L6 22L18 9H10.5V0Z" fill="white" className="drop-shadow-lg"/>
                        </svg>
                      </div>
                      <span className="text-xl font-black tracking-tight text-neutral-900">RELAMPO</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-900">
                    <strong>Note:</strong> Visit the <strong>Logo Downloads</strong> tab to download all logo variations in SVG format.
                  </p>
                </div>
              </div>
            </section>

            {/* Colors */}
            <section className="mb-16">
              <h2 className="text-2xl font-bold text-neutral-900 mb-6">Brand Colors</h2>
              
              <div className="bg-neutral-50 border-2 border-neutral-200 rounded-xl p-8">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white border border-neutral-200 rounded-lg p-4">
                    <div className="w-full h-24 bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500 rounded-lg mb-3 shadow-lg"></div>
                    <div className="text-sm font-semibold text-neutral-900 mb-1">Primary Gradient</div>
                    <div className="text-xs text-neutral-600 space-y-1 font-mono">
                      <div>from: #fde047</div>
                      <div>via: #facc15</div>
                      <div>to: #eab308</div>
                    </div>
                  </div>

                  <div className="bg-white border border-neutral-200 rounded-lg p-4">
                    <div className="w-full h-24 bg-[#0a0a0a] rounded-lg mb-3"></div>
                    <div className="text-sm font-semibold text-neutral-900 mb-1">Background Dark</div>
                    <div className="text-xs text-neutral-600 space-y-1 font-mono">
                      <div>HEX: #0a0a0a</div>
                      <div>Usage: Main background</div>
                    </div>
                  </div>

                  <div className="bg-white border border-neutral-200 rounded-lg p-4">
                    <div className="w-full h-24 bg-[#111111] rounded-lg mb-3"></div>
                    <div className="text-sm font-semibold text-neutral-900 mb-1">Surface Dark</div>
                    <div className="text-xs text-neutral-600 space-y-1 font-mono">
                      <div>HEX: #111111</div>
                      <div>Usage: Cards, panels</div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h4 className="font-semibold text-neutral-900 mb-2">Why Vibrant Yellow?</h4>
                  <p className="text-sm text-neutral-700 leading-relaxed">
                    The bright yellow gradient represents <strong>speed, energy, and instant power</strong> — like a lightning bolt. 
                    It's bold, memorable, and stands out in the performance testing space. Yellow conveys urgency, 
                    high performance, and the electric nature of "Relampo" (Portuguese for "lightning flash").
                  </p>
                </div>
              </div>
            </section>

            {/* Typography */}
            <section className="mb-16">
              <h2 className="text-2xl font-bold text-neutral-900 mb-6">Typography</h2>
              
              <div className="bg-neutral-50 border-2 border-neutral-200 rounded-xl p-8">
                <div className="space-y-6">
                  <div className="bg-white border border-neutral-200 rounded-lg p-6">
                    <div className="text-xs text-neutral-600 mb-3">Brand Wordmark</div>
                    <div className="text-3xl font-black tracking-tight text-neutral-900 mb-2">RELAMPO</div>
                    <div className="text-sm text-neutral-600 font-mono">font-weight: 900, letter-spacing: tight</div>
                  </div>

                  <div className="bg-white border border-neutral-200 rounded-lg p-6">
                    <div className="text-xs text-neutral-600 mb-3">Primary Font</div>
                    <div className="text-lg text-neutral-900 mb-2">System UI / -apple-system / sans-serif</div>
                    <div className="text-sm text-neutral-600">Modern, professional, cross-platform compatibility</div>
                  </div>
                </div>
              </div>
            </section>

            {/* UI Components Preview */}
            <section className="mb-16">
              <h2 className="text-2xl font-bold text-neutral-900 mb-6">UI Components</h2>
              
              <div className="bg-neutral-50 border-2 border-neutral-200 rounded-xl p-8">
                <p className="text-neutral-700 mb-4">
                  For interactive component examples and the Relampo League showcase, visit the <strong>Relampo League</strong> tab.
                </p>
                <p className="text-neutral-600 text-sm">
                  The design system includes buttons, inputs, cards, navigation elements, and more — all optimized for the dark theme.
                </p>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
