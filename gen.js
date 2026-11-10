/* Estudia Pro by Julián Lenis — generador de resúmenes y tests (sin IA, por reglas) */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.EPGen = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const STOP = new Set(('a al algo algún alguna algunas alguno algunos ante antes aquel aquella aquellas aquello aquellos aquí así aún aunque bajo bien cada casi como cómo con contra cual cuál cuales cuando cuándo cuanto cuya cuyo de del desde donde dónde dos durante e el él ella ellas ello ellos en entre era eran eres es esa esas ese eso esos esta está estaba estaban estado están estar este esto estos fue fueron fui ha había habían han hasta hay haya he hecho la las le les lo los más me mi mis mismo mucho muchos muy nada ni no nos nosotros nuestra nuestro o os otra otras otro otros para pero poco por porque que qué quien quién quienes se sea según ser si sí siempre sido sin sino sobre son su sus también tan tanto te tiene tienen todo todos tras tu tus un una unas uno unos usted vez y ya yo puede pueden cuales mediante cual tal tales dicha dicho dichos será serán sería hace hacen hizo luego después entonces mientras allí ahí debe deben ver cosa forma parte manera tipo tipos ejemplo además incluso solo sólo cuanto cuanta veces gran grandes nuevo nueva primer primera primero segundo tercera tercer tres cuatro cinco seis siete ocho nueve diez así mismo asimismo').split(/\s+/));
  const DETS = new Set(['el','la','los','las','un','una','unos','unas','del','al','su','sus','este','esta','estos','estas','ese','esa','esos','esas','cada','nuestro','nuestra','aquel','aquella']);
  const GENDER = { el: 'm', los: 'm', un: 'm', unos: 'm', del: 'm', al: 'm', este: 'm', estos: 'm', ese: 'm', esos: 'm', nuestro: 'm', la: 'f', las: 'f', una: 'f', unas: 'f', esta: 'f', estas: 'f', esa: 'f', esas: 'f', nuestra: 'f' };
  const ABBR = ['Sr','Sra','Srta','Dr','Dra','etc','pág','págs','p','pp','ej','aprox','núm','vol','cap','Ud','Uds','Avda','art','fig','a','d','C','S','km','kg','cm','mm','min','máx','mín','EE','UU'];
  const ROMAN = /^(?=[MDCLXVI])M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/;
  const W = /[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu;
  // términos demasiado genéricos para respuestas
  const WEAK = new Set(['proceso','parte','forma','manera','tipo','tipos','cosa','cosas','ejemplo','efecto','causa','resultado','número','lugar','persona','personas','tiempo','año','años','día','días','vez','veces','caso','casos','serie','grupo','nivel','sistema','acción','acciones','elemento','elementos','factor','factores','aspecto','aspectos','punto','puntos','dato','datos','información','texto','página','páginas','capítulo','tema','temas','nombre','nombres','palabra','palabras','frase','frases','idea','ideas','hecho','hechos','modo','modos','sentido','razón','razones','uso','usos','base','bases','medio','medios','fin','fines','paso','pasos','valor','valores','cantidad','función','funciones','relación','relaciones','cambio','cambios','estado','estados','periodo','período','época','siglo','siglos','mundo','tierra','agua','aire','sol','vida','cuerpo','hombre','mujer','niño','niña','gente','país','países','ciudad','ciudades','región','regiones','propio','propia','propios','propias','mismo','misma','otros','otras','todo','toda','varios','varias','algunos','algunas','mucho','mucha','poco','poca','nuevo','nueva','gran','grande','mayor','menor','mejor','peor','único','unica','único','primero','primera','segundo','segunda']);

  function rng(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  function shuffle(a, r) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const low = s => s.toLocaleLowerCase('es');
  const norm = s => low(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const capFirst = s => s ? s.charAt(0).toLocaleUpperCase('es') + s.slice(1) : s;
  const ensureQ = s => { s = s.trim().replace(/\s+/g, ' '); if (!/[?？]$/.test(s)) s += '?'; if (!/^[¿¡"«]/.test(s)) s = '¿' + s.replace(/^[¿¡]?/, ''); return s; };
  const ensurePeriod = s => { s = s.trim().replace(/\s+/g, ' '); if (!/[.!?…]$/.test(s)) s += '.'; return capFirst(s); };
  // Recapitaliza nombres propios frecuentes tras bajar la primera letra
  const fixNames = s => s.replace(/\b(felipe|isabel|fernando|carlos|cristóbal|colón|madrid|granada|américa|españa|castilla|aragón|cádiz)\b/gi,
    w => w.charAt(0).toLocaleUpperCase('es') + w.slice(1));

  function clean(text) {
    return String(text || '')
      .replace(/\u0000/g, '')
      .replace(/\r/g, '')
      .replace(/[|¦]/g, 'I')
      .replace(/[“”„]/g, '"').replace(/[‘’]/g, "'")
      .replace(/[•·▪●■◆◇○●]\s*/g, '')
      .replace(/[^\S\n]+/g, ' ')
      .replace(/(\p{L})[-­]\n\s*(\p{Ll})/gu, '$1$2')
      .replace(/(\p{L})[-­]\s+(\p{Ll})/gu, '$1$2')
      .replace(/([^.!?:;\n])\n(?=\s*\p{Ll})/gu, '$1 ')
      .replace(/\n{2,}/g, '\u2029')
      .replace(/\n/g, '\u2029')
      .split('\u2029').map(s => s.trim()).filter(Boolean)
      .reduce((a, p) => {
        // descarta basura OCR muy corta o sin letras
        if (!/\p{L}{3,}/u.test(p)) return a;
        if ((p.match(/[^\p{L}\p{N}\s.,;:¿?¡!'"()\-%°º]/gu) || []).length > p.length * 0.25) return a;
        if (a.length && !/[.!?:;…»"]$/.test(a[a.length - 1]) && /^\p{Ll}/u.test(p)) a[a.length - 1] += ' ' + p;
        else a.push(p);
        return a;
      }, [])
      .join('\n\n').replace(/ {2,}/g, ' ');
  }

  function isGarbageSentence(s) {
    const ws = s.match(W) || [];
    if (ws.length < 5 || ws.length > 55) return true;
    const letters = (s.match(/\p{L}/gu) || []).length;
    if (letters < 15) return true;
    // demasiados símbolos raros
    if ((s.match(/[^\p{L}\p{N}\s.,;:¿?¡!'"()\-%°º\/]/gu) || []).length > 4) return true;
    // demasiadas palabras sueltas de 1-2 letras (OCR roto)
    const short = ws.filter(w => w.length <= 2 && !/^(el|la|lo|los|las|un|una|de|del|al|en|a|y|o|u|se|si|no|su|me|te|le|nos|os|mi|tu|ya|es|ha|he|ni|por|con|sin)$/i.test(w)).length;
    if (short > ws.length * 0.35) return true;
    return false;
  }

  function sentences(text) {
    const t = clean(text);
    const out = [];
    for (const para of t.split(/\n\n/)) {
      let p = para.replace(/^[•·▪●■\-–—*]\s+/, '');
      p = p.replace(new RegExp('\\b(' + ABBR.join('|') + ')\\.', 'g'), '$1\u0001');
      p = p.replace(/(\d)\.(\d)/g, '$1\u0001$2');
      const parts = p.split(/(?<=[.!?…])\s+(?=[¿¡"«(\p{Lu}\p{N}])/u);
      for (let s of parts) {
        s = s.replace(/\u0001/g, '.').trim();
        if (!s || isGarbageSentence(s)) continue;
        const words = s.match(W) || [];
        if (words.length < 5) { if (out.length && words.length) out[out.length - 1] += ' ' + s; continue; }
        out.push(s.replace(/\s+/g, ' '));
      }
    }
    return out;
  }

  function tf(sents) {
    const f = new Map();
    for (const s of sents) for (const w of (s.match(W) || [])) {
      const k = low(w); if (k.length < 3 || STOP.has(k) || WEAK.has(k) || /^\d+$/.test(k)) continue;
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
      // definiciones: "X es/son ...", "se llama/conoce como"
      if (/\b(es|son|se llama|se denomina|se conoce como|consiste en|significa|se define)\b/i.test(s)) sc *= 1.55;
      // causas / consecuencias
      if (/\b(porque|debido a|a causa de|por lo tanto|por tanto|como consecuencia|gracias a|provoca|produce|genera|origina)\b/i.test(s)) sc *= 1.3;
      // fechas / números
      if (/\b(1[0-9]{3}|20[0-2][0-9])\b/.test(s) || /\d+\s?%/.test(s)) sc *= 1.25;
      // nombres propios
      if (/(?<![.!?]\s|^)\b\p{Lu}\p{Ll}+(?:\s+(?:de|del|la|los|las|y)\s+\p{Lu}\p{Ll}+|\s+\p{Lu}\p{Ll}+)+/u.test(s)) sc *= 1.15;
      // posible título / encabezado corto con mayúsculas
      if (i === 0) sc *= 1.2;
      if (/^[A-ZÁÉÍÓÚÑ0-9].{0,40}$/.test(s) && ws.length <= 8) sc *= 1.2;
      if (ws.length > (level === 'ninos' ? 22 : 42)) sc *= 0.45;
      if (ws.length < 6) sc *= 0.65;
      // penaliza frases muy genéricas
      const weakHits = ws.map(low).filter(k => WEAK.has(k)).length;
      if (weakHits > ws.length * 0.3) sc *= 0.7;
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
    return [...f.entries()].filter(([k]) => k.length > 3 && !WEAK.has(k)).sort((a, b) => b[1] - a[1] || b[0].length - a[0].length).slice(0, n).map(x => x[0]);
  }

  function candidates(s, freq) {
    const toks = []; let m; W.lastIndex = 0;
    while ((m = W.exec(s))) toks.push({ w: m[0], i: m.index, e: m.index + m[0].length });
    const res = [];
    for (let k = 0; k < toks.length; k++) {
      const t = toks[k], w = t.w, l = low(w), prev = k ? low(toks[k - 1].w) : '';
      if (/^\d[\d.,]*$/.test(w)) {
        let e = t.e; const after = s.slice(e);
        const mm = after.match(/^\s?(%|por ciento|°C|ºC|grados|millones|mil|km|metros|años)/);
        if (mm) e += mm[0].length;
        res.push({ text: s.slice(t.i, e), i: t.i, e, type: /^\d{3,4}$/.test(w) && +w >= 1000 && +w < 2100 && !mm ? 'year' : 'num', w: 3.2, unit: mm ? mm[0] : '' });
        continue;
      }
      if (ROMAN.test(w) && w.length > 1 && /^(siglo|siglos)$/.test(prev)) { res.push({ text: w, i: t.i, e: t.e, type: 'roman', w: 3 }); continue; }
      if (/^\p{Lu}/u.test(w) && k > 0 && !/[.!?:]\s*$/.test(s.slice(toks[k - 1].e, t.i)) && w.length > 1 && !STOP.has(l) && !WEAK.has(l)) {
        let j = k; while (j + 1 < toks.length) {
          const nx = toks[j + 1].w;
          if (/^\p{Lu}/u.test(nx) && /^\s+$/.test(s.slice(toks[j].e, toks[j + 1].i))) { j++; continue; }
          if (/^(de|del|la|los|las|y)$/.test(nx) && j + 2 < toks.length && /^\p{Lu}/u.test(toks[j + 2].w)) { j += 2; continue; }
          break;
        }
        const ptxt = s.slice(t.i, toks[j].e);
        if (ROMAN.test(ptxt) || ptxt.length < 3) { k = j; continue; }
        const ctx = DETS.has(prev) ? 'det:' + prev : (/^(a|en|desde|hasta|hacia)$/.test(prev) ? 'loc' : prev === 'de' ? 'de' : (/^\p{Ll}/u.test(toks[k - 1].w) && !STOP.has(prev) ? 'mod' : 'subj'));
        res.push({ text: ptxt, i: t.i, e: toks[j].e, nw: j - k + 1, type: 'prop', w: 2.6 + (freq.get(l) || 0) * 0.15, ctx });
        k = j; continue;
      }
      if (DETS.has(prev) && /^\p{Ll}/u.test(w) && l.length >= 5 && !STOP.has(l) && !WEAK.has(l) && !/(mente|ando|iendo|ado|ido|aba|ían|aron)$/.test(l)) {
        res.push({ text: w, i: t.i, e: t.e, type: 'term', w: 1.2 + (freq.get(l) || 0) * 1.1, det: prev, g: GENDER[prev] || '', plural: /^(los|las|unos|unas|estos|estas|esos|esas|sus|nuestros|nuestras)$/.test(prev) || (!/^(el|la|un|una|del|al|este|esta|ese|esa|su|nuestro|nuestra|cada|aquel|aquella)$/.test(prev) && /s$/.test(l)) });
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
    while (out.size < 8 && guard++ < 120) {
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

  // Intenta convertir una frase importante en pregunta natural
  function naturalQuestion(s, freq, r) {
    const words = s.match(W) || [];

    // "Este proceso se llama X" / "se llama condensación"
    let m = s.match(/^(.+?)\s*[;,]?\s*(?:este|ese|el)?\s*proceso\s+se\s+(?:llama|denomina|conoce como)\s+(?:la|el|los|las)?\s*([A-Za-zÁÉÍÓÚáéíóúÑñ][\wÁÉÍÓÚáéíóúñ\-]{3,})/i);
    if (m && !WEAK.has(low(m[2]))) {
      let ctx = m[1].replace(/[.!?]$/, '').trim();
      ctx = ctx.replace(/^(cuando|si|al|tras|después de)\s+/i, '');
      if (ctx.length >= 18 && ctx.length <= 120) {
        return { question: ensureQ('Cómo se llama el proceso en el que ' + low(ctx)), answer: low(m[2]), type: 'def', source: s, kind: 'natural' };
      }
    }

    // "…, lo que se conoce como precipitación"
    m = s.match(/^(.+?),\s*lo que se conoce como\s+(?:la|el)?\s*([A-Za-zÁÉÍÓÚáéíóúÑñ][\wÁÉÍÓÚáéíóúñ\-]{3,})/i);
    if (m && !WEAK.has(low(m[2]))) {
      let ctx = m[1].replace(/[.!?]$/, '').trim();
      if (ctx.length > 120) return null;
      return { question: ensureQ('Cómo se llama el hecho de que ' + low(ctx)), answer: low(m[2]), type: 'def', source: s, kind: 'natural' };
    }

    // Definición corta: "La fotosíntesis es …" / "El ciclo del agua es …"
    m = s.match(/^((?:El|La|Los|Las|Un|Una)\s+[^.]{3,60}?|[A-ZÁÉÍÓÚÑ][^.]{1,40}?)\s+(es|son)\s+(.+)$/i);
    if (m) {
      const subjFull = m[1].trim();
      const subjWords = subjFull.match(W) || [];
      let pred = m[3].trim().replace(/[.!?]$/, '');
      // sujeto corto y predicado útil; evita frases que empiezan por adverbio/número
      if (subjWords.length >= 1 && subjWords.length <= 8 && pred.length >= 12 && !/^(aprox|aproximadamente|\d)/i.test(subjFull) && !/^(Esto|Eso|Aquello|Él|Ella)$/i.test(subjFull)) {
        // si predicado es "el proceso … se llama X" ya lo cubrimos arriba
        if (!/\bse\s+(llama|denomina|conoce como)\b/i.test(pred)) {
          const q = ensureQ((m[2].toLowerCase() === 'son' ? 'Qué son ' : 'Qué es ') + low(subjFull));
          let ans = pred;
          // "el proceso por el cual X" → respuesta X (más clara)
          const porElCual = pred.match(/^(?:el|la|los|las|un|una)\s+(?:proceso|fenómeno|mecanismo)\s+(?:por el cual|mediante el cual|que)\s+(.+)/i);
          if (porElCual) ans = pred;
          else {
            // "el pigmento verde…" → deja el sintagma nominal completo
            ans = pred;
          }
          if (ans.length > 85) ans = ans.slice(0, 82).replace(/\s+\S*$/, '') + '…';
          ans = ans.charAt(0).toLocaleLowerCase('es') + ans.slice(1);
          return { question: q, answer: ans, type: 'def', source: s, kind: 'natural', long: ans.length > 40 };
        }
      }
    }

    // "En AAAA …"
    m = s.match(/^(En|Hacia|Desde|Hasta)\s+(1[0-9]{3}|20[0-2][0-9])\s+(.+)$/i);
    if (m) {
      let rest = m[3].replace(/[.!?]$/, '').trim();
      rest = rest.replace(new RegExp('\\b' + m[2] + '\\b', 'g'), '').replace(/\s{2,}/g, ' ').trim();
      // construye pregunta con verbo conjugado si empieza por verbo
      if (rest.length >= 12) {
        // "se casaron Isabel..." → ok; capitaliza nombres propios se pierde al lower — mejor solo lower la primera palabra si es verbo
        let body = rest;
        // Conserva mayúsculas internas; solo pasa a minúscula la primera letra si no es nombre propio multi-palabra raro
        body = body.charAt(0).toLocaleLowerCase('es') + body.slice(1);
        // Recupera mayúscula de nombres propios tras el primer token verbal (se casaron Isabel…)
        body = body.replace(/\b([a-záéíóúñ]+)\s+([A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚáéíóúñ]*)/g, (all, a, b) => {
          // deja como está
          return all;
        });
        return { question: ensureQ('En qué año ' + fixNames(body)), answer: m[2], type: 'year', source: s, kind: 'natural' };
      }
    }

    // "… en AAAA." (sujeto + verbo + en año)
    m = s.match(/^(.{12,120}?)\s+en\s+(1[0-9]{3}|20[0-2][0-9])(?:\s+y\b.*)?[.!?]?$/i);
    if (m && !/^En\s/i.test(s)) {
      let body = m[1].replace(/[.!?]$/, '').trim();
      const inv = body.match(/^(.+?)\s+(se\s+[A-Za-zÁÉÍÓÚáéíóúÑñ]+)$/i);
      if (inv) {
        let subj = inv[1];
        subj = subj.replace(/^(El|La|Los|Las|Un|Una)\s+/, (m0) => m0.toLocaleLowerCase('es'));
        body = inv[2].toLocaleLowerCase('es') + ' ' + subj;
      } else {
        body = body.charAt(0).toLocaleLowerCase('es') + body.slice(1);
      }
      return { question: ensureQ('En qué año ' + fixNames(body)), answer: m[2], type: 'year', source: s, kind: 'natural' };
    }

    // "… mediante/a través de la evaporación"
    m = s.match(/^(.+?)\s+(?:mediante|a través de|por medio de)\s+(?:la|el|los|las)?\s*([a-záéíóúñ][\wáéíóúñ\-]{4,})[.!?]?$/i);
    if (m && !WEAK.has(low(m[2])) && (m[1].match(W) || []).length >= 5) {
      let body = m[1].replace(/[.!?]$/, '').trim();
      body = body.charAt(0).toLocaleLowerCase('es') + body.slice(1);
      // evita "mediante qué sol calienta" → mejor "¿Mediante qué el Sol calienta…?"
      if (/^(el|la|los|las|un|una)\s/i.test(m[1])) body = low(m[1].split(/\s+/)[0]) + ' ' + m[1].split(/\s+/).slice(1).join(' ');
      return { question: ensureQ('Mediante qué ' + body), answer: low(m[2]), type: 'term', source: s, kind: 'natural' };
    }

    return null;
  }

  // ----- Solo preguntas tipo test clásicas: enunciado completo + 3 opciones (A, B, C) -----
  const N_OPTS = 3;
  const PROC = /(ción|sión|sis|miento|aje|ismo)$/i;
  const wc = s => (String(s).match(W) || []).length;
  const BAD_STEM = /_{2,}|\.{4,}|…\s*\?|\b(completa|rellena|rellenar|hueco|espacio en blanco|palabra que falta|qu[eé] palabra falta)\b/i;

  // Comprueba que una pregunta es de opción múltiple clásica (nada de huecos)
  function isClassicMC(q) {
    if (!q || typeof q.question !== 'string') return false;
    const stem = q.question.trim();
    if (stem.length < 10 || BAD_STEM.test(stem)) return false;
    if (!/[?？.]$/.test(stem)) return false;
    if (!Array.isArray(q.options) || q.options.length !== N_OPTS) return false;
    const opts = q.options.map(o => String(o || '').trim());
    if (opts.some(o => !o || o.length < 2 || /_{2,}|…$/.test(o))) return false;
    if (new Set(opts.map(norm)).size !== N_OPTS) return false;
    if (!(q.answer >= 0 && q.answer < N_OPTS)) return false;
    if (norm(opts[q.answer]) !== norm(q.answerText)) return false;
    // mismo tipo de respuesta: longitudes comparables (evita mezclar frases con palabras sueltas)
    const ns = opts.map(wc);
    const mn = Math.min(...ns), mx = Math.max(...ns);
    if (mn <= 2 && mx >= 5) return false;
    if (mx > 3 * Math.max(mn, 1) + 2) return false;
    // años con años, números con números
    const isNum = o => /^\d/.test(o);
    if (opts.some(isNum) && !opts.every(isNum)) return false;
    return true;
  }

  // Afirmación verdadera vs. dos versiones falsas (cambia un dato por otro del mismo tipo)
  const STEMS_AD = ['Según los apuntes, ¿cuál de estas afirmaciones es correcta?', '¿Cuál de estas afirmaciones es verdadera?', 'De acuerdo con el texto, ¿qué afirmación es cierta?', '¿Qué afirmación coincide con lo que dicen los apuntes?'];
  const STEMS_NI = ['¿Qué frase es verdad?', '¿Cuál de estas frases es correcta?', 'Según lo que has leído, ¿qué frase es verdad?'];
  function makeStatement(x, c, ds, r, level, k, allNorm) {
    const base = x.s.replace(/\s+/g, ' ').trim();
    const fix = d => c.type === 'term' ? low(d) : d;
    const build = d => ensurePeriod(x.s.slice(0, c.i) + d + x.s.slice(c.e));
    const truth = ensurePeriod(base);
    const falses = [];
    for (const d of ds) {
      const f = build(fix(d));
      const fk = norm(f);
      if (fk === norm(truth) || allNorm.has(fk) || falses.some(z => norm(z) === fk)) continue;
      falses.push(f);
      if (falses.length === N_OPTS - 1) break;
    }
    if (falses.length < N_OPTS - 1) return null;
    const options = shuffle([truth, ...falses], r);
    const stems = level === 'ninos' ? STEMS_NI : STEMS_AD;
    return {
      question: stems[k % stems.length],
      options,
      answer: options.indexOf(truth),
      answerText: truth,
      source: x.s,
      type: c.type,
      kind: 'statement',
      sentenceIndex: x.i
    };
  }

  function pickDistractors(c, bank, x, r, level, forbid, strict) {
    const key = norm(c.text);
    const banned = new Set([key, ...(forbid || []).map(norm)]);
    let ds;
    if (c.type === 'year' || c.type === 'num') {
      ds = [...bank[c.type].values()].filter(d => norm(d.text) !== key && (c.type === 'year' || d.unit === c.unit)).map(d => d.text).concat(numDistractors(c, r));
    } else if (c.type === 'roman') ds = romanDistractors(c);
    else {
      let cand = [...bank[c.type].values()].filter(d =>
        norm(d.text) !== key &&
        sameForm(c, d) &&
        !x.s.includes(d.text) &&
        !norm(d.text).includes(key) &&
        !key.includes(norm(d.text)) &&
        !WEAK.has(low(d.text))
      );
      // términos tipo proceso (-ción, -sión…) solo con otros del mismo tipo
      if (c.type === 'term') cand = cand.filter(d => PROC.test(d.text) === PROC.test(c.text));
      if (strict && c.type === 'term') cand = cand.filter(d => (d.g || '') === (c.g || '') && d.plural === c.plural);
      if (strict && c.type === 'prop') {
        if (c.ctx === 'mod') return [];
        const ctxs = new Map();
        for (const { cs } of bank._all) for (const z of cs) if (z.type === 'prop') { const kk = norm(z.text); if (!ctxs.has(kk)) ctxs.set(kk, new Set()); ctxs.get(kk).add(z.ctx); }
        cand = cand.filter(d => (ctxs.get(norm(d.text)) || new Set()).has(c.ctx));
      }
      cand.sort((a, b) => Math.abs(a.text.length - c.text.length) - Math.abs(b.text.length - c.text.length) + (r() - 0.5) * 3 + (level === 'ninos' ? 0 : (b.w - a.w) * 0.2));
      const g = cand.filter(d => sameGender(c, d));
      ds = (strict || g.length >= N_OPTS - 1 ? g : cand).map(d => d.text);
    }
    const uniq = []; const seen = new Set(banned);
    for (const d of ds) {
      const raw = String(d).trim();
      if (!raw) continue;
      const k = norm(raw);
      if (seen.has(k)) continue;
      if (raw.length < 3 || WEAK.has(low(raw))) continue;
      seen.add(k);
      uniq.push(c.type === 'term' ? low(raw) : raw);
      if (uniq.length >= 6) break;
    }
    return uniq;
  }

  function generate(text, opts = {}) {
    const level = opts.level || 'adultos';
    const r = rng(opts.seed || Date.now());
    const sents = sentences(text);
    const freq = tf(sents);
    let max = opts.count || (level === 'ninos' ? 5 : 10);
    if (max > 100) max = 100;
    if (max < 1) max = 1;
    const scored = scoreSentences(sents, freq, level);
    const all = scored.map(x => ({ x, cs: candidates(x.s, freq) }));
    const bank = { prop: new Map(), term: new Map(), year: new Map(), num: new Map(), roman: new Map() };
    for (const { cs } of all) for (const c of cs) {
      const k = norm(c.text);
      if (!bank[c.type].has(k)) bank[c.type].set(k, c);
    }
    bank._all = all;
    const allNorm = new Set(sents.map(s => norm(ensurePeriod(s))));

    const usedAns = new Set();
    const usedSrc = new Set();
    const usedQ = new Set();
    const qs = [];
    const push = q => {
      if (!isClassicMC(q)) return false;
      const qk = norm(q.question) + '|' + norm(q.answerText);
      if (usedQ.has(qk)) return false;
      usedQ.add(qk); qs.push(q); return true;
    };

    const order = all
      .filter(a => (level !== 'ninos' || a.x.n <= 28) && a.x.n >= 5)
      .sort((a, b) => b.x.sc - a.x.sc);

    // Banco de respuestas naturales (para distractores del mismo tipo)
    const nats = order.map(o => ({ o, n: naturalQuestion(o.x.s, freq, r) })).filter(z => z.n);
    const defLong = nats.filter(z => z.n.type === 'def' && z.n.long).map(z => z.n.answer);
    const shortAns = nats.filter(z => z.n.type !== 'year' && !z.n.long && wc(z.n.answer) <= 3).map(z => z.n.answer);

    // 1) Preguntas naturales (¿Qué es…?, ¿En qué año…?, ¿Cómo se llama…?)
    for (const { o: { x }, n: nat0 } of nats) {
      if (qs.length >= max) break;
      if (usedSrc.has(x.i)) continue;
      const nat = Object.assign({}, nat0);
      if (/…$/.test(nat.answer) || nat.answer.length > 85) continue;
      const ak = norm(nat.answer);
      if (usedAns.has(ak)) continue;
      const forbidSet = new Set([ak, ...(nat.question.match(W) || []).map(norm)]);
      let ds = [];
      const add = d => {
        d = String(d || '').trim(); const k = norm(d);
        if (!d || /…$/.test(d) || k === ak || forbidSet.has(k) || ds.some(u => norm(u) === k)) return;
        if (normSafeIncludes(nat.question, d)) return;
        ds.push(d);
      };
      if (nat.type === 'year') {
        pickDistractors({ text: nat.answer, type: 'year', unit: '' }, bank, x, r, level, []).forEach(add);
      } else if (nat.long) {
        shuffle(defLong, r).forEach(add);
        if (ds.length < N_OPTS - 1) swapVariants(nat.answer, bank, r).forEach(add);
      } else {
        const proc = PROC.test(nat.answer);
        const pool = shortAns.concat([...bank.term.values()].map(d => d.text));
        shuffle(pool, r).filter(d => wc(d) <= 3 && (!proc || PROC.test(d)) && !WEAK.has(low(d))).forEach(add);
        if (ds.length < N_OPTS - 1 && proc) ['evaporación', 'oxidación', 'respiración', 'fermentación', 'combustión', 'sublimación'].forEach(add);
      }
      if (ds.length < N_OPTS - 1) continue;
      ds = ds.slice(0, N_OPTS - 1);
      let question = nat.question;
      if (/^¿Mediante qué /.test(question) && PROC.test(nat.answer)) question = question.replace(/^¿Mediante qué /, '¿Mediante qué proceso ');
      const lf = t => /^\p{Lu}\p{Ll}/u.test(t) && DETS.has(low(t.split(/\s+/)[0])) ? t.charAt(0).toLocaleLowerCase('es') + t.slice(1) : t;
      const answer = nat.type === 'year' ? nat.answer : lf(nat.answer);
      const options = shuffle([answer, ...ds.map(d => nat.type === 'year' ? d : lf(d))], r);
      const q = { question, options, answer: options.findIndex(o => norm(o) === norm(answer)), answerText: answer, source: nat.source, type: nat.type, kind: 'natural', sentenceIndex: x.i };
      if (push(q)) { usedAns.add(ak); usedSrc.add(x.i); }
    }

    // 2) Afirmaciones: una verdadera (frase de los apuntes) y dos falsas con un dato cambiado
    let k = 0;
    for (const pass of [0]) {
      for (const { x, cs } of order) {
        if (qs.length >= max) break;
        if (pass === 0 && usedSrc.has(x.i)) continue;
        if (x.n > (level === 'ninos' ? 22 : 30)) continue;
        const pool = cs
          .filter(c => !usedAns.has(norm(c.text)) && !WEAK.has(low(c.text.split(/\s+/).pop())))
          .sort((a, b) => b.w - a.w + (r() - 0.5) * 0.4);
        for (const c of pool) {
          const key = norm(c.text);
          const rest = norm(x.s.slice(0, c.i) + ' ' + x.s.slice(c.e));
          if (new RegExp('(^|[^\\p{L}])' + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^\\p{L}]|$)', 'u').test(rest)) continue;
          const ds = pickDistractors(c, bank, x, r, level, [], true);
          if (ds.length < N_OPTS - 1) continue;
          const q = makeStatement(x, c, ds, r, level, k, allNorm);
          if (!q) continue;
          if (push(q)) { k++; usedAns.add(key); usedSrc.add(x.i); break; }
        }
      }
    }

    return qs
      .sort((a, b) => a.sentenceIndex - b.sentenceIndex)
      .map((q, i) => {
        q.id = i + 1;
        q.answer = q.options.findIndex(o => norm(o) === norm(q.answerText));
        return q;
      })
      .filter(isClassicMC);
  }
  // Versiones falsas de una definición: cambia un término por otro del mismo género/número
  function swapVariants(str, bank, r) {
    const out = [];
    const cs = candidates(str, new Map()).filter(c => c.type === 'term');
    for (const c of shuffle(cs, r)) {
      const pool = shuffle([...bank.term.values()].filter(d =>
        norm(d.text) !== norm(c.text) && !norm(str).includes(norm(d.text)) && !WEAK.has(low(d.text)) &&
        (d.g || '') === (c.g || '') && d.plural === c.plural && PROC.test(d.text) === PROC.test(c.text)), r);
      for (const d of pool.slice(0, 2)) out.push(str.slice(0, c.i) + low(d.text) + str.slice(c.e));
    }
    return out;
  }
  function normSafeIncludes(hay, needle) {
    const n = norm(needle);
    return n.length >= 4 && norm(hay).includes(n);
  }

  function reshuffle(q, seed) {
    const r = rng(seed || Date.now());
    const options = shuffle(q.options, r);
    return Object.assign({}, q, { options, answer: options.findIndex(o => norm(o) === norm(q.answerText)) });
  }
  function grade(qs, answers) {
    let ok = 0; const wrong = [];
    qs.forEach((q, i) => { if (answers[i] === q.answer) ok++; else wrong.push({ q, chosen: answers[i] }); });
    return { ok, total: qs.length, pct: qs.length ? Math.round(ok * 100 / qs.length) : 0, wrong };
  }
  return { clean, sentences, summarize, keywords, generate, grade, reshuffle, candidates, tf, naturalQuestion, scoreSentences, isClassicMC, N_OPTS };
});
