import { useState, useRef, useCallback, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import './converter.css';
import { convertContent, ConversionResult } from '../../lib/converter/conversion';

export function ConverterView() {
    const [file, setFile] = useState<File | null>(null);
    const [convertedYaml, setConvertedYaml] = useState<string>('');
    const [conversionStats, setConversionStats] = useState<any>(null);
    const [limitations, setLimitations] = useState<string[]>([]);

    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lang, setLang] = useState<'en' | 'es'>('en');

    // Search State
    const [isSearchVisible, setIsSearchVisible] = useState(false);
    const [searchValue, setSearchValue] = useState('');
    const [searchMatches, setSearchMatches] = useState({ count: 0, current: 0 });
    const editorRef = useRef<any>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleEditorDidMount = (editor: any, _: any) => {
        editorRef.current = editor;
    };

    const performSearch = (query: string, direction: 'next' | 'previous' = 'next') => {
        if (!editorRef.current || !query) return;
        editorRef.current.trigger('source', direction === 'next' ? 'editor.action.nextMatchFindAction' : 'editor.action.previousMatchFindAction');
    };

    // Sync search query with Monaco's find controller (basic implementation)
    useEffect(() => {
        if (isSearchVisible && editorRef.current && searchValue) {
            const model = editorRef.current.getModel();
            const matches = model.findMatches(searchValue, false, false, false, null, true);
            setSearchMatches({ count: matches.length, current: matches.length > 0 ? 1 : 0 });

            if (matches.length > 0) {
                editorRef.current.revealRangeInCenter(matches[0].range);
                editorRef.current.setSelection(matches[0].range);
            }
        }
    }, [searchValue, isSearchVisible]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) validateAndSetFile(droppedFile);
    }, []);

    const validateAndSetFile = (uploadedFile: File) => {
        const ext = uploadedFile.name.split('.').pop()?.toLowerCase();
        if (ext === 'json' || ext === 'jmx') {
            setFile(uploadedFile);
            setError(null);
            setConvertedYaml('');
            setConversionStats(null);
            setLimitations([]);
        } else {
            setError('Invalid file type. Please upload .json or .jmx');
        }
    };

    const handleConvert = async () => {
        if (!file) return;
        try {
            const text = await file.text();
            const result: ConversionResult = convertContent(text, file.name);
            setConvertedYaml(result.yaml);
            setConversionStats(result.stats);
            setLimitations(result.limitations);
            setError(null);
        } catch (e: any) {
            console.error(e);
            setError(e.message || 'Conversion failed');
        }
    };

    const handleDownload = () => {
        if (!convertedYaml) return;
        const blob = new Blob([convertedYaml], { type: 'text/yaml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'pulse_load_test.yaml';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleCopy = () => {
        if (convertedYaml) {
            navigator.clipboard.writeText(convertedYaml);
            // Optional: Show toast
        }
    };

    const handleClear = () => {
        setFile(null);
        setConvertedYaml('');
        setConversionStats(null);
        setLimitations([]);
        setError(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="converter-scope">
            <header>
                <div className="brand">
                    <div className="logo" aria-hidden="true">
                        <svg width="18" height="22" viewBox="0 0 18 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M10.5 0L0 12.5H7.5L6 22L18 9H10.5V0Z" fill="white"></path>
                        </svg>
                    </div>
                    <div className="brand-text">
                        <h1>RELAMPO</h1>
                        <div className="subtitle">Postman/JMX to Relampo YAML</div>
                    </div>
                </div>
                <div className="lang-toggle">
                    <span className="lang-label" style={{ color: lang === 'en' ? '#facc15' : '#a3a3a3' }}>EN</span>
                    <label className="toggle-switch" aria-label="Language toggle">
                        <input
                            type="checkbox"
                            checked={lang === 'es'}
                            onChange={() => setLang(lang === 'en' ? 'es' : 'en')}
                        />
                        <span className="toggle-slider"></span>
                    </label>
                    <span className="lang-label" style={{ color: lang === 'es' ? '#facc15' : '#a3a3a3' }}>ES</span>
                </div>
            </header>

            <div className="main-layout">
                {/* Upload Panel */}
                <div className="panel">
                    <h2 className="panel-title">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="17 8 12 3 7 8"></polyline>
                            <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                        <span>Upload Collection</span>
                    </h2>

                    <div className="info-box">
                        Convert Postman (.json) or JMeter (.jmx) files to Relampo YAML directly in your browser.
                    </div>

                    <div
                        role="button"
                        tabIndex={0}
                        className={`upload-zone ${isDragging ? 'has-file' : ''}`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
                    >
                        <svg className="upload-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                        </svg>
                        <div className="upload-title">Drop your file here</div>
                        <div className="upload-subtitle">or click to select</div>

                        {file && (
                            <div role="presentation" className="file-info visible" onClick={(e) => e.stopPropagation()} onKeyDown={() => {}}>
                                <div className="file-name">{file.name}</div>
                                <button className="file-remove" onClick={handleClear} title="Remove file">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </svg>
                                </button>
                            </div>
                        )}

                        {error && <div style={{ color: '#ef4444', marginTop: '10px', fontSize: '13px' }}>{error}</div>}
                    </div>

                    <div className="convert-actions">
                        <button className="btn" onClick={handleConvert} disabled={!file}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 3v12"></path>
                                <path d="m8 11 4 4 4-4"></path>
                            </svg>
                            <span>Convert to YAML</span>
                        </button>
                    </div>

                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={(e) => e.target.files?.[0] && validateAndSetFile(e.target.files[0])}
                        accept=".json,.jmx"
                        style={{ display: 'none' }}
                    />
                </div>

                {/* Output Panel */}
                <div className="panel" style={{ padding: 0 }}>
                    <div style={{ padding: '24px', paddingBottom: 0 }}>
                        <h2 className="panel-title">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                <line x1="16" y1="17" x2="8" y2="17"></line>
                            </svg>
                            <span>YAML Output</span>
                        </h2>
                    </div>

                    {isSearchVisible && (
                        <div className="search-bar">
                            <div className="search-input-container">
                                <svg className="search-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="11" cy="11" r="8"></circle>
                                    <path d="m21 21-4.35-4.35"></path>
                                </svg>
                                <input
                                    type="text"
                                    className="search-input"
                                    placeholder="Search in YAML..."
                                    value={searchValue}
                                    onChange={(e) => setSearchValue(e.target.value)}
                                />
                                <span className="search-counter">{searchMatches.current}/{searchMatches.count}</span>
                            </div>
                            <div className="search-buttons">
                                <button className="btn-icon" onClick={() => performSearch(searchValue, 'previous')} disabled={searchMatches.count === 0} title="Previous">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="15 18 9 12 15 6"></polyline>
                                    </svg>
                                </button>
                                <button className="btn-icon" onClick={() => performSearch(searchValue, 'next')} disabled={searchMatches.count === 0} title="Next">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="9 18 15 12 9 6"></polyline>
                                    </svg>
                                </button>
                                <button className="btn-icon" onClick={() => setIsSearchVisible(false)} title="Close search">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="yaml-output" style={{ flex: 1, padding: 0, overflow: 'hidden', border: 0 }}>
                        <Editor
                            height="100%"
                            defaultLanguage="yaml"
                            value={convertedYaml}
                            theme="vs-dark"
                            onMount={handleEditorDidMount}
                            options={{
                                readOnly: true,
                                minimap: { enabled: false },
                                scrollBeyondLastLine: false,
                                padding: { top: 16, bottom: 16 }
                            }}
                        />
                    </div>

                    <div style={{ padding: '24px', borderTop: '1px solid var(--border-subtle)' }}>
                        <div className="download-actions">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setIsSearchVisible(!isSearchVisible)}
                                disabled={!convertedYaml}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="11" cy="11" r="8"></circle>
                                    <path d="m21 21-4.35-4.35"></path>
                                </svg>
                                <span>Search</span>
                            </button>
                            <button className="btn btn-success" onClick={handleDownload} disabled={!convertedYaml}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                    <polyline points="7 10 12 15 17 10"></polyline>
                                    <line x1="12" y1="15" x2="12" y2="3"></line>
                                </svg>
                                <span>Download YAML</span>
                            </button>
                            <button className="btn btn-secondary" onClick={handleCopy} disabled={!convertedYaml}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                                <span>Copy</span>
                            </button>
                            <button className="btn btn-secondary" onClick={handleClear} disabled={!convertedYaml}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                                <span>Clear</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Conversion Summary Panel */}
                <div className="panel reference-panel">
                    <h2 className="panel-title">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="M12 16v-4"></path>
                            <path d="M12 8h.01"></path>
                        </svg>
                        <span>Conversion Summary</span>
                    </h2>

                    {convertedYaml ? (
                        <div id="conversionSummary">
                            {/* Elements Converted Section */}
                            <div className="reference-section">
                                <div className="reference-title">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }}>
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                    Elements Converted
                                </div>
                                <ul className="reference-list">
                                    {conversionStats && (
                                        <>
                                            <li>HTTP Requests: {conversionStats.requests || 0}</li>
                                            <li>Folders/Groups: {conversionStats.folders || 0}</li>
                                            <li>Extractors: {conversionStats.extractors || 0}</li>
                                            {conversionStats.assertions !== undefined && <li>Assertions: {conversionStats.assertions}</li>}
                                        </>
                                    )}
                                </ul>
                            </div>

                            {/* Unsupported Elements Section */}
                            {limitations.length > 0 && (
                                <div className="reference-section" id="unsupportedSection">
                                    <div className="reference-title" style={{ color: '#f59e0b' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }}>
                                            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
                                            <path d="M12 9v4"></path>
                                            <path d="M12 17h.01"></path>
                                        </svg>
                                        Unsupported Elements
                                    </div>
                                    <ul className="reference-list" id="elementsUnsupported">
                                        {limitations.map((limitation) => (
                                            <li key={limitation}>{limitation}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Default Reference Info */
                        <div id="defaultReference">
                            <div className="reference-section">
                                <div className="reference-title">Generated Output</div>
                                <div className="reference-code" style={{ whiteSpace: 'pre-wrap' }}>
                                    {`# Relampo YAML
test:
  name: "Imported Collection"
  version: "1.0"
  http_defaults:
    timeout: "10s"
  scenarios:
    - name: "Imported Scenario"
      steps: []`}
                                </div>
                            </div>

                            <div className="reference-section">
                                <div className="reference-title">✓ Includes</div>
                                <ul className="reference-list">
                                    <li>test metadata</li>
                                    <li>http_defaults + detected base_url</li>
                                    <li>steps (requests and groups)</li>
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
