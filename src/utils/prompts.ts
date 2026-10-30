/**
 * Prompts, language configurations, and HTML document styles for Margin Notes.
 */

export const NOTE_CSS = `
*{box-sizing:border-box}
:root{--ink:#1d2233;--muted:#5c6377;--line:#d8dce8;--bg:#e4e7ee;
 --acc:#2f5496;--acc-soft:#e9effa;--acc-ink:#1f3864;
 --amber:#c98a00;--amber-soft:#fff5d6;--amber-ink:#7a5200;
 --teal:#0e8a80;--teal-soft:#dcf5f1;--teal-ink:#0a5a54;
 --rose:#d1304f;--rose-soft:#ffe6eb;--rose-ink:#8c1330;
 --violet:#7040d8;--violet-soft:#f0e8ff;--violet-ink:#4a24a0;
 --sky:#0a7fb8;--sky-soft:#def1fb;--sky-ink:#075680;
 --green:#178a42;--green-soft:#dff5e6;--green-ink:#0d5a2a;
 --body:'Carlito','Calibri','Hind Siliguri','Noto Sans Arabic',system-ui,sans-serif;
 --hand:'Kalam','Atma','Hind Siliguri','Noto Sans Arabic',cursive;
 --script:'Caveat','Atma','Hind Siliguri',cursive;
 --mono:'JetBrains Mono',ui-monospace,Menlo,Consolas,monospace}
[data-accent=indigo]{--acc:#4f46e5;--acc-soft:#ebe9fd;--acc-ink:#3730a3}
[data-accent=teal]{--acc:#0e8a80;--acc-soft:#dcf5f1;--acc-ink:#0a5a54}
[data-accent=rose]{--acc:#d1304f;--acc-soft:#ffe6eb;--acc-ink:#8c1330}
[data-accent=amber]{--acc:#b87400;--acc-soft:#fff0cc;--acc-ink:#7a4d00}
[data-accent=slate]{--acc:#37455c;--acc-soft:#e6eaf1;--acc-ink:#1f2a3b}
html{font-size:16px}
body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--body);line-height:1.62;-webkit-font-smoothing:antialiased}
.sheet{width:min(794px,calc(100% - 24px));margin:20px auto 40px;background:#fff;padding:60px 68px 72px;box-shadow:0 1px 3px rgba(20,24,50,.12),0 14px 40px -18px rgba(20,24,50,.35);counter-reset:sec}
@media(max-width:700px){.sheet{padding:28px 20px 40px}}

/* cover */
.cover{margin-bottom:26px;padding-bottom:16px;border-bottom:3px solid var(--acc)}
.cover .kicker{font-size:.78rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
.cover h1{font-size:2.35rem;line-height:1.12;margin:.35rem 0 .6rem;color:var(--acc-ink);letter-spacing:-.01em}
.meta{display:flex;flex-wrap:wrap;gap:.2rem .9rem;color:var(--muted);font-size:.86rem}
.meta span+span::before{content:"•";margin-inline-end:.9rem;color:var(--line)}
.legend{margin-top:14px;display:flex;flex-wrap:wrap;gap:.35rem;align-items:center;font-size:.74rem;font-weight:700}
.legend b{color:var(--muted);text-transform:uppercase;letter-spacing:.08em;font-size:.66rem;margin-inline-end:.3rem}
.legend span{padding:.28rem .55rem;border-radius:6px;background:var(--bg-l);border-inline-start:4px solid var(--b-l);color:var(--ink)}
.l-def{--b-l:var(--acc);--bg-l:var(--acc-soft)}.l-key{--b-l:var(--amber);--bg-l:var(--amber-soft)}.l-ex{--b-l:var(--teal);--bg-l:var(--teal-soft)}
.l-formula{--b-l:var(--violet);--bg-l:var(--violet-soft)}.l-why{--b-l:var(--sky);--bg-l:var(--sky-soft)}.l-warn{--b-l:var(--rose);--bg-l:var(--rose-soft)}.l-tip{--b-l:var(--green);--bg-l:var(--green-soft)}

/* headings */
.sheet h2,.sheet h3,.sheet h4{line-height:1.25;margin:0}
section.topic{margin:34px 0;counter-increment:sec;counter-reset:sub}
section.topic.addendum,section.topic.extras{counter-increment:none}
section.topic.addendum{margin:14px 0 0;padding-inline-start:14px;border-inline-start:3px dashed var(--line)}
.sheet h2{font-size:1.55rem;color:var(--acc-ink);padding-bottom:6px;border-bottom:1px solid var(--line);margin-bottom:14px}
.sheet h3{font-size:1.2rem;color:var(--acc);margin:22px 0 6px;counter-increment:sub}
.sheet h4{font-size:1.02rem;margin:16px 0 4px}
.sheet p{margin:.5rem 0}
.sheet ul,.sheet ol{margin:.45rem 0;padding-inline-start:1.35rem}
.sheet li{margin:.22rem 0}
.sheet li::marker{color:var(--acc);font-weight:700}
.sheet code{font-family:var(--mono);font-size:.86em;background:#f0f1f7;border-radius:4px;padding:.08em .35em}
.sheet small{color:var(--muted)}

/* inline */
b.term{color:var(--acc-ink);font-weight:700}
mark.hl,mark.hl2,mark.hl3{color:inherit;border-radius:3px;padding:.02em .2em}
mark.hl{background:#fff0a3}mark.hl2{background:#ffd2e0}mark.hl3{background:#cdeafb}
u.ul{text-decoration:underline;text-decoration-color:var(--rose);text-decoration-thickness:2px;text-underline-offset:3px}
.arr{color:var(--rose);font-weight:800;padding:0 .12em}
.ts{display:inline-block;font-size:.66rem;font-weight:700;color:var(--muted);background:#eef0f6;border-radius:5px;padding:.15rem .4rem;vertical-align:middle;margin-inline:.2rem}

/* boxes */
.box{--b:var(--acc);--bg:var(--acc-soft);--bi:var(--acc-ink);margin:16px 0;padding:12px 16px 13px;background:var(--bg);border-inline-start:5px solid var(--b);border-radius:6px;position:relative}
.box.def{--b:var(--acc);--bg:var(--acc-soft);--bi:var(--acc-ink)}.box.key{--b:var(--amber);--bg:var(--amber-soft);--bi:var(--amber-ink)}
.box.ex{--b:var(--teal);--bg:var(--teal-soft);--bi:var(--teal-ink)}.box.formula{--b:var(--violet);--bg:var(--violet-soft);--bi:var(--violet-ink)}
.box.why{--b:var(--sky);--bg:var(--sky-soft);--bi:var(--sky-ink)}.box.warn{--b:var(--rose);--bg:var(--rose-soft);--bi:var(--rose-ink)}
.box.tip{--b:var(--green);--bg:var(--green-soft);--bi:var(--green-ink)}.box.recap{--b:#1d2233;--bg:#eceef4;--bi:#1d2233}
.box .label{font-size:.72rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--bi);margin-bottom:6px}
.box>:last-child{margin-bottom:0}.box p:first-of-type{margin-top:.15rem}
.box.formula p{font-size:1.1rem}

/* blocks */
.flow{display:flex;flex-wrap:wrap;align-items:stretch;gap:6px;margin:20px 0}
.flow .node{flex:1 1 120px;background:#fff;border:2px solid var(--acc);border-radius:10px;padding:9px 12px;text-align:center;font-weight:700;font-size:.92rem;line-height:1.35}
.flow .link{align-self:center;color:var(--rose);font-size:1.5rem;font-weight:800;text-align:center;line-height:1;min-width:30px}
.flow .link small{display:block;font-size:.6rem;line-height:1.1;color:var(--muted);margin-top:2px;font-weight:600}
.flow.vertical{flex-direction:column;align-items:center}.flow.vertical .node{flex:none;width:min(100%,420px)}.flow.vertical .link{transform:rotate(90deg);min-width:0;margin:5px 0}
.cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px;margin:18px 0}
.cols .col{background:#fff;border:1px solid var(--line);border-top:4px solid var(--acc);border-radius:8px;padding:10px 14px}
.cols .col:nth-child(2){border-top-color:var(--teal)}.cols .col:nth-child(3){border-top-color:var(--amber)}
.timeline{position:relative;margin:20px 0;padding-inline-start:26px;border-inline-start:3px solid var(--acc-soft)}
.tl-item{position:relative;margin:0 0 14px}
.tl-item:before{content:"";position:absolute;inset-inline-start:-35px;top:6px;width:14px;height:14px;border-radius:50%;background:#fff;border:3px solid var(--acc)}
.tl-when{display:inline-block;font-size:.78rem;font-weight:800;color:var(--acc-ink);background:var(--acc-soft);padding:.2rem .55rem;border-radius:5px;margin-bottom:3px}
.aside{margin:16px 0;padding:10px 14px;border:1.5px dashed var(--amber);background:var(--amber-soft);border-radius:8px;font-size:.93rem;color:var(--amber-ink)}
details.qa{margin:8px 0;border:1px solid var(--line);border-radius:8px;background:#fff;overflow:hidden}
details.qa summary{cursor:pointer;padding:10px 14px;font-weight:700;list-style:none;display:flex;gap:10px;align-items:baseline}
details.qa summary::before{content:"Q";flex:none;font-size:.7rem;font-weight:800;background:var(--acc);color:#fff;border-radius:5px;padding:.2rem .4rem}
details.qa[open] summary{background:var(--acc-soft)}
details.qa p{margin:0;padding:10px 14px 14px}
table{border-collapse:collapse;width:100%;margin:18px 0;font-size:.93rem;background:#fff}
th{background:var(--acc);color:#fff;text-align:start;padding:8px 10px;font-weight:700;border:1px solid var(--acc)}
td{padding:7px 10px;border:1px solid var(--line);vertical-align:top}
tbody tr:nth-child(even) td{background:#f6f8fc}
figure.visual,figure.shot{margin:22px 0;padding:14px 14px 10px;background:#fff;border:1px solid var(--line);border-radius:10px;text-align:center}
figure.visual svg{width:100%;height:auto;max-width:680px;display:block;margin:0 auto;overflow:visible}
figure.shot img{max-width:100%;height:auto;border:1px solid var(--line);border-radius:4px}
figcaption{font-size:.82rem;color:var(--muted);margin-top:8px;font-style:italic}
svg text{font-family:inherit}
svg .n1{fill:var(--acc-soft);stroke:var(--acc);stroke-width:2}
svg .n2{fill:var(--amber-soft);stroke:var(--amber);stroke-width:2}
svg .n3{fill:var(--teal-soft);stroke:var(--teal);stroke-width:2}
svg .n4{fill:var(--rose-soft);stroke:var(--rose);stroke-width:2}
svg .n5{fill:var(--violet-soft);stroke:var(--violet);stroke-width:2}
svg .n6{fill:var(--sky-soft);stroke:var(--sky);stroke-width:2}
svg .n7{fill:var(--green-soft);stroke:var(--green);stroke-width:2}
svg .n8{fill:#fff;stroke:var(--ink);stroke-width:2}
svg .ln{fill:none;stroke:var(--ink);stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
svg .ar{fill:none;stroke:var(--rose);stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round}
svg .dash{stroke-dasharray:7 6}
svg .t{fill:var(--ink);font-size:14px;font-weight:500}svg .tb{font-weight:700}svg .tsm{fill:var(--muted);font-size:12px}svg .tl{font-size:18px;font-weight:800}svg .tm{text-anchor:middle}

/* ===== DOCUMENT style: numbered headings like a Word file ===== */
[data-style=doc] section.topic:not(.extras):not(.addendum)>h2::before{content:counter(sec) ". "}
[data-style=doc] section.topic:not(.extras):not(.addendum)>h3::before{content:counter(sec) "." counter(sub) "  ";color:var(--muted);font-weight:600}
[data-style=doc] .sheet h4{color:var(--ink)}

/* ===== HANDWRITTEN style ===== */
[data-style=hand]{--bg:#d9d3c6}
[data-style=hand] body,[data-style=hand] .sheet{font-family:var(--hand)}
[data-style=hand] .sheet{font-size:1.1rem;line-height:1.75;color:#23253a;background-color:#fffdf4;background-image:radial-gradient(circle,#bfc7de 1.1px,transparent 1.3px);background-size:24px 24px;border-radius:6px 20px 8px 18px;box-shadow:0 2px 0 #cfc7b3,0 22px 46px -22px rgba(60,45,20,.5)}
[data-style=hand] .cover{border-bottom:0}
[data-style=hand] .cover .kicker{font-family:var(--script);font-size:1.5rem;letter-spacing:.02em;text-transform:none;color:var(--rose)}
[data-style=hand] .cover h1{font-family:var(--script);font-size:3.4rem;font-weight:700;color:var(--acc-ink);line-height:1.05;display:inline-block;background:linear-gradient(transparent 62%,var(--acc-soft) 62%,var(--acc-soft) 92%,transparent 92%);padding:0 .2em;margin-inline-start:-.2em}
[data-style=hand] .meta,[data-style=hand] .legend span,[data-style=hand] .legend b,[data-style=hand] .ts{font-family:var(--hand);letter-spacing:0;text-transform:none}
[data-style=hand] .legend span{border-inline-start:0;border:1.6px solid var(--b-l);border-radius:255px 12px 225px 12px/12px 225px 12px 255px;font-size:.85rem;padding:.3rem .65rem}
[data-style=hand] .sheet h2{font-family:var(--script);font-size:2.3rem;font-weight:700;color:var(--acc-ink);display:inline-block;border-bottom:0;padding:0 .2rem;margin-bottom:10px;background:linear-gradient(transparent 64%,#ffe9a8 64%,#ffe9a8 90%,transparent 90%)}
[data-style=hand] .sheet h3{font-family:var(--script);font-size:1.75rem;color:var(--rose);margin:18px 0 4px}
[data-style=hand] .sheet h3::before{content:"✦ ";font-size:.8em}
[data-style=hand] .sheet h4{font-family:var(--script);font-size:1.4rem;color:var(--teal);text-decoration:underline wavy;text-decoration-thickness:1.5px;text-underline-offset:4px}
[data-style=hand] .sheet ul{list-style:none;padding-inline-start:1.4rem}
[data-style=hand] .sheet ul>li{position:relative}
[data-style=hand] .sheet ul>li::before{content:"➤";position:absolute;inset-inline-start:-1.3rem;color:var(--rose);font-size:.8em;top:.2em}
[data-style=hand] .sheet ol>li::marker{font-family:var(--script);font-size:1.3em;color:var(--rose)}
[data-style=hand] b.term{border-bottom:2.5px solid var(--acc)}
[data-style=hand] mark.hl{background:linear-gradient(104deg,transparent .6%,#ffe45c 2.5%,#ffe45c 94%,transparent 99%);border-radius:.4em .9em .5em .8em;padding:.04em .3em}
[data-style=hand] mark.hl2{background:linear-gradient(100deg,transparent .6%,#ffb3cc 2.5%,#ffb3cc 94%,transparent 99%);border-radius:.8em .4em .9em .5em;padding:.04em .3em}
[data-style=hand] mark.hl3{background:linear-gradient(103deg,transparent .6%,#a8dcf7 2.5%,#a8dcf7 94%,transparent 99%);border-radius:.5em .9em .4em .8em;padding:.04em .3em}
[data-style=hand] u.ul{text-decoration-style:wavy}
[data-style=hand] .arr{font-family:var(--script);font-size:1.5em;line-height:.5}
[data-style=hand] .ts{background:#fff4c2;border:1.2px dashed #c9a53a;color:#6b5a1b;font-size:.78rem}
[data-style=hand] code{background:#fff0c9}
[data-style=hand] .box{border-inline-start:0;border:2.6px solid var(--b);padding:22px 20px 14px;margin:28px 0 22px;border-radius:255px 18px 225px 18px/18px 225px 18px 255px;transform:rotate(-.3deg);box-shadow:3px 4px 0 rgba(0,0,0,.1)}
[data-style=hand] .box:nth-of-type(even){transform:rotate(.3deg);border-radius:18px 255px 18px 225px/225px 18px 255px 18px}
[data-style=hand] .box .label{position:absolute;top:-15px;inset-inline-start:18px;margin:0;background:var(--b);color:#fff;font-family:var(--script);font-size:1.15rem;font-weight:700;letter-spacing:0;text-transform:none;padding:4px 12px 3px;border-radius:10px 10px 10px 3px;transform:rotate(-1.6deg)}
[data-style=hand] .flow .node{font-family:var(--hand);border:2.4px solid var(--acc);border-radius:255px 14px 225px 14px/14px 225px 14px 255px;box-shadow:2px 3px 0 var(--acc-soft)}
[data-style=hand] .flow .link{font-family:var(--script);font-size:2.2rem}
[data-style=hand] .cols .col{border:2.2px solid var(--ink);border-radius:255px 14px 225px 14px/14px 225px 14px 255px;box-shadow:3px 3px 0 rgba(0,0,0,.1)}
[data-style=hand] .tl-when{font-family:var(--script);font-size:1.2rem;background:#ffe45c;color:#3a3000;transform:rotate(-1.2deg)}
[data-style=hand] .timeline{border-inline-start:3px dashed var(--acc)}
[data-style=hand] .aside{font-family:var(--script);font-size:1.3rem;line-height:1.25;background:#fff176;border:0;border-radius:2px;color:#4a3d00;transform:rotate(1.2deg);box-shadow:3px 5px 8px rgba(0,0,0,.2);max-width:80%;margin-inline:auto 0;padding:12px 16px}
[data-style=hand] details.qa{border:2.2px dashed var(--acc);border-radius:16px 4px 16px 4px}
[data-style=hand] table{border:2.4px solid var(--ink)}
[data-style=hand] th{background:var(--acc-soft);color:var(--acc-ink);font-family:var(--script);font-size:1.3rem;border-color:var(--ink)}
[data-style=hand] td{border-color:#b9bdd0}
[data-style=hand] figure.visual,[data-style=hand] figure.shot{border:2.4px solid var(--ink);border-radius:255px 16px 225px 16px/16px 225px 16px 255px;padding:18px 18px 12px}
[data-style=hand] figure.visual svg{filter:url(#rough)}
[data-style=hand] figure.visual svg .t{font-family:var(--hand);font-size:15px;font-weight:600}
[data-style=hand] figcaption{font-family:var(--script);font-style:normal;font-size:1.2rem;color:var(--rose)}

/* ===== PDF export mode: fixed A4 width, no shadow ===== */
.pdf body,.pdf{background:#fff!important}
.pdf .sheet{width:794px;margin:0;box-shadow:none;padding:40px 64px 48px;border-radius:0}
.pdf[data-style=hand] .sheet{border-radius:0}
.pdf figure.visual svg{filter:none!important}
`;

