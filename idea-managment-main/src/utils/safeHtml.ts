/** Encode at the HTML boundary, including legacy database values. */
export const escapeHtml = (value: unknown): string => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#039;');

export function safeImageSource(source: unknown): string {
  if (typeof source !== 'string' || !source.trim()) return '';
  const value = source.trim();
  if (/^data:image\/(png|jpeg|jpg|gif|webp);base64,[a-z0-9+/=\s]+$/i.test(value)) return value;
  try {
    const url = new URL(value, window.location.origin);
    if (url.protocol === 'blob:' && url.origin === window.location.origin) return url.href;
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return '';
    if (url.pathname.startsWith('/uploads/')) return `${window.location.origin}${url.pathname}${url.search}`;
    return url.origin === window.location.origin ? url.href : '';
  } catch { return ''; }
}
