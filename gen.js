/* Estudia Pro by Julián Lenis — generador de resúmenes y tests (sin IA, por reglas) */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.EPGen = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const STOP = new Set(('a al algo algún alguna algunas alguno algunos ante antes aquel aquella aquellas aquello aquellos aquí así aún aunque bajo bien cada casi como cómo con contra cual cuál cuales cuando cuándo cuanto cuya cuyo de del desde donde dónde dos durante e el él ella ellas ello ellos en entre era eran eres es esa esas ese eso esos esta está estaba estaban estado están estar este esto estos fue fueron fui ha había habían han hasta hay haya he hecho la las le les lo los más me mi mis mismo mucho muchos muy nada ni no nos nosotros nuestra nuestro o os otra otras otro otros para pero poco por porque que qué quien quién quienes se sea según ser si sí siempre sido sin sino sobre son su sus también tan tanto te tiene tienen todo todos tras tu tus un una unas uno unos usted vez y ya yo puede pueden cuales mediante cual tal tales dicha dicho dichos ese esa esta cuya cuyos cuyas será serán sería hace hacen hizo luego después entonces donde mientras aquí allí ahí debe deben otro ver cosa forma parte manera tipo tipos ejemplo además incluso solo sólo cuanto cuanta veces gran grandes nuevo nueva primer primera primero segundo').split(/\s+/));
  const DETS = new Set(['el','la','los','las','un','una','unos','unas','del','al','su','sus','este','esta','estos','estas','ese','esa','esos','esas','cada','nuestro','nuestra']);
  const GENDER = { el: 'm', los: 'm', un: 'm', unos: 'm', del: 'm', al: 'm', este: 'm', estos: 'm', ese: 'm', esos: 'm', nuestro: 'm', la: 'f', las: 'f', una: 'f', unas: 'f', esta: 'f', estas: 'f', esa: 'f', esas: 'f', nuestra: 'f' };
  const ABBR = ['Sr','Sra','Srta','Dr','Dra','etc','pág','págs','p','pp','ej','aprox','núm','vol','cap','Ud','Uds','Avda','art','fig','a','d','C','S','km','kg','cm','mm','min','máx','mín','EE','UU'];
  const ROMAN = /^(?=[MDCLXVI])M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/;
  const W = /[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu;

  function rng(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  function shuffle(a, r) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const low = s => s.toLocaleLowerCase('es');
  const norm = s => low(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  function clean(text) {
    return String(text || '')
      .replace(/\r/g, '')
      .replace(/(\p{L})[-­]\n\s*(\p{Ll})/gu, '$1$2')       // pala-\nbra
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{2,}/g, '\u2029')                        // párrafos
      .replace(/([^.!?:;\u2029])\n(?=\s*\p{Ll})/gu, '$1 ')   // línea cortada en minúscula
      .replace(/\n/g, '\u2029')
      .split('\u2029').map(s => s.trim()).filter(Boolean)
      .reduce((a, p) => { // une líneas partidas (OCR): el trozo anterior no acaba en punto y este empieza en minúscula
        if (a.length && !/[.!?:;…»"]$/.test(a[a.length - 1]) && /^\p{Ll}/u.test(p)) a[a.length - 1] += ' ' + p; else a.push(p); return a; }, [])
      .join('\n\n').replace(/ {2,}/g, ' ');
  }

  function sentences(text) {
    const t = clean(text);
    const out = [];
    for (const para of t.split(/\n\n/)) {
      let p = para.replace(/[•·▪●■\-–—*]\s+/g, m => m.trim() ? '' : m);
      // protege abreviaturas
      p = p.replace(new RegExp('\\b(' + ABBR.join('|') + ')\\.', 'g'), '$1\u0001');
      p = p.replace(/(\d)\.(\d)/g, '$1\u0001$2');
      const parts = p.split(/(?<=[.!?…])\s+(?=[¿¡"«(\p{Lu}\p{N}])/u);
      for (let s of parts) {
        s = s.replace(/\u0001/g, '.').trim();
        if (!s) continue;
        const words = s.match(W) || [];
        if (words.length < 4) { if (out.length && words.length) out[out.length - 1] += ' ' + s; continue; }
        out.push(s);
      }
    }
    return out;
  }

  function tf(sents) {
    const f = new Map();
    for (const s of sents) for (const w of (s.match(W) || [])) {
      const k = low(w); if (k.length < 3 || STOP.has(k) || /^\d+$/.test(k)) continue;
      f.set(k, (f.get(k) || 0) + 1);
    }
    return f;
  }

  function scoreSentences(sents, freq, level) {
    const max = Math.max(1, ...freq.values());
    return sents.map((s, i) => {
      const ws = (s.match(W) || []);
      const c = ws.map(low).filter(k => freq.has(k));
      let sc = c.reduce((a, k) => a + freq.get(k) / max, 0) / Math.sqrt(Math.max(ws.length, 1));
      if (i === 0) sc *= 1.15;
      if (/\d/.test(s)) sc *= 1.1;
      if (ws.length > (level === 'ninos' ? 22 : 40)) sc *= 0.5;
      if (ws.length < 6) sc *= 0.7;
      return { s, i, sc, n: ws.length };
    });
  }

  function summarize(text, opts = {}) {
    const level = opts.level || 'adultos';
    const sents = sentences(text); if (!sents.length) return [];
    const freq = tf(sents);
    const n = opts.n || Math.max(level === 'ninos' ? 2 : 3, Math.min(level === 'ninos' ? 4 : 8, Math.round(sents.length * (level === 'ninos' ? 0.2 : 0.3))));
    return scoreSentences(sents, freq, level).sort((a, b) => b.sc - a.sc).slice(0, n).sort((a, b) => a.i - b.i).map(x => x.s);
  }

  function keywords(text, n = 12) {
    const f = tf(sentences(text));
    return [...f.entries()].filter(([k]) => k.length > 3).sort((a, b) => b[1] - a[1] || b[0].length - a[0].length).slice(0, n).map(x => x[0]);
  }

  // Candidatos a hueco en una frase: números/fechas, nombres propios, sustantivos (tras determinante)
  function candidates(s, freq) {
    const toks = []; let m; W.lastIndex = 0;
    while ((m = W.exec(s))) toks.push({ w: m[0], i: m.index, e: m.index + m[0].length });
    const res = [];
    for (let k = 0; k < toks.length; k++) {
      const t = toks[k], w = t.w, l = low(w), prev = k ? low(toks[k - 1].w) : '';
      // números y años (incluye %, "millones")
      if (/^\d[\d.,]*$/.test(w)) {
        let e = t.e; const after = s.slice(e);
        const mm = after.match(/^\s?(%|por ciento|°C|ºC|grados|millones|mil|km|metros|años)/);
        if (mm) e += mm[0].length;
        res.push({ text: s.slice(t.i, e), i: t.i, e, type: /^\d{3,4}$/.test(w) && +w > 0 && +w < 2100 && !mm ? 'year' : 'num', w: 3, unit: mm ? mm[0] : '' });
        continue;
      }
      if (ROMAN.test(w) && w.length > 1 && /^(siglo|siglos)$/.test(prev)) { res.push({ text: w, i: t.i, e: t.e, type: 'roman', w: 3 }); continue; }
      // nombres propios (secuencia de mayúsculas, permite "de", "del", "y" internos)
      if (/^\p{Lu}/u.test(w) && k > 0 && !/[.!?:]\s*$/.test(s.slice(toks[k - 1].e, t.i)) && w.length > 1 && !STOP.has(l)) {
        let j = k; while (j + 1 < toks.length) {
          const nx = toks[j + 1].w;
          if (/^\p{Lu}/u.test(nx) && /^\s+$/.test(s.slice(toks[j].e, toks[j + 1].i))) { j++; continue; }
          if (/^(de|del|la)$/.test(nx) && j + 2 < toks.length && /^\p{Lu}/u.test(toks[j + 2].w)) { j += 2; continue; }
          break;
        }
        const ptxt = s.slice(t.i, toks[j].e);
        if (ROMAN.test(ptxt) || ptxt.length < 3) { k = j; continue; }
        res.push({ text: ptxt, i: t.i, e: toks[j].e, nw: j - k + 1, type: 'prop', w: 2.5 + (freq.get(l) || 0) * 0.1 });
        k = j; continue;
      }
      // sustantivos comunes: tras determinante, no stopword, longitud >= 4
      if (DETS.has(prev) && /^\p{Ll}/u.test(w) && l.length >= 4 && !STOP.has(l) && !/(mente|ando|iendo|ado|ido)$/.test(l)) {
        res.push({ text: w, i: t.i, e: t.e, type: 'term', w: 1 + (freq.get(l) || 0), det: prev, g: GENDER[prev] || '', plural: /s$/.test(l) });
      }
    }
    return res;
  }

  const sameForm = (a, b) => a.type === 'prop' ? Math.abs((a.nw || 1) - (b.nw || 1)) <= 1 : (a.plural === b.plural);
  const sameGender = (a, b) => a.type !== 'term' || !a.g || !b.g || a.g === b.g || /^(agua|alma|águila|hacha|área|aula|hambre)$/.test(low(a.text)) || /^(agua|alma|águila|hacha|área|aula|hambre)$/.test(low(b.text));

  function numDistractors(c, r) {
    const w = c.text.replace(c.unit, '').trim();
    const v = parseFloat(w.replace(/\./g, '').replace(',', '.'));
    if (!isFinite(v)) return [];
    const out = new Set(); let guard = 0;
    const deltas = c.type === 'year' ? [1, 2, 5, 10, 12, 20, 25, 50, 100] : [];
    while (out.size < 6 && guard++ < 100) {
      let x;
      if (c.type === 'year') x = v + (r() < 0.5 ? -1 : 1) * deltas[Math.floor(r() * deltas.length)];
      else { const f = [0.5, 0.75, 1.25, 1.5, 2, 3, 0.25][Math.floor(r() * 7)]; x = v * f; x = v >= 10 ? Math.round(x) : Math.round(x * 10) / 10; if (/%/.test(c.unit) && x > 100) continue; }
      if (x === v || x <= 0) continue;
      const str = (Number.isInteger(x) ? String(x) : String(x).replace('.', ',')) + (c.unit || '');
      out.add(str);
    }
    return [...out];
  }
  function romanDistractors(c) {
    const R = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX','XXI'];
    const i = R.indexOf(c.text); if (i < 0) return [];
    return [i - 2, i - 1, i + 1, i + 2, i + 3].filter(j => j >= 0 && j < R.length && j !== i).map(j => R[j]);
  }

  function generate(text, opts = {}) {
    const level = opts.level || 'adultos';
    const r = rng(opts.seed || Date.now());
    const sents = sentences(text);
    const freq = tf(sents);
    const max = opts.count || (level === 'ninos' ? 5 : 10);
    const scored = scoreSentences(sents, freq, level);
    // banco de términos por tipo para distractores
    const all = scored.map(x => ({ x, cs: candidates(x.s, freq) }));
    const bank = { prop: new Map(), term: new Map(), year: new Map(), num: new Map(), roman: new Map() };
    for (const { cs } of all) for (const c of cs) { const k = norm(c.text); if (!bank[c.type].has(k)) bank[c.type].set(k, c); }
    const used = new Set(); const qs = [];
    const order = all.filter(a => a.cs.length && (level !== 'ninos' || a.x.n <= 26) && a.x.n >= 5)
      .sort((a, b) => b.x.sc - a.x.sc);
    for (const { x, cs } of order) {
      if (qs.length >= max) break;
      const pool = cs.filter(c => !used.has(norm(c.text))).sort((a, b) => b.w - a.w + (r() - 0.5) * 0.6);
      for (const c of pool) {
        let ds;
        const key = norm(c.text);
        const rest = norm(x.s.slice(0, c.i) + ' ' + x.s.slice(c.e));
        if (new RegExp('(^|[^\\p{L}])' + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^\\p{L}]|$)', 'u').test(rest)) continue; // se delataría
        if (c.type === 'year' || c.type === 'num') ds = [...bank[c.type].values()].filter(d => norm(d.text) !== key && (c.type === 'year' || d.unit === c.unit)).map(d => d.text).concat(numDistractors(c, r));
        else if (c.type === 'roman') ds = romanDistractors(c);
        else {
          let cand = [...bank[c.type].values()].filter(d => norm(d.text) !== key && sameForm(c, d) && !x.s.includes(d.text) && !norm(d.text).includes(key) && !key.includes(norm(d.text)));
          if (level === 'ninos') cand.sort((a, b) => Math.abs(b.text.length - c.text.length) - Math.abs(a.text.length - c.text.length) + (r() - 0.5) * 4);
          else cand.sort((a, b) => Math.abs(a.text.length - c.text.length) - Math.abs(b.text.length - c.text.length) + (r() - 0.5) * 4 + (b.w - a.w) * 0.2);
          const g = cand.filter(d => sameGender(c, d));
          ds = (g.length >= 3 ? g : cand).map(d => d.text);
        }
        const uniq = []; const seen = new Set([key]);
        for (const d of ds) { const k = norm(d); if (!seen.has(k) && d.trim()) { seen.add(k); uniq.push(d); } if (uniq.length === 3) break; }
        if (uniq.length < 3) continue;
        // ajusta mayúsculas de términos comunes
        const fix = d => c.type === 'term' ? low(d) : d;
        const options = shuffle([c.text, ...uniq.map(fix)], r);
        const blank = x.s.slice(0, c.i) + '_____' + x.s.slice(c.e);
        qs.push({ id: qs.length + 1, question: blank, options, answer: options.indexOf(c.text), answerText: c.text, source: x.s, type: c.type, sentenceIndex: x.i });
        used.add(key);
        break;
      }
    }
    return qs.sort((a, b) => a.sentenceIndex - b.sentenceIndex).map((q, i) => (q.id = i + 1, q));
  }

  function reshuffle(q, seed) { const r = rng(seed || Date.now()); const options = shuffle(q.options, r); return Object.assign({}, q, { options, answer: options.indexOf(q.answerText) }); }
  function grade(qs, answers) {
    let ok = 0; const wrong = [];
    qs.forEach((q, i) => { if (answers[i] === q.answer) ok++; else wrong.push({ q, chosen: answers[i] }); });
    return { ok, total: qs.length, pct: qs.length ? Math.round(ok * 100 / qs.length) : 0, wrong };
  }
  return { clean, sentences, summarize, keywords, generate, grade, reshuffle, candidates, tf };
});
