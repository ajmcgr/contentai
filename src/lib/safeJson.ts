// Ensures strings are safe inside <script> tags or template strings.
export function safeJson<T>(v: T): string {
  return JSON.stringify(v)
    .replace(/</g, '\\u003C')    // avoid </script> breaking out
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

// Convenience: read from a data-* attribute
export function readJsonAttr(el: HTMLElement | null, attr = 'data-json'): any {
  if (!el) return null;
  const raw = el.getAttribute(attr);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}