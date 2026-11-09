/* Estudia Pro by Julián Lenis — app */
'use strict';
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const LIBS = {
  tess: 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js',
  tessWorker: 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/worker.min.js',
  tessCore: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.1',
  tessLang: 'https://cdn.jsdelivr.net/npm/@tesseract.js-data/spa/4.0.0_best_int',
  pdf: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js',
  pdfWorker: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js'
};
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { alert('No queda espacio para guardar. Borra algún apunte antiguo.'); return false; } }
};
let level = store.get('ep_level', 'adultos');
let S = { doc: null, qs: [], answers: [], pos: 0, mode: 'normal', seed: 1 };

// ---------- vistas ----------
function show(v) { for (const s of ['home', 'study', 'test', 'res']) $('v-' + s).classList.toggle('hide', s !== v); scrollTo(0, 0); }
function progress(p, txt) { $('prog').classList.toggle('hide', p == null); if (p != null) { $('progBar').style.width = Math.round(p * 100) + '%'; $('progTxt').textContent = txt || ''; } }
function busy(b) { for (const id of ['fCam', 'fImg', 'fPdf']) $(id).disabled = b; $('bGen').disabled = b; }
function updCount() { const n = ($('text').value.match(/[\p{L}\p{N}]+/gu) || []).length; $('count').textContent = n + ' palabras' + (n && n < 60 ? ' · añade más texto para que salgan más preguntas' : ''); }
function addText(t) { const ta = $('text'); ta.value = (ta.value.trim() ? ta.value.trim() + '\n\n' : '') + t.trim(); updCount(); }

// ---------- librerías ----------
const loaded = {};
function loadScript(src) { return loaded[src] ||= new Promise((ok, ko) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => { delete loaded[src]; ko(new Error('No se pudo descargar ' + src.split('/').pop() + '. ¿Tienes conexión?')); }; document.head.appendChild(s); }); }
let ocrWorker = null, ocrCb = null;
async function getOcr() {
  if (ocrWorker) return ocrWorker;
  await loadScript(LIBS.tess);
  ocrWorker = await Tesseract.createWorker('spa', 1, {
    workerPath: LIBS.tessWorker, corePath: LIBS.tessCore, langPath: LIBS.tessLang,
    logger: m => ocrCb && ocrCb(m)
  });
  return ocrWorker;
}
// prepara la imagen: tamaño razonable, escala de grises y más contraste
async function prepImage(src) {
  const img = await (src instanceof Blob ? createImageBitmap(src).catch(() => blobToImg(src)) : src);
  const max = 2200, k = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  const x = c.getContext('2d'); x.drawImage(img, 0, 0, c.width, c.height);
  const d = x.getImageData(0, 0, c.width, c.height), p = d.data; let mn = 255, mx = 0;
  for (let i = 0; i < p.length; i += 4) { const g = p[i] * .299 + p[i + 1] * .587 + p[i + 2] * .114; p[i] = g; if (g < mn) mn = g; if (g > mx) mx = g; }
  const r = Math.max(1, mx - mn);
  for (let i = 0; i < p.length; i += 4) { const g = Math.min(255, Math.max(0, (p[i] - mn) * 255 / r)); p[i] = p[i + 1] = p[i + 2] = g; }
  x.putImageData(d, 0, 0); return c;
}
function blobToImg(b) { return new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ko(new Error('No se pudo abrir la imagen (formato no compatible)')); i.src = URL.createObjectURL(b); }); }
async function ocr(canvas, label, base, span) {
  ocrCb = m => { if (m.status === 'recognizing text') progress(base + span * m.progress, label + ' · leyendo ' + Math.round(m.progress * 100) + '%'); else progress(base, label + ' · ' + ({ 'loading tesseract core': 'cargando lector', 'loading language traineddata': 'descargando idioma español', 'initializing api': 'preparando' }[m.status] || m.status)); };
  const w = await getOcr();
  const { data } = await w.recognize(canvas);
  return { text: data.text || '', conf: data.confidence || 0 };
}

