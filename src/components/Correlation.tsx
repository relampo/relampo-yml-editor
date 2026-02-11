import { useState, useEffect } from 'react';
import { 
  FileWarning, 
  Sparkles, 
  Check, 
  Loader2, 
  RefreshCw, 
  Filter,
  ChevronRight,
  X,
  AlertCircle,
  CheckCircle2,
  Circle,
  Eye,
  Play,
  Square
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useYAML } from '../contexts/YAMLContext';
import { analyzeYAMLForCorrelations, applyCorrelations } from '../utils/correlationAnalyzer';
import type { CorrelationCandidate } from '../types/correlation';

// Types
type CorrelationState = 'no-recording' | 'ready' | 'analyzing' | 'results' | 'yaml-changed';

type AnalysisStep = {
  label: string;
  status: 'pending' | 'loading' | 'complete';
};

export function Correlation() {
  const { yamlContent, setYamlContent } = useYAML();
  const [state, setState] = useState<CorrelationState>('ready');
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set());
  const [selectedCandidate, setSelectedCandidate] = useState<CorrelationCandidate | null>(null);
  const [showLowConfidence, setShowLowConfidence] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [candidates, setCandidates] = useState<CorrelationCandidate[]>([]);

  // Verificar si hay recording al montar o cuando cambia el YAML
  useEffect(() => {
    if (!yamlContent || yamlContent.trim() === '') {
      setState('no-recording');
    } else if (yamlContent.includes('steps:') && yamlContent.includes('response:')) {
      // Solo cambiar a "ready" si no hay resultados previos
      if (state !== 'results') {
        setState('ready');
      }
    } else {
      setState('no-recording');
    }
  }, [yamlContent]); // Removido 'state' de las dependencias

  // Simular progreso del análisis
  useEffect(() => {
    if (state === 'analyzing' && isAnalyzing) {
      const interval = setInterval(() => {
        setAnalysisProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setState('results');
            setIsAnalyzing(false);
            return 100;
          }
          return prev + 2;
        });
      }, 100);

      return () => clearInterval(interval);
    }
  }, [state, isAnalyzing]);

  // Función para iniciar análisis
  const startAnalysis = () => {
    setAnalysisProgress(0);
    setIsAnalyzing(true);
    setState('analyzing');
    setCandidates([]); // Limpiar candidatos anteriores
    
    // Resetear steps
    setAnalysisSteps([
      { label: 'Analizando patrones sintácticos (shape analysis)', status: 'loading' },
      { label: 'Analizando nombres y contexto (semantic)', status: 'pending' },
      { label: 'Analizando flujo entre steps', status: 'pending' },
      { label: 'Análisis estadístico', status: 'pending' },
      { label: 'Reglas específicas por tecnología', status: 'pending' },
      { label: 'Detección de encoding/encryption', status: 'pending' },
      { label: 'Clasificación con IA', status: 'pending' },
    ]);

    // Simular progreso de steps
    setTimeout(() => setAnalysisSteps(prev => prev.map((s, i) => i === 0 ? {...s, status: 'complete'} : i === 1 ? {...s, status: 'loading'} : s)), 1000);
    setTimeout(() => setAnalysisSteps(prev => prev.map((s, i) => i <= 1 ? {...s, status: 'complete'} : i === 2 ? {...s, status: 'loading'} : s)), 2000);
    setTimeout(() => setAnalysisSteps(prev => prev.map((s, i) => i <= 2 ? {...s, status: 'complete'} : i === 3 ? {...s, status: 'loading'} : s)), 3000);
    setTimeout(() => setAnalysisSteps(prev => prev.map((s, i) => i <= 3 ? {...s, status: 'complete'} : i === 4 ? {...s, status: 'loading'} : s)), 4000);
    setTimeout(() => setAnalysisSteps(prev => prev.map((s, i) => i <= 4 ? {...s, status: 'complete'} : i === 5 ? {...s, status: 'loading'} : s)), 4500);
    setTimeout(() => setAnalysisSteps(prev => prev.map((s, i) => i <= 5 ? {...s, status: 'complete'} : i === 6 ? {...s, status: 'loading'} : s)), 5000);
    setTimeout(() => {
      setAnalysisSteps(prev => prev.map((s, i) => ({...s, status: 'complete'})));
      
      // Ejecutar análisis real del YAML aquí, cuando todo esté completo
      console.log('🚀 Running real YAML analysis...');
      const analysisResult = analyzeYAMLForCorrelations(yamlContent);
      console.log('📊 Analysis complete, candidates found:', analysisResult.length);
      setCandidates(analysisResult);
    }, 5500);
  };

  // Función para detener análisis
  const stopAnalysis = () => {
    setIsAnalyzing(false);
    setAnalysisProgress(0);
    setState('ready');
  };

  // Mock analysis steps
  const [analysisSteps, setAnalysisSteps] = useState<AnalysisStep[]>([
    { label: 'Analizando patrones sintácticos (shape analysis)', status: 'pending' },
    { label: 'Analizando nombres y contexto (semantic)', status: 'pending' },
    { label: 'Analizando flujo entre steps', status: 'pending' },
    { label: 'Análisis estadístico', status: 'pending' },
    { label: 'Reglas específicas por tecnología', status: 'pending' },
    { label: 'Detección de encoding/encryption', status: 'pending' },
    { label: 'Clasificación con IA', status: 'pending' },
  ]);

  const filteredCandidates = candidates.filter(c => {
    if (!showLowConfidence && c.confidence < 85) return false;
    if (filterType !== 'all' && c.type !== filterType) return false;
    return true;
  });

  const toggleCandidate = (id: string) => {
    const newSet = new Set(selectedCandidates);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedCandidates(newSet);
  };

  const toggleAll = () => {
    if (selectedCandidates.size === filteredCandidates.length) {
      setSelectedCandidates(new Set());
    } else {
      setSelectedCandidates(new Set(filteredCandidates.map(c => c.id)));
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 85) return 'text-green-400';
    if (confidence >= 70) return 'text-yellow-400';
    return 'text-orange-400';
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 85) return <CheckCircle2 className="w-4 h-4 text-green-400" />;
    if (confidence >= 70) return <Circle className="w-4 h-4 text-yellow-400" />;
    return <Circle className="w-4 h-4 text-orange-400" />;
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'session_id': 'Session ID',
      'auth_token': 'Auth Token',
      'csrf_token': 'CSRF Token',
      'cursor': 'Cursor',
      'user_id': 'User ID',
      'api_key': 'API Key'
    };
    return labels[type] || type;
  };

  // Función para renderizar diff con colores
  const renderColoredDiff = (diffText: string) => {
    const lines = diffText.split('\n');
    return lines.map((line, idx) => {
      // Colorear líneas según contenido
      if (line.startsWith('+ ')) {
        // Líneas de adición (verde)
        return (
          <div key={idx} className="text-green-400">
            {line}
          </div>
        );
      } else if (line.startsWith('- ')) {
        // Líneas de remoción (rojo)
        return (
          <div key={idx} className="text-red-400">
            {line}
          </div>
        );
      } else if (line.includes('extractors:') || line.includes('Agregar extractor')) {
        // Keywords de extractor (amarillo)
        return (
          <div key={idx} className="text-yellow-400 font-semibold">
            {line}
          </div>
        );
      } else if (line.includes('Reemplazar') || line.includes('con ${')) {
        // Keywords de reemplazo (cyan)
        const parts = line.split(/(\$\{[^}]+\})/g);
        return (
          <div key={idx} className="text-cyan-400">
            {parts.map((part, i) => {
              if (part.match(/\$\{[^}]+\}/)) {
                return (
                  <span key={i} className="text-blue-400 font-semibold">
                    {part}
                  </span>
                );
              }
              return part;
            })}
          </div>
        );
      } else if (line.trim().startsWith('•')) {
        // Listado de usos (zinc)
        return (
          <div key={idx} className="text-zinc-400">
            {line}
          </div>
        );
      } else {
        // Texto normal
        return (
          <div key={idx} className="text-zinc-500">
            {line}
          </div>
        );
      }
    });
  };

  // Render functions for each state
  const renderNoRecording = () => (
    <div className="h-full flex items-center justify-center bg-[#0a0a0a]">
      <div className="text-center max-w-lg px-4">
        <FileWarning className="w-16 h-16 text-zinc-600 mx-auto mb-6" />
        <h2 className="text-2xl font-semibold text-zinc-200 mb-3">
          No se encontró información de grabación en este YAML
        </h2>
        <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
          Para poder sugerir correlaciones automáticas, el YAML debe incluir la sección de tráfico grabado (requests y responses).
        </p>
        <ul className="text-xs text-zinc-500 text-left max-w-md mx-auto mb-8 space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-yellow-400 mt-0.5">•</span>
            <span>Verifica que este sea un YAML generado desde el recorder</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-yellow-400 mt-0.5">•</span>
            <span>O que incluya una sección <code className="font-mono bg-zinc-900 px-1 rounded">recording:</code> (o equivalente)</span>
          </li>
        </ul>
        <Button
          className="bg-yellow-400 hover:bg-yellow-500 text-black font-medium"
        >
          Volver al editor YAML
        </Button>
      </div>
    </div>
  );

  const renderReady = () => (
    <div className="h-full flex items-center justify-center bg-[#0a0a0a]">
      <div className="max-w-xl w-full mx-4">
        <div className="bg-[#111111] border border-white/10 rounded-lg p-6 mb-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 bg-yellow-400/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-6 h-6 text-yellow-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-zinc-100 mb-2">
                YAML actual: script + recording detectado
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-zinc-500">Steps en script:</span>
                  <span className="text-zinc-200 ml-2 font-medium">12</span>
                </div>
                <div>
                  <span className="text-zinc-500">Interacciones grabadas:</span>
                  <span className="text-zinc-200 ml-2 font-medium">47</span>
                </div>
              </div>
            </div>
          </div>

          <Button
            onClick={startAnalysis}
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-medium py-6 text-base"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Analizar correlaciones sobre este YAML
          </Button>
        </div>

        <div className="text-xs text-zinc-500 leading-relaxed">
          Analizaremos el script y el tráfico grabado para detectar valores dinámicos (session_id, tokens, IDs, cursores…) y proponer correlaciones automatizadas.
        </div>
      </div>
    </div>
  );

  const renderAnalyzing = () => (
    <div className="h-full flex items-center justify-center bg-[#0a0a0a]">
      <div className="max-w-xl w-full mx-4">
        <div className="bg-[#111111] border border-white/10 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <Loader2 className="w-6 h-6 text-yellow-400 animate-spin" />
            <h3 className="text-lg font-semibold text-zinc-100">
              Analizando correlaciones sobre el YAML actual…
            </h3>
          </div>

          {/* Progress bar */}
          <div className="mb-6">
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 transition-all duration-500"
                style={{ width: `${analysisProgress}%` }}
              />
            </div>
            <div className="text-xs text-zinc-500 mt-2 text-right">{analysisProgress}%</div>
          </div>

          {/* Analysis steps */}
          <div className="space-y-3">
            {analysisSteps.map((step, idx) => (
              <div key={idx} className="flex items-center gap-3">
                {step.status === 'complete' && (
                  <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                )}
                {step.status === 'loading' && (
                  <Loader2 className="w-4 h-4 text-yellow-400 animate-spin flex-shrink-0" />
                )}
                {step.status === 'pending' && (
                  <Circle className="w-4 h-4 text-zinc-600 flex-shrink-0" />
                )}
                <span className={`text-sm ${
                  step.status === 'complete' ? 'text-zinc-400' :
                  step.status === 'loading' ? 'text-zinc-200' :
                  'text-zinc-600'
                }`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderResults = () => (
    <div className="h-full flex flex-col bg-[#0a0a0a]">
      {/* Header */}
      <div className="border-b border-white/5 bg-[#111111] p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm text-zinc-400 mb-1">YAML actual: script + recording</div>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-green-400 flex items-center gap-1.5">
                <Check className="w-4 h-4" />
                Encontrados {filteredCandidates.length} candidatos de correlación
              </span>
              <span className="text-zinc-500">Steps: 12</span>
              <span className="text-zinc-500">Interacciones: 47</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setState('analyzing')}
              className="border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Re-analizar YAML
            </Button>
          </div>
        </div>
      </div>

      {/* Main content: Table + Details */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Candidates table */}
        <div className="flex-1 flex flex-col border-r border-white/5 overflow-hidden">
          {/* Filters */}
          <div className="p-4 border-b border-white/5 bg-[#0a0a0a] space-y-3">
            <div className="flex items-center gap-3">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-1.5 bg-[#111111] border border-white/10 rounded text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-yellow-400"
              >
                <option value="all">Todos los tipos</option>
                <option value="session_id">Session ID</option>
                <option value="auth_token">Auth Token</option>
                <option value="csrf_token">CSRF Token</option>
                <option value="cursor">Cursor</option>
                <option value="user_id">User ID</option>
                <option value="api_key">API Key</option>
              </select>

              <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showLowConfidence}
                  onChange={(e) => setShowLowConfidence(e.target.checked)}
                  className="rounded border-white/10"
                />
                Mostrar baja confianza
              </label>
            </div>

            {selectedCandidates.size > 0 && (
              <Button
                onClick={() => setShowApplyModal(true)}
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-medium"
              >
                Aplicar seleccionados ({selectedCandidates.size})
              </Button>
            )}
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[#111111] border-b border-white/10">
                <tr className="text-zinc-400">
                  <th className="p-3 text-left w-12">
                    <input
                      type="checkbox"
                      checked={selectedCandidates.size === filteredCandidates.length && filteredCandidates.length > 0}
                      onChange={toggleAll}
                      className="rounded border-white/10"
                    />
                  </th>
                  <th className="p-3 text-left">Variable</th>
                  <th className="p-3 text-left">Valor ejemplo</th>
                  <th className="p-3 text-left">Fuente</th>
                  <th className="p-3 text-left">Usado en</th>
                  <th className="p-3 text-left">Confianza</th>
                </tr>
              </thead>
              <tbody>
                {filteredCandidates.map((candidate) => (
                  <tr
                    key={candidate.id}
                    onClick={() => setSelectedCandidate(candidate)}
                    className={`border-b border-white/5 cursor-pointer transition-colors ${
                      selectedCandidate?.id === candidate.id
                        ? 'bg-yellow-400/10'
                        : 'hover:bg-white/5'
                    }`}
                  >
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedCandidates.has(candidate.id)}
                        onChange={() => toggleCandidate(candidate.id)}
                        className="rounded border-white/10"
                      />
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-zinc-200">{candidate.variable}</span>
                        <span className="px-2 py-0.5 bg-zinc-800 rounded text-xs text-zinc-400">
                          {getTypeLabel(candidate.type)}
                        </span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div 
                        className="relative group"
                        title={candidate.fullValue}
                      >
                        <code className="text-xs text-zinc-400 font-mono cursor-help">
                          {candidate.valueExample}
                        </code>
                        {/* Tooltip on hover */}
                        <div className="absolute left-0 top-full mt-1 hidden group-hover:block z-50 bg-black border border-white/20 rounded px-2 py-1 text-xs font-mono text-zinc-300 max-w-md break-all shadow-lg">
                          {candidate.fullValue}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-zinc-400">
                      <div className="text-xs">
                        {candidate.source}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="space-y-1">
                        {candidate.usedIn.map((usage, idx) => (
                          <div key={idx} className="text-xs text-zinc-500">{usage}</div>
                        ))}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {getConfidenceIcon(candidate.confidence)}
                        <span className={`font-medium ${getConfidenceColor(candidate.confidence)}`}>
                          {candidate.confidence}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Detail panel */}
        {selectedCandidate && (
          <div className="w-[480px] bg-[#0a0a0a] overflow-auto">
            <div className="p-4 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#111111]">
              <div className="flex items-center gap-2">
                <span className="text-lg font-mono font-semibold text-zinc-100">
                  {selectedCandidate.variable}
                </span>
                <span className="px-2 py-0.5 bg-zinc-800 rounded text-xs text-zinc-400">
                  {getTypeLabel(selectedCandidate.type)}
                </span>
              </div>
              <button
                onClick={() => setSelectedCandidate(null)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-6">
              {/* Explanation */}
              <div>
                <h4 className="text-sm font-semibold text-zinc-300 mb-2">Explicación</h4>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  {selectedCandidate.explanation}
                </p>
              </div>

              {/* Technical details */}
              <div>
                <h4 className="text-sm font-semibold text-zinc-300 mb-3">Detalles técnicos</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Tipo detectado:</span>
                    <span className="text-zinc-300">{getTypeLabel(selectedCandidate.type)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Formato:</span>
                    <span className="text-zinc-300 font-mono text-xs">{selectedCandidate.technicalDetails.format}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Entropía:</span>
                    <span className="text-zinc-300">{selectedCandidate.technicalDetails.entropy}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Veces usado:</span>
                    <span className="text-zinc-300">{selectedCandidate.technicalDetails.timesUsed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Encodings detectados:</span>
                    <span className="text-zinc-300">{selectedCandidate.technicalDetails.encodings}</span>
                  </div>
                </div>
              </div>

              {/* Extractor */}
              <div>
                <h4 className="text-sm font-semibold text-zinc-300 mb-3">Extractor sugerido</h4>
                <div className="bg-[#111111] border border-white/10 rounded p-3 space-y-2 text-sm font-mono">
                  <div className="flex">
                    <span className="text-zinc-500 w-32">from_step:</span>
                    <span className="text-yellow-400">{selectedCandidate.extractor.fromStep}</span>
                  </div>
                  <div className="flex">
                    <span className="text-zinc-500 w-32">from_location:</span>
                    <span className="text-zinc-300">{selectedCandidate.extractor.fromLocation}</span>
                  </div>
                  <div className="flex">
                    <span className="text-zinc-500 w-32">path:</span>
                    <span className="text-green-400">{selectedCandidate.extractor.path}</span>
                  </div>
                  <div className="flex">
                    <span className="text-zinc-500 w-32">variable:</span>
                    <span className="text-blue-400">{selectedCandidate.extractor.variable}</span>
                  </div>
                </div>
              </div>

              {/* Diff */}
              <div>
                <h4 className="text-sm font-semibold text-zinc-300 mb-3">Cambios en el YAML</h4>
                <div className="bg-[#111111] border border-white/10 rounded p-3 font-mono text-xs whitespace-pre-wrap text-zinc-300">
                  {renderColoredDiff(selectedCandidate.diff)}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-white/10">
                <Button
                  variant="outline"
                  className="flex-1 border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300"
                >
                  Rechazar
                </Button>
                <Button
                  className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-black font-medium"
                >
                  Aplicar al YAML
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Apply modal */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#111111] border border-white/10 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-zinc-100 mb-4">
              Aplicar {selectedCandidates.size} correlaciones al YAML
            </h3>
            
            <div className="mb-6 space-y-2">
              {filteredCandidates
                .filter(c => selectedCandidates.has(c.id))
                .map(c => (
                  <div key={c.id} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-400" />
                    <span className="font-mono text-zinc-300">{c.variable}</span>
                    <span className="text-zinc-600">→</span>
                    <span className="text-zinc-500 text-xs">{getTypeLabel(c.type)}</span>
                  </div>
                ))}
            </div>

            <p className="text-sm text-zinc-400 mb-6">
              Se añadirán extractores y se reemplazarán valores literales en el script YAML.
            </p>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowApplyModal(false)}
                className="flex-1 border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  setShowApplyModal(false);
                  // Here would trigger the actual apply
                  const newYAML = applyCorrelations(yamlContent, filteredCandidates.filter(c => selectedCandidates.has(c.id)));
                  setYamlContent(newYAML);
                }}
                className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-black font-medium"
              >
                Aplicar cambios
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderYAMLChanged = () => (
    <div className="h-full bg-[#0a0a0a] p-4">
      <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-orange-400 mb-1">
            El YAML ha cambiado significativamente
          </h4>
          <p className="text-sm text-zinc-400 mb-3">
            El YAML ha cambiado significativamente desde el último análisis. Vuelve a ejecutar el análisis antes de aplicar correlaciones.
          </p>
          <Button
            onClick={() => setState('analyzing')}
            className="bg-yellow-400 hover:bg-yellow-500 text-black font-medium"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Re-analizar YAML
          </Button>
        </div>
      </div>
    </div>
  );

  // Main render
  return (
    <div className="h-full bg-[#0a0a0a]">
      {state === 'no-recording' && renderNoRecording()}
      {state === 'ready' && renderReady()}
      {state === 'analyzing' && renderAnalyzing()}
      {state === 'results' && renderResults()}
      {state === 'yaml-changed' && renderYAMLChanged()}
    </div>
  );
}