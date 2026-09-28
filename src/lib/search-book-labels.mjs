// Presentation only: preserve approved catalog spelling and all route/filter IDs.
export function displayBookLabel(id, labels = {}) {
  if (!id) return '';
  if (Object.prototype.hasOwnProperty.call(labels, id) && typeof labels[id] === 'string' && labels[id].trim()) return labels[id];
  return String(id).replace(/-/g, ' ');
}