// ---------- entradas ----------
async function onImages(files) {
  files = [...files]; if (!files.length) return; busy(true);
  const low = [];
  try {
    for (let i = 0; i < files.length; i++) {
      const lab = `Foto ${i + 1} de ${files.length}`; progress(i / files.length, lab + ' · preparando');
      const c = await prepImage(files[i]);
      const r = await ocr(c, lab, i / files.length, 1 / files.length);
      if (r.text.trim()) addText(r.text); if (r.conf < 60) low.push(i + 1);
    }
    progress(1, '✅ Listo. Revisa el texto antes de crear el test.' + (low.length ? ` Ojo: la foto ${low.join(', ')} se leyó con poca seguridad (letra a mano, sombra o foto torcida).` : ''));
  } catch (e) { progress(1, '❌ ' + e.message); }
  busy(false);
}
async function onPdf(file) {
  if (!file) return; busy(true);
  try {
    progress(0, 'Cargando lector de PDF…'); await loadScript(LIBS.pdf);
    pdfjsLib.GlobalWorkerOptions.workerSrc = LIBS.pdfWorker;
    const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    const N = Math.min(pdf.numPages, 150); let ocrd = 0; const out = [];
    for (let n = 1; n <= N; n++) {
      progress((n - 1) / N, `Página ${n} de ${N}`);
      const page = await pdf.getPage(n);
      const tc = await page.getTextContent();
      let t = tc.items.map(it => it.str + (it.hasEOL ? '\n' : '')).join('').replace(/[ \t]+/g, ' ');
      if (t.replace(/\s/g, '').length < 30 && ocrd < 20) { // página escaneada: la leemos como foto
        const vp = page.getViewport({ scale: 2 }); const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height;
        await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
        t = (await ocr(await prepImage(c), `Página ${n} (escaneada)`, (n - 1) / N, 1 / N)).text; ocrd++;
      }
      out.push(t.trim());
    }
    addText(out.filter(Boolean).join('\n\n'));
    if (!$('title').value) $('title').value = file.name.replace(/\.pdf$/i, '');
    progress(1, `✅ PDF leído (${N} páginas${pdf.numPages > N ? ' de ' + pdf.numPages : ''}${ocrd ? ', ' + ocrd + ' escaneadas' : ''}). Revisa el texto.`);
  } catch (e) { progress(1, '❌ No se pudo leer el PDF: ' + e.message); }
  busy(false);
}
$('fCam').onchange = e => { onImages(e.target.files); e.target.value = ''; };
$('fImg').onchange = e => { onImages(e.target.files); e.target.value = ''; };
$('fPdf').onchange = e => { onPdf(e.target.files[0]); e.target.value = ''; };
$('bPaste').onclick = async () => { try { const t = await navigator.clipboard.readText(); if (t) { addText(t); return; } } catch { } $('text').focus(); };
$('text').oninput = updCount;
for (const b of $('level').children) b.onclick = () => { level = b.dataset.v; store.set('ep_level', level); paintLevel(); };
function paintLevel() { for (const b of $('level').children) b.classList.toggle('on', b.dataset.v === level); }

