/* Estudia Pro by Julián Lenis — importar un test ya hecho (PDF/texto) tal cual + solucionario oficial */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.EPExam = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const LETTERS = 'abcdef';
  // Encabezados del solucionario (ca / es / en)
  const KEY_HEAD = /^\s*(?:\d+\s*[.)]\s*)?(?:full\s+de\s+)?(?:soluci(?:ó|o)n(?:es)?|solucions|solucionari|solucionario|respostes(?:\s+correctes)?|respuestas(?:\s+correctas)?|clau(?:\s+de\s+(?:respostes|correcci[oó]))?|clave(?:\s+de\s+(?:respuestas|correcci[oó]n))?|plantilla(?:\s+de\s+(?:respuestas|correcci[oó]n))?|correcci[oó](?:n)?|answer\s*key|answers|solutions|key)\b(?:\s+(?:del?|de\s+la|of\s+the|al)\s+[\p{L} ]{0,30})?\s*[:.\-–]?\s*(.*)$/iu;
  // «Resposta correcta: b» justo debajo de la pregunta
  const INLINE_SOL = /^\s*(?:resposta|respuesta|soluci(?:ó|o)n?|answer|correct(?:a|e)?)(?:\s+correct(?:a|e))?\s*[:.\-–=]\s*\(?([a-fA-F])(?![\p{L}\p{N}])\)?/iu;
  const Q_START = /^\s*(?:(?:pregunta|qüestió|qüestio|cuestión|question|q)\s*)?(\d{1,3})\s*(?:[.)\-–:º]|\s(?=[¿¡\p{Lu}]))\s*(.*)$/iu;
  const OPT_START = /^\s*[□■○●•▢☐◻◯\-–]?\s*\(?([a-fA-F])\s*[).:\-–]\s*(.*)$/u;
  const NOISE = /^\s*(?:(?:p[àa]gina|page|p[àa]g\.?)\s*\d+(?:\s*(?:de|of|\/)\s*\d+)?|\d+\s*\/\s*\d+|\d{1,3})\s*$/iu;
  const sp = s => String(s || '').replace(/[\u00a0\u2007\u202f\t]/g, ' ').replace(/ {2,}/g, ' ').trim();
  const join = (a, b) => (a ? (b ? a + ' ' + b : a) : b);

  function lines(text) {
    return String(text || '').replace(/\r\n?/g, '\n').split('\n').map(sp);
  }

  // Busca el solucionario: encabezado (último) o bloque final de pares «1-B 2-A…»
  const PAIR_LINE = /^(?:\s*\(?\d{1,3}\s*(?:[.\-–:)=]\s*){0,2}\(?[a-fA-F]\)?\s*[,;.]?\s*)+$/;
  function findKeyStart(ls) {
    for (let i = ls.length - 1; i >= 0; i--) {
      const m = ls[i].match(KEY_HEAD);
      if (!m) continue;
      const rest = m[1] || '';
      // encabezado corto, o con pares detrás («Solucions: 1B 2C…»)
      if (ls[i].length <= 60 || /\d{1,3}\s*[.\-–:)=]?\s*\(?[a-fA-F]\b/.test(rest)) {
        // no confundir con una pregunta que empieza por «Solucions…» seguida de opciones
        const next = ls.slice(i + 1).find(x => x);
        if (next && OPT_START.test(next) && !/\d/.test(next.slice(0, 4))) continue;
        return { start: i, heading: true };
      }
    }
    let j = ls.length;
    while (j > 0 && (!ls[j - 1] || PAIR_LINE.test(ls[j - 1]) || NOISE.test(ls[j - 1]) && !/^\d+$/.test(ls[j - 1]))) j--;
    const block = ls.slice(j).filter(x => x && PAIR_LINE.test(x));
    const pairs = block.join(' ').match(/\d{1,3}\s*(?:[.\-–:)=]\s*){0,2}\(?[a-fA-F]\b/g) || [];
    if (pairs.length >= 2) return { start: j, heading: false };
    return null;
  }

  function parseKey(keyLines, maxNum) {
    const key = {};
    const ls = keyLines.slice();
    if (ls.length) { const m = ls[0].match(KEY_HEAD); if (m) ls[0] = m[1] || ''; }
    const put = (n, l) => { n = +n; l = String(l).toLowerCase(); if (n >= 1 && n <= maxNum && !(n in key)) key[n] = LETTERS.indexOf(l); };
    // Tablas: fila de números seguida de fila de letras (en líneas o en un flujo de celdas)
    const toks = ls.join(' ').split(/[\s|,;]+/).filter(Boolean);
    for (let i = 0; i < toks.length;) {
      let k = i; while (k < toks.length && /^\d{1,3}[.)]?$/.test(toks[k])) k++;
      const nNum = k - i; let m = k; while (m < toks.length && /^\(?[a-fA-F]\)?$/.test(toks[m])) m++;
      const nLet = m - k;
      if (nNum >= 2 && nLet === nNum) {
        for (let t = 0; t < nNum; t++) put(parseInt(toks[i + t], 10), toks[k + t].replace(/[()]/g, ''));
        i = m;
      } else i = Math.max(i + 1, k);
    }
    // Pares «1-B», «1. b)», «1b», «1 = c», «2: A»
    const re = /(?:^|[^\p{L}\p{N}])(\d{1,3})\s*(?:[.\-–:)=º]\s*){0,2}\(?([a-fA-F])(?![\p{L}\p{N}'’·])/gu;
    for (const l of ls) {
      let m; re.lastIndex = 0;
      // formato explicativo «3. c) La Comissió… 1958 a Brussel·les»: solo el primer par de la línea
      const explanatory = /^\s*\d{1,3}\s*(?:[.\-–:)=]\s*){0,2}\(?[a-fA-F]\)?\s+\S+\s+\S+/.test(l) && !PAIR_LINE.test(l);
      while ((m = re.exec(l))) { put(m[1], m[2]); if (explanatory) break; }
    }
    return key;
  }

  function splitInlineOptions(s, expectFrom) {
    // «… a) x b) y c) z» → partes. Solo con «)» para no romper frases normales.
    const re = /(^|\s)\(?([a-fA-F])\)\s+/g; const hits = []; let m;
    while ((m = re.exec(s))) hits.push({ i: m.index + m[1].length, end: re.lastIndex, l: m[2].toLowerCase() });
    // deben ser letras consecutivas desde la esperada
    const seq = []; let want = expectFrom;
    for (const h of hits) if (h.l === LETTERS[want]) { seq.push(h); want++; }
    if (seq.length < 2 && !(seq.length === 1 && expectFrom > 0)) return null;
    const out = { before: sp(s.slice(0, seq[0].i)), opts: [] };
    seq.forEach((h, k) => out.opts.push(sp(s.slice(h.end, k + 1 < seq.length ? seq[k + 1].i : s.length))));
    return out;
  }

  function parse(text) {
    const ls = lines(text);
    const ks = findKeyStart(ls);
    const body = ks ? ls.slice(0, ks.start) : ls;
    const qs = []; let cur = null, numbered = 0, inlineSol = {};
    const close = () => { if (cur) { qs.push(cur); cur = null; } };
    for (const raw of body) {
      if (!raw || NOISE.test(raw)) continue;
      const qm = raw.match(Q_START);
      const prevNum = qs.length ? qs[qs.length - 1].num : (cur ? cur.num : 0);
      const lastNum = cur ? cur.num : prevNum;
      const restart = qm && +qm[1] === 1 && cur && !cur.opts.length && !qs.length; // «1. Instruccions…» antes de la pregunta 1
      if (qm && qm[2] && (+qm[1] === lastNum + 1 || (!cur && !qs.length && +qm[1] <= 3) || restart)) {
        if (restart) { cur = null; numbered = 0; }
        numbered++; close();
        cur = { num: +qm[1], stem: '', opts: [] };
        const inl = splitInlineOptions(qm[2], 0);
        if (inl) { cur.stem = inl.before; cur.opts = inl.opts; } else cur.stem = qm[2];
        continue;
      }
      if (!cur) continue; // portada, instrucciones…
      const sol = raw.match(INLINE_SOL);
      if (sol) { inlineSol[cur.num] = LETTERS.indexOf(sol[1].toLowerCase()); continue; }
      const om = raw.match(OPT_START);
      if (om && om[1].toLowerCase() === LETTERS[cur.opts.length] && om[2]) {
        const inl = splitInlineOptions(raw, cur.opts.length);
        if (inl && inl.opts.length > 1) cur.opts.push(...inl.opts); else cur.opts.push(om[2]);
        continue;
      }
      const inl = splitInlineOptions(raw, cur.opts.length);
      if (inl && inl.opts.length >= 2) { if (inl.before) { if (cur.opts.length) cur.opts[cur.opts.length - 1] = join(cur.opts[cur.opts.length - 1], inl.before); else cur.stem = join(cur.stem, inl.before); } cur.opts.push(...inl.opts); continue; }
      // línea partida: continúa la opción o el enunciado
      if (cur.opts.length) cur.opts[cur.opts.length - 1] = join(cur.opts[cur.opts.length - 1], raw);
      else cur.stem = join(cur.stem, raw);
    }
    close();
    const valid = qs.filter(q => q.stem && q.opts.length >= 2 && q.opts.length <= 6 && q.opts.every(o => o));
    const maxNum = qs.reduce((m, q) => Math.max(m, q.num), 0);
    const key = ks ? parseKey(ls.slice(ks.start), maxNum) : {};
    Object.assign(key, Object.fromEntries(Object.entries(inlineSol).filter(([n]) => !(n in key))));
    const questions = valid.map(q => {
      const k = q.num in key ? key[q.num] : null;
      const answer = k != null && k >= 0 && k < q.opts.length ? k : null;
      return {
        exam: true, num: q.num, question: q.stem, options: q.opts.slice(),
        answer, answerText: answer == null ? null : q.opts[answer], keyMissing: answer == null,
        keyBad: k != null && answer == null // la letra del solucionario no existe en la pregunta
      };
    });
    const keyed = questions.filter(q => !q.keyMissing).length;
    const ratio = numbered ? valid.length / numbered : 0;
    const isExam = valid.length >= 2 && (keyed >= Math.ceil(valid.length / 2) || (valid.length >= 3 && ratio >= 0.7));
    return { isExam, questions, keyed, total: questions.length, numbered, keyFound: !!ks || Object.keys(inlineSol).length > 0, keyHeading: !!(ks && ks.heading) };
  }

  // ¿Parece un test aunque no se haya podido leer bien? (para decidir si probar la IA como último recurso)
  function looksLikeExam(text) {
    const ls = lines(text);
    const nq = ls.filter(l => Q_START.test(l)).length;
    const no = ls.filter(l => OPT_START.test(l) || /(^|\s)\(?[a-c]\)\s+\S/.test(l)).length;
    const head = ls.some(l => KEY_HEAD.test(l) && l.length <= 60);
    return nq >= 3 && no >= nq * 1.5 || (head && nq >= 2 && no >= 4);
  }

  // Corrección con el solucionario oficial: las preguntas sin solución no puntúan
  function grade(qs, answers) {
    let ok = 0, graded = 0; const wrong = [], ungraded = [];
    qs.forEach((q, i) => {
      if (q.answer == null) { ungraded.push(i); return; }
      graded++;
      if (answers[i] === q.answer) ok++; else wrong.push({ q, chosen: answers[i] });
    });
    return { ok, total: graded, all: qs.length, pct: graded ? Math.round(ok * 100 / graded) : 0, wrong, ungraded };
  }

  // Comprueba que un texto devuelto (p. ej. por la IA) aparece tal cual en el original
  const flat = s => String(s || '').replace(/\s+/g, ' ').trim();
  function verbatimIn(src, piece) { const p = flat(piece); return !!p && flat(src).includes(p); }

  return { parse, parseKey, findKeyStart, looksLikeExam, grade, verbatimIn, splitInlineOptions, LETTERS, KEY_HEAD };
});
