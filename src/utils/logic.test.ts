import test from 'node:test';
import assert from 'node:assert/strict';
import { esc, sanitize, stripTags, safeName } from './sanitize';
import { batchUnits, chunkTranscript, SourceUnit } from './batching';
import { resolveLang, systemPrompt, GenerationOptions } from './prompts';

test('esc escapes special characters safely', () => {
  assert.equal(esc('Tom & Jerry <cartoon> "quote" \'apostrophe\''), 'Tom &amp; Jerry &lt;cartoon&gt; &quot;quote&quot; &#39;apostrophe&#39;');
  assert.equal(esc(null), '');
  assert.equal(esc(undefined), '');
});

test('sanitize cleans untrusted HTML and harmful scripts', () => {
  const dirty = '<div><h3>Photosynthesis</h3><script>alert(1)</script><p onclick="hack()">Light reaction</p></div>';
  const clean = sanitize(dirty);
  assert.equal(clean.includes('<script>'), false);
  assert.equal(clean.includes('onclick'), false);
  assert.equal(clean.includes('Light reaction'), true);
  assert.equal(clean.includes('Photosynthesis'), true);
});

test('stripTags transforms SVG and strips markup', () => {
  const html = '<section class="topic"><h2>Cell Structure</h2><figure class="visual"><svg><rect></rect></svg></figure><p>Mitochondria is the <b class="term">powerhouse</b>.</p></section>';
  const plain = stripTags(html);
  assert.equal(plain.includes('[diagram]'), true);
  assert.equal(plain.includes('Cell Structure'), true);
  assert.equal(plain.includes('Mitochondria is the'), true);
  assert.equal(plain.includes('powerhouse'), true);
  assert.equal(plain.includes('<section'), false);
  assert.equal(plain.includes('<svg'), false);
});

test('safeName creates sanitized file names', () => {
  assert.equal(safeName('Cell Biology: Lecture #5 (Fall/2026)!'), 'Cell Biology Lecture 5 Fall2026');
  assert.equal(safeName(''), 'note');
});

test('resolveLang handles preset and custom languages', () => {
  const en = resolveLang('en');
  assert.equal(en.name, 'English');
  assert.equal(en.code, 'en');

  const bn = resolveLang('bn');
  assert.equal(bn.name, 'Bangla');
  assert.equal(bn.code, 'bn');

  const custom = resolveLang('other', 'Swedish');
  assert.equal(custom.name, 'Swedish');
  assert.equal(custom.code, 'en');
  assert.equal(custom.instr.includes('Swedish'), true);
});

test('batchUnits groups units without exceeding limits', () => {
  const units: SourceUnit[] = [
    { id: 'U1', label: 'Slide 1', text: 'Short slide 1' },
    { id: 'U2', label: 'Slide 2', text: 'Short slide 2' },
    { id: 'U3', label: 'Slide 3', text: 'Short slide 3' },
  ];
  const batches = batchUnits(units, 2, 5000, 2);
  assert.equal(batches.length, 2);
  assert.equal(batches[0].length, 2);
  assert.equal(batches[1].length, 1);
});

test('chunkTranscript splits long transcripts into logical chunks', () => {
  const p1 = 'Line A\nLine B\nLine C';
  const p2 = 'Line D\nLine E\nLine F';
  const text = `${p1}\n${p2}`;
  const chunks = chunkTranscript(text, 15);
  assert.equal(chunks.length > 1, true);
  assert.equal(chunks.join(' ').includes('Line A'), true);
  assert.equal(chunks.join(' ').includes('Line F'), true);
});

test('systemPrompt generates prompt tailored to user options', () => {
  const lang = resolveLang('en');
  const opts: GenerationOptions = {
    audit: true,
    visuals: true,
    explain: true,
    examples: true,
    embed: true,
    extras: true,
    read: true,
    fast: false,
  };
  const prompt = systemPrompt(lang, opts);
  assert.equal(prompt.includes('You are Margin, an elite note-maker'), true);
  assert.equal(prompt.includes('ORIGINAL PICTURES'), true);
  assert.equal(prompt.includes('flowchart'), true);
  assert.equal(prompt.includes('why'), true);
});