// ---------- generar ----------
$('bGen').onclick = () => {
  const text = $('text').value.trim();
  if ((text.match(/[\p{L}]+/gu) || []).length < 25) return alert('Necesito más texto (al menos unas 3 o 4 frases) para preparar un test.');
  const title = $('title').value.trim() || EPGen.keywords(text, 3).join(', ') || 'Apuntes';
  const docs = store.get('ep_docs', []);
  let doc = docs.find(d => d.text === text);
  if (!doc) { doc = { id: Date.now().toString(36), title, text, date: Date.now() }; docs.unshift(doc); }
  else { doc.title = title; doc.date = Date.now(); docs.splice(docs.indexOf(doc), 1); docs.unshift(doc); }
  store.set('ep_docs', docs.slice(0, 15));
  openDoc(doc);
};
function openDoc(doc) {
  S.doc = doc; S.seed = Date.now() % 1e9;
  const sum = EPGen.summarize(doc.text, { level });
  $('sTitle').textContent = 'Resumen · ' + doc.title;
  $('sum').innerHTML = sum.map(s => `<li>${esc(s)}</li>`).join('') || '<li class="muted">No se ha podido resumir.</li>';
  $('kw').innerHTML = EPGen.keywords(doc.text, level === 'ninos' ? 8 : 14).map(k => `<span class="chip">${esc(k)}</span>`).join('');
  makeTest();
  show('study');
}
function makeTest() {
  const n = +$('nq').value || 0;
  S.qs = EPGen.generate(S.doc.text, { level, count: n || undefined, seed: S.seed });
  S.mode = 'normal';
  $('bStart').disabled = !S.qs.length;
  $('bStart').textContent = S.qs.length ? `📝 Empezar test (${S.qs.length} preguntas)` : 'No he podido sacar preguntas: añade más texto';
}
$('bStart').onclick = () => startTest(S.qs, 'normal');
$('bBack1').onclick = () => { show('home'); renderLists(); };

// ---------- test ----------
function startTest(qs, mode) { S.qs = qs; S.mode = mode; S.answers = new Array(qs.length).fill(null); S.pos = 0; renderQ(); show('test'); }
function renderQ() {
  const q = S.qs[S.pos];
  $('tPos').textContent = `Pregunta ${S.pos + 1} de ${S.qs.length}`;
  $('tMode').textContent = S.mode === 'review' ? '🔁 Repaso de fallos' : (level === 'ninos' ? '🧒 Niños' : '🎓 Adultos');
  $('tBar').style.width = ((S.pos + 1) / S.qs.length * 100) + '%';
  $('tQ').innerHTML = '¿Qué palabra falta?<br>' + esc(q.question).replace('_____', '<b>_____</b>');
  $('tOpts').innerHTML = q.options.map((o, i) => `<button class="opt${S.answers[S.pos] === i ? ' sel' : ''}" data-i="${i}">${'ABCD'[i]}) ${esc(o)}</button>`).join('');
  for (const b of $('tOpts').children) b.onclick = () => { S.answers[S.pos] = +b.dataset.i; renderQ(); };
  $('bPrev').disabled = S.pos === 0;
  const last = S.pos === S.qs.length - 1;
  $('bNext').textContent = last ? '✅ Corregir' : 'Siguiente →';
  $('bNext').disabled = S.answers[S.pos] == null;
}
$('bPrev').onclick = () => { if (S.pos) { S.pos--; renderQ(); } };
$('bNext').onclick = () => { if (S.pos < S.qs.length - 1) { S.pos++; renderQ(); } else finish(); };
$('bQuit').onclick = () => { if (confirm('¿Salir del test? Se perderán las respuestas.')) show('study'); };

