import { Upload, Download, ChevronDown } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface YAMLEditorHeaderProps {
  language: string;
  setLanguage: (lang: 'en' | 'es') => void;
  t: (key: string) => string;
  hasDocumentActivity: boolean;
  isDirty: boolean;
  lastSavedAt: string | null;
  actionMessage: string;
  onUpload: () => void;
  onDownload: (includeResponses: boolean) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function YAMLEditorHeader({
  language,
  setLanguage,
  t,
  hasDocumentActivity,
  isDirty,
  lastSavedAt,
  actionMessage,
  onUpload,
  onDownload,
  fileInputRef,
  onFileChange,
}: YAMLEditorHeaderProps) {
  return (
    <div className="bg-[#1a1a1a] border-b border-white/10 px-6 py-4 flex-shrink-0">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Brand */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#fde047] via-[#facc15] to-[#eab308] flex items-center justify-center"
            style={{ boxShadow: '0 14px 35px rgba(250, 204, 21, 0.40)' }}
          >
            <svg
              width="18"
              height="22"
              viewBox="0 0 18 22"
              fill="none"
              style={{ filter: 'drop-shadow(0 2px 6px rgba(0, 0, 0, 0.25))' }}
            >
              <path
                d="M10.5 0L0 12.5H7.5L6 22L18 9H10.5V0Z"
                fill="white"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-[20px] font-black text-white tracking-tight m-0">RELAMPO</h1>
            <p className="text-xs text-zinc-400 font-medium tracking-wide m-0">
              {language === 'es' ? 'Editor de YAML' : 'YAML Editor'}
            </p>
          </div>
        </div>

        {/* Right: Buttons + Language Toggle */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2">
            {hasDocumentActivity && (
              <span
                className={`text-[11px] px-2 py-1 rounded border ${
                  isDirty
                    ? 'text-amber-300 border-amber-400/30 bg-amber-400/10'
                    : 'text-emerald-300 border-emerald-400/30 bg-emerald-400/10'
                }`}
              >
                {isDirty
                  ? language === 'es'
                    ? 'Guardando...'
                    : 'Saving...'
                  : language === 'es'
                    ? 'Guardado'
                    : 'Saved'}
              </span>
            )}
            {hasDocumentActivity && lastSavedAt && !isDirty && (
              <span className="text-[11px] text-zinc-500">
                {language === 'es' ? 'Último guardado:' : 'Last save:'} {lastSavedAt}
              </span>
            )}
            {actionMessage && <span className="text-[11px] text-zinc-300">{actionMessage}</span>}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              onClick={onUpload}
              variant="outline"
              size="sm"
              className="border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300"
            >
              <Upload className="w-4 h-4 mr-2" />
              {t('yamlEditor.uploadYaml')}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex h-8 items-center justify-center gap-2 rounded-md border border-yellow-400/20 bg-yellow-400/5 px-3 text-sm font-medium text-yellow-400 shadow-sm transition-all duration-200 hover:bg-yellow-400/10 hover:border-yellow-400/35 hover:shadow-yellow-400/10 focus:outline-none focus:ring-2 focus:ring-yellow-400/40">
                <Download className="w-4 h-4" />
                {t('yamlEditor.downloadYaml')}
                <ChevronDown className="w-4 h-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-[#111111] border border-white/10 text-zinc-200 min-w-[260px] p-1.5"
              >
                <DropdownMenuLabel className="text-zinc-400 text-xs uppercase tracking-wide">
                  {language === 'es' ? 'Opciones de descarga' : 'Download options'}
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem
                  onClick={() => onDownload(true)}
                  className="rounded-md px-3 py-2 focus:bg-yellow-400/10 focus:text-white cursor-pointer data-[highlighted]:bg-yellow-400/10 data-[highlighted]:text-white"
                >
                  <div className="flex flex-col">
                    <span>{language === 'es' ? 'Descargar con respuestas' : 'Download with responses'}</span>
                    <span className="text-xs text-zinc-500">
                      {language === 'es'
                        ? 'Útil para editar y correlacionar el script'
                        : 'Best for editing and correlating the script'}
                    </span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDownload(false)}
                  className="rounded-md px-3 py-2 focus:bg-yellow-400/10 focus:text-white cursor-pointer data-[highlighted]:bg-yellow-400/10 data-[highlighted]:text-white"
                >
                  <div className="flex flex-col">
                    <span>{language === 'es' ? 'Descargar sin respuestas' : 'Download without responses'}</span>
                    <span className="text-xs text-zinc-500">
                      {language === 'es'
                        ? 'Ideal para lanzar pruebas con el script'
                        : 'Best for running tests with the script'}
                    </span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Language Toggle */}
          <div
            className="lang-toggle"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <span
              className="lang-label"
              style={{
                fontSize: '12px',
                fontWeight: '600',
                color: language === 'en' ? '#facc15' : '#a3a3a3',
                transition: 'color 0.3s ease',
              }}
            >
              EN
            </span>
            <label
              className="toggle-switch"
              htmlFor="langToggle"
              aria-label="Language toggle"
              style={{
                position: 'relative',
                display: 'inline-block',
                width: '44px',
                height: '24px',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                id="langToggle"
                checked={language === 'es'}
                onChange={() => setLanguage(language === 'en' ? 'es' : 'en')}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span
                className="toggle-slider"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: '#1a1a1a',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '24px',
                  transition: 'background-color 0.3s ease, border-color 0.3s ease',
                }}
              ></span>
            </label>
            <span
              className="lang-label"
              style={{
                fontSize: '12px',
                fontWeight: '600',
                color: language === 'es' ? '#facc15' : '#a3a3a3',
                transition: 'color 0.3s ease',
              }}
            >
              ES
            </span>
            <style>{`
              .toggle-slider:before {
                position: absolute;
                content: "";
                height: 18px;
                width: 18px;
                left: 3px;
                bottom: 2px;
                background: linear-gradient(135deg, #fde047 0%, #facc15 45%, #eab308 100%);
                border-radius: 50%;
                transition: transform 0.3s ease;
                box-shadow: 0 2px 8px rgba(250, 204, 21, 0.4);
              }
              input:checked + .toggle-slider:before {
                transform: translateX(20px);
              }
              .toggle-switch:hover .toggle-slider {
                border-color: #facc15;
              }
            `}</style>
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".yaml,.yml"
        onChange={onFileChange}
        className="hidden"
      />
    </div>
  );
}
