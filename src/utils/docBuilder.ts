import { NOTE_CSS, LEGEND } from './prompts';
import { esc } from './sanitize';
import { NoteRecord } from './storage';

export const FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Carlito:wght@400;700&family=Kalam:wght@400;700&family=Caveat:wght@500;700&family=Atma:wght@400;600;700&family=Hind+Siliguri:wght@400;500;600;700&family=Noto+Sans+Arabic:wght@400;600;700&family=JetBrains+Mono:wght@400;600&display=swap';

export function noteDoc(
  rec: NoteRecord,
  o: { style?: string; accent?: string; size?: number; pdf?: boolean } = {}
): string {
  const style = o.style || rec.style;
  const accent = o.accent || rec.accent;
  const L = rec.labels || LEGEND;
  const chips = [rec.source, rec.lang?.name, rec.date]
    .filter(Boolean)
    .map((c) => '<span>' + esc(c) + '</span>')
    .join('');
  const zoom = o.size ? ' style="font-size:' + o.size + 'px"' : '';

  return (
    '<!doctype html><html lang="' +
    esc(rec.lang?.code || 'en') +
    '" dir="' +
    esc(rec.lang?.dir || 'ltr') +
    '" data-style="' +
    esc(style) +
    '" data-accent="' +
    esc(accent) +
    '" class="' +
    (o.pdf ? 'pdf' : '') +
    '"' +
    zoom +
    '><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' +
    esc(rec.title) +
    '</title><link rel="stylesheet" href="' +
    FONTS_URL +
    '"><style>' +
    NOTE_CSS +
    '</style></head><body>' +
    '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1 L9 5 L1 9 L3 5 Z" fill="#d1304f"/></marker><filter id="rough"><feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" seed="4" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="2.6"/></filter></defs></svg>' +
    '<main class="sheet"><header class="cover"><div class="kicker">' +
    esc(rec.subject || 'Study note') +
    '</div><h1>' +
    esc(rec.title) +
    '</h1><div class="meta">' +
    chips +
    '</div>' +
    '<div class="legend"><b>' +
    esc(L.legend || 'How to read this note') +
    '</b><span class="l-def">📘 ' +
    esc(L.def || 'Definition') +
    '</span><span class="l-key">⭐ ' +
    esc(L.key || 'Key idea') +
    '</span><span class="l-ex">🧪 ' +
    esc(L.ex || 'Example') +
    '</span><span class="l-formula">🧮 ' +
    esc(L.formula || 'Formula') +
    '</span><span class="l-why">💡 ' +
    esc(L.why || 'Explained simply') +
    '</span><span class="l-warn">⚠️ ' +
    esc(L.warn || 'Watch out') +
    '</span><span class="l-tip">🧠 ' +
    esc(L.tip || 'Memory trick') +
    '</span></div></header>' +
    rec.body +
    '</main></body></html>'
  );
}