export const LANGS: Record<string, [string, string, string, string]> = {
  en: ['English', 'en', 'ltr', 'Write the whole note in clear English.'],
  bn: ['Bangla', 'bn', 'ltr', 'Write the whole note in Bangla (বাংলা), in simple natural student-friendly Bangla. Keep technical terms, formulas, symbols, code and proper names in their original English form; the first time a term appears write it as বাংলা শব্দ (English term) when a common Bangla word exists.'],
  'bn-en': ['Bangla + English', 'bn', 'ltr', 'Write the note bilingually for a Bangladeshi student: headings in English with the Bangla in brackets; definitions and key points in English; every explanation, "explained simply" box and recap in simple Bangla (বাংলা). Keep technical terms in English.'],
  hi: ['Hindi', 'hi', 'ltr', 'Write the whole note in Hindi (हिन्दी). Keep technical terms in English where students use them.'],
  ur: ['Urdu', 'ur', 'rtl', 'Write the whole note in Urdu (اردو). Keep technical terms in English where students use them.'],
  ar: ['Arabic', 'ar', 'rtl', 'Write the whole note in Arabic (العربية). Keep technical terms in English in brackets.'],
  es: ['Spanish', 'es', 'ltr', 'Write the whole note in Spanish.'],
  fr: ['French', 'fr', 'ltr', 'Write the whole note in French.'],
  de: ['German', 'de', 'ltr', 'Write the whole note in German.'],
  pt: ['Portuguese', 'pt', 'ltr', 'Write the whole note in Portuguese.'],
  ru: ['Russian', 'ru', 'ltr', 'Write the whole note in Russian.'],
  tr: ['Turkish', 'tr', 'ltr', 'Write the whole note in Turkish.'],
  id: ['Indonesian', 'id', 'ltr', 'Write the whole note in Indonesian.'],
  zh: ['Chinese', 'zh', 'ltr', 'Write the whole note in Simplified Chinese.'],
  ja: ['Japanese', 'ja', 'ltr', 'Write the whole note in Japanese.'],
  ko: ['Korean', 'ko', 'ltr', 'Write the whole note in Korean.'],
};

