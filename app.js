/* Estudia Pro by Julián Lenis — app */
'use strict';
const isMC = q => !!q && Array.isArray(q.options) && q.options.length === 3 && q.answer >= 0 && q.answer < 3 && !/_{2,}|^\s*(completa|rellena)\b|palabra falta/i.test(String(q.question || ''));
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
let S = { doc: null, qs: [], answers: [], revealed: [], pos: 0, mode: 'normal', seed: 1, ai: false, sum: null, exam: false };
/** Fotos pendientes para enviar a Gemini (sin OCR) */
let pendingImages = [];

// ---------- vistas ----------
function show(v) {
  for (const s of ['home', 'study', 'test', 'res', 'settings']) {
    const el = $('v-' + s); if (el) el.classList.toggle('hide', s !== v);
  }
  scrollTo(0, 0);
}
function progress(p, txt) { $('prog').classList.toggle('hide', p == null); if (p != null) { $('progBar').style.width = Math.round(p * 100) + '%'; $('progTxt').textContent = txt || ''; } }
function busy(b) { for (const id of ['fCam', 'fImg', 'fPdf']) $(id).disabled = b; $('bGen').disabled = b; }
function updCount() {
  const n = ($('text').value.match(/[\p{L}\p{N}]+/gu) || []).length;
  const extra = pendingImages.length ? ` · ${pendingImages.length} foto(s) para la IA` : '';
  $('count').textContent = n + ' palabras' + extra + (n && n < 60 && !pendingImages.length ? ' · añade más texto para que salgan más preguntas' : '');
}
function addText(t) { const ta = $('text'); ta.value = (ta.value.trim() ? ta.value.trim() + '\n\n' : '') + t.trim(); updCount(); }

