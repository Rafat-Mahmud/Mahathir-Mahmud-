/**
 * Document, slide, and image reader utilities for Margin Notes.
 */
import JSZip from 'jszip';
import { SourceUnit } from './batching';

// Load pdfjsLib gracefully from CDN or imported bundle
declare const pdfjsLib: any;

const CDN = {
  pdfjs: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  pdfjsWorker: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
};

const loadedScripts: Record<string, Promise<void>> = {};

export function loadScript(key: 'pdfjs'): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (typeof pdfjsLib !== 'undefined') return Promise.resolve();

  if (!loadedScripts[key]) {
    loadedScripts[key] = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = CDN[key];
      s.onload = () => resolve();
      s.onerror = () => {
        delete loadedScripts[key];
        reject(new Error('Could not load PDF reader. Check your internet connection.'));
      };
      document.head.appendChild(s);
    });
  }
  return loadedScripts[key];
}

export async function shrinkToBlob(
  src: ImageBitmapSource | Blob | File,
  max = 1500,
  q = 0.82
): Promise<Blob> {
  const bmp = await createImageBitmap(src as ImageBitmapSource);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(bmp.width * k));
  c.height = Math.max(1, Math.round(bmp.height * k));
  const x = c.getContext('2d')!;
  x.fillStyle = '#ffffff';
  x.fillRect(0, 0, c.width, c.height);
  x.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((resolve, reject) => {
    c.toBlob((b) => (b ? resolve(b) : reject(new Error('Canvas to Blob failed'))), 'image/jpeg', q);
  });
}

export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const res = reader.result as string;
      const base64 = res.split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function splitText(name: string, text: string, next: () => number, size = 6500): SourceUnit[] {
  const paras = text.split(/\n{2,}/);
  const out: SourceUnit[] = [];
  let cur = '';
  let n = 1;

  for (const p of paras) {
    if (cur.length + p.length > size && cur) {
      out.push({
        id: 'U' + next(),
        label: name + ' part ' + n,
        file: name,
        text: cur.trim(),
        blob: null,
      });
      cur = '';
      n++;
    }
    cur += p + '\n\n';
  }
  if (cur.trim()) {
    out.push({
      id: 'U' + next(),
      label: name + ' part ' + n,
      file: name,
      text: cur.trim(),
      blob: null,
    });
  }
  return out;
}

export async function readPdf(
  file: File,
  o: { read: boolean },
  log: (msg: string) => void,
  next: () => number
): Promise<SourceUnit[]> {
  await loadScript('pdfjs');
  if (typeof pdfjsLib === 'undefined') {
    throw new Error('The PDF reader did not start.');
  }
  pdfjsLib.GlobalWorkerOptions.workerSrc = CDN.pdfjsWorker;

  let pdf: any;
  try {
    const buffer = await file.arrayBuffer();
    pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
  } catch (e: any) {
    if (e && /password/i.test(e.name + (e.message || ''))) {
      throw new Error(`"${file.name}" is password protected. Remove the password and try again.`);
    }
    throw new Error(
      `Could not open "${file.name}" as a PDF (${e?.message || e}). Try re-saving it as PDF, or paste its text into the transcript box.`
    );
  }

  const units: SourceUnit[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const vp0 = page.getViewport({ scale: 1 });
    const tc = await page.getTextContent();
    let text = '';
    let lastY: number | null = null;

    for (const it of tc.items) {
      if (typeof it.str !== 'string') continue;
      const y = it.transform ? it.transform[5] : 0;
      if (lastY !== null && Math.abs(y - lastY) > 3) {
        text += '\n';
      } else if (text && !/[\s]$/.test(text)) {
        text += ' ';
      }
      text += it.str;
      if (it.hasEOL) text += '\n';
      lastY = y;
    }
    text = text.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    const slide = vp0.width > vp0.height * 1.15;
    let blob: Blob | null = null;

    if (o.read && (slide || text.length < 450)) {
      const sc = Math.min(2.2, 1500 / Math.max(vp0.width, vp0.height));
      const vp = page.getViewport({ scale: sc });
      const c = document.createElement('canvas');
      c.width = Math.ceil(vp.width);
      c.height = Math.ceil(vp.height);
      const x = c.getContext('2d')!;
      x.fillStyle = '#ffffff';
      x.fillRect(0, 0, c.width, c.height);
      await page.render({ canvasContext: x, viewport: vp }).promise;
      blob = await new Promise<Blob | null>((resolve) => c.toBlob(resolve, 'image/jpeg', 0.82));
      c.width = 0;
      c.height = 0;
    }

    units.push({
      id: 'U' + next(),
      label: (slide ? 'Slide ' : 'Page ') + i,
      file: file.name,
      text,
      blob,
    });

    if (i % 5 === 0 || i === pdf.numPages) {
      log(`  ${file.name}: read ${i} of ${pdf.numPages}`);
    }
  }

  return units;
}

