import type { CorrelationCandidate } from '../types/correlation';

// Función para detectar si un valor es dinámico
function isDynamicValue(value: string): boolean {
  // JWT tokens
  if (/^eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/.test(value)) return true;
  
  // Session IDs (hex)
  if (/^[a-f0-9]{16,}$/i.test(value)) return true;
  
  // Account keys con prefijos
  if (/^(acc|usr|res|req|tok|sid|ord|reg)_[a-z0-9]+$/i.test(value)) return true;
  
  // Base64
  if (/^[A-Za-z0-9+/]{16,}={0,2}$/.test(value) && value.length % 4 === 0) return true;
  
  // UUIDs
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) return true;
  
  // Region IDs (us-east-1, etc)
  if (/^[a-z]+-[a-z]+-\d+$/.test(value)) return true;
  
  // Alfanuméricos con alta entropía (mínimo 8 caracteres)
  if (value.length >= 8 && /^[a-zA-Z0-9_-]+$/.test(value) && calculateEntropy(value) > 3.5) {
    return true;
  }
  
  return false;
}

// Función para calcular entropía
function calculateEntropy(value: string): number {
  const freq = new Map<string, number>();
  for (const char of value) {
    freq.set(char, (freq.get(char) || 0) + 1);
  }
  
  let entropy = 0;
  for (const count of freq.values()) {
    const p = count / value.length;
    entropy -= p * Math.log2(p);
  }
  
  return entropy;
}

// Función para clasificar el tipo de valor
function classifyValueType(value: string, key: string): CorrelationCandidate['type'] {
  const lowerKey = key.toLowerCase();
  
  if (/token|jwt|bearer/i.test(key)) return 'auth_token';
  if (/session|sid/i.test(key)) return 'session_id';
  if (/csrf|xsrf/i.test(key)) return 'csrf_token';
  if (/cursor|after|before|next|prev/i.test(key)) return 'cursor';
  if (/user.*id|userid/i.test(key)) return 'user_id';
  if (/account.*key|accountkey/i.test(key)) return 'api_key';
  if (/region.*id|regionid/i.test(key)) return 'api_key';
  if (/order.*id|orderid/i.test(key)) return 'uuid';
  
  // Por patrón del valor
  if (/^eyJ/.test(value)) return 'auth_token';
  if (/^acc_/.test(value)) return 'api_key';
  if (/^ord_/.test(value)) return 'uuid';
  if (/^reg_/.test(value)) return 'api_key';
  if (/^[a-f0-9]{16,}$/i.test(value)) return 'session_id';
  if (/^[a-z]+-[a-z]+-\d+$/.test(value)) return 'api_key';
  
  return 'dynamic_value';
}

// Helper para parsear objetos YAML
function parseSimpleYAMLObject(yamlStr: string): any {
  const result: any = {};
  const lines = yamlStr.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));
  
  let currentPath: string[] = [];
  let currentObj = result;
  let stack: any[] = [result];
  let lastIndent = -1;
  
  for (const line of lines) {
    const indent = line.search(/\S/);
    const content = line.trim();
    
    // Si bajamos de nivel, actualizar stack
    if (indent < lastIndent && indent >= 0) {
      const levelsUp = Math.floor((lastIndent - indent) / 2);
      for (let i = 0; i < levelsUp && stack.length > 1; i++) {
        stack.pop();
        currentPath.pop();
      }
      currentObj = stack[stack.length - 1];
    }
    
    if (content.includes(':')) {
      const colonIndex = content.indexOf(':');
      const key = content.substring(0, colonIndex).trim();
      const value = content.substring(colonIndex + 1).trim();
      
      if (value === '' || value === '{}' || value === '[]') {
        // Es un objeto anidado
        const newObj: any = {};
        currentObj[key] = newObj;
        stack.push(newObj);
        currentPath.push(key);
        currentObj = newObj;
      } else {
        // Es un valor primitivo
        let parsedValue: any = value.replace(/^[\"']|[\"']$/g, '');
        
        // Parsear tipos
        if (parsedValue === 'true') parsedValue = true;
        else if (parsedValue === 'false') parsedValue = false;
        else if (!isNaN(Number(parsedValue)) && parsedValue !== '') {
          parsedValue = Number(parsedValue);
        }
        
        currentObj[key] = parsedValue;
      }
    }
    
    lastIndent = indent;
  }
  
  return result;
}

// Extraer todos los valores de un objeto de forma recursiva
function extractAllValuesRecursive(
  obj: any, 
  path: string = '', 
  results: Map<string, { value: string; path: string; key: string }> = new Map()
): Map<string, { value: string; path: string; key: string }> {
  if (!obj || typeof obj !== 'object') return results;
  
  for (const [key, value] of Object.entries(obj)) {
    const currentPath = path ? `${path}.${key}` : key;
    
    if (typeof value === 'string' && value.length > 3) {
      results.set(currentPath, { value, path: currentPath, key });
    } else if (typeof value === 'object' && value !== null) {
      extractAllValuesRecursive(value, currentPath, results);
    }
  }
  
  return results;
}

// Buscar un valor en un objeto de forma profunda
function findValueInObjectDeep(searchValue: string, obj: any, currentPath: string = ''): string[] {
  const results: string[] = [];
  
  if (!obj || typeof obj !== 'object') return results;
  
  for (const [key, value] of Object.entries(obj)) {
    const path = currentPath ? `${currentPath}.${key}` : key;
    
    if (value === searchValue) {
      results.push(path);
    } else if (typeof value === 'string' && value.includes(searchValue)) {
      results.push(path);
    } else if (typeof value === 'object' && value !== null) {
      results.push(...findValueInObjectDeep(searchValue, value, path));
    }
  }
  
  return results;
}

// Extraer path del URL
function extractPathFromURL(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname;
  } catch {
    // Si falla, intentar extraer manualmente
    const match = url.match(/https?:\/\/[^\/]+(.+)/);
    return match ? match[1] : url;
  }
}

// Función principal de análisis
export function analyzeYAMLForCorrelations(yamlContent: string): CorrelationCandidate[] {
  const candidates: CorrelationCandidate[] = [];
  
  try {
    console.log('🔍 Starting YAML correlation analysis...');
    console.log('YAML length:', yamlContent.length);
    
    // Extraer todos los bloques de request del YAML
    const requestBlocks: any[] = [];
    
    // Regex para extraer cada request con su response
    const requestPattern = /# Request (\d+):[^\n]*\n[\s\S]*?- request:\s*\n([\s\S]*?)(?=\n\s{6}# ===|# Request \d+:|$)/g;
    let match;
    
    while ((match = requestPattern.exec(yamlContent)) !== null) {
      const requestIndex = parseInt(match[1]);
      const requestContent = match[2];
      
      const request: any = {
        index: requestIndex,
        method: '',
        url: '',
        path: '',
        headers: {},
        body: null,
        response: null
      };
      
      // Extraer método
      const methodMatch = requestContent.match(/method:\s*(\w+)/);
      if (methodMatch) request.method = methodMatch[1];
      
      // Extraer URL completa
      const urlMatch = requestContent.match(/url:\s*(.+)/);
      if (urlMatch) {
        request.url = urlMatch[1].trim();
        request.path = extractPathFromURL(request.url);
        console.log(`📍 Request ${requestIndex}: ${request.method} ${request.path}`);
      }
      
      // Extraer headers del request
      const headersMatch = requestContent.match(/headers:([\s\S]*?)(?=\n\s{10}(?:body:|recorded_at:|response:))/);
      if (headersMatch) {
        const headerLines = headersMatch[1].match(/[\w-]+:\s*"[^"]+"/g);
        if (headerLines) {
          headerLines.forEach(line => {
            const colonIndex = line.indexOf(':');
            const key = line.substring(0, colonIndex).trim();
            const value = line.substring(colonIndex + 1).trim().replace(/^"|"$/g, '');
            request.headers[key] = value;
          });
        }
      }
      
      // Extraer body del request
      const bodyMatch = requestContent.match(/body:\s*\n([\s\S]*?)(?=\n\s{10}recorded_at:|response:)/);
      if (bodyMatch) {
        request.body = parseSimpleYAMLObject(bodyMatch[1]);
        console.log(`📦 Request ${requestIndex} body:`, request.body);
      }
      
      // Extraer response
      const responseMatch = requestContent.match(/response:\s*\n([\s\S]+)/);
      if (responseMatch) {
        const responseContent = responseMatch[1];
        
        // Extraer response body
        const responseBodyMatch = responseContent.match(/body:\s*\n([\s\S]*?)(?=\n\s{12}time_ms:|$)/);
        if (responseBodyMatch) {
          const responseBody = parseSimpleYAMLObject(responseBodyMatch[1]);
          request.response = { body: responseBody };
          console.log(`📥 Request ${requestIndex} response body:`, responseBody);
        }
      }
      
      requestBlocks.push(request);
    }
    
    console.log(`✅ Found ${requestBlocks.length} request blocks`);
    
    // Mapa para registrar valores dinámicos encontrados
    const valueRegistry = new Map<string, { 
      sourceIndex: number; 
      path: string; 
      value: string; 
      key: string;
      location: 'response.body' | 'response.header';
      sourceRequest: { method: string; path: string; index: number };
    }>();
    
    // Fase 1: Extraer todos los valores dinámicos de las RESPONSES
    requestBlocks.forEach((request, index) => {
      if (!request.response?.body) return;
      
      const responseValues = extractAllValuesRecursive(request.response.body, '');
      console.log(`🔎 Request ${index + 1} response values:`, responseValues.size);
      
      responseValues.forEach(({ value, path, key }) => {
        if (isDynamicValue(value)) {
          console.log(`✨ Dynamic value found: ${key} = "${value.substring(0, 40)}..." (entropy: ${calculateEntropy(value).toFixed(2)})`);
          valueRegistry.set(value, { 
            sourceIndex: index, 
            path, 
            value, 
            key,
            location: 'response.body',
            sourceRequest: {
              method: request.method,
              path: request.path,
              index: request.index
            }
          });
        }
      });
    });
    
    console.log(`🎯 Total dynamic values found in responses: ${valueRegistry.size}`);
    
    // Fase 2: Para cada valor dinámico, buscar donde se usa en requests subsecuentes
    valueRegistry.forEach(({ sourceIndex, path, value, key, location, sourceRequest }) => {
      const usages: string[] = [];
      const usedInRequests: Array<{ method: string; path: string; index: number; location: string }> = [];
      
      // Buscar en todos los requests DESPUÉS del source
      for (let i = sourceIndex + 1; i < requestBlocks.length; i++) {
        const targetRequest = requestBlocks[i];
        
        // 1. Buscar en URL/PATH
        if (targetRequest.url && targetRequest.url.includes(value)) {
          const usageStr = `${targetRequest.method} ${targetRequest.path} → path`;
          usages.push(usageStr);
          usedInRequests.push({
            method: targetRequest.method,
            path: targetRequest.path,
            index: targetRequest.index,
            location: 'path'
          });
          console.log(`🔗 Found usage of "${key}" in ${targetRequest.method} ${targetRequest.path} (path)`);
        }
        
        // 2. Buscar en HEADERS
        if (targetRequest.headers) {
          for (const [headerName, headerValue] of Object.entries(targetRequest.headers)) {
            if (typeof headerValue === 'string' && headerValue.includes(value)) {
              const usageStr = `${targetRequest.method} ${targetRequest.path} → header.${headerName}`;
              usages.push(usageStr);
              usedInRequests.push({
                method: targetRequest.method,
                path: targetRequest.path,
                index: targetRequest.index,
                location: `header.${headerName}`
              });
              console.log(`🔗 Found usage of "${key}" in ${targetRequest.method} ${targetRequest.path} (header.${headerName})`);
            }
          }
        }
        
        // 3. Buscar en REQUEST BODY
        if (targetRequest.body) {
          const bodyUsages = findValueInObjectDeep(value, targetRequest.body, '');
          bodyUsages.forEach(bodyPath => {
            const usageStr = `${targetRequest.method} ${targetRequest.path} → body.${bodyPath}`;
            usages.push(usageStr);
            usedInRequests.push({
              method: targetRequest.method,
              path: targetRequest.path,
              index: targetRequest.index,
              location: `body.${bodyPath}`
            });
            console.log(`🔗 Found usage of "${key}" in ${targetRequest.method} ${targetRequest.path} (body.${bodyPath})`);
          });
        }
      }
      
      console.log(`🔗 Value "${key}" used ${usages.length} times`);
      
      // Solo crear candidato si se usa al menos una vez
      if (usages.length > 0) {
        const varName = key;
        const type = classifyValueType(value, key);
        
        // Calcular confianza basada en el número de usos y tipo
        let confidence = 75;
        if (usages.length >= 2) confidence += 10;
        if (usages.length >= 3) confidence += 5;
        if (type === 'auth_token' || type === 'session_id') confidence += 10;
        if (/^eyJ/.test(value)) confidence += 5;
        if (/^(acc|ord|reg)_/.test(value)) confidence += 5;
        
        const candidate: CorrelationCandidate = {
          id: `corr-${candidates.length + 1}`,
          variable: varName,
          type,
          valueExample: value.length > 30 ? value.substring(0, 30) + '...' : value,
          source: `${sourceRequest.method} ${sourceRequest.path} → JSON $.${path}`,
          usedIn: usages,
          confidence: Math.min(98, confidence),
          explanation: `${getTypeDescription(type)} generado en ${sourceRequest.method} ${sourceRequest.path} y utilizado en ${usages.length} request${usages.length > 1 ? 's' : ''} posterior${usages.length > 1 ? 'es' : ''}. Tiene alta entropía y debe ser extraído automáticamente.`,
          technicalDetails: {
            format: detectFormat(value),
            entropy: calculateEntropy(value),
            timesUsed: usages.length,
            encodings: detectEncoding(value)
          },
          extractor: {
            fromStep: `step_${sourceRequest.index}`,
            fromLocation: location,
            path: `$.${path}`,
            variable: varName
          },
          diff: generateDiffText(varName, value, usages),
          fullValue: value,
          sourceRequest,
          usedInRequests
        };
        
        candidates.push(candidate);
        console.log(`✅ Added candidate: ${varName} (${candidate.confidence}% confidence, ${usages.length} usages)`);
      }
    });
    
    console.log(`🎉 Total candidates: ${candidates.length}`);
    return candidates.sort((a, b) => b.confidence - a.confidence);
  } catch (error) {
    console.error('❌ Error analyzing YAML:', error);
    return [];
  }
}