function paintAiBadge() {
  const on = EPAi.hasKey();
  const b = $('aiBadge');
  b.className = 'badge ' + (on ? 'on' : 'off');
  b.textContent = on
    ? '✨ IA activada · Gemini ' + EPAi.MODEL
    : 'IA desactivada · generador gratis';
}

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
  try {
    if (EPAi.hasKey()) {
      // Con IA: no OCR — las fotos van a Gemini al crear el test
      for (let i = 0; i < files.length; i++) {
        progress(i / files.length, `Foto ${i + 1} de ${files.length} · preparando para la IA`);
        const inline = await EPAi.blobToInline(files[i]);
        pendingImages.push(inline);
      }
      progress(1, `✅ ${files.length} foto(s) listas para la IA. Pulsa «Crear resumen y test».`);
      if (!$('title').value) $('title').value = 'Apuntes (fotos)';
      updCount();
    } else {
      const low = [];
      for (let i = 0; i < files.length; i++) {
        const lab = `Foto ${i + 1} de ${files.length}`; progress(i / files.length, lab + ' · preparando');
        const c = await prepImage(files[i]);
        const r = await ocr(c, lab, i / files.length, 1 / files.length);
        if (r.text.trim()) addText(r.text); if (r.conf < 60) low.push(i + 1);
      }
      progress(1, '✅ Listo. Revisa el texto antes de crear el test.' + (low.length ? ` Ojo: la foto ${low.join(', ')} se leyó con poca seguridad.` : ''));
    }
  } catch (e) { progress(1, '❌ ' + e.message); }
  busy(false);
}
// Texto de una página de PDF por líneas reales (según la posición), para reconocer tests ya hechos
function pdfLinesText(tc) {
  const items = tc.items.filter(it => it.str != null && it.transform);
  const rows = [];
  for (const it of items) {
    const y = it.transform[5], x = it.transform[4], h = Math.abs(it.transform[3]) || it.height || 10;
    let r = rows.find(r => Math.abs(r.y - y) <= Math.max(2, h * 0.4));
    if (!r) { r = { y, h, items: [] }; rows.push(r); }
    r.items.push({ x, w: it.width || 0, s: it.str, h });
  }
  rows.sort((a, b) => b.y - a.y);
  return rows.map(r => {
    r.items.sort((a, b) => a.x - b.x);
    let out = '', end = null;
    for (const it of r.items) {
      if (out && end != null && !/\s$/.test(out) && !/^\s/.test(it.s) && it.x - end > it.h * 0.12) out += ' ';
      out += it.s; end = it.x + it.w;
    }
    return out.replace(/[ \t]+/g, ' ').trim();
  }).filter(Boolean).join('\n');
}
async function onPdf(file) {
  if (!file) return; busy(true);
  try {
    progress(0, 'Cargando lector de PDF…'); await loadScript(LIBS.pdf);
    pdfjsLib.GlobalWorkerOptions.workerSrc = LIBS.pdfWorker;
    const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    const N = Math.min(pdf.numPages, 150); let ocrd = 0; const out = [], outLines = [];
    for (let n = 1; n <= N; n++) {
      progress((n - 1) / N, `Página ${n} de ${N}`);
      const page = await pdf.getPage(n);
      const tc = await page.getTextContent();
      let t = tc.items.map(it => it.str + (it.hasEOL ? '\n' : '')).join('').replace(/[ \t]+/g, ' ');
      let tl = pdfLinesText(tc);
      if (t.replace(/\s/g, '').length < 30) {
        if (EPAi.hasKey() && pendingImages.length < 8) {
          const vp = page.getViewport({ scale: 1.5 });
          const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height;
          await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
          const dataUrl = c.toDataURL('image/jpeg', 0.85);
          pendingImages.push({ mimeType: 'image/jpeg', data: dataUrl.split(',')[1] });
          t = ''; tl = '';
        } else if (ocrd < 20) {
          const vp = page.getViewport({ scale: 2 }); const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height;
          await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
          t = tl = (await ocr(await prepImage(c), `Página ${n} (escaneada)`, (n - 1) / N, 1 / N)).text; ocrd++;
        }
      }
      if (t.trim()) out.push(t.trim());
      if (tl.trim()) outLines.push(tl.trim());
    }
    // ¿Es un test ya hecho (preguntas numeradas con a/b/c y solucionario)? Entonces se usa tal cual
    const asLines = outLines.join('\n');
    const ex = asLines ? EPExam.parse(asLines) : null;
    if (ex && ex.isExam) addText(asLines);
    else if (out.length) addText(out.join('\n\n'));
    if (!$('title').value) $('title').value = file.name.replace(/\.pdf$/i, '');
    if (ex && ex.isExam) progress(1, `✅ Test detectado en el PDF: ${ex.total} preguntas` + (ex.keyed ? ` · soluciones oficiales de ${ex.keyed}` : ' · ⚠️ no he podido leer las soluciones') + '. Pulsa «Crear resumen y test».');
    else progress(1, `✅ PDF leído (${N} páginas${pendingImages.length ? ', ' + pendingImages.length + ' página(s) como imagen para la IA' : ''}${ocrd ? ', ' + ocrd + ' con OCR' : ''}).`);
    updCount();
  } catch (e) { progress(1, '❌ No se pudo leer el PDF: ' + e.message); }
  busy(false);
}
$('fCam').onchange = e => { onImages(e.target.files); e.target.value = ''; };
$('fImg').onchange = e => { onImages(e.target.files); e.target.value = ''; };
$('fPdf').onchange = e => { onPdf(e.target.files[0]); e.target.value = ''; };

$('bClearText').onclick = () => {
  const has = $('text').value.trim() || $('title').value.trim() || pendingImages.length;
  if (!has) { alert('No hay texto ni fotos que borrar.'); return; }
  if (!confirm('¿Borrar el texto, el título y las fotos cargadas? Así puedes poner material nuevo. (No se borra tu historial ni la clave de IA.)')) return;
  clearMaterial();
  progress(1, '🗑️ Texto y fotos borrados. Ya puedes cargar algo nuevo.');
  setTimeout(() => progress(null), 2000);
};
$('bFreshTest').onclick = () => {
  if (!confirm('¿Empezar un test nuevo? Se descartará este test y se borrará el material cargado para que puedas poner otro.')) return;
  goFreshHome();
};
$('bFreshRes').onclick = () => {
  if (!confirm('¿Empezar un test nuevo con otro material? Se borrará el texto/fotos actuales (tu historial de notas se conserva).')) return;
  goFreshHome();
};

$('bPaste').onclick = async () => { try { const t = await navigator.clipboard.readText(); if (t) { addText(t); return; } } catch { } $('text').focus(); };
$('text').oninput = updCount;
for (const b of $('level').children) b.onclick = () => { level = b.dataset.v; store.set('ep_level', level); paintLevel(); };
function paintLevel() { for (const b of $('level').children) b.classList.toggle('on', b.dataset.v === level); }
function getWantedCount() {
  const v = $('nq').value;
  if (v === 'custom') {
    let n = parseInt($('nqCustom').value, 10);
    if (!Number.isFinite(n) || n < 1) n = 10;
    return Math.min(100, Math.max(1, n));
  }
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0;
}
function paintNqCustom() {
  const wrap = $('nqCustomWrap');
  if (!wrap) return;
  wrap.classList.toggle('hide', $('nq').value !== 'custom');
}
if ($('nq')) $('nq').onchange = paintNqCustom;


// ---------- ajustes / IA ----------
$('bSettings').onclick = () => {
  $('apiKey').value = EPAi.getKey();
  $('keyStatus').textContent = EPAi.hasKey()
    ? 'Hay una clave guardada en este móvil.'
    : 'Todavía no hay clave. Pégala arriba (es gratis).';
  $('keyStatus').className = 'muted';
  show('settings');
};
$('bBackSettings').onclick = () => { paintAiBadge(); show('home'); };
$('bSaveKey').onclick = () => {
  const k = $('apiKey').value.trim();
  if (!k) { $('keyStatus').textContent = 'Pega una clave antes de guardar.'; $('keyStatus').className = 'status-err'; return; }
  if (!EPAi.setKey(k)) { $('keyStatus').textContent = 'No se pudo guardar (¿almacenamiento lleno?).'; $('keyStatus').className = 'status-err'; return; }
  $('keyStatus').textContent = '✅ Clave guardada solo en este móvil. IA activada.';
  $('keyStatus').className = 'status-ok';
  paintAiBadge();
};
$('bClearKey').onclick = () => {
  if (!confirm('¿Borrar la clave de este móvil?')) return;
  EPAi.clearKey();
  $('apiKey').value = '';
  pendingImages = [];
  $('keyStatus').textContent = 'Clave borrada. Se usará el generador gratis.';
  $('keyStatus').className = 'muted';
  paintAiBadge();
  updCount();
};
$('bTestKey').onclick = async () => {
  const k = $('apiKey').value.trim() || EPAi.getKey();
  if (!k) { $('keyStatus').textContent = 'Pega o guarda una clave primero.'; $('keyStatus').className = 'status-err'; return; }
  $('keyStatus').textContent = 'Probando clave con Gemini…';
  $('keyStatus').className = 'muted';
  $('bTestKey').disabled = true;
  try {
    await EPAi.testKey(k);
    if ($('apiKey').value.trim()) EPAi.setKey($('apiKey').value.trim());
    $('keyStatus').textContent = '✅ Clave correcta. Gemini responde bien.';
    $('keyStatus').className = 'status-ok';
    paintAiBadge();
  } catch (e) {
    $('keyStatus').textContent = '❌ ' + EPAi.spanishError(e, e.status);
    $('keyStatus').className = 'status-err';
  }
  $('bTestKey').disabled = false;
};


// ---------- borrar material / nuevo test ----------
function clearMaterial({ clearProg } = {}) {
  $('title').value = '';
  $('text').value = '';
  pendingImages = [];
  try { localStorage.removeItem('ep_draft'); } catch {}
  // no tocamos ep_gemini_key, ep_docs, ep_results, ep_level
  if (clearProg !== false) progress(null);
  updCount();
}
function discardCurrentTest() {
  S = { doc: null, qs: [], answers: [], revealed: [], pos: 0, mode: 'normal', seed: 1, ai: false, sum: null, exam: false };
}
function goFreshHome() {
  discardCurrentTest();
  clearMaterial();
  show('home');
  renderLists();
  paintAiBadge();
  scrollTo(0, 0);
}

// ---------- generar ----------
$('bGen').onclick = async () => {
  const text = $('text').value.trim();
  if (!pendingImages.length && (text.match(/[\p{L}]+/gu) || []).length < 25)
    return alert('Necesito más texto (al menos unas 3 o 4 frases) o alguna foto para preparar un test.');
  // 1) ¿Es un test ya hecho? Se usan sus preguntas tal cual y su solucionario (sin generador ni IA creativa)
  let ex = text ? EPExam.parse(text) : null;
  if (!(ex && ex.isExam) && EPAi.hasKey() && ((text && EPExam.looksLikeExam(text)) || (!text && pendingImages.length))) {
    try {
      busy(true); progress(0.3, text ? '📄 Parece un test: ordenando las preguntas tal cual…' : '📄 Mirando si las fotos son un test ya hecho…');
      const r = await EPAi.structureExam({ text: text || '', images: text ? [] : pendingImages });
      if (r && r.isExam) ex = r;
    } catch (e) { /* sigue el flujo normal */ }
    busy(false); progress(null);
  }
  if (ex && ex.isExam) {
    const title = $('title').value.trim() || 'Test del PDF';
    const docs = store.get('ep_docs', []);
    const etext = text || ex.questions.map(q => q.num + '. ' + q.question + '\n' + q.options.map((o, i) => 'abcdef'[i] + ') ' + o).join('\n')).join('\n');
    let doc = docs.find(d => d.text === etext);
    if (!doc) { doc = { id: Date.now().toString(36), title, text: etext, date: Date.now() }; docs.unshift(doc); }
    else { doc.title = title; doc.date = Date.now(); docs.splice(docs.indexOf(doc), 1); docs.unshift(doc); }
    doc.exam = { questions: ex.questions, viaAi: !!ex.questions.some(q => q.viaAi) };
    store.set('ep_docs', docs.slice(0, 15));
    pendingImages = []; updCount();
    return openExam(doc);
  }
  const title = $('title').value.trim() || (text ? (EPGen.keywords(text, 3).join(', ') || 'Apuntes') : 'Apuntes (fotos)');
  const docs = store.get('ep_docs', []);
  let doc = docs.find(d => d.text === text && text);
  if (!doc) { doc = { id: Date.now().toString(36), title, text, date: Date.now() }; docs.unshift(doc); }
  else { doc.title = title; doc.date = Date.now(); docs.splice(docs.indexOf(doc), 1); docs.unshift(doc); }
  store.set('ep_docs', docs.slice(0, 15));
  await openDoc(doc, { images: pendingImages.slice() });
};
const NOTE0 = $('v-study').querySelector('.note').textContent;
function openExam(doc) {
  const qs = (doc.exam && doc.exam.questions) || EPExam.parse(doc.text).questions;
  S.doc = doc; S.ai = false; S.sum = null; S.exam = true; S.mode = 'normal';
  S.qs = qs.map(q => Object.assign({}, q, { options: q.options.slice() }));
  const keyed = S.qs.filter(q => q.answer != null).length, miss = S.qs.length - keyed;
  show('study');
  $('sTitle').textContent = '📄 Test del PDF · ' + doc.title;
  const info = [`${S.qs.length} preguntas copiadas tal cual del documento (sin cambiar nada).`];
  if (keyed && !miss) info.push('Soluciones oficiales leídas del solucionario: se corrige con ellas al terminar.');
  else if (keyed) info.push(`Soluciones oficiales de ${keyed} preguntas. ${miss} no tienen solución en el documento: no puntúan.`);
  else info.push('⚠️ No he podido leer las soluciones del documento. Puedes hacer el test, pero no puedo corregirlo (no me invento respuestas).');
  if (doc.exam && doc.exam.viaAi) info.push('ℹ️ Transcrito con la IA desde las fotos: compáralo con tu hoja.');
  $('sum').innerHTML = info.map(s => `<li>${esc(s)}</li>`).join('');
  $('kw').innerHTML = '';
  const note = $('v-study').querySelector('.note');
  if (note) note.textContent = '📄 Es un test ya hecho: no se generan preguntas nuevas. La corrección sale al final, con el solucionario del documento.';
  $('bStart').disabled = !S.qs.length;
  $('bStart').textContent = `📝 Empezar test (${S.qs.length} preguntas del PDF)`;
}
async function openDoc(doc, opts = {}) {
  if (doc.exam || (doc.text && EPExam.parse(doc.text).isExam)) return openExam(doc);
  S.doc = doc; S.seed = Date.now() % 1e9; S.ai = false; S.sum = null; S.exam = false;
  { const note = $('v-study').querySelector('.note'); if (note) note.textContent = NOTE0; }
  show('study');
  $('sTitle').textContent = 'Resumen · ' + doc.title;
  $('sum').innerHTML = '<li class="muted">Preparando…</li>';
  $('kw').innerHTML = '';
  $('bStart').disabled = true;
  $('bStart').textContent = 'Preparando test…';
  const wanted = getWantedCount();
  const images = opts.images || [];
  let usedAi = false;
  let aiNote = '';
  let shortNote = '';

  if (EPAi.hasKey() && (doc.text.trim().length >= 40 || images.length)) {
    try {
      progress(0.05, wanted > 25 ? ('Creando preguntas 0/' + wanted + '…') : '✨ Gemini está creando el test…');
      busy(true);
      const result = await EPAi.generate({
        text: doc.text,
        images,
        level,
        count: wanted || undefined,
        title: doc.title,
        onProgress: ({ have, want, msg }) => {
          const pct = want ? Math.min(0.95, 0.05 + 0.9 * (have / want)) : 0.3;
          progress(pct, msg || ('Creando preguntas ' + have + '/' + want + '…'));
        }
      });
      S.qs = result.questions;
      S.sum = result.summary;
      S.ai = true;
      usedAi = true;
      pendingImages = [];
      updCount();
      if (result.partial && result.requested && S.qs.length < result.requested) {
        shortNote = 'La IA generó ' + S.qs.length + ' de ' + result.requested + ' (límite o error en un lote). Puedes reintentar o añadir más apuntes.';
      } else if (wanted && S.qs.length < wanted) {
        shortNote = 'La IA generó ' + S.qs.length + ' preguntas (pediste ' + wanted + ').';
      }
      progress(1, '✅ Test creado con IA · ' + S.qs.length + ' preguntas');
    } catch (e) {
      aiNote = EPAi.spanishError(e, e.status);
      progress(1, '⚠️ ' + aiNote);
    }
    busy(false);
  }

  if (!usedAi) {
    const sum = EPGen.summarize(doc.text, { level });
    S.sum = sum;
    const ask = wanted || (level === 'ninos' ? 5 : 10);
    S.qs = EPGen.generate(doc.text, { level, count: ask, seed: S.seed });
    S.ai = false;
    if (S.qs.length < ask) {
      shortNote = 'Tu material da para ' + S.qs.length + ' preguntas; añade más páginas o texto para llegar a ' + ask + '.';
    }
    if (aiNote) {
      const note = $('v-study').querySelector('.note');
      if (note) note.textContent = '⚠️ ' + aiNote + ' Se usó el generador gratis automático.' + (shortNote ? ' ' + shortNote : '');
    } else if (shortNote) {
      const note = $('v-study').querySelector('.note');
      if (note) note.textContent = 'ℹ️ ' + shortNote;
    }
  } else {
    const note = $('v-study').querySelector('.note');
    if (note) note.textContent = '✨ Resumen y preguntas creados con Gemini (tu clave). Revísalos con tus apuntes.' + (shortNote ? ' ' + shortNote : '');
  }

  $('sTitle').textContent = (S.ai ? '✨ Resumen IA · ' : 'Resumen · ') + doc.title;
  $('sum').innerHTML = (S.sum && S.sum.length ? S.sum : ['No se ha podido resumir.']).map(s => `<li>${esc(s)}</li>`).join('');
  $('kw').innerHTML = EPGen.keywords(doc.text || '', level === 'ninos' ? 8 : 14).map(k => `<span class="chip">${esc(k)}</span>`).join('');
  S.mode = 'normal';
  $('bStart').disabled = !S.qs.length;
  $('bStart').textContent = S.qs.length
    ? `📝 Empezar test (${S.qs.length} preguntas${S.ai ? ' · IA' : ''})`
    : 'No he podido sacar preguntas: añade más texto o fotos';
  setTimeout(() => progress(null), wanted > 25 ? 2500 : 1800);
}
function makeTestLocal() {
  const ask = getWantedCount() || (level === 'ninos' ? 5 : 10);
  S.qs = EPGen.generate(S.doc.text, { level, count: ask, seed: S.seed });
  S.ai = false; S.mode = 'normal';
  $('bStart').disabled = !S.qs.length;
  let label = S.qs.length ? `📝 Empezar test (${S.qs.length} preguntas)` : 'No he podido sacar preguntas: añade más texto';
  if (S.qs.length && S.qs.length < ask) label += ` · material da para ${S.qs.length}`;
  $('bStart').textContent = label;
}
$('bStart').onclick = () => startTest(S.qs, 'normal');
$('bBack1').onclick = () => { show('home'); renderLists(); paintAiBadge(); };

