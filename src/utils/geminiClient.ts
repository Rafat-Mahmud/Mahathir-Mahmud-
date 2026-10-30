/**
 * Server-side Gemini API client bridge.
 * Fully replaces the previous sample/claude connection with the built-in Gemini connection.
 */
import { blobToBase64, shrinkToBlob } from './fileReaders';
import { SourceUnit } from './batching';
import { LEGEND, LangInfo } from './prompts';

export interface HealthResult {
  ok: boolean;
  message: string;
}

export async function checkConnection(test = false): Promise<HealthResult> {
  try {
    const res = await fetch(`/api/gemini/health?test=${test}`);
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, message: data.message || data.error || 'Connection error' };
    }
    if (test) {
      return { ok: true, message: `Gemini connected (${data.text || 'OK'})` };
    }
    return { ok: true, message: 'Gemini available · click to test' };
  } catch (err: any) {
    return { ok: false, message: err?.message || 'Server unreachable' };
  }
}

export async function askGemini(
  prompt: string,
  blobs: (Blob | null | undefined)[],
  signal?: AbortSignal,
  tier: 'default' | 'quick' = 'default',
  _tag?: string,
  onText?: (chars: number) => void
): Promise<{ text: string; truncated?: boolean }> {
  const imagesData: { mimeType: string; data: string }[] = [];

  for (const b of blobs) {
    if (b) {
      try {
        const base64 = await blobToBase64(b);
        imagesData.push({
          mimeType: b.type || 'image/jpeg',
          data: base64,
        });
      } catch (err) {
        console.warn('Failed to encode image blob for Gemini:', err);
      }
    }
  }

  const res = await fetch('/api/gemini/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      images: imagesData,
      tier,
    }),
    signal,
  });

  if (!res.ok) {
    let errMessage = 'Server error during generation';
    try {
      const errJson = await res.json();
      errMessage = errJson.error || errJson.message || errMessage;
    } catch {
      // ignore
    }
    throw new Error(errMessage);
  }

  const data = await res.json();
  const text = data.text || '';
  if (onText) onText(text.length);
  return { text };
}

export async function askGeminiJson<T = any>(
  prompt: string,
  signal?: AbortSignal
): Promise<T> {
  const res = await fetch('/api/gemini/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      jsonMode: true,
      tier: 'quick',
    }),
    signal,
  });

  if (!res.ok) {
    throw new Error('Failed to generate JSON');
  }

  const data = await res.json();
  const text = String(data.text || '')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  return JSON.parse(text);
}

export async function legendLabels(
  lang: LangInfo,
  signal?: AbortSignal
): Promise<Record<string, string>> {
  if (lang.name === 'English') return { ...LEGEND };
  try {
    const prompt =
      'Translate these UI labels into ' +
      lang.name +
      '. Reply with ONLY a JSON object with the same keys.\n' +
      JSON.stringify(LEGEND);
    const data = await askGeminiJson<Record<string, string>>(prompt, signal);
    const out: Record<string, string> = {};
    Object.keys(LEGEND).forEach((k) => {
      out[k] = String(data[k] || LEGEND[k]);
    });
    return out;
  } catch {
    return { ...LEGEND };
  }
}

export async function embedPictures(body: string, units: SourceUnit[]): Promise<string> {
  const map = new Map(units.filter((u) => u.blob).map((u) => [u.id, u]));
  const ids = Array.from(new Set(Array.from(body.matchAll(/data-src="(U\d+)"/g)).map((m) => m[1])));
  const urls: Record<string, string> = {};

  for (const id of ids) {
    const u = map.get(id);
    if (!u || !u.blob) continue;
    try {
      const b = await shrinkToBlob(u.blob, 1000, 0.74);
      urls[id] = await new Promise<string>((res) => {
        const fr = new FileReader();
        fr.onload = () => res(fr.result as string);
        fr.readAsDataURL(b);
      });
    } catch {
      // skip
    }
  }

  const doc = new DOMParser().parseFromString('<body>' + body + '</body>', 'text/html');
  doc.querySelectorAll('figure.shot').forEach((f) => {
    const id = f.getAttribute('data-src');
    if (id && urls[id]) {
      const img = doc.createElement('img');
      img.setAttribute('src', urls[id]);
      img.setAttribute('alt', (f.textContent || 'Original').trim().slice(0, 120));
      f.insertBefore(img, f.firstChild);
      f.removeAttribute('data-src');
    } else {
      f.remove();
    }
  });

  return doc.body.innerHTML;
}
