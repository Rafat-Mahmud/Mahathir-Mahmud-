/**
 * Batching and chunking utilities for notes processing.
 */

export interface SourceUnit {
  id: string;
  label: string;
  file?: string;
  text: string;
  blob?: Blob | null;
}

export function batchUnits(units: SourceUnit[], maxUnits = 6, maxChars = 11000, maxImgs = 4): SourceUnit[][] {
  const out: SourceUnit[][] = [];
  let cur: SourceUnit[] = [];
  let ch = 0;
  let im = 0;

  for (const u of units) {
    const c = u.text?.length || 0;
    const i = u.blob ? 1 : 0;
    if (cur.length && (cur.length >= maxUnits || ch + c > maxChars || im + i > maxImgs)) {
      out.push(cur);
      cur = [];
      ch = 0;
      im = 0;
    }
    cur.push(u);
    ch += c;
    im += i;
  }
  if (cur.length) {
    out.push(cur);
  }
  return out;
}

export function chunkTranscript(text: string, max = 12000): string[] {
  const lines = text.replace(/\r/g, '').split('\n');
  const out: string[] = [];
  let cur = '';

  for (const ln of lines) {
    if (cur.length + ln.length > max && cur) {
      out.push(cur.trim());
      cur = '';
    }
    cur += ln + '\n';
  }
  if (cur.trim()) {
    out.push(cur.trim());
  }
  return out;
}

export const unitText = (u: SourceUnit): string =>
  '\n=== ' +
  u.label +
  (u.file ? ' · ' + u.file : '') +
  ' · id=' +
  u.id +
  ' ===\n' +
  (u.text || '(no extractable text: read the picture)');