function finish() {
  const g = EPGen.grade(S.qs, S.answers); S.last = g;
  $('rScore').textContent = `${g.ok}/${g.total}`;
  const nota = Math.round(g.ok / g.total * 100) / 10;
  $('rTxt').textContent = `Nota: ${String(nota).replace('.', ',')} de 10 · ${g.pct}% ` + (g.pct === 100 ? '🏆 ¡Perfecto!' : g.pct >= 70 ? '👏 ¡Muy bien!' : g.pct >= 50 ? '👍 Aprobado' : '💪 Repasa y vuelve a intentarlo');
  $('rList').innerHTML = S.qs.map((q, i) => {
    const ok = S.answers[i] === q.answer;
    return `<div class="res"><div>${ok ? '✅' : '❌'} <b>${i + 1}.</b> ${esc(q.question).replace('_____', '<b>_____</b>')}</div>` +
      (ok ? `<div class="muted">Tu respuesta: ${esc(q.answerText)}</div>` :
        `<div class="muted">Tu respuesta: <s>${esc(q.options[S.answers[i]] ?? '—')}</s> · Correcta: <b style="color:#4ade80">${esc(q.answerText)}</b></div>`) +
      `<div class="src">📖 De tus apuntes: «${esc(q.source)}»</div></div>`;
  }).join('');
  $('bReview').disabled = !g.wrong.length;
  $('bReview').textContent = g.wrong.length ? `🔁 Repasar fallos (${g.wrong.length})` : '🔁 Sin fallos';
  const h = store.get('ep_results', []);
  h.unshift({ doc: S.doc.id, title: S.doc.title, date: Date.now(), ok: g.ok, total: g.total, level, mode: S.mode, wrong: g.wrong.map(w => w.q) });
  store.set('ep_results', h.slice(0, 40));
  show('res');
}
$('bReview').onclick = () => startTest(S.last.wrong.map((w, i) => EPGen.reshuffle(w.q, Date.now() + i)), 'review');
$('bAgain').onclick = () => startTest(S.qs.map((q, i) => EPGen.reshuffle(q, Date.now() + i)), S.mode);
$('bNew').onclick = () => { S.seed = (S.seed * 7 + 13) % 1e9; makeTest(); if (S.qs.length) startTest(S.qs, 'normal'); };
$('bHome').onclick = () => { show('home'); renderLists(); };

// ---------- listas guardadas ----------
function fmt(t) { return new Date(t).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); }
function renderLists() {
  const docs = store.get('ep_docs', []), h = store.get('ep_results', []);
  $('docs').innerHTML = docs.length ? docs.map(d => `<div class="item"><div><b>${esc(d.title)}</b><span class="muted">${fmt(d.date)} · ${(d.text.match(/\S+/g) || []).length} palabras</span></div><span><button class="btn small pri" data-open="${d.id}">Estudiar</button> <button class="btn small" data-edit="${d.id}">✏️</button> <button class="btn small" data-del="${d.id}">🗑</button></span></div>`).join('') : 'Todavía no hay apuntes guardados.';
  $('hist').innerHTML = h.length ? h.slice(0, 12).map((r, i) => `<div class="item"><div><b>${esc(r.title)}</b><span class="muted">${fmt(r.date)} · ${r.level === 'ninos' ? 'Niños' : 'Adultos'}${r.mode === 'review' ? ' · repaso' : ''}</span></div><span><b style="color:${r.ok / r.total >= .5 ? '#4ade80' : '#f87171'}">${r.ok}/${r.total}</b>${r.wrong && r.wrong.length ? ` <button class="btn small warn" data-rev="${i}">🔁</button>` : ''}</span></div>`).join('') : 'Todavía no has hecho ningún test.';
  document.querySelectorAll('[data-open]').forEach(b => b.onclick = () => openDoc(docs.find(d => d.id === b.dataset.open)));
  document.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => { const d = docs.find(x => x.id === b.dataset.edit); $('title').value = d.title; $('text').value = d.text; updCount(); scrollTo(0, 0); });
  document.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { if (confirm('¿Borrar estos apuntes?')) { store.set('ep_docs', docs.filter(d => d.id !== b.dataset.del)); renderLists(); } });
  document.querySelectorAll('[data-rev]').forEach(b => b.onclick = () => { const r = h[+b.dataset.rev]; S.doc = docs.find(d => d.id === r.doc) || { id: r.doc, title: r.title, text: '' }; startTest(r.wrong.map((q, i) => EPGen.reshuffle(q, Date.now() + i)), 'review'); });
}

// ---------- arranque ----------
const draft = store.get('ep_draft', null); if (draft) { $('title').value = draft.title || ''; $('text').value = draft.text || ''; }
setInterval(() => { try { localStorage.setItem('ep_draft', JSON.stringify({ title: $('title').value, text: $('text').value })); } catch { } }, 3000);
function net() { $('off').classList.toggle('hide', navigator.onLine); } addEventListener('online', net); addEventListener('offline', net); net();
paintLevel(); updCount(); renderLists();
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => { });
