import { useState, useRef } from 'react';
import MonacoEditor, { Monaco } from '@monaco-editor/react';
import { Play, CheckCircle2, AlertCircle } from 'lucide-react';
import type { editor } from 'monaco-editor';

interface SparkCodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
}

interface ValidationResult {
  isValid: boolean;
  message: string;
  line?: number;
}

/**
 * 🔥 Spark Code Editor
 * - Monaco Editor (VS Code)
 * - Full syntax highlighting
 * - Editable
 * - Manual syntax validation using Monaco diagnostics
 */
export function SparkCodeEditor({
  value,
  onChange,
  minHeight = '250px',
}: SparkCodeEditorProps) {
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);

  // Handle editor mount
  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
  };

  // Validate JavaScript syntax using Monaco markers
  const validateSyntax = () => {
    setIsValidating(true);
    
    setTimeout(() => {
      if (!value.trim()) {
        setValidationResult({
          isValid: false,
          message: 'Empty script - add your JavaScript code',
        });
        setIsValidating(false);
        return;
      }

      // Get Monaco markers (errors/warnings)
      if (monacoRef.current && editorRef.current) {
        const model = editorRef.current.getModel();
        if (model) {
          const markers = monacoRef.current.editor.getModelMarkers({ resource: model.uri });
          const errors = markers.filter(m => m.severity === monacoRef.current!.MarkerSeverity.Error);
          
          if (errors.length > 0) {
            const firstError = errors[0];
            setValidationResult({
              isValid: false,
              message: firstError.message,
              line: firstError.startLineNumber,
            });
            setIsValidating(false);
            return;
          }
        }
      }

      // Fallback: also try Function constructor for runtime errors
      try {
        new Function('vars', 'response', 'console', value);
        setValidationResult({
          isValid: true,
          message: 'Syntax OK - No errors found!',
        });
      } catch (error: any) {
        const match = error.message.match(/line (\d+)/i) || 
                      error.message.match(/position (\d+)/i);
        
        setValidationResult({
          isValid: false,
          message: error.message,
          line: match ? parseInt(match[1]) : undefined,
        });
      }
      
      setIsValidating(false);
    }, 200);
  };

  const lineCount = (value || '').split('\n').length;

  const handleEditorChange = (newValue: string | undefined) => {
    onChange(newValue || '');
    // Clear validation result when code changes
    setValidationResult(null);
  };

  return (
    <div className="relative">
      {/* Editor Container */}
      <div className="rounded-lg border border-white/10 overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-3 py-2 bg-[#1e1e1e] border-b border-white/10">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <span className="text-zinc-400">{lineCount} lines</span>
          </div>
          
          {/* Validate Button */}
          <button
            onClick={validateSyntax}
            disabled={isValidating}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
              isValidating 
                ? 'bg-zinc-700 text-zinc-400 cursor-wait'
                : 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30'
            }`}
          >
            <Play className="w-3 h-3" />
            {isValidating ? 'Checking...' : 'Check Syntax'}
          </button>
        </div>

        {/* Monaco Editor */}
        <MonacoEditor
          height={minHeight}
          defaultLanguage="javascript"
          value={value}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on',
            padding: { top: 12 },
            scrollbar: {
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8,
            },
          }}
        />
      </div>

      {/* Validation Result */}
      {validationResult && (
        <div className={`mt-2 px-3 py-2 rounded-lg text-xs flex items-center gap-2 ${
          validationResult.isValid 
            ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
            : 'bg-red-500/10 text-red-400 border border-red-500/20'
        }`}>
          {validationResult.isValid ? (
            <>
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{validationResult.message}</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{validationResult.message}</span>
              {validationResult.line && (
                <span className="text-red-300 font-mono">Line {validationResult.line}</span>
              )}
            </>
          )}
        </div>
      )}

      {/* Quick Reference */}
      <div className="mt-3 p-3 bg-zinc-900/50 rounded-lg border border-white/5">
        <div className="text-xs text-zinc-400 mb-2 font-semibold">Quick Reference:</div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <code className="text-cyan-400">vars</code>
            <span className="text-zinc-400"> - Read/write variables</span>
          </div>
          <div>
            <code className="text-cyan-400">response</code>
            <span className="text-zinc-400"> - Response object (after)</span>
          </div>
          <div>
            <code className="text-pink-400">vars.myVar</code>
            <span className="text-zinc-400"> - Access variable</span>
          </div>
          <div>
            <code className="text-pink-400">response.status</code>
            <span className="text-zinc-400"> - HTTP status code</span>
          </div>
          <div>
            <code className="text-pink-400">response.body</code>
            <span className="text-zinc-400"> - Response body</span>
          </div>
          <div>
            <code className="text-yellow-300">console.log()</code>
            <span className="text-zinc-400"> - Print to console</span>
          </div>
        </div>
      </div>
    </div>
  );
}
