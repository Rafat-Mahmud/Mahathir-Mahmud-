/**
 * Sanitization and string formatting utilities for Margin Notes.
 */

const BAD_TAGS = [
  'script', 'iframe', 'frame', 'frameset', 'object', 'embed', 'link',
  'meta', 'base', 'style', 'form', 'input', 'button', 'textarea',
  'select', 'foreignObject', 'animate', 'animateMotion', 'animateTransform',
  'set', 'use', 'image', 'audio', 'video', 'source', 'template', 'noscript'
];

export function esc(s: any): string {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c] || c));
}

export function sanitize(html: string): string {
  let clean = String(html || '').trim()
    .replace(/^```(?:html)?\s*/i, '')
    .replace(/\s*```$/, '');

  if (typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString('<body>' + clean + '</body>', 'text/html');
    BAD_TAGS.forEach(tag => {
      doc.body.querySelectorAll(tag).forEach(n => n.remove());
    });
    doc.body.querySelectorAll('*').forEach(el => {
      [...el.attributes].forEach(a => {
        const n = a.name.toLowerCase();
        if (
          n.startsWith('on') ||
          n === 'style' ||
          n === 'href' ||
          n === 'xlink:href' ||
          n === 'src' ||
          n === 'srcdoc' ||
          n === 'action' ||
          n === 'formaction' ||
          /javascript:/i.test(a.value)
        ) {
          el.removeAttribute(a.name);
        }
      });
    });
    return doc.body.innerHTML;
  }

  // Node/fallback regex-based stripping for testing environments
  BAD_TAGS.forEach(tag => {
    const re = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>|<${tag}\\b[^>]*\\/?>`, 'gi');
    clean = clean.replace(re, '');
  });
  clean = clean.replace(/\s*on\w+\s*=\s*(['"]).*?\1/gi, '');
  clean = clean.replace(/href\s*=\s*(['"])javascript:.*?\1/gi, '');
  return clean;
}

export function stripTags(h: string): string {
  return String(h || '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' [diagram] ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

export function safeName(t: string): string {
  return (t || 'note')
    .replace(/[^\p{L}\p{N} _-]+/gu, '')
    .trim()
    .slice(0, 80) || 'note';
}
