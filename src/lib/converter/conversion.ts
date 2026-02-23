import { convertPostmanJSONToPulseYAML } from './postman';
import { convertJMXToPulseYAML } from './jmx';
import { getFileExtension } from './fileUtils';

export interface ConversionResult {
  yaml: string;
  stats: any;
  limitations: string[];
}

export function convertContent(fileText: string, fileName: string): ConversionResult {
  const extension = getFileExtension(fileName);

  if (extension === 'json') {
    return convertPostmanJSONToPulseYAML(fileText) as unknown as ConversionResult;
  }

  if (extension === 'jmx') {
    return convertJMXToPulseYAML(fileText) as unknown as ConversionResult;
  }

  throw new Error(`unsupported extension: ${extension}`);
}