// ---------- test ----------
function startTest(qs, mode) {
  S.exam = !!(qs && qs.length && qs.every(q => q && q.exam));
  // Test del PDF: tal cual (mismo orden, mismas opciones). Si no: solo test clásico A/B/C
  if (!S.exam) qs = (qs || []).map((q, i) => EPGen.toThree(q, i + 1)).filter(isMC);
  if (!qs.length) return alert('No hay preguntas tipo test (A, B, C) para mostrar. Crea un test nuevo.');
  S.qs = qs; S.mode = mode;
  S.answers = new Array(qs.length).fill(null);
  S.revealed = new Array(qs.length).fill(false);
  S.pos = 0; renderQ(); show('test');
}
function renderQ() {
  const q = S.qs[S.pos];
  const revealed = S.revealed[S.pos];
  $('tPos').textContent = `Pregunta ${S.pos + 1} de ${S.qs.length}`;
  $('tMode').textContent = S.mode === 'review' ? '🔁 Repaso de fallos' : S.exam ? '📄 Test del PDF' : (S.ai ? '✨ IA' : (level === 'ninos' ? '🧒 ¡Tú puedes!' : '🎓 Adultos'));
  $('tBar').style.width = ((S.pos + 1) / S.qs.length * 100) + '%';
  $('tQ').textContent = q.question;
  $('tOpts').innerHTML = q.options.map((o, i) => {
    let cls = 'opt';
    if (S.answers[S.pos] === i) cls += ' sel';
    if (revealed) {
      if (i === q.answer) cls += ' good';
      else if (S.answers[S.pos] === i) cls += ' bad';
    }
    const txt = S.exam ? String(o) : String(o).charAt(0).toLocaleUpperCase('es') + String(o).slice(1);
    return `<button class="${cls}" data-i="${i}" ${revealed ? 'disabled' : ''}><b>${'ABCDEF'[i]}</b> · ${esc(txt)}</button>`;
  }).join('');
  for (const b of $('tOpts').children) b.onclick = () => {
    if (S.revealed[S.pos]) return;
    S.answers[S.pos] = +b.dataset.i;
    // Test del PDF: no se enseña la solución hasta el final (se puede cambiar la respuesta)
    if (!S.exam) S.revealed[S.pos] = true;
    renderQ();
  };
  const expl = $('tExpl');
  if (revealed && q.explanation) {
    const ok = S.answers[S.pos] === q.answer;
    expl.classList.remove('hide');
    expl.style.background = ok ? '#ecfdf5' : '#fff7ed';
    expl.style.borderColor = ok ? '#86efac' : '#fed7aa';
    expl.style.color = ok ? '#166534' : '#9a3412';
    expl.innerHTML = (ok ? '✅ ' : '💡 ') + esc(q.explanation);
  } else {
    expl.classList.add('hide');
    expl.textContent = '';
  }
  $('bPrev').disabled = S.pos === 0;
  const last = S.pos === S.qs.length - 1;
  $('bNext').textContent = last ? '✅ Corregir' : 'Siguiente →';
  $('bNext').disabled = !S.exam && S.answers[S.pos] == null;
}
$('bPrev').onclick = () => { if (S.pos) { S.pos--; renderQ(); } };
$('bNext').onclick = () => {
  if (S.pos < S.qs.length - 1) { S.pos++; renderQ(); return; }
  if (S.exam) {
    const blank = S.answers.filter(a => a == null).length;
    if (blank && !confirm(`Te quedan ${blank} pregunta(s) sin responder. ¿Corregir igualmente? (cuentan como fallo)`)) return;
  }
  finish();
};
$('bQuit').onclick = () => { if (confirm('¿Salir del test? Se perderán las respuestas.')) show('study'); };

