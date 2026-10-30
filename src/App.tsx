import React, { useState, useEffect, useRef } from 'react';
import { readFiles } from './utils/fileReaders';
import { SourceUnit, batchUnits, chunkTranscript, unitText } from './utils/batching';
import {
  LANGS,
  resolveLang,
  systemPrompt,
  COMPONENTS,
  TRANSCRIPT_NOTE,
  AUDIT_PROMPT,
  EXTRAS_PROMPT,
  GenerationOptions,
} from './utils/prompts';
import { sanitize, stripTags, safeName } from './utils/sanitize';
import { NoteRecord, saveNote, allNotes, delNote } from './utils/storage';
import { noteDoc } from './utils/docBuilder';
import { buildPdf } from './utils/pdfGenerator';
import {
  checkConnection,
  askGemini,
  legendLabels,
  embedPictures,
} from './utils/geminiClient';

interface RunPart {
  kind: string;
  ref: string;
  src: string;
  blobs: (Blob | null)[];
  frag: string | null;
  audited: boolean;
  add?: string;
  err: any;
}

export default function App() {
  // Navigation
  const [view, setView] = useState<'create' | 'run' | 'note' | 'lib'>('create');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Gemini Connection status
  const [connStatus, setConnStatus] = useState<{
    state: 'checking' | 'ok' | 'bad';
    text: string;
  }>({ state: 'checking', text: 'Checking…' });

  // Library State
  const [notes, setNotes] = useState<NoteRecord[]>([]);
  const [deleteArmedId, setDeleteArmedId] = useState<string | null>(null);

  // Form State
  const [files, setFiles] = useState<File[]>([]);
  const [link, setLink] = useState('');
  const [transcript, setTranscript] = useState('');
  const [style, setStyle] = useState<'doc' | 'hand'>('doc');
  const [accent, setAccent] = useState('blue');
  const [langKey, setLangKey] = useState('en');
  const [langOther, setLangOther] = useState('');
  const [options, setOptions] = useState<GenerationOptions>({
    audit: true,
    visuals: true,
    explain: true,
    examples: true,
    embed: true,
    extras: true,
    fast: false,
    read: true,
  });
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [formErr, setFormErr] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Execution / Run State
  const [runTitle, setRunTitle] = useState('Reading your material…');
  const [runPct, setRunPct] = useState(0);
  const [runStage, setRunStage] = useState<'read' | 'write' | 'extras' | 'finish'>('read');
  const [runSub, setRunSub] = useState('');
  const [runLogs, setRunLogs] = useState<string[]>([]);
  const [runErr, setRunErr] = useState<string | null>(null);
  const [canRetry, setCanRetry] = useState(true);
  const isRunningRef = useRef(false);
  const abortCtrlRef = useRef<AbortController | null>(null);
  const activeTasksRef = useRef<Record<string, { t0: number; chars: number }>>({});
  const runStateRef = useRef<{
    units: SourceUnit[] | null;
    parts: RunPart[] | null;
    slideBatches: SourceUnit[][];
    slideDone: boolean[];
    slideAdd: string[];
    extrasDone: boolean;
    extrasHtml: string;
    done: number;
    total: number;
  }>({
    units: null,
    parts: null,
    slideBatches: [],
    slideDone: [],
    slideAdd: [],
    extrasDone: false,
    extrasHtml: '',
    done: 0,
    total: 0,
  });

  // Note Viewer State
  const [currentNote, setCurrentNote] = useState<NoteRecord | null>(null);
  const [viewStyle, setViewStyle] = useState<'doc' | 'hand'>('doc');
  const [viewAccent, setViewAccent] = useState('blue');
  const [viewSize, setViewSize] = useState(16);
  const [pdfStatus, setPdfStatus] = useState<string>('');
  const [pdfPreparing, setPdfPreparing] = useState(false);
  const [cachedPdfBlob, setCachedPdfBlob] = useState<{ key: string; blob: Blob; pages: number } | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Show Toast
  const showToast = (msg: string) => {
    setToastMsg(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToastMsg(null), 3800);
  };

  // Check connection on load
  useEffect(() => {
    async function initConn() {
      const res = await checkConnection(false);
      setConnStatus({
        state: res.ok ? 'ok' : 'bad',
        text: res.message,
      });
    }
    initConn();
    loadLibrary();
  }, []);

  const handleTestConnection = async () => {
    setConnStatus({ state: 'checking', text: 'Testing…' });
    const res = await checkConnection(true);
    setConnStatus({
      state: res.ok ? 'ok' : 'bad',
      text: res.message,
    });
    showToast(res.message);
  };

  // Load notes from store
  const loadLibrary = async () => {
    const list = await allNotes();
    setNotes(list);
  };

  // Append run log
  const log = (msg: string) => {
    setRunLogs((prev) => [...prev, msg]);
  };

  // Activity ticker effect
  useEffect(() => {
    const timer = setInterval(() => {
      const keys = Object.keys(activeTasksRef.current);
      if (!keys.length) {
        setRunSub('');
        return;
      }
      const text = keys
        .map((k) => {
          const a = activeTasksRef.current[k];
          const sec = Math.round((Date.now() - a.t0) / 1000);
          return `${k}: ${a.chars ? `writing, ${a.chars.toLocaleString()} characters` : 'Gemini is thinking…'} (${sec}s)`;
        })
        .join('   ·   ');
      setRunSub(text);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format file size
  const fmtSize = (n: number) =>
    n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';

  // Handle file additions
  const addFiles = (newFiles: FileList | File[]) => {
    const list = Array.from(newFiles);
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => `${f.name}-${f.size}`));
      const toAdd = list.filter((f) => !existing.has(`${f.name}-${f.size}`));
      return [...prev, ...toAdd];
    });
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  // Handle start generation
  const handleStartRun = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErr(null);

    const cleanLink = link.trim();
    const cleanTx = transcript.trim();

    if (!files.length && !cleanTx) {
      setFormErr(
        cleanLink
          ? 'A link alone cannot be read directly. Paste the class transcript or add the slides.'
          : 'Add a file, or paste a class transcript.'
      );
      return;
    }

    // Reset run state
    isRunningRef.current = true;
    abortCtrlRef.current = new AbortController();
    runStateRef.current = {
      units: null,
      parts: null,
      slideBatches: [],
      slideDone: [],
      slideAdd: [],
      extrasDone: !options.extras,
      extrasHtml: '',
      done: 0,
      total: 0,
    };
    setRunLogs([]);
    setRunErr(null);
    setRunPct(2);
    setRunStage('read');
    setRunTitle('Reading your material…');
    setView('run');

    await executeGeneration();
  };

  const setProgress = (frac: number, stage: 'read' | 'write' | 'extras' | 'finish', msg?: string) => {
    const p = Math.max(2, Math.min(Math.round(frac * 100), 99));
    setRunPct(p);
    setRunStage(stage);
    if (msg) setRunTitle(msg);
  };

  // Core execution engine
  const executeGeneration = async () => {
    abortCtrlRef.current = new AbortController();
    const signal = abortCtrlRef.current.signal;
    const r = runStateRef.current;
    const lang = resolveLang(langKey, langOther);

    try {
      // 1. Read files
      if (!r.units) {
        log('Reading your files…');
        r.units = await readFiles(files, options, log);
        const imgCount = r.units.filter((u) => u.blob).length;
        log(`Read ${r.units.length} pages/slides${imgCount ? `, ${imgCount} with pictures.` : '.'}`);
        if (!r.units.length && !transcript.trim()) {
          throw new Error('I could not find anything readable in those files.');
        }
      }

      // 2. Plan parts
      if (!r.parts) {
        const parts: RunPart[] = [];
        if (transcript.trim()) {
          const slidesRef = r.units
            .filter((u) => u.text)
            .map((u) => `[${u.label} id=${u.id}] ${u.text}`)
            .join('\n')
            .slice(0, 60000);
          const chunks = chunkTranscript(transcript);
          chunks.forEach((c) =>
            parts.push({
              kind: 'class transcript',
              ref:
                TRANSCRIPT_NOTE +
                (slidesRef
                  ? '\n\nThe class SLIDES text is given as reference below. Where the teacher is explaining a slide, merge slide content and speech into one place; keep every detail from both.\n\nSLIDES REFERENCE:\n' +
                    slidesRef
                  : ''),
              src: c,
              blobs: [],
              frag: null,
              audited: false,
              err: null,
            })
          );
          r.slideBatches = slidesRef && options.audit ? batchUnits(r.units, 8, 14000, 4) : [];
        } else {
          batchUnits(r.units, 6, 11000, 4).forEach((b) =>
            parts.push({
              kind: 'slides / document pages',
              ref: b.some((u) => u.blob)
                ? 'Pages may come with a PICTURE: read diagrams, charts, tables, equations and handwriting from it as carefully as the text.'
                : '',
              src: b.map(unitText).join('\n'),
              blobs: b.filter((u) => u.blob).map((u) => u.blob!),
              frag: null,
              audited: false,
              err: null,
            })
          );
          r.slideBatches = [];
        }

        r.parts = parts;
        r.slideDone = new Array(r.slideBatches.length).fill(false);
        r.slideAdd = new Array(r.slideBatches.length).fill('');
        r.total =
          parts.length * (options.audit ? 2 : 1) +
          r.slideBatches.length +
          (options.extras ? 1 : 0) +
          1;
        r.done = 0;
        log(`Split into ${parts.length} part${parts.length === 1 ? '' : 's'} so nothing is skipped.`);
      }

      const sys = systemPrompt(lang, options);
      const bump = (st: 'read' | 'write' | 'extras' | 'finish', msg: string) => {
        r.done++;
        setProgress(0.05 + (0.9 * r.done) / r.total, st, msg);
      };

      // 3. Write & Audit each part
      setProgress(0.06 + (0.9 * r.done) / r.total, 'write', 'Writing every topic…');
      const n = r.parts.length;

      for (let i = 0; i < n; i++) {
        const p = r.parts[i];
        if (signal.aborted) throw new Error('Stopped.');

        const taskKey = `part ${i + 1}`;
        try {
          if (p.frag === null) {
            activeTasksRef.current[taskKey] = { t0: Date.now(), chars: 0 };
            const prompt =
              sys +
              '\n\n---\n' +
              (i === 0
                ? 'This is the FIRST part: do not write a document title and no long introduction; start with the first topic.'
                : `This is part ${i + 1} of ${n}. Continue the same document seamlessly: no introduction, no title.`) +
              ' ' +
              (i === n - 1
                ? 'This is the LAST part.'
                : 'Do not write a conclusion for the whole document; more parts follow.') +
              '\nSource type: ' +
              p.kind +
              '.\n' +
              p.ref +
              '\n\nConvert ALL of the material below into note HTML. Cover everything.\n\nSOURCE:\n' +
              p.src;

            const res = await askGemini(
              prompt,
              p.blobs,
              signal,
              options.fast ? 'quick' : 'default',
              taskKey,
              (chars) => {
                if (activeTasksRef.current[taskKey]) {
                  activeTasksRef.current[taskKey].chars = chars;
                }
              }
            );
            p.frag = sanitize(res.text);
            bump('write', `Written part ${i + 1} of ${n}`);
            log(`Written part ${i + 1} of ${n}`);
          }
        } finally {
          delete activeTasksRef.current[taskKey];
        }

        if (options.audit && !p.audited) {
          const auditKey = `check ${i + 1}`;
          try {
            activeTasksRef.current[auditKey] = { t0: Date.now(), chars: 0 };
            const ap =
              AUDIT_PROMPT +
              '\n\nLANGUAGE: ' +
              lang.instr +
              '\n\nCOMPONENT REFERENCE:\n' +
              COMPONENTS +
              '\n\nSOURCE:\n' +
              p.src +
              '\n\nNOTE (plain text):\n' +
              stripTags(p.frag || '').slice(0, 90000);

            const res = await askGemini(
              ap,
              p.blobs,
              signal,
              'quick',
              auditKey,
              (chars) => {
                if (activeTasksRef.current[auditKey]) {
                  activeTasksRef.current[auditKey].chars = chars;
                }
              }
            );
            const add = sanitize(res.text);
            p.add = /<NONE\s*\/?>/i.test(res.text) || add.length < 30 ? '' : add;
            p.audited = true;
            if (p.add) log(`Completeness check added missing details to part ${i + 1}.`);
            bump('write', `Checked part ${i + 1} of ${n} for missing information`);
          } finally {
            delete activeTasksRef.current[auditKey];
          }
        }
      }

      // 4. Slides cross-check
      if (r.slideBatches.length) {
        const body = r.parts.map((p) => (p.frag || '') + (p.add || '')).join('\n');
        for (let k = 0; k < r.slideBatches.length; k++) {
          if (r.slideDone[k]) continue;
          const b = r.slideBatches[k];
          const ap =
            AUDIT_PROMPT +
            '\n\nLANGUAGE: ' +
            lang.instr +
            '\n\nSOURCE (class slides):\n' +
            b.map(unitText).join('\n') +
            '\n\nNOTE (plain text):\n' +
            stripTags(body).slice(0, 120000);

          const res = await askGemini(
            ap,
            b.filter((u) => u.blob).map((u) => u.blob!),
            signal,
            'quick'
          );
          const add = sanitize(res.text);
          r.slideAdd[k] = /<NONE\s*\/?>/i.test(res.text) || add.length < 30 ? '' : add;
          r.slideDone[k] = true;
          if (r.slideAdd[k]) {
            log(`Added slide details the lecture didn't mention (batch ${k + 1}).`);
          }
          bump('write', `Cross-checked slides (${k + 1}/${r.slideBatches.length})`);
        }
      }

      // 5. Study extras
      if (options.extras && !r.extrasDone) {
        setProgress(0.05 + (0.9 * r.done) / r.total, 'extras', 'Building glossary, revision sheet and self-test…');
        const body =
          r.parts.map((p) => (p.frag || '') + (p.add || '')).join('\n') + r.slideAdd.join('\n');
        const res = await askGemini(
          EXTRAS_PROMPT +
            '\n\nLANGUAGE: ' +
            lang.instr +
            '\n\nNOTE:\n' +
            stripTags(body).slice(0, 150000),
          [],
          signal,
          'default'
        );
        r.extrasHtml = sanitize(res.text);
        r.extrasDone = true;
        bump('extras', 'Study extras ready');
        log('Study extras ready.');
      }

      // 6. Finish & Assemble
      setProgress(0.96, 'finish', 'Finishing the document…');
      let body =
        r.parts.map((p) => (p.frag || '') + (p.add || '')).join('\n') +
        '\n' +
        r.slideAdd.join('\n') +
        '\n' +
        r.extrasHtml;

      if (r.units) {
        body = await embedPictures(body, r.units);
      }

      const labels = await legendLabels(lang, signal);
      const firstFileName = files[0] ? files[0].name.replace(/\.[^.]+$/, '') : 'Class notes';

      const record: NoteRecord = {
        id: 'n' + Date.now().toString(36),
        created: Date.now(),
        title: title.trim() || firstFileName,
        subject: subject.trim() || undefined,
        style,
        accent,
        lang: {
          name: lang.name,
          code: lang.code,
          dir: lang.dir,
        },
        source: [
          files.length ? `${files.length} file${files.length > 1 ? 's' : ''}` : '',
          transcript ? 'Class transcript' : '',
          link ? hostOf(link) : '',
        ]
          .filter(Boolean)
          .join(' + '),
        date: new Date().toLocaleDateString(undefined, {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
        body,
        labels,
      };

      await saveNote(record);
      await loadLibrary();
      isRunningRef.current = false;
      setRunPct(100);
      setRunStage('finish');
      setRunTitle('Your note is ready');
      showToast('Your note is ready');
      openNote(record);
    } catch (err: any) {
      isRunningRef.current = false;
      if (err?.message === 'Stopped.' || signal.aborted) {
        setRunTitle('Stopped');
        log('Stopped.');
        setRunErr('You stopped the run. Finished parts are kept; Retry continues from where you left off.');
        setCanRetry(true);
      } else {
        setRunTitle('Something went wrong');
        setRunErr(err?.message || 'Generation error occurred');
        log(`Error: ${err?.message || err}`);
        setCanRetry(true);
      }
    }
  };

  const hostOf = (u: string) => {
    try {
      return new URL(u).hostname.replace(/^www\./, '');
    } catch {
      return 'Class link';
    }
  };

  const handleStopRun = () => {
    if (abortCtrlRef.current) {
      abortCtrlRef.current.abort();
    }
  };

  // Open note in viewer
  const openNote = (rec: NoteRecord) => {
    setCurrentNote(rec);
    setViewStyle(rec.style);
    setViewAccent(rec.accent);
    setViewSize(16);
    setView('note');
    setPdfStatus('');
    setPdfPreparing(false);
    setCachedPdfBlob(null);

    // Schedule PDF generation
    triggerPdfGeneration(rec, rec.style, rec.accent);
  };

  // Trigger PDF preparation
  const triggerPdfGeneration = async (rec: NoteRecord, s: string, a: string) => {
    const key = `${rec.id}|${s}|${a}`;
    setPdfPreparing(true);
    setPdfStatus('Preparing PDF…');
    try {
      const res = await buildPdf(rec, s, a, (msg) => setPdfStatus(msg));
      setCachedPdfBlob({ key, blob: res.blob, pages: res.pages });
      setPdfStatus(`PDF ready (${res.pages} pages). Press Download PDF.`);
      setPdfPreparing(false);
    } catch (e: any) {
      setPdfStatus(`PDF generation error: ${e?.message || e}. You can still download HTML or print to PDF.`);
      setPdfPreparing(false);
    }
  };

  // Apply visual style or accent switch inside the viewer
  const updateViewerStyle = (newStyle: 'doc' | 'hand') => {
    setViewStyle(newStyle);
    if (!currentNote) return;
    const updated = { ...currentNote, style: newStyle };
    setCurrentNote(updated);
    saveNote(updated);
    triggerPdfGeneration(updated, newStyle, viewAccent);
  };

  const updateViewerAccent = (newAccent: string) => {
    setViewAccent(newAccent);
    if (!currentNote) return;
    const updated = { ...currentNote, accent: newAccent };
    setCurrentNote(updated);
    saveNote(updated);
    triggerPdfGeneration(updated, viewStyle, newAccent);
  };

  // Download Note as HTML
  const downloadHtml = () => {
    if (!currentNote) return;
    const html = noteDoc(currentNote, {
      style: viewStyle,
      accent: viewAccent,
      size: 0,
    });
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeName(currentNote.title)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('HTML saved');
  };

  // Download Note as PDF
  const downloadPdf = async () => {
    if (!currentNote) return;
    const key = `${currentNote.id}|${viewStyle}|${viewAccent}`;
    let blob: Blob | null = null;

    if (cachedPdfBlob && cachedPdfBlob.key === key) {
      blob = cachedPdfBlob.blob;
    } else {
      setPdfPreparing(true);
      setPdfStatus('Creating the PDF…');
      try {
        const res = await buildPdf(currentNote, viewStyle, viewAccent, (m) => setPdfStatus(m));
        blob = res.blob;
        setCachedPdfBlob({ key, blob: res.blob, pages: res.pages });
        setPdfStatus(`PDF ready (${res.pages} pages).`);
      } catch (err: any) {
        setPdfStatus(`PDF error: ${err?.message || err}`);
      } finally {
        setPdfPreparing(false);
      }
    }

    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeName(currentNote.title)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast('PDF downloaded');
    }
  };

  // Delete note from library
  const handleDeleteNote = async (id: string) => {
    if (deleteArmedId !== id) {
      setDeleteArmedId(id);
      setTimeout(() => {
        setDeleteArmedId((cur) => (cur === id ? null : cur));
      }, 3000);
      return;
    }
    await delNote(id);
    setDeleteArmedId(null);
    loadLibrary();
    showToast('Note deleted');
  };

  // Collect unique subjects for datalist
  const subjectsList = Array.from(new Set(notes.map((n) => n.subject).filter(Boolean)));

  return (
    <div className="wide">
      {/* Top Header */}
      <header className="top">
        <button
          className="logo"
          id="home"
          type="button"
          onClick={() => setView(isRunningRef.current ? 'run' : 'create')}
          aria-label="Margin home"
        >
          <svg viewBox="0 0 40 40" width="32" height="32" aria-hidden="true">
            <rect x="2" y="2" width="36" height="36" rx="11" fill="#15182b" />
            <path
              d="M12 28V12l8 10 8-10v16"
              fill="none"
              stroke="#ffd447"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="31" cy="9" r="3" fill="#ff5a3c" />
          </svg>
          Margin
        </button>

        <nav className="tabs" role="tablist">
          <button
            className="tab"
            id="tab-create"
            role="tab"
            aria-selected={view === 'create' || view === 'run'}
            onClick={() => setView(isRunningRef.current ? 'run' : 'create')}
          >
            Create
          </button>
          <button
            className="tab"
            id="tab-lib"
            role="tab"
            aria-selected={view === 'lib' || view === 'note'}
            onClick={() => {
              loadLibrary();
              setView('lib');
            }}
          >
            Library <em id="libn">{notes.length}</em>
          </button>
        </nav>

        {/* Gemini Built-in Connection Pill */}
        <button
          className={`pill ${connStatus.state === 'ok' ? 'ok' : connStatus.state === 'bad' ? 'bad' : ''}`}
          id="pill"
          type="button"
          title="Built-in Gemini Connection · Click to test"
          onClick={handleTestConnection}
        >
          <i />
          <span>{connStatus.text}</span>
        </button>
      </header>

      {/* ============ CREATE VIEW ============ */}
      {view === 'create' && (
        <section id="v-create">
          <div className="wrap">
            <div className="hero">
              <p className="eyebrow">Notes for students</p>
              <h1>
                Turn any class into a <mark>complete</mark> note
                <span className="note-scribble">nothing missed</span>
              </h1>
              <p className="lede">
                Add slides, PDFs, photos or a class transcript. Margin reads every page, writes one organised
                document with tables, flowcharts and diagrams, checks that nothing is left out, and gives you a
                PDF.
              </p>
            </div>

            <form id="form" autoComplete="off" onSubmit={handleStartRun}>
              {/* Step 1: Material */}
              <section className="step">
                <h2>
                  <span>1</span>Your material
                </h2>

                <div
                  className={`drop ${dragOver ? 'over' : ''}`}
                  id="drop"
                  tabIndex={0}
                  role="button"
                  aria-label="Choose files"
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
                  }}
                >
                  <input
                    ref={fileInputRef}
                    id="file"
                    type="file"
                    multiple
                    hidden
                    accept=".pdf,.pptx,.docx,.txt,.md,.csv,.png,.jpg,.jpeg,.webp,application/pdf"
                    onChange={(e) => {
                      if (e.target.files) addFiles(e.target.files);
                      e.target.value = '';
                    }}
                  />
                  <b>Drop files here or browse</b>
                  <small>PDF · PowerPoint · Word · text · photos of notes or whiteboards</small>
                </div>

                {files.length > 0 && (
                  <ul className="files" id="files">
                    {files.map((f, i) => (
                      <li key={`${f.name}-${i}`}>
                        <span className="ext">
                          {(f.name.split('.').pop() || '').slice(0, 4).toUpperCase()}
                        </span>
                        <span className="nm">{f.name}</span>
                        <span className="sz">{fmtSize(f.size)}</span>
                        <button
                          type="button"
                          aria-label={`Remove file ${f.name}`}
                          onClick={() => removeFile(i)}
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="sep">and / or</div>

                <label className="field" htmlFor="link">
                  <span className="lab">
                    Class link <em>(optional)</em>
                  </span>
                  <input
                    id="link"
                    type="url"
                    placeholder="https://youtube.com/watch?v=…"
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                  />
                </label>

                <label className="field" htmlFor="tx">
                  <span className="lab">
                    Class transcript <em>(what the teacher said)</em>
                  </span>
                  <textarea
                    id="tx"
                    placeholder="Paste the transcript of the class here. Margin merges it with your slides."
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                  />
                </label>
                <p className="hint">
                  This page cannot open external links directly, so speech comes from the transcript you paste.
                </p>

                <details className="how">
                  <summary>How do I get a transcript from a class link?</summary>
                  <ol>
                    <li>
                      <b>YouTube:</b> open the video, tap <i>…more</i> under it, choose <i>Show transcript</i>,
                      select all the text and copy it.
                    </li>
                    <li>
                      <b>Zoom, Teams, Meet recordings:</b> open the recording page, use <i>Transcript</i> or{' '}
                      <i>Captions</i>, then copy or download it.
                    </li>
                    <li>
                      Paste it above. Time stamps are fine and are kept as references in the note.
                    </li>
                  </ol>
                </details>
              </section>

              {/* Step 2: The look */}
              <section className="step">
                <h2>
                  <span>2</span>The look
                </h2>
                <div className="styles" role="radiogroup" aria-label="Note style">
                  <label className="opt">
                    <input
                      type="radio"
                      name="style"
                      value="doc"
                      checked={style === 'doc'}
                      onChange={() => setStyle('doc')}
                    />
                    <div className="card">
                      <div className="mini doc">
                        <b>1. Photosynthesis</b>
                        <i />
                        <i />
                        <i className="s" />
                      </div>
                      <strong>Document</strong>
                      <span>Looks like a Word file: numbered headings, tables, shaded call-outs.</span>
                    </div>
                  </label>

                  <label className="opt">
                    <input
                      type="radio"
                      name="style"
                      value="hand"
                      checked={style === 'hand'}
                      onChange={() => setStyle('hand')}
                    />
                    <div className="card">
                      <div className="mini hand">
                        <b>Photosynthesis</b>
                        <i />
                        <i />
                        <i className="s" />
                      </div>
                      <strong>Handwritten</strong>
                      <span>Notebook feel: marker highlights, sticky notes, doodle arrows.</span>
                    </div>
                  </label>
                </div>

                <div className="grid2">
                  <div className="field">
                    <span className="lab">Accent colour</span>
                    <div className="sws" id="sws">
                      {[
                        { id: 'blue', color: '#2f5496', label: 'Blue' },
                        { id: 'indigo', color: '#4f46e5', label: 'Indigo' },
                        { id: 'teal', color: '#0e8a80', label: 'Teal' },
                        { id: 'rose', color: '#d1304f', label: 'Rose' },
                        { id: 'amber', color: '#b87400', label: 'Amber' },
                        { id: 'slate', color: '#37455c', label: 'Slate' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className="sw"
                          data-a={item.id}
                          style={{ ['--c' as any]: item.color }}
                          aria-pressed={accent === item.id}
                          aria-label={item.label}
                          onClick={() => setAccent(item.id)}
                        />
                      ))}
                    </div>
                  </div>

                  <label className="field" htmlFor="lang">
                    <span className="lab">Note language</span>
                    <select
                      id="lang"
                      value={langKey}
                      onChange={(e) => setLangKey(e.target.value)}
                    >
                      <option value="en">English</option>
                      <option value="bn">বাংলা (Bangla)</option>
                      <option value="bn-en">English + বাংলা (bilingual)</option>
                      <option value="hi">हिन्दी (Hindi)</option>
                      <option value="ur">اردو (Urdu)</option>
                      <option value="ar">العربية (Arabic)</option>
                      <option value="es">Español</option>
                      <option value="fr">Français</option>
                      <option value="de">Deutsch</option>
                      <option value="pt">Português</option>
                      <option value="ru">Русский</option>
                      <option value="tr">Türkçe</option>
                      <option value="id">Bahasa Indonesia</option>
                      <option value="zh">中文</option>
                      <option value="ja">日本語</option>
                      <option value="ko">한국어</option>
                      <option value="other">Other…</option>
                    </select>
                    {langKey === 'other' && (
                      <input
                        id="lang-other"
                        type="text"
                        placeholder="Type any language, e.g. Swedish"
                        style={{ marginTop: '.5rem' }}
                        value={langOther}
                        onChange={(e) => setLangOther(e.target.value)}
                      />
                    )}
                  </label>
                </div>
                <p className="hint">You can switch style and colour again inside the finished note.</p>
              </section>

              {/* Step 3: What goes in */}
              <section className="step">
                <h2>
                  <span>3</span>What goes in
                </h2>
                <div className="toggles">
                  <label className="tg">
                    <input
                      type="checkbox"
                      id="o-audit"
                      checked={options.audit}
                      onChange={(e) => setOptions({ ...options, audit: e.target.checked })}
                    />
                    <span>
                      <b>Completeness check</b>
                      <small>A second pass hunts for anything missing and adds it.</small>
                    </span>
                  </label>

                  <label className="tg">
                    <input
                      type="checkbox"
                      id="o-visuals"
                      checked={options.visuals}
                      onChange={(e) => setOptions({ ...options, visuals: e.target.checked })}
                    />
                    <span>
                      <b>Diagrams, flowcharts, tables</b>
                      <small>Drawn by Gemini wherever they explain better than words.</small>
                    </span>
                  </label>

                  <label className="tg">
                    <input
                      type="checkbox"
                      id="o-explain"
                      checked={options.explain}
                      onChange={(e) => setOptions({ ...options, explain: e.target.checked })}
                    />
                    <span>
                      <b>Hard-topic explanations</b>
                      <small>“Explained simply” boxes with an everyday analogy.</small>
                    </span>
                  </label>

                  <label className="tg">
                    <input
                      type="checkbox"
                      id="o-examples"
                      checked={options.examples}
                      onChange={(e) => setOptions({ ...options, examples: e.target.checked })}
                    />
                    <span>
                      <b>Extra worked examples</b>
                      <small>Short examples where the source has none.</small>
                    </span>
                  </label>

                  <label className="tg">
                    <input
                      type="checkbox"
                      id="o-embed"
                      checked={options.embed}
                      onChange={(e) => setOptions({ ...options, embed: e.target.checked })}
                    />
                    <span>
                      <b>Include original pictures</b>
                      <small>Puts the real slide, chart or photo into the note where it matters.</small>
                    </span>
                  </label>

                  <label className="tg">
                    <input
                      type="checkbox"
                      id="o-extras"
                      checked={options.extras}
                      onChange={(e) => setOptions({ ...options, extras: e.target.checked })}
                    />
                    <span>
                      <b>Study extras</b>
                      <small>Glossary, one-page revision sheet and self-test questions.</small>
                    </span>
                  </label>

                  <label className="tg">
                    <input
                      type="checkbox"
                      id="o-fast"
                      checked={options.fast}
                      onChange={(e) => setOptions({ ...options, fast: e.target.checked })}
                    />
                    <span>
                      <b>Fast draft</b>
                      <small>Uses the quicker model. Good for a first look, a little less detailed.</small>
                    </span>
                  </label>

                  <label className="tg">
                    <input
                      type="checkbox"
                      id="o-read"
                      checked={options.read}
                      onChange={(e) => setOptions({ ...options, read: e.target.checked })}
                    />
                    <span>
                      <b>Read slide images</b>
                      <small>Looks at every slide picture: diagrams, charts, handwriting.</small>
                    </span>
                  </label>
                </div>

                <div className="grid2">
                  <label className="field" htmlFor="title">
                    <span className="lab">
                      Note title <em>(optional)</em>
                    </span>
                    <input
                      id="title"
                      type="text"
                      placeholder="e.g. Cell Biology, Lecture 5"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </label>

                  <label className="field" htmlFor="subject">
                    <span className="lab">
                      Subject <em>(optional)</em>
                    </span>
                    <input
                      id="subject"
                      type="text"
                      placeholder="e.g. Biology"
                      list="subjects"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                    />
                    <datalist id="subjects">
                      {subjectsList.map((s, idx) => (
                        <option key={idx} value={s as string} />
                      ))}
                    </datalist>
                  </label>
                </div>
              </section>

              <button className="go" id="go" type="submit">
                Create my note →
              </button>
              <p className="hint" id="eta">
                Powered by Gemini 3.8. A 30-slide deck usually takes 1 to 2 minutes.
              </p>
              {formErr && <p className="err" id="ferr">{formErr}</p>}
            </form>
          </div>
        </section>
      )}

      {/* ============ RUN VIEW ============ */}
      {view === 'run' && (
        <section id="v-run">
          <div className="wrap run">
            <p className="eyebrow">Working on it</p>
            <h1 id="rtitle">{runTitle}</h1>
            <div className="bar">
              <i id="rfill" style={{ width: `${runPct}%` }} />
            </div>
            <p className="pct" id="rpct">{runPct}%</p>
            <p className="sub" id="rsub" aria-live="polite">{runSub}</p>

            <ol className="stages" id="stages">
              <li
                data-s="read"
                className={
                  runStage === 'read'
                    ? 'on'
                    : ['write', 'extras', 'finish'].includes(runStage)
                    ? 'done'
                    : ''
                }
              >
                <i />Reading slides and pages
              </li>
              <li
                data-s="write"
                className={
                  runStage === 'write'
                    ? 'on'
                    : ['extras', 'finish'].includes(runStage)
                    ? 'done'
                    : ''
                }
              >
                <i />Writing every topic and checking nothing is missing
              </li>
              <li
                data-s="extras"
                className={
                  runStage === 'extras' ? 'on' : runStage === 'finish' ? 'done' : ''
                }
              >
                <i />Glossary, revision sheet and self-test
              </li>
              <li data-s="finish" className={runStage === 'finish' ? 'done' : ''}>
                <i />Finishing the document
              </li>
            </ol>

            <pre className="log" id="log">
              {runLogs.join('\n')}
            </pre>

            <div className="acts">
              {isRunningRef.current && (
                <button className="ghost" id="stop" type="button" onClick={handleStopRun}>
                  Stop
                </button>
              )}
            </div>

            {runErr && (
              <div className="box-err" id="rerr">
                <b>Some parts did not finish.</b>
                <p id="rerr-msg">{runErr}</p>
                <div className="acts">
                  {canRetry && (
                    <button
                      className="go"
                      id="retry"
                      type="button"
                      onClick={() => {
                        isRunningRef.current = true;
                        setRunErr(null);
                        executeGeneration();
                      }}
                    >
                      Retry unfinished parts
                    </button>
                  )}
                  <button
                    className="ghost"
                    id="back"
                    type="button"
                    onClick={() => {
                      isRunningRef.current = false;
                      setView('create');
                    }}
                  >
                    Back to the form
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ============ NOTE VIEW ============ */}
      {view === 'note' && currentNote && (
        <section id="v-note">
          <div className="nbar">
            <button
              className="ghost"
              id="n-back"
              type="button"
              onClick={() => {
                loadLibrary();
                setView('lib');
              }}
            >
              ← Library
            </button>
            <span className="nt" id="n-title">
              {currentNote.title}
            </span>
            <span className="sp" />

            {/* Document vs Handwritten toggle */}
            <div className="seg" role="group" aria-label="Style">
              <button
                id="st-doc"
                type="button"
                aria-pressed={viewStyle === 'doc'}
                onClick={() => updateViewerStyle('doc')}
              >
                Document
              </button>
              <button
                id="st-hand"
                type="button"
                aria-pressed={viewStyle === 'hand'}
                onClick={() => updateViewerStyle('hand')}
              >
                Handwritten
              </button>
            </div>

            {/* Accent swatches */}
            <div className="sws" id="nsws" style={{ padding: 0 }}>
              {[
                { id: 'blue', color: '#2f5496', label: 'Blue' },
                { id: 'teal', color: '#0e8a80', label: 'Teal' },
                { id: 'rose', color: '#d1304f', label: 'Rose' },
                { id: 'amber', color: '#b87400', label: 'Amber' },
                { id: 'slate', color: '#37455c', label: 'Slate' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="sw"
                  data-a={item.id}
                  style={{ ['--c' as any]: item.color }}
                  aria-pressed={viewAccent === item.id}
                  aria-label={item.label}
                  onClick={() => updateViewerAccent(item.id)}
                />
              ))}
            </div>

            {/* Text Zoom */}
            <button
              className="ghost"
              id="zoom-out"
              type="button"
              aria-label="Smaller text"
              onClick={() => setViewSize((s) => Math.max(12, s - 1))}
            >
              A−
            </button>
            <button
              className="ghost"
              id="zoom-in"
              type="button"
              aria-label="Bigger text"
              onClick={() => setViewSize((s) => Math.min(24, s + 1))}
            >
              A+
            </button>

            {/* Downloads */}
            <button
              className="go"
              id="dl-pdf"
              type="button"
              style={{ padding: '.55rem 1rem', fontSize: '.9rem' }}
              disabled={pdfPreparing}
              onClick={downloadPdf}
            >
              {pdfPreparing ? 'Preparing PDF…' : '⬇ Download PDF'}
            </button>
            <button className="ghost" id="dl-html" type="button" onClick={downloadHtml}>
              ⬇ HTML
            </button>
          </div>

          <iframe
            ref={iframeRef}
            id="frame"
            title="Your note"
            sandbox="allow-same-origin"
            srcDoc={noteDoc(currentNote, {
              style: viewStyle,
              accent: viewAccent,
              size: viewSize,
            })}
          />
          <p className="status" id="nstatus" aria-live="polite">
            {pdfStatus}
          </p>
        </section>
      )}

      {/* ============ LIBRARY VIEW ============ */}
      {view === 'lib' && (
        <section id="v-lib">
          <div className="libh">
            <h1>My library</h1>
          </div>

          {notes.length === 0 ? (
            <p className="empty" id="lib-empty">
              No notes yet. Your first one takes just a couple of minutes.
            </p>
          ) : (
            <div className="lib" id="lib">
              {notes.map((n) => (
                <article className="nc" key={n.id}>
                  <span className="tag">{n.subject || 'Note'}</span>
                  <h3>{n.title}</h3>
                  <div className="m">
                    {[
                      n.style === 'hand' ? 'Handwritten' : 'Document',
                      n.lang?.name || 'English',
                      n.date,
                    ].join(' · ')}
                  </div>
                  <div className="b">
                    <button
                      className="go"
                      style={{ padding: '.45rem .9rem', fontSize: '.85rem' }}
                      type="button"
                      data-a="open"
                      onClick={() => openNote(n)}
                    >
                      Open
                    </button>
                    <button
                      className="ghost"
                      type="button"
                      data-a="del"
                      onClick={() => handleDeleteNote(n.id)}
                    >
                      {deleteArmedId === n.id ? 'Click again to delete' : 'Delete'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Toast Notification */}
      {toastMsg && (
        <div className="toast" id="toast">
          {toastMsg}
        </div>
      )}
    </div>
  );
}
