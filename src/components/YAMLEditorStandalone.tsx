import { useState } from 'react';
import { Download, Upload, FileText, Play, Save, X } from 'lucide-react';
import { Button } from './ui/button';
import JSZip from 'jszip';
import html2canvas from 'html2canvas';

export function YAMLEditorStandalone() {
  const [yamlContent, setYamlContent] = useState(`# Relampo Test Configuration
# Performance testing made simple

name: "API Load Test Example"
version: "1.0"
description: "Example load test for REST API"

# Global variables
variables:
  base_url: "https://api.example.com"
  api_key: "\${API_KEY}"
  user_id: "12345"

# Data sources
data_sources:
  - name: users_csv
    type: csv
    path: "./data/users.csv"
    delimiter: ","
    
  - name: tokens_json
    type: json
    path: "./data/tokens.json"

# HTTP defaults applied to all requests
http_defaults:
  headers:
    Content-Type: "application/json"
    Accept: "application/json"
    User-Agent: "Relampo/1.0"
  timeout: 30s
  follow_redirects: true

# Test scenarios
scenarios:
  - name: "Ramp Up Load Test"
    load:
      type: ramp
      start_users: 10
      end_users: 100
      duration: 5m
      ramp_time: 2m
    
    steps:
      - type: request
        name: "Get User Profile"
        method: GET
        url: "\${base_url}/users/\${user_id}"
        headers:
          Authorization: "Bearer \${api_key}"
        extract:
          - name: username
            type: json_path
            expression: "$.data.username"
          - name: email
            type: json_path
            expression: "$.data.email"
        assertions:
          - type: status_code
            expected: 200
          - type: response_time
            operator: less_than
            value: 500ms
      
      - type: think_time
        duration: 2s
      
      - type: request
        name: "Update User Settings"
        method: PUT
        url: "\${base_url}/users/\${user_id}/settings"
        headers:
          Authorization: "Bearer \${api_key}"
        body: |
          {
            "theme": "dark",
            "notifications": true,
            "language": "en"
          }
        assertions:
          - type: status_code
            expected: 200
      
      - type: group
        name: "Dashboard Operations"
        steps:
          - type: request
            name: "Get Dashboard"
            method: GET
            url: "\${base_url}/dashboard"
            headers:
              Authorization: "Bearer \${api_key}"
          
          - type: request
            name: "Get Recent Activity"
            method: GET
            url: "\${base_url}/activity/recent"
            headers:
              Authorization: "Bearer \${api_key}"
      
      - type: if
        condition: "\${username} == 'admin'"
        then:
          - type: request
            name: "Get Admin Panel"
            method: GET
            url: "\${base_url}/admin"
            headers:
              Authorization: "Bearer \${api_key}"
        else:
          - type: request
            name: "Get User Panel"
            method: GET
            url: "\${base_url}/user"
            headers:
              Authorization: "Bearer \${api_key}"
      
      - type: loop
        iterations: 3
        steps:
          - type: request
            name: "Poll Status"
            method: GET
            url: "\${base_url}/status"
          - type: think_time
            duration: 1s
      
      - type: retry
        max_attempts: 3
        backoff: exponential
        steps:
          - type: request
            name: "Critical Operation"
            method: POST
            url: "\${base_url}/critical"
            headers:
              Authorization: "Bearer \${api_key}"
            body: |
              {
                "action": "process",
                "priority": "high"
              }

  - name: "Constant Load Test"
    load:
      type: constant
      users: 50
      duration: 10m
    
    steps:
      - type: request
        name: "Health Check"
        method: GET
        url: "\${base_url}/health"
        assertions:
          - type: status_code
            expected: 200
          - type: response_time
            operator: less_than
            value: 100ms

  - name: "Spike Test"
    load:
      type: spike
      base_users: 10
      spike_users: 200
      spike_duration: 30s
      total_duration: 5m
    
    steps:
      - type: request
        name: "API Endpoint"
        method: GET
        url: "\${base_url}/api/v1/data"
`);

  const [downloadMessage, setDownloadMessage] = useState<string | null>(null);
  const [fileName, setFileName] = useState('relampo-test.yaml');

  const handleUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.yaml,.yml';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result as string;
          setYamlContent(content);
          setFileName(file.name);
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleDownloadYAML = () => {
    const blob = new Blob([yamlContent], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPackage = async () => {
    setDownloadMessage('Preparing YAML Editor package...');
    
    try {
      const zip = new JSZip();
      
      // Add YAML file
      zip.file(fileName, yamlContent);
      
      // Add README
      const readme = `# Relampo YAML Editor Package

## Contents

- ${fileName} - Your Relampo test configuration
- README.md - This file
- getting-started.md - Quick start guide

## About Relampo

**Relampo** is a modern performance testing platform that makes load testing simple and reliable.

**Key Features:**
- Declarative YAML configuration
- Real traffic recording
- Auto-correlation
- Multiple load patterns (ramp, constant, spike)
- Rich assertion and extraction capabilities

## Running Your Test

\`\`\`bash
# Install Relampo
npm install -g relampo

# Run your test
relampo run ${fileName}

# View results
relampo report
\`\`\`

## Documentation

Visit https://relampo.dev/docs for complete documentation.

## Support

- GitHub: https://github.com/relampo
- Docs: https://relampo.dev
- Community: https://discord.gg/relampo
`;
      
      zip.file('README.md', readme);
      
      // Add getting started guide
      const gettingStarted = `# Getting Started with Relampo

## Installation

\`\`\`bash
npm install -g relampo
\`\`\`

## Your First Test

1. Edit your YAML configuration file
2. Define your test scenarios
3. Run the test: \`relampo run ${fileName}\`
4. View results: \`relampo report\`

## YAML Structure

### Variables
Define reusable variables:
\`\`\`yaml
variables:
  base_url: "https://api.example.com"
  api_key: "\${API_KEY}"
\`\`\`

### Scenarios
Create test scenarios with different load patterns:
\`\`\`yaml
scenarios:
  - name: "Load Test"
    load:
      type: ramp
      start_users: 10
      end_users: 100
      duration: 5m
\`\`\`

### Steps
Define the requests and operations:
- \`request\` - HTTP request
- \`think_time\` - Pause between operations
- \`group\` - Group related requests
- \`if\` - Conditional logic
- \`loop\` - Repeat operations
- \`retry\` - Retry failed operations

## Examples

Check the official documentation for more examples:
https://relampo.dev/docs/examples

## Next Steps

1. Customize your test configuration
2. Add assertions and extractions
3. Configure load patterns
4. Run and analyze results
`;
      
      zip.file('getting-started.md', gettingStarted);
      
      // Capture screenshot of the editor
      setDownloadMessage('Capturing editor screenshot...');
      const editorElement = document.getElementById('yaml-editor-capture');
      
      if (editorElement) {
        try {
          const canvas = await html2canvas(editorElement, {
            backgroundColor: '#0a0a0a',
            scale: 2,
            logging: false,
          });
          
          const blob = await new Promise<Blob>((resolve) => {
            canvas.toBlob((blob) => resolve(blob!), 'image/png');
          });
          
          zip.file('editor-screenshot.png', blob);
        } catch (error) {
          console.error('Error capturing screenshot:', error);
        }
      }
      
      // Generate ZIP
      setDownloadMessage('Creating ZIP file...');
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      
      // Download
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'relampo-yaml-editor-package.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setDownloadMessage('✓ Package downloaded successfully!');
      setTimeout(() => setDownloadMessage(null), 3000);
    } catch (error) {
      console.error('Download error:', error);
      setDownloadMessage('Error creating package. Please try again.');
      setTimeout(() => setDownloadMessage(null), 3000);
    }
  };

  const handleRun = () => {
    setDownloadMessage('Running test... (simulated)');
    setTimeout(() => {
      setDownloadMessage('✓ Test completed successfully!');
      setTimeout(() => setDownloadMessage(null), 3000);
    }, 2000);
  };

  const lineCount = yamlContent.split('\n').length;

  return (
    <div id="yaml-editor-capture" className="h-full w-full bg-[#0a0a0a] flex flex-col overflow-hidden">
      {/* Header with Relampo Logo */}
      <div className="bg-[#111111] border-b border-white/5 px-8 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Relampo Logo */}
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500 rounded-xl flex items-center justify-center shadow-xl shadow-yellow-400/40">
                <svg width="18" height="22" viewBox="0 0 18 22" fill="none">
                  <path d="M10.5 0L0 12.5H7.5L6 22L18 9H10.5V0Z" fill="white" className="drop-shadow-lg"/>
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-black text-zinc-100 tracking-tight">
                  RELAMPO
                </h1>
                <p className="text-xs text-zinc-500">YAML Editor</p>
              </div>
            </div>
            
            <div className="h-8 w-px bg-white/10 mx-2" />
            
            <div>
              <p className="text-sm text-zinc-400">
                <FileText className="w-4 h-4 inline mr-1.5" />
                {fileName}
              </p>
              <p className="text-xs text-zinc-600 mt-0.5">
                {lineCount} lines • Performance testing made simple
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300"
              onClick={handleUpload}
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload YAML
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300"
              onClick={handleDownloadYAML}
            >
              <Save className="w-4 h-4 mr-2" />
              Save YAML
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-green-400/20 bg-green-400/5 hover:bg-green-400/10 text-green-400"
              onClick={handleRun}
            >
              <Play className="w-4 h-4 mr-2" />
              Run Test
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-yellow-400/20 bg-yellow-400/5 hover:bg-yellow-400/10 text-yellow-400"
              onClick={handleDownloadPackage}
            >
              <Download className="w-4 h-4 mr-2" />
              Download Package
            </Button>
          </div>
        </div>
        
        {downloadMessage && (
          <div className="mt-3 text-sm text-yellow-400 flex items-center gap-2">
            <div className="w-1 h-4 bg-yellow-400 rounded-full animate-pulse" />
            {downloadMessage}
          </div>
        )}
      </div>

      {/* Editor Area */}
      <div className="flex-1 overflow-hidden min-h-0 flex">
        {/* Line Numbers */}
        <div className="bg-[#0a0a0a] border-r border-white/5 px-4 py-6 overflow-y-auto flex-shrink-0 select-none">
          <div className="font-mono text-sm text-zinc-600 text-right space-y-[4px]">
            {Array.from({ length: lineCount }, (_, i) => (
              <div key={i + 1} className="leading-6">
                {i + 1}
              </div>
            ))}
          </div>
        </div>

        {/* Code Editor */}
        <div className="flex-1 overflow-auto bg-[#0a0a0a]">
          <textarea
            value={yamlContent}
            onChange={(e) => setYamlContent(e.target.value)}
            className="w-full h-full px-6 py-6 bg-transparent text-zinc-300 font-mono text-sm leading-6 resize-none outline-none"
            style={{
              caretColor: '#facc15',
              tabSize: 2,
            }}
            spellCheck={false}
          />
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-[#111111] border-t border-white/5 px-6 py-2 flex-shrink-0">
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <div className="flex items-center gap-4">
            <span>YAML</span>
            <span>UTF-8</span>
            <span>LF</span>
          </div>
          <div className="flex items-center gap-4">
            <span>{lineCount} lines</span>
            <span>{yamlContent.length} characters</span>
            <span className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-green-400 rounded-full" />
              Ready
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}