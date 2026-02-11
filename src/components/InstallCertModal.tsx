import { X, ShieldCheck, Download, Info, ChevronRight, Chrome, Monitor, Apple } from 'lucide-react';
import { useState } from 'react';

interface InstallCertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstall: () => void;
  onDownload: () => void;
  onShowInstructions: () => void;
  isInstalling?: boolean;
  installError?: string | null;
}

export function InstallCertModal({
  isOpen,
  onClose,
  onInstall,
  onDownload,
  onShowInstructions,
  isInstalling = false,
  installError = null
}: InstallCertModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">Install certificate to capture HTTPS</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-neutral-700 leading-relaxed">
            Relampo uses a local proxy to record HTTPS traffic. Install the Relampo CA certificate on this machine to capture encrypted requests.
          </p>

          {/* Info Box */}
          <div className="flex gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900 leading-relaxed">
              <p className="font-medium mb-1">Why is this needed?</p>
              <p className="text-blue-800">
                To decrypt and inspect HTTPS traffic, Relampo acts as a "man-in-the-middle" proxy. 
                Your system must trust the Relampo CA to allow this interception.
              </p>
            </div>
          </div>

          {/* Install Error */}
          {installError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs font-medium text-red-900 mb-1">Installation Failed</p>
              <p className="text-xs text-red-800">{installError}</p>
              <p className="text-xs text-red-700 mt-2">
                Try downloading the certificate manually and following the install instructions below.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            {/* Primary: Install CA */}
            <button
              onClick={onInstall}
              disabled={isInstalling}
              className="w-full flex items-center justify-between px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5" />
                <div className="text-left">
                  <div className="text-sm font-semibold">
                    {isInstalling ? 'Installing...' : 'Install CA (Recommended)'}
                  </div>
                  <div className="text-xs text-blue-100">
                    One-click automatic installation
                  </div>
                </div>
              </div>
              {!isInstalling && (
                <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              )}
              {isInstalling && (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              )}
            </button>

            {/* Secondary: Download */}
            <button
              onClick={onDownload}
              disabled={isInstalling}
              className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-neutral-50 text-neutral-900 border border-neutral-300 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <div className="flex items-center gap-3">
                <Download className="w-5 h-5 text-neutral-600" />
                <div className="text-left">
                  <div className="text-sm font-semibold">Download CA Cert</div>
                  <div className="text-xs text-neutral-600">
                    Install manually (for advanced users)
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-neutral-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between">
          <button
            onClick={onShowInstructions}
            className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1"
          >
            Install Instructions
            <ChevronRight className="w-4 h-4" />
          </button>
          <p className="text-xs text-neutral-600">
            You can remove it anytime from <span className="font-medium">Settings → Certificates</span>
          </p>
        </div>
      </div>
    </div>
  );
}

// Install Instructions Drawer
interface InstallInstructionsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  certPath?: string;
}

export function InstallInstructionsDrawer({
  isOpen,
  onClose,
  certPath = '/path/to/relampo-ca.crt'
}: InstallInstructionsDrawerProps) {
  const [activeOS, setActiveOS] = useState<'windows' | 'macos' | 'linux' | 'firefox'>('windows');

  if (!isOpen) return null;

  const instructions = {
    windows: {
      title: 'Windows',
      icon: Monitor,
      steps: [
        'Double-click the downloaded certificate file (relampo-ca.crt)',
        'Click "Install Certificate..."',
        'Select "Local Machine" and click "Next" (requires admin)',
        'Select "Place all certificates in the following store"',
        'Click "Browse" and select "Trusted Root Certification Authorities"',
        'Click "Next", then "Finish"',
        'Click "Yes" on the security warning',
        'Restart your browser'
      ]
    },
    macos: {
      title: 'macOS',
      icon: Apple,
      steps: [
        'Double-click the downloaded certificate file (relampo-ca.crt)',
        'Keychain Access will open automatically',
        'Find "Relampo CA" in the list',
        'Double-click it to open details',
        'Expand "Trust" section',
        'Set "When using this certificate" to "Always Trust"',
        'Close the window (it will ask for your password)',
        'Restart your browser'
      ]
    },
    linux: {
      title: 'Linux',
      icon: Monitor,
      steps: [
        'Copy certificate to system trust store:',
        '  sudo cp relampo-ca.crt /usr/local/share/ca-certificates/',
        'Update certificate store:',
        '  sudo update-ca-certificates',
        'For Chrome/Chromium, also run:',
        '  certutil -d sql:$HOME/.pki/nssdb -A -t "C,," -n "Relampo CA" -i relampo-ca.crt',
        'Restart your browser'
      ]
    },
    firefox: {
      title: 'Firefox (All OS)',
      icon: Chrome,
      steps: [
        'Open Firefox and go to Settings (about:preferences)',
        'Search for "certificates" in the search bar',
        'Click "View Certificates..."',
        'Go to the "Authorities" tab',
        'Click "Import..."',
        'Select the downloaded certificate file (relampo-ca.crt)',
        'Check "Trust this CA to identify websites"',
        'Click "OK"',
        'Restart Firefox'
      ]
    }
  };

  const current = instructions[activeOS];
  const Icon = current.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Drawer */}
      <div className="relative bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full max-w-2xl mx-0 sm:mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-semibold text-neutral-900">Install Instructions</h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* OS Tabs */}
        <div className="px-6 pt-4 border-b border-neutral-200 flex-shrink-0">
          <div className="flex gap-1">
            {(['windows', 'macos', 'linux', 'firefox'] as const).map((os) => {
              const config = instructions[os];
              const TabIcon = config.icon;
              return (
                <button
                  key={os}
                  onClick={() => setActiveOS(os)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                    activeOS === os
                      ? 'text-blue-700 bg-blue-50 border-b-2 border-blue-600'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                  }`}
                >
                  <TabIcon className="w-4 h-4" />
                  {config.title}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900">
              <p className="font-medium mb-1">Certificate Location</p>
              <code className="text-xs bg-white px-2 py-1 rounded border border-amber-200 font-mono">
                {certPath}
              </code>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
              <Icon className="w-5 h-5 text-blue-600" />
              {current.title} Installation Steps
            </h3>
            <ol className="space-y-3">
              {current.steps.map((step, index) => (
                <li key={index} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-semibold">
                    {index + 1}
                  </span>
                  <p className={`text-sm text-neutral-700 pt-0.5 ${
                    step.startsWith('  ') ? 'font-mono text-xs bg-neutral-50 px-3 py-2 rounded border border-neutral-200 -ml-9 pl-12' : ''
                  }`}>
                    {step}
                  </p>
                </li>
              ))}
            </ol>
          </div>

          <div className="pt-4 border-t border-neutral-200">
            <p className="text-xs text-neutral-600">
              <strong>Note:</strong> After installation, run <span className="font-semibold">Diagnostics</span> to verify the certificate is trusted.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-200 flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
