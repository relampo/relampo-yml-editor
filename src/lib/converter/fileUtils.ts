/**
 * Gets the file extension from a filename.
 */
export function getFileExtension(fileName: string): string {
  return fileName.toLowerCase().split('.').pop() || '';
}

/**
 * Checks if the extension is supported for conversion.
 */
export function isSupportedInputExtension(extension: string): boolean {
  return extension === 'json' || extension === 'jmx';
}

/**
 * Builds a suggested filename for the converted YAML.
 */
export function buildSuggestedFileName(originalFileName: string): string {
  const baseName = originalFileName.replace(/\.(json|jmx)$/i, '');
  return `${baseName}.relampo.yml`;
}