function getTypeDescription(type: string): string {
  const descriptions: Record<string, string> = {
    auth_token: 'Token de autenticación',
    session_id: 'Identificador de sesión',
    csrf_token: 'Token CSRF',
    cursor: 'Cursor de paginación',
    user_id: 'Identificador de usuario',
    api_key: 'Clave o identificador',
    uuid: 'Identificador único',
    dynamic_value: 'Valor dinámico'
  };
  return descriptions[type] || 'Valor dinámico';
}

function detectFormat(value: string): string {
  if (/^eyJ/.test(value)) return 'JWT';
  if (/^[a-f0-9]{16,}$/i.test(value)) return `hex (${value.length} chars)`;
  if (/^(acc|ord|reg)_/.test(value)) return 'prefixed alphanumeric';
  if (/^[A-Za-z0-9+/]+=*$/.test(value)) return 'base64';
  if (/^[a-z]+-[a-z]+-\d+$/.test(value)) return 'region identifier';
  return 'alphanumeric';
}

function detectEncoding(value: string): string[] {
  const encodings: string[] = [];
  
  if (/^eyJ/.test(value)) encodings.push('base64 → JWT');
  if (/^[A-Za-z0-9+/]+=*$/.test(value) && value.length % 4 === 0) encodings.push('base64');
  
  return encodings;
}