function finishExam() {
  const g = EPExam.grade(S.qs, S.answers); S.last = g;
  const L = i => 'ABCDEF'[i];
  if (g.total) {
    $('rScore').textContent = `${g.ok}/${g.total}`;
    const nota = Math.round(g.ok / g.total * 100) / 10;
    $('rTxt').textContent = `Nota: ${String(nota).replace('.', ',')} de 10 · ${g.pct}% ` + (g.pct === 100 ? '🏆 ¡Perfecto!' : g.pct >= 70 ? '👏 ¡Muy bien!' : g.pct >= 50 ? '👍 Aprobado' : '💪 Repasa y vuelve a intentarlo') +
      ' · 📄 corregido con el solucionario del PDF' + (g.ungraded.length ? ` · ${g.ungraded.length} sin solución en el PDF (no puntúan)` : '');
  } else {
    $('rScore').textContent = '—';
    $('rTxt').textContent = '⚠️ El documento no trae soluciones que haya podido leer, así que no puedo corregir este test (no me invento respuestas).';
  }
  $('rList').innerHTML = S.qs.map((q, i) => {
    const a = S.answers[i], mine = a == null ? 'Sin responder' : `${L(a)} · ${q.options[a]}`;
    if (q.answer == null) return `<div class="res"><div>⚠️ <b>${q.num || i + 1}.</b> ${esc(q.question)}</div><div class="muted">Tu respuesta: ${esc(mine)} · Sin solución en el PDF: no puntúa</div></div>`;
    const ok = a === q.answer, right = `${L(q.answer)} · ${q.options[q.answer]}`;
    return `<div class="res"><div>${ok ? '✅' : '❌'} <b>${q.num || i + 1}.</b> ${esc(q.question)}</div>` +
      (ok ? `<div class="muted">Tu respuesta: ${esc(mine)}</div>` :
        `<div class="muted">Tu respuesta: ${a == null ? esc(mine) : '<s>' + esc(mine) + '</s>'} · Correcta (solucionario): <b style="color:#16a34a">${esc(right)}</b></div>`) + `</div>`;
  }).join('');
  $('bReview').disabled = !g.wrong.length;
  $('bReview').textContent = g.wrong.length ? `🔁 Repasar fallos (${g.wrong.length})` : '🔁 Sin fallos';
  $('bNew').classList.add('hide');
  const h = store.get('ep_results', []);
  if (g.total) {
    h.unshift({ doc: S.doc.id, title: S.doc.title, date: Date.now(), ok: g.ok, total: g.total, level, mode: S.mode, ai: false, exam: true, wrong: g.wrong.map(w => w.q) });
    store.set('ep_results', h.slice(0, 40));
  }
  show('res');
}
function finish() {
  if (S.exam) return finishExam();
  $('bNew').classList.remove('hide');
  const g = EPGen.grade(S.qs, S.answers); S.last = g;
  $('rScore').textContent = `${g.ok}/${g.total}`;
  const nota = Math.round(g.ok / g.total * 100) / 10;
  $('rTxt').textContent = `Nota: ${String(nota).replace('.', ',')} de 10 · ${g.pct}% ` + (g.pct === 100 ? '🏆 ¡Perfecto!' : g.pct >= 70 ? '👏 ¡Muy bien!' : g.pct >= 50 ? '👍 Aprobado' : '💪 Repasa y vuelve a intentarlo') + (S.ai ? ' · ✨ IA' : '');
  $('rList').innerHTML = S.qs.map((q, i) => {
    const ok = S.answers[i] === q.answer;
    return `<div class="res"><div>${ok ? '✅' : '❌'} <b>${i + 1}.</b> ${esc(q.question)}</div>` +
      (ok ? `<div class="muted">Tu respuesta: ${esc(q.answerText)}</div>` :
        `<div class="muted">Tu respuesta: <s>${esc(q.options[S.answers[i]] ?? '—')}</s> · Correcta: <b style="color:#16a34a">${esc(q.answerText)}</b></div>`) +
      (q.explanation ? `<div class="src">💡 ${esc(q.explanation)}</div>` : '') +
      (q.source && q.source !== q.explanation ? `<div class="src">📖 «${esc(q.source)}»</div>` : '') +
      `</div>`;
  }).join('');
  $('bReview').disabled = !g.wrong.length;
  $('bReview').textContent = g.wrong.length ? `🔁 Repasar fallos (${g.wrong.length})` : '🔁 Sin fallos';
  const h = store.get('ep_results', []);
  h.unshift({ doc: S.doc.id, title: S.doc.title, date: Date.now(), ok: g.ok, total: g.total, level, mode: S.mode, ai: !!S.ai, wrong: g.wrong.map(w => w.q) });
  store.set('ep_results', h.slice(0, 40));
  show('res');
}
// En el test del PDF no se barajan las opciones: las letras tienen que coincidir con el solucionario
const again = (q, i) => q.exam ? q : EPGen.reshuffle(q, Date.now() + i);
$('bReview').onclick = () => startTest(S.last.wrong.map((w, i) => again(w.q, i)), 'review');
$('bAgain').onclick = () => startTest(S.qs.map(again), S.mode);
$('bNew').onclick = async () => {
  S.seed = (S.seed * 7 + 13) % 1e9;
  if (EPAi.hasKey() && S.doc) {
    $('bNew').disabled = true;
    try {
      await openDoc(S.doc, {});
      if (S.qs.length) startTest(S.qs, 'normal');
    } finally { $('bNew').disabled = false; }
  } else {
    makeTestLocal();
    if (S.qs.length) startTest(S.qs, 'normal');
  }
};
$('bHome').onclick = () => { show('home'); renderLists(); paintAiBadge(); };

