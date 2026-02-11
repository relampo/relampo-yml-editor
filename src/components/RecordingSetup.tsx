import { useState } from 'react';
import { RecordingStatus } from './Recorder';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { 
  Radio, 
  Globe, 
  Shield, 
  Filter, 
  Plus,
  X,
  Info
} from 'lucide-react';

interface RecordingSetupProps {
  status: RecordingStatus;
}

export function RecordingSetup({ status }: RecordingSetupProps) {
  const [port, setPort] = useState('8888');
  const [baseUrl, setBaseUrl] = useState('https://api.example.com');
  const [scenarioName, setScenarioName] = useState('Recorded Scenario');
  const [yamlFileName, setYamlFileName] = useState('recording.yaml');
  
  // Filtros estilo JMeter: include + exclude patterns
  const [includePatterns, setIncludePatterns] = useState<string[]>(['.*']);
  const [excludePatterns, setExcludePatterns] = useState<string[]>([
    '.*\\.(css|js|png|jpg|jpeg|gif|ico|woff|woff2)$'
  ]);

  const disabled = status === 'recording';

  return (
    <div className="p-4 space-y-4">
      {/* HTTP Proxy Settings */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide flex items-center gap-2">
          <Radio className="w-3.5 h-3.5" />
          HTTP Proxy
        </h3>
        
        <div className="space-y-3">
          <div className="space-y-2">
            <label className="text-xs text-zinc-400">Listening Port</label>
            <Input
              type="number"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              disabled={disabled}
              className="bg-[#0a0a0a] border-white/10"
            />
          </div>

          <div className="flex items-start gap-2 p-2 bg-zinc-900/50 rounded border border-zinc-800">
            <Info className="w-4 h-4 text-zinc-500 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-zinc-500">
              <p className="font-medium text-zinc-400 mb-1">
                Proxy Status: {status === 'recording' ? 'Listening' : 'Not started'}
              </p>
              {status === 'recording' && (
                <p>Configure your browser to use proxy: <span className="text-yellow-400 font-mono">127.0.0.1:{port}</span></p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Target Application & Scenario */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide flex items-center gap-2">
          <Globe className="w-3.5 h-3.5" />
          Target & Scenario
        </h3>

        <div className="space-y-3">
          <div className="space-y-2">
            <label className="text-xs text-zinc-400">Base URL</label>
            <Input
              type="url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              disabled={disabled}
              placeholder="https://api.example.com"
              className="bg-[#0a0a0a] border-white/10"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs text-zinc-400">Scenario Name</label>
            <Input
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              disabled={disabled}
              placeholder="Recorded Scenario"
              className="bg-[#0a0a0a] border-white/10"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs text-zinc-400">YAML File Name</label>
            <Input
              value={yamlFileName}
              onChange={(e) => setYamlFileName(e.target.value)}
              disabled={disabled}
              placeholder="recording.yaml"
              className="bg-[#0a0a0a] border-white/10"
            />
          </div>
        </div>
      </div>

      {/* Request Filters (JMeter style) */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide flex items-center gap-2">
          <Filter className="w-3.5 h-3.5" />
          Request Filters
        </h3>

        <div className="space-y-4">
          {/* Include Patterns */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-300">Include Patterns (regex)</label>
            <p className="text-xs text-zinc-500 mb-2">Only capture URLs matching these patterns</p>
            {includePatterns.map((pattern, idx) => (
              <div key={`include-${idx}`} className="flex items-center gap-2">
                <Input
                  value={pattern}
                  onChange={(e) => {
                    const newPatterns = [...includePatterns];
                    newPatterns[idx] = e.target.value;
                    setIncludePatterns(newPatterns);
                  }}
                  disabled={disabled}
                  placeholder=".*"
                  className="bg-[#0a0a0a] border-white/10 text-xs flex-1 font-mono"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={disabled || includePatterns.length <= 1}
                  className="text-zinc-400 hover:text-red-400"
                  onClick={() => setIncludePatterns(includePatterns.filter((_, i) => i !== idx))}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
            
            <Button
              size="sm"
              variant="outline"
              disabled={disabled}
              className="w-full border-white/10 bg-white/5 hover:bg-white/10 text-zinc-400"
              onClick={() => setIncludePatterns([...includePatterns, ''])}
            >
              <Plus className="w-3 h-3 mr-2" />
              Add Include Pattern
            </Button>
          </div>

          {/* Exclude Patterns */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-300">Exclude Patterns (regex)</label>
            <p className="text-xs text-zinc-500 mb-2">Skip URLs matching these patterns</p>
            {excludePatterns.map((pattern, idx) => (
              <div key={`exclude-${idx}`} className="flex items-center gap-2">
                <Input
                  value={pattern}
                  onChange={(e) => {
                    const newPatterns = [...excludePatterns];
                    newPatterns[idx] = e.target.value;
                    setExcludePatterns(newPatterns);
                  }}
                  disabled={disabled}
                  placeholder=".*\\.(css|js|png)$"
                  className="bg-[#0a0a0a] border-white/10 text-xs flex-1 font-mono"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={disabled}
                  className="text-zinc-400 hover:text-red-400"
                  onClick={() => setExcludePatterns(excludePatterns.filter((_, i) => i !== idx))}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
            
            <Button
              size="sm"
              variant="outline"
              disabled={disabled}
              className="w-full border-white/10 bg-white/5 hover:bg-white/10 text-zinc-400"
              onClick={() => setExcludePatterns([...excludePatterns, ''])}
            >
              <Plus className="w-3 h-3 mr-2" />
              Add Exclude Pattern
            </Button>
          </div>
        </div>
      </div>

      {/* TLS Certificate */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide flex items-center gap-2">
          <Shield className="w-3.5 h-3.5" />
          TLS Certificate
        </h3>

        <div className="p-3 bg-white/5 rounded-lg border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400">Root certificate:</span>
            <span className="text-xs font-medium text-zinc-500">Not installed</span>
          </div>

          <Button
            size="sm"
            variant="outline"
            className="w-full border-yellow-400/20 bg-yellow-400/5 hover:bg-yellow-400/10 text-yellow-400"
          >
            <Shield className="w-3 h-3 mr-2" />
            Download & Install Certificate
          </Button>

          <p className="text-xs text-zinc-500">
            Required for recording HTTPS traffic. Install the certificate in your system's trusted root store.
          </p>
        </div>
      </div>
    </div>
  );
}