function generateDiffText(varName: string, value: string, usages: string[]): string {
  const shortValue = value.length > 40 ? value.substring(0, 40) + '...' : value;
  
  let diff = `+ Agregar extractor:\n`;
  diff += `  extractors:\n`;
  diff += `    - name: ${varName}\n`;
  diff += `      jsonpath: $.${varName}\n\n`;
  diff += `- Reemplazar "${shortValue}" con \${${varName}} en:\n`;
  usages.forEach(usage => {
    diff += `  • ${usage}\n`;
  });
  
  return diff;
}

// Función para aplicar correlaciones al YAML
export function applyCorrelations(yamlContent: string, candidates: CorrelationCandidate[]): string {
  let modifiedYaml = yamlContent;
  
  console.log(`🔧 Applying ${candidates.length} correlations...`);
  
  for (const candidate of candidates) {
    if (!candidate.sourceRequest) continue;
    
    const stepNum = candidate.sourceRequest.index;
    console.log(`📝 Processing ${candidate.variable} from step ${stepNum}`);
    
    // 1. Agregar extractores después del request que genera el valor
    const requestPattern = new RegExp(
      `(# Request ${stepNum}:.*?\\n[\\s\\S]*?response:[\\s\\S]*?time_ms: \\d+)`,
      'i'
    );
    
    const match = modifiedYaml.match(requestPattern);
    if (match) {
      const extractor = `\n          extractors:\n            - name: ${candidate.variable}\n              jsonpath: ${candidate.extractor.path}\n              scope: global`;
      
      modifiedYaml = modifiedYaml.replace(match[0], match[0] + extractor);
      console.log(`✅ Added extractor for ${candidate.variable}`);
    }
    
    // 2. Reemplazar valores literales con variables en requests subsecuentes
    if (candidate.usedInRequests) {
      candidate.usedInRequests.forEach(usage => {
        const usageStepNum = usage.index;
        
        // Buscar el request específico y reemplazar solo ahí
        const usagePattern = new RegExp(
          `(# Request ${usageStepNum}:[\\s\\S]*?)("${escapeRegex(candidate.fullValue)}")([\\s\\S]*?)(?=# Request \\d+:|# ===|$)`,
          'i'
        );
        
        modifiedYaml = modifiedYaml.replace(usagePattern, (match, before, value, after) => {
          return before + `"\${${candidate.variable}}"` + after;
        });
        
        console.log(`✅ Replaced in ${usage.method} ${usage.path} (${usage.location})`);
      });
    }
  }
  
  console.log(`🎉 Applied ${candidates.length} correlations successfully!`);
  return modifiedYaml;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
