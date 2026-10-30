/**
 * IndexedDB storage with fallback to localStorage/memory for Margin Notes.
 */

export interface NoteRecord {
  id: string;
  created: number;
  title: string;
  subject?: string;
  style: 'doc' | 'hand';
  accent: string;
  lang: {
    name: string;
    code: string;
    dir: string;
  };
  source: string;
  date: string;
  body: string;
  labels: Record<string, string>;
}

const mem = new Map<string, NoteRecord>();
let dbp: Promise<IDBDatabase | null> | null = null;

function idb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
    return Promise.resolve(null);
  }
  if (!dbp) {
    dbp = new Promise((resolve) => {
      try {
        const r = indexedDB.open('margin-notes', 1);
        r.onupgradeneeded = () => {
          r.result.createObjectStore('notes', { keyPath: 'id' });
        };
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => resolve(null);
        r.onblocked = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }
  return dbp;
}

async function dbDo<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => any): Promise<T | null> {
  const db = await idb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction('notes', mode);
      const out = fn(tx.objectStore('notes'));
      tx.oncomplete = () => resolve(out && out.result !== undefined ? out.result : true);
      tx.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function saveNote(rec: NoteRecord): Promise<void> {
  mem.set(rec.id, rec);
  try {
    localStorage.setItem('margin_note_' + rec.id, JSON.stringify(rec));
  } catch {
    // quota exceeded or disabled
  }
  await dbDo('readwrite', (s) => s.put(rec));
}

export async function allNotes(): Promise<NoteRecord[]> {
  const r = await dbDo<NoteRecord[]>('readonly', (s) => s.getAll());
  let arr: NoteRecord[] = [];
  if (Array.isArray(r) && r.length) {
    arr = r;
  } else {
    // Check localStorage fallback
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('margin_note_')) {
          const item = JSON.parse(localStorage.getItem(k) || '');
          if (item && item.id) {
            mem.set(item.id, item);
          }
        }
      }
    } catch {
      // ignore
    }
    arr = [...mem.values()];
  }
  return arr.sort((a, b) => b.created - a.created);
}

export async function delNote(id: string): Promise<void> {
  mem.delete(id);
  try {
    localStorage.removeItem('margin_note_' + id);
  } catch {
    // ignore
  }
  await dbDo('readwrite', (s) => s.delete(id));
}