// ---------- listas guardadas ----------
function fmt(t) { return new Date(t).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); }
function renderLists() {
  const docs = store.get('ep_docs', []), h = store.get('ep_results', []);
  $('docs').innerHTML = docs.length ? docs.map(d => `<div class="item"><div><b>${esc(d.title)}</b><span class="muted">${fmt(d.date)} · ${(d.text.match(/\S+/g) || []).length} palabras</span></div><span><button class="btn small pri" data-open="${d.id}">Estudiar</button> <button class="btn small" data-edit="${d.id}">✏️</button> <button class="btn small" data-del="${d.id}">🗑</button></span></div>`).join('') : 'Todavía no hay apuntes guardados.';
  $('hist').innerHTML = h.length ? h.slice(0, 12).map((r, i) => `<div class="item"><div><b>${esc(r.title)}</b><span class="muted">${fmt(r.date)} · ${r.level === 'ninos' ? 'Niños' : 'Adultos'}${r.ai ? ' · IA' : ''}${r.exam ? ' · 📄 PDF' : ''}${r.mode === 'review' ? ' · repaso' : ''}</span></div><span><b style="color:${r.ok / r.total >= .5 ? '#16a34a' : '#dc2626'}">${r.ok}/${r.total}</b>${r.wrong && r.wrong.length ? ` <button class="btn small warn" data-rev="${i}">🔁</button>` : ''}</span></div>`).join('') : 'Todavía no has hecho ningún test.';
  document.querySelectorAll('[data-open]').forEach(b => b.onclick = () => openDoc(docs.find(d => d.id === b.dataset.open)));
  document.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => { const d = docs.find(x => x.id === b.dataset.edit); $('title').value = d.title; $('text').value = d.text; updCount(); scrollTo(0, 0); });
  document.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { if (confirm('¿Borrar estos apuntes?')) { store.set('ep_docs', docs.filter(d => d.id !== b.dataset.del)); renderLists(); } });
  document.querySelectorAll('[data-rev]').forEach(b => b.onclick = () => { const r = h[+b.dataset.rev]; S.doc = docs.find(d => d.id === r.doc) || { id: r.doc, title: r.title, text: '' }; startTest(r.wrong.map(again), 'review'); });
}

// ---------- arranque ----------
const draft = store.get('ep_draft', null); if (draft) { $('title').value = draft.title || ''; $('text').value = draft.text || ''; }
setInterval(() => { try { localStorage.setItem('ep_draft', JSON.stringify({ title: $('title').value, text: $('text').value })); } catch { } }, 3000);
function net() { $('off').classList.toggle('hide', navigator.onLine); } addEventListener('online', net); addEventListener('offline', net); net();
paintLevel(); paintNqCustom(); updCount(); renderLists(); paintAiBadge();
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => { });
