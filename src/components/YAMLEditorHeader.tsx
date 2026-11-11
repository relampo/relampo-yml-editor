import '../styles/editor-header.css';
import { UsageMetricsConsent } from './UsageMetricsConsent';
import { ChevronDown, FilePlus, Save, Upload, SquarePlus, Link2 } from 'lucide-react';
import { ProtocolMenu } from './protocols/ProtocolMenu';
import type { StudioProtocol } from '../utils/protocolProject';
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
  correlateEnabled?: boolean;
  onCorrelate?: () => void;
  onNewStudio?: () => void;
  onSelectProtocol?: (protocol: StudioProtocol) => void;
  grpcEnabled?: boolean;
  httpEnabled?: boolean;
  language: string;
  setLanguage: (lang: 'en' | 'es') => void;
  t: (key: string) => string;
  isDocumentEmpty: boolean;
  onNew: () => void;
  onUpload: () => void;
  onDownload: (includeResponses: boolean) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function YAMLEditorHeader({
  language,
  onSelectProtocol,
  onNewStudio,
  onCorrelate,
  correlateEnabled = false,
  grpcEnabled = false,
  httpEnabled = false,
  setLanguage,
  t,
  isDocumentEmpty,
  onNew,
  onUpload,
  onDownload,
  fileInputRef,
  onFileChange,
}: YAMLEditorHeaderProps) {
  return (
    <header
      className="editor-header saas-editor-surface"
      aria-label={language === 'es' ? 'Herramientas del editor' : 'Editor tools'}
    >
      <div className="editor-header-row">
        <div className="editor-header-brand">
          <span
            className="editor-header-logo"
            aria-hidden="true"
          >
            <svg
              width="13"
              height="17"
              viewBox="0 0 18 22"
              fill="none"
            >
              <path
                d="M10.5 0L0 12.5H7.5L6 22L18 9H10.5V0Z"
                fill="currentColor"
              />
            </svg>
          </span>
          <span className="editor-header-name">Relampo</span>
          <span
            className="editor-header-divider"
            aria-hidden="true"
          />
          <h1 className="editor-header-title">{language === 'es' ? 'Editor de YAML' : 'YAML Editor'}</h1>
        </div>

        <div className="editor-header-controls">
          <UsageMetricsConsent language={language} />
          {/* Action Buttons */}
          <div className="editor-header-actions">
            {onSelectProtocol && (
              <ProtocolMenu
                language={language}
                appearance="saas"
                grpcEnabled={grpcEnabled}
                httpEnabled={httpEnabled}
                onSelect={onSelectProtocol}
              />
            )}
            {onCorrelate && (
              <Button
                onClick={onCorrelate}
                disabled={!correlateEnabled}
                variant="outline"
                size="sm"
                className="editor-header-button"
              >
                <Link2 className="w-4 h-4" />
                Correlate
              </Button>
            )}
            {onNewStudio && (
              <Button
                onClick={onNewStudio}
                variant="outline"
                size="sm"
                title={
                  language === 'es' ? 'Abrir otro editor en una pestaña nueva' : 'Open another editor in a new tab'
                }
                className="editor-header-button"
              >
                <SquarePlus className="w-4 h-4" />
                {language === 'es' ? 'Nuevo Studio' : 'New Studio'}
              </Button>
            )}
            {!isDocumentEmpty && (
              <Button
                onClick={onNew}
                size="sm"
                className="editor-header-button"
              >
                <FilePlus className="w-4 h-4" />
                {t('yamlEditor.newDocument')}
              </Button>
            )}

            <Button
              onClick={onUpload}
              variant="outline"
              size="sm"
              className="editor-header-button"
            >
              <Upload className="w-4 h-4" />
              {t('yamlEditor.uploadYaml')}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger className="editor-header-button editor-header-save">
                <Save className="w-4 h-4" />
                {t('yamlEditor.saveYaml')}
                <ChevronDown className="w-4 h-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="saas-editor-surface editor-header-menu min-w-65 p-1.5"
              >
                <DropdownMenuLabel className="editor-header-menu-label text-xs">
                  {language === 'es' ? 'Opciones de guardado' : 'Save options'}
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="editor-header-menu-separator" />
                <DropdownMenuItem
                  onClick={() => onDownload(true)}
                  className="editor-header-menu-item rounded-md px-3 py-2 cursor-pointer"
                >
                  <div className="flex flex-col">
                    <span>{language === 'es' ? 'Guardar con respuestas' : 'Save with responses'}</span>
                    <span className="text-xs text-zinc-500">
                      {language === 'es'
                        ? 'Útil para editar y correlacionar el script'
                        : 'Best for editing and correlating the script'}
                    </span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDownload(false)}
                  className="editor-header-menu-item rounded-md px-3 py-2 cursor-pointer"
                >
                  <div className="flex flex-col">
                    <span>{language === 'es' ? 'Guardar sin respuestas' : 'Save without responses'}</span>
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

          <div
            className="editor-header-language"
            role="group"
            aria-label={language === 'es' ? 'Idioma' : 'Language'}
          >
            {(['en', 'es'] as const).map(locale => (
              <button
                key={locale}
                type="button"
                aria-label={locale === 'en' ? 'English' : 'Español'}
                aria-pressed={language === locale}
                onClick={() => setLanguage(locale)}
              >
                {locale.toUpperCase()}
              </button>
            ))}
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
    </header>
  );
}
