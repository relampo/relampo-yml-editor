import yaml from 'js-yaml';

/**
 * Stringifies an object to YAML format using standard settings for Relampo.
 */
export function stringifyYAML(obj: any): string {
  return yaml.dump(obj, {
    indent: 2,
    lineWidth: -1, // Don't wrap long lines
    noRefs: true, // Don't use anchors/aliases
    sortKeys: false, // Keep order of keys as defined
  });
}
