import { Shield, ShieldAlert, ShieldCheck, ShieldX, Download, Settings, PlayCircle, AlertCircle, Info } from 'lucide-react';
import { useState } from 'react';

export type CertStatus = 'missing' | 'needs_install' | 'trusted' | 'expired' | 'invalid';

interface CertificateData {
  status: CertStatus;
  trusted_os?: boolean;
  trusted_firefox?: boolean;
  expires_at?: string;
  fingerprint?: string;
}

interface CertificateStatusProps {
  certData: CertificateData;
  onGenerate: () => void;
  onInstall: () => void;
  onDownload: () => void;
  onShowInstructions: () => void;
  onRunDiagnostics: () => void;
  isLoading?: boolean;
}

export function CertificateStatus({
  certData,
  onGenerate,
  onInstall,
  onDownload,
  onShowInstructions,
  onRunDiagnostics,
  isLoading = false
}: CertificateStatusProps) {
  const [showDetails, setShowDetails] = useState(false);

  const getStatusConfig = () => {
    switch (certData.status) {
      case 'trusted':
        return {
          icon: ShieldCheck,
          label: 'Trusted',
          color: 'green',
          bgColor: 'bg-green-50',
          textColor: 'text-green-700',
          borderColor: 'border-green-200',
          iconColor: 'text-green-600',
          description: 'Certificate is installed and trusted',
          showActions: false
        };
      case 'needs_install':
        return {
          icon: ShieldAlert,
          label: 'Needs Install',
          color: 'amber',
          bgColor: 'bg-amber-50',
          textColor: 'text-amber-800',
          borderColor: 'border-amber-200',
          iconColor: 'text-amber-600',
          description: 'Certificate exists but is not in trust store',
          showActions: true
        };
      case 'expired':
      case 'invalid':
        return {
          icon: ShieldX,
          label: certData.status === 'expired' ? 'Expired' : 'Invalid',
          color: 'red',
          bgColor: 'bg-red-50',
          textColor: 'text-red-800',
          borderColor: 'border-red-200',
          iconColor: 'text-red-600',
          description: `Certificate is ${certData.status}. Rotate to continue.`,
          showActions: true
        };
      case 'missing':
      default:
        return {
          icon: Shield,
          label: 'Missing',
          color: 'neutral',
          bgColor: 'bg-neutral-50',
          textColor: 'text-neutral-700',
          borderColor: 'border-neutral-300',
          iconColor: 'text-neutral-500',
          description: 'No CA certificate found',
          showActions: true
        };
    }
  };

  const config = getStatusConfig();
  const StatusIcon = config.icon;

  return (
    <div className="space-y-3">
      {/* Status Badge */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-neutral-600">Certificate</span>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${config.bgColor} ${config.textColor} ${config.borderColor} transition-all hover:shadow-sm`}
          >
            <StatusIcon className={`w-3.5 h-3.5 ${config.iconColor}`} />
            <span className="text-xs font-semibold">{config.label}</span>
            <Info className="w-3 h-3 opacity-60" />
          </button>
        </div>

        {/* Quick Actions */}
        {config.showActions && (
          <div className="flex items-center gap-1.5">
            {(certData.status === 'missing' || certData.status === 'expired' || certData.status === 'invalid') && (
              <button
                onClick={onGenerate}
                disabled={isLoading}
                className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
              >
                {certData.status === 'expired' || certData.status === 'invalid' ? 'Rotate CA' : 'Generate CA'}
              </button>
            )}
            {certData.status === 'needs_install' && (
              <>
                <button
                  onClick={onInstall}
                  disabled={isLoading}
                  className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  Install CA
                </button>
                <button
                  onClick={onDownload}
                  disabled={isLoading}
                  className="px-3 py-1 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors disabled:opacity-50"
                >
                  Download
                </button>
              </>
            )}
          </div>
        )}

        {/* Diagnostics (always available) */}
        <button
          onClick={onRunDiagnostics}
          disabled={isLoading}
          className="ml-auto px-2.5 py-1 text-xs font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors disabled:opacity-50"
        >
          Run Diagnostics
        </button>
      </div>

      {/* Expanded Details */}
      {showDetails && (
        <div className={`p-4 rounded-lg border ${config.borderColor} ${config.bgColor}`}>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <StatusIcon className={`w-5 h-5 ${config.iconColor} flex-shrink-0 mt-0.5`} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${config.textColor}`}>
                  {config.description}
                </p>
                {certData.expires_at && (
                  <p className="text-xs text-neutral-600 mt-1">
                    Expires: {new Date(certData.expires_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>

            {/* Trust Store Status */}
            {(certData.trusted_os !== undefined || certData.trusted_firefox !== undefined) && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-neutral-200">
                {certData.trusted_os !== undefined && (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-white rounded text-xs">
                    <div className={`w-1.5 h-1.5 rounded-full ${certData.trusted_os ? 'bg-green-500' : 'bg-neutral-300'}`}></div>
                    <span className="text-neutral-700">OS Trust Store</span>
                  </div>
                )}
                {certData.trusted_firefox !== undefined && (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-white rounded text-xs">
                    <div className={`w-1.5 h-1.5 rounded-full ${certData.trusted_firefox ? 'bg-green-500' : 'bg-neutral-300'}`}></div>
                    <span className="text-neutral-700">Firefox</span>
                  </div>
                )}
              </div>
            )}

            {/* Fingerprint */}
            {certData.fingerprint && (
              <div className="pt-2 border-t border-neutral-200">
                <p className="text-xs text-neutral-600 mb-1">SHA-256 Fingerprint</p>
                <code className="text-[10px] text-neutral-700 font-mono bg-white px-2 py-1 rounded border border-neutral-200 break-all">
                  {certData.fingerprint}
                </code>
              </div>
            )}

            {/* Actions */}
            {config.showActions && (
              <div className="flex items-center gap-2 pt-2 border-t border-neutral-200">
                {(certData.status === 'missing' || certData.status === 'expired' || certData.status === 'invalid') && (
                  <button
                    onClick={onGenerate}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                  >
                    <PlayCircle className="w-3.5 h-3.5" />
                    {certData.status === 'expired' || certData.status === 'invalid' ? 'Rotate CA' : 'Generate CA'}
                  </button>
                )}
                {certData.status === 'needs_install' && (
                  <>
                    <button
                      onClick={onInstall}
                      disabled={isLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Install CA
                    </button>
                    <button
                      onClick={onDownload}
                      disabled={isLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors disabled:opacity-50"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download CA Cert
                    </button>
                  </>
                )}
                <button
                  onClick={onShowInstructions}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 hover:bg-white border border-transparent hover:border-neutral-200 rounded-lg transition-colors"
                >
                  Install Instructions
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
