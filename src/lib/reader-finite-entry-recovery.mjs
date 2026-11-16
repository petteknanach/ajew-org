// JSON inside a script raw-text element needs HTML-safe escaping, not entity escaping.
export function recoveryRegistryJSON(entries) {
  return JSON.stringify(entries).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}