export interface LangInfo {
  name: string;
  code: string;
  dir: string;
  instr: string;
}

export function resolveLang(v: string, other?: string): LangInfo {
  if (v === 'other') {
    const n = (other || 'English').trim() || 'English';
    return {
      name: n,
      code: 'en',
      dir: 'ltr',
      instr: 'Write the whole note in ' + n + '. Keep technical terms in English in brackets when helpful.',
    };
  }
  const l = LANGS[v] || LANGS.en;
  return { name: l[0], code: l[1], dir: l[2], instr: l[3] };
}

export const COMPONENTS = `
STRUCTURE
- Wrap every major topic in <section class="topic"> that begins with <h2> (plain heading text, an emoji is optional). Use <h3> for sub-topics and <h4> for small sub-points. Use <p>, <ul>/<ol>/<li>.
- Prefer short, scannable bullet notes, but never at the cost of dropping information.

TABLES (use them whenever the content is a comparison, a list of items with properties, classifications, steps with inputs/outputs, dates, formulas with variables, pros/cons, or any data in rows):
  <table><thead><tr><th>…</th></tr></thead><tbody><tr><td>…</td></tr></tbody></table>

INLINE MARKUP (use generously, like a student with highlighters)
- <b class="term">key term</b> first appearance of each important term
- <mark class="hl">…</mark> the single most important phrase/fact/number; <mark class="hl2">…</mark> contrast or secondary idea; <mark class="hl3">…</mark> names, dates, units, conditions
- <u class="ul">…</u> something to remember / exam favourite
- <span class="arr">→</span> arrows for cause → effect, leads to, becomes (also ⇒ ↑ ↓ ⇄)
- <span class="ts">Slide 4</span> or <span class="ts">12:30</span> source reference chips (slide, page or class time)
- <code>…</code> for code/commands; <sub>/<sup> for maths and chemistry

CALL-OUT BOXES: <div class="box TYPE"><div class="label">Label</div> … </div>
  TYPE = def (📘 Definition: every formal definition) · key (⭐ Key idea / rule) · ex (🧪 Example: every worked example, case study or story)
         formula (🧮 Formula: formula + legend of every symbol and unit) · why (💡 Explained simply: plain-language explanation of a HARD idea with an everyday analogy)
         warn (⚠️ Watch out: common mistakes, exceptions, exam traps, things the teacher stressed, announcements, deadlines) · tip (🧠 Memory trick: mnemonics and patterns)
         recap (✅ Quick recap: 3-5 lines closing a big topic)
  Write the label text in the note's language.

DIAGRAM-LIKE BLOCKS
- Simple flowchart / process / cause chain: <div class="flow"><div class="node">Step A</div><div class="link">→<small>because</small></div><div class="node">Step B</div></div>  (add class "vertical" for top-to-bottom)
- Compare / contrast (2-3 columns): <div class="cols"><div class="col"><h4>A</h4><ul>…</ul></div><div class="col"><h4>B</h4><ul>…</ul></div></div>
- Timeline / history / stages: <div class="timeline"><div class="tl-item"><span class="tl-when">1905</span><div>What happened</div></div></div>
- Margin note / teacher comment: <div class="aside">✎ …</div>
- Self-test question: <details class="qa"><summary>Question?</summary><p>Answer</p></details>

ILLUSTRATIONS (inline SVG that you draw yourself)
<figure class="visual"><svg viewBox="0 0 640 H" role="img" aria-label="…"> … </svg><figcaption>Fig. N: caption</figcaption></figure>
- viewBox width is always 640, height 200-420. No width/height attributes, no <style>, no <script>, no external images, no inline colours.
- Style ONLY with these classes: shapes (fill+outline) n1 accent · n2 amber · n3 teal · n4 rose · n5 violet · n6 sky · n7 green · n8 white;
  lines: ln (ink line) · ar (rose arrow line, add marker-end="url(#ah)") · dash (dashed); text: t (normal) · tb (bold) · tsm (small grey) · tl (large) · tm (centred, text-anchor middle).
- Draw real, meaningful diagrams: labelled parts of a system, cycles with arrows, graphs with axes and labelled curves, layer stacks, hierarchies and trees, circuits, number lines, Venn diagrams, and FLOWCHARTS with start/end rounded boxes, process rectangles, decision diamonds (<polygon>) with Yes/No branches and arrows.
  Keep text inside shapes short, never overlapping, with 12px+ padding. Every label must be readable.
`;