export async function readPptx(
  file: File,
  _o: { read: boolean },
  log: (msg: string) => void,
  next: () => number
): Promise<SourceUnit[]> {
  const z = await JSZip.loadAsync(await file.arrayBuffer());
  const names = Object.keys(z.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)![0], 10);
      const numB = parseInt(b.match(/\d+/)![0], 10);
      return numA - numB;
    });

  const units: SourceUnit[] = [];
  for (const n of names) {
    const num = parseInt(n.match(/\d+/)![0], 10);
    const xml = await z.file(n)!.async('string');
    const d = new DOMParser().parseFromString(xml, 'application/xml');
    const paras = Array.from(d.getElementsByTagName('a:p'))
      .map((p) =>
        Array.from(p.getElementsByTagName('a:t'))
          .map((t) => t.textContent || '')
          .join('')
      )
      .filter((t) => t.trim());
    let text = paras.join('\n');

    const nf = z.file('ppt/notesSlides/notesSlide' + num + '.xml');
    if (nf) {
      const nx = await nf.async('string');
      const nd = new DOMParser().parseFromString(nx, 'application/xml');
      const nt = Array.from(nd.getElementsByTagName('a:p'))
        .map((p) =>
          Array.from(p.getElementsByTagName('a:t'))
            .map((t) => t.textContent || '')
            .join('')
        )
        .filter((t) => t.trim() && !/^\d+$/.test(t.trim()))
        .join('\n');
      if (nt) text += '\n[Speaker notes: ' + nt + ']';
    }

    units.push({
      id: 'U' + next(),
      label: 'Slide ' + num,
      file: file.name,
      text,
      blob: null,
    });
  }

  log(`  ${file.name}: ${units.length} slides read (text and speaker notes).`);
  return units;
}

export async function readDocx(
  file: File,
  _o: { read: boolean },
  _log: (msg: string) => void,
  next: () => number
): Promise<SourceUnit[]> {
  const z = await JSZip.loadAsync(await file.arrayBuffer());
  const xml = await z.file('word/document.xml')!.async('string');
  const d = new DOMParser().parseFromString(xml, 'application/xml');
  const lines = Array.from(d.getElementsByTagName('w:p'))
    .map((p) => {
      const st = p.getElementsByTagName('w:pStyle')[0];
      const h = st && /heading/i.test(st.getAttribute('w:val') || '');
      const t = Array.from(p.getElementsByTagName('w:t'))
        .map((x) => x.textContent || '')
        .join('');
      return t.trim() ? (h ? '## ' + t : t) : '';
    })
    .filter(Boolean);

  return splitText(file.name, lines.join('\n\n'), next);
}

export async function readFiles(
  files: File[],
  o: { read: boolean },
  log: (msg: string) => void
): Promise<SourceUnit[]> {
  let counter = 0;
  const next = () => ++counter;
  const units: SourceUnit[] = [];

  for (const f of files) {
    const ext = (f.name.split('.').pop() || '').toLowerCase();
    log('Reading ' + f.name + '…');
    if (ext === 'pdf') {
      units.push(...(await readPdf(f, o, log, next)));
    } else if (ext === 'pptx') {
      units.push(...(await readPptx(f, o, log, next)));
    } else if (ext === 'docx') {
      units.push(...(await readDocx(f, o, log, next)));
    } else if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
      units.push({
        id: 'U' + next(),
        label: 'Photo ' + f.name,
        file: f.name,
        text: '',
        blob: await shrinkToBlob(f),
      });
    } else if (['txt', 'md', 'csv'].includes(ext)) {
      units.push(...splitText(f.name, await f.text(), next));
    } else {
      throw new Error(
        `"${f.name}" is not a supported file type. Use PDF, PowerPoint, Word, text or an image.`
      );
    }
  }

  return units;
}
