import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { NoteRecord } from './storage';
import { noteDoc } from './docBuilder';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function buildPdf(
  rec: NoteRecord,
  style: string,
  accent: string,
  say: (msg: string) => void
): Promise<{ blob: Blob; pages: number }> {
  say('Creating the PDF…');

  const f = document.createElement('iframe');
  f.setAttribute('sandbox', 'allow-same-origin');
  f.style.cssText =
    'position:fixed;left:-10000px;top:0;width:794px;height:1200px;border:0;opacity:0;pointer-events:none;';
  document.body.appendChild(f);

  try {
    await new Promise<void>((resolve) => {
      f.onload = () => resolve();
      f.srcdoc = noteDoc(rec, { style, accent, pdf: true });
    });

    const doc = f.contentDocument;
    if (!doc) {
      throw new Error('Could not access iframe document for PDF generation');
    }

    try {
      await Promise.race([doc.fonts?.ready, sleep(6000)]);
    } catch {
      // ignore
    }

    const images = Array.from(doc.images);
    await Promise.all(
      images.map(
        (im) =>
          im.complete
            ? Promise.resolve(1)
            : new Promise((r) => {
                im.onload = im.onerror = r;
              })
      )
    );

    doc.querySelectorAll('details').forEach((d) => (d.open = true));
    await sleep(300);

    const sheet = doc.querySelector('.sheet') as HTMLElement;
    if (!sheet) {
      throw new Error('Document content sheet not found');
    }

    const H = Math.ceil(sheet.scrollHeight);
    const top0 = sheet.getBoundingClientRect().top;
    const PH = 1030; // content px per A4 page at 794px width

    const cands = Array.from(
      sheet.querySelectorAll(':scope > header, :scope > section > *')
    ).map((el) => {
      const r = el.getBoundingClientRect();
      return {
        top: r.top - top0,
        bottom: r.bottom - top0,
        h: r.height,
        head: /^H[1-6]$/.test(el.tagName),
      };
    });

    const pages: [number, number][] = [];
    let s = 0;
    while (s < H - 2) {
      let e = Math.min(s + PH, H);
      if (e < H) {
        for (const c of cands) {
          if (c.top > s + 120 && c.top < e && c.bottom > e && c.h < PH * 0.92) {
            e = Math.min(e, c.top);
          }
          if (c.head && c.top > s + 120 && c.bottom <= s + PH && c.bottom > s + PH - 70) {
            e = Math.min(e, c.top);
          }
        }
      }
      pages.push([s, e]);
      s = e;
    }

    const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });

    for (let i = 0; i < pages.length; i++) {
      say(`Creating the PDF: page ${i + 1} of ${pages.length}…`);
      const [a, b] = pages[i];
      const cv = await html2canvas(sheet, {
        scale: 2,
        backgroundColor: '#ffffff',
        x: 0,
        y: a,
        width: 794,
        height: b - a,
        windowWidth: 794,
        windowHeight: H,
        logging: false,
        useCORS: true,
      });

      if (i > 0) pdf.addPage();
      pdf.addImage(cv.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 12, 210, ((b - a) * 210) / 794);
      pdf.setFontSize(8);
      pdf.setTextColor(120);
      pdf.text(`${i + 1} / ${pages.length}`, 105, 291, { align: 'center' });
      cv.width = 0;
      cv.height = 0;
      await sleep(10);
    }

    const blob = pdf.output('blob');
    return { blob, pages: pages.length };
  } finally {
    f.remove();
  }
}