export interface GenerationOptions {
  audit: boolean;
  visuals: boolean;
  explain: boolean;
  examples: boolean;
  embed: boolean;
  extras: boolean;
  read: boolean;
  fast: boolean;
}

export function systemPrompt(lang: LangInfo, o: GenerationOptions): string {
  const visuals = o.visuals
    ? 'For every major topic whose content is a process, algorithm, structure, cycle, relationship, comparison, graph or hierarchy, include a flowchart, diagram, table or comparison block. A table or flowchart that makes the topic clearer is better than extra prose. Aim for at least one visual element per topic.'
    : 'Do NOT draw SVG figures. You may still use tables, flow, cols and timeline blocks where they clarify.';
  const explain = o.explain
    ? 'For every concept a beginner would find hard (abstract, mathematical, many steps, counter-intuitive) add a "why" box: plain words, an everyday analogy, then the logic step by step. Anything you add that is not in the source goes inside a why/tip/ex box, never mixed into factual bullets.'
    : 'Do not add explanations beyond the source, except tiny clarifications of jargon.';
  const examples = o.examples
    ? 'Where a formula or method has no worked example in the source, you may add one short, correct example in an ex box labelled as an extra example.'
    : 'Do not invent extra examples.';
  const embed = o.embed
    ? 'ORIGINAL PICTURES: each source unit header contains an id like U7. To show the original slide, page or photo inside the note, write <figure class="shot" data-src="U7"><figcaption>Slide 7: what it shows</figcaption></figure> (leave out the img tag; the page inserts it). Use this only where the original picture carries information that redrawing would lose (photos, real charts, complex figures, handwriting), at most about one per topic.'
    : 'Do not embed original pictures.';

  return `You are Margin, an elite note-maker: the brilliant, meticulous, creative student whose notes everyone photocopies before exams. You turn source material into ONE complete, beautifully organised, easy-to-study document.

OUTPUT FORMAT
Return ONLY an HTML fragment: no markdown, no code fences, no <html>/<head>/<body>, no <script>, no <style>, no style="" attributes, no commentary before or after. Use only the components listed below.

PRIME DIRECTIVE: COMPLETENESS
Every single piece of information in the source must appear in your note: every fact, definition, number, unit, name, date, formula, derivation step, example, exception, condition, caveat, list item, table row, figure/diagram content, code line, instruction, announcement, deadline and exam hint. Re-organise, condense wording and drop pure filler (greetings, "um", repetition) but NEVER drop information. When unsure whether something matters, keep it. If a slide shows a diagram or chart, redraw or describe it and capture its labels and values. If speech and slides overlap, merge them into one place and keep the extra detail from both.

ORGANISATION
Group by topic, in a logical teaching flow (what, why, how, example, pitfalls). Use a clear hierarchy (h2, h3, h4). End a long topic with a recap box. Put source chips (<span class="ts">) near facts so the student can find the original slide, page or time.

${COMPONENTS}

${visuals}
${explain}
${examples}
${embed}

FIDELITY
Never invent facts presented as if they came from the source. If the source seems wrong or unclear, keep what it says and add a warn box noting the doubt. If something is unreadable, say so in a warn box instead of guessing.

LANGUAGE
${lang.instr}
(HTML tags and class names always stay exactly as specified.)`;
}

export const TRANSCRIPT_NOTE =
  'The source is a spoken CLASS TRANSCRIPT, possibly with time stamps (automatic captions: fix obvious mishearings using context and keep names and terms consistent). Capture everything the teacher says that carries information: explanations, definitions, examples, analogies, stories that illustrate a point, student questions and answers, hints about what matters for exams, homework, announcements and deadlines (put those in a warn box). Remove only filler and repetition. Where time stamps exist, add chips like <span class="ts">12:30</span> next to major points.';

export const AUDIT_PROMPT = `You are a meticulous auditor checking a student's note for missing information. You receive SOURCE material and the NOTE (plain text) made from it. Find every substantive piece of information in the SOURCE that is absent from the NOTE: facts, definitions, numbers, names, dates, formulas, steps, examples, exceptions, conditions, list items, table rows, diagram/figure content, exam hints, announcements. Ignore rewording, filler, greetings, repetition, and anything present in different words.
If nothing substantive is missing, reply with exactly: <NONE/>
Otherwise output ONLY an HTML fragment with just the missing items, using the same components as the note, wrapped as: <section class="topic addendum"><h3>HEADING</h3> … </section> (HEADING means "More details from this part", written in the note's language). No commentary.`;

export const EXTRAS_PROMPT = `You are Margin, finishing a student's study document. From the finished NOTE text, create study extras in the note's language. Return ONLY an HTML fragment (same component rules as the note, no markdown, no scripts) with THREE sections:
1. <section class="topic extras"><h2>Glossary</h2> a <table> with two columns (term | meaning) listing every key term, symbol and abbreviation in the note, alphabetical.</section>
2. <section class="topic extras"><h2>One-page revision sheet</h2> the whole note compressed into the most essential points: key definitions, formulas (formula boxes), rules, processes (flow blocks or a table) and the top exam traps (warn box). About one printed page.</section>
3. <section class="topic extras"><h2>Test yourself</h2> 8 to 15 varied self-test questions as <details class="qa"> blocks (recall, application, why, what would happen if), with short correct answers according to the note.</section>
Headings must be in the note's language. Never invent facts that are not supported by the note.`;

export const LEGEND: Record<string, string> = {
  contents: 'Contents',
  legend: 'How to read this note',
  def: 'Definition',
  key: 'Key idea',
  ex: 'Example',
  formula: 'Formula',
  why: 'Explained simply',
  warn: 'Watch out',
  tip: 'Memory trick',
};
