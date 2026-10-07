/* Scoped additive arrival; all existing edition anchors remain unchanged. */
export function qualifiedSearchAnchor(path,row) {
  if (!row) return '';
  if (String(path).replace(/\/$/,'') === '/reader/alim-litrufa/reviewed/part-2-17-62-63') {
    const m=String(row[0]).match(/^(17|62|63)-p(0|[1-9]\d*)$/);
    return m ? `#letter-${m[1]}-segment-${m[2]}` : '';
  }
  if (String(path).replace(/\/$/,'') === '/reader/reviewed/wrapup-18-19-92-209') {
    const owner=String(row[0]);
    return /^(?:al-2-(?:18|19)-p[1-9]\d*|(?:92|209):[1-9]\d*)$/.test(owner) ? '#unit-'+owner.replace(':','-') : '';
  }
  return `#seg-${row[0]}`;
}
