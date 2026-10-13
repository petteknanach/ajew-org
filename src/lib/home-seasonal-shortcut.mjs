// Viewer-local month spotlight for study navigation, not a holiday-day clock.
const resources = Object.freeze({ href: '/resources', icon: '✨', label: 'All Resources', he: 'כל האוצרות' });
const spotlights = Object.freeze({
  Nisan: Object.freeze({ href: '/pesach', icon: '🍷', label: 'Pesach', he: 'חג הפסח' }),
  Iyar: Object.freeze({ href: '/omer', icon: '🌾', label: 'Sfiras HaOmer', he: 'ספירת העומר' }),
  Sivan: Object.freeze({ href: '/shavuos', icon: '🌾', label: 'Shavuos / שבועות', he: 'זמן מתן תורתנו' }),
});
// ICU's English Hebrew-calendar names, including common and leap-year Adar.
const months = new Set(['Tishri', 'Heshvan', 'Kislev', 'Tevet', 'Shevat', 'Adar', 'Adar I', 'Adar II', 'Nisan', 'Iyar', 'Sivan', 'Tamuz', 'Av', 'Elul']);

export function shortcutForMonth(month) {
  return months.has(month) && Object.hasOwn(spotlights, month) ? spotlights[month] : resources;
}

export function seasonalShortcut(date = new Date(), intl = globalThis.Intl) {
  try {
    if (!Number.isFinite(Date.prototype.getTime.call(date))) return resources;
    const formatter = new intl.DateTimeFormat('en-u-ca-hebrew', { month: 'long' });
    // Some engines silently substitute Gregorian despite the requested locale.
    if (formatter.resolvedOptions().calendar !== 'hebrew') return resources;
    const parts = formatter.formatToParts(date).filter(part => part.type === 'month');
    return parts.length === 1 ? shortcutForMonth(parts[0].value) : resources;
  } catch {
    return resources;
  }
}

export function startSeasonalShortcut(document = globalThis.document, { now = () => new Date(), intl = globalThis.Intl } = {}) {
  const view = document?.defaultView;
  if (!view) return () => {};
  let timer = null;
  let lastDay = null;
  let stopped = false;
  const clearTimer = () => {
    if (timer !== null) view.clearTimeout(timer);
    timer = null;
  };
  const refresh = (force = false) => {
    if (stopped) return;
    clearTimer();
    let date;
    try { date = now(); } catch { date = new Date(NaN); }
    let day = null;
    try { day = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`; } catch { /* invalid clock: resources */ }
    if (force || day !== lastDay) {
      const anchor = document.getElementById('home-seasonal-shortcut');
      const icon = anchor?.children[0];
      const label = anchor?.children[1]?.children[0];
      const he = anchor?.children[1]?.children[1];
      if (anchor?.tagName === 'A' && icon && label && he) {
        const shortcut = seasonalShortcut(date, intl);
        anchor.setAttribute('href', shortcut.href);
        icon.textContent = shortcut.icon;
        label.textContent = shortcut.label;
        he.textContent = shortcut.he;
      }
      lastDay = day;
    }
    // One bounded timer: check local date changes, including clock/timezone shifts.
    timer = view.setTimeout(() => refresh(), 60_000);
  };
  const ready = () => refresh(true);
  const visible = () => { if (document.visibilityState === 'visible') refresh(true); };
  const hide = () => clearTimer();
  document.addEventListener('visibilitychange', visible);
  view.addEventListener('pageshow', ready);
  view.addEventListener('pagehide', hide);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready, { once: true });
  else ready();
  return () => {
    stopped = true;
    clearTimer();
    document.removeEventListener('DOMContentLoaded', ready);
    document.removeEventListener('visibilitychange', visible);
    view.removeEventListener('pageshow', ready);
    view.removeEventListener('pagehide', hide);
  };
}
