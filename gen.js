/* Estudia Pro by Julián Lenis — generador de resúmenes y tests (sin IA, por reglas) */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.EPGen = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const STOP = new Set(('a al algo algún alguna algunas alguno algunos ante antes aquel aquella aquellas aquello aquellos aquí así aún aunque bajo bien cada casi como cómo con contra cual cuál cuales cuando cuándo cuanto cuya cuyo de del desde donde dónde dos durante e el él ella ellas ello ellos en entre era eran eres es esa esas ese eso esos esta está estaba estaban estado están estar este esto estos fue fueron fui ha había habían han hasta hay haya he hecho la las le les lo los más me mi mis mismo mucho muchos muy nada ni no nos nosotros nuestra nuestro o os otra otras otro otros para pero poco por porque que qué quien quién quienes se sea según ser si sí siempre sido sin sino sobre son su sus también tan tanto te tiene tienen todo todos tras tu tus un una unas uno unos usted vez y ya yo puede pueden cuales mediante cual tal tales dicha dicho dichos será serán sería hace hacen hizo luego después entonces mientras allí ahí debe deben ver cosa forma parte manera tipo tipos ejemplo además incluso solo sólo cuanto cuanta veces gran grandes nuevo nueva primer primera primero segundo tercera tercer tres cuatro cinco seis siete ocho nueve diez así mismo asimismo' +
    // català (apunts en català)
    ' els les amb per que una uns unes dels als és són seu seva seus seves aquest aquesta aquests aquestes aquell aquella molt més però també quan com on van va fou eren ser han hi ho perquè fins des tot tots tota totes altre altra altres sense seus mateix mateixa cap sí doncs encara després abans pot poden').split(/\s+/));
  const DETS = new Set(['el','la','los','las','un','una','unos','unas','del','al','su','sus','este','esta','estos','estas','ese','esa','esos','esas','cada','nuestro','nuestra','aquel','aquella',
    'els','les','uns','unes','dels','als','aquest','aquesta','aquests','aquestes','seu','seva']);
  const GENDER = { el: 'm', los: 'm', un: 'm', unos: 'm', del: 'm', al: 'm', este: 'm', estos: 'm', ese: 'm', esos: 'm', nuestro: 'm', la: 'f', las: 'f', una: 'f', unas: 'f', esta: 'f', estas: 'f', esa: 'f', esas: 'f', nuestra: 'f', els: 'm', uns: 'm', dels: 'm', als: 'm', aquest: 'm', aquests: 'm', seu: 'm', les: 'f', unes: 'f', aquesta: 'f', aquestes: 'f', seva: 'f' };
  const ABBR = ['Sr','Sra','Srta','Dr','Dra','etc','pág','págs','p','pp','ej','aprox','núm','vol','cap','Ud','Uds','Avda','art','fig','a','d','C','S','km','kg','cm','mm','min','máx','mín','EE','UU'];
  const ROMAN = /^(?=[MDCLXVI])M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/;
  const W = /[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu;
  // términos demasiado genéricos para huecos / respuestas
  const WEAK = new Set(['proceso','parte','forma','manera','tipo','tipos','cosa','cosas','ejemplo','efecto','causa','resultado','número','lugar','persona','personas','tiempo','año','años','día','días','vez','veces','caso','casos','serie','grupo','nivel','sistema','acción','acciones','elemento','elementos','factor','factores','aspecto','aspectos','punto','puntos','dato','datos','información','texto','página','páginas','capítulo','tema','temas','nombre','nombres','palabra','palabras','frase','frases','idea','ideas','hecho','hechos','modo','modos','sentido','razón','razones','uso','usos','base','bases','medio','medios','fin','fines','paso','pasos','valor','valores','cantidad','función','funciones','relación','relaciones','cambio','cambios','estado','estados','periodo','período','época','siglo','siglos','mundo','tierra','agua','aire','sol','vida','cuerpo','hombre','mujer','niño','niña','gente','país','países','ciudad','ciudades','región','regiones','propio','propia','propios','propias','mismo','misma','otros','otras','todo','toda','varios','varias','algunos','algunas','mucho','mucha','poco','poca','nuevo','nueva','gran','grande','mayor','menor','mejor','peor','único','unica','único','primero','primera','segundo','segunda',
    // català
    'països','país','ciutat','ciutats','persones','persona','gent','cosa','coses','part','parts','tipus','exemple','manera','forma','temps','any','anys','dia','dies','vegada','vegades','cas','casos','grup','grups','lloc','llocs','món','nom','noms','tema','temes','idea','idees','fet','fets','canvi','canvis','sistema','nivell','punt','punts']);

  function rng(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  function shuffle(a, r) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const low = s => s.toLocaleLowerCase('es');
  const norm = s => low(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const capFirst = s => s ? s.charAt(0).toLocaleUpperCase('es') + s.slice(1) : s;
  const ensureQ = (s, lang) => {
    s = s.trim().replace(/\s+/g, ' '); if (!/[?？]$/.test(s)) s += '?';
    if (lang === 'ca') return capFirst(s.replace(/^[¿¡]/, ''));
    if (!/^[¿¡"«]/.test(s)) s = '¿' + s.replace(/^[¿¡]?/, ''); return s;
  };
  // Idioma de los apuntes: 'ca' (català) o 'es' (castellano, por defecto)
  function detectLang(text) {
    const t = ' ' + low(String(text || '')).replace(/[’]/g, "'") + ' ';
    const count = re => (t.match(re) || []).length;
    const ca = count(/\s(els|amb|és|són|dels|aquest|aquesta|perquè|però|molt|seva|seu|també|als|uns|unes|fou|van)\s/g) + count(/\s[ld]'\p{L}/gu) + count(/ció\b|cions\b/g) * 0.3;
    const es = count(/\s(los|con|es|son|del|este|esta|porque|pero|muy|su|sus|también|unos|unas|fue|las)\s/g) + count(/ción\b|ciones\b/g) * 0.3;
    return ca > es * 1.1 && ca >= 2 ? 'ca' : 'es';
  }
  const STR = {
    es: { stmt: '¿Cuál de estas afirmaciones es correcta según tus apuntes?', stmtAbout: k => '¿Cuál de estas afirmaciones sobre «' + k + '» es correcta?', what: 'Qué es ', whatPl: 'Qué son ' },
    ca: { stmt: "Quina d'aquestes afirmacions és correcta segons els apunts?", stmtAbout: k => "Quina d'aquestes afirmacions sobre «" + k + "» és correcta?", what: 'Què és ', whatPl: 'Què són ' }
  };
  // Formato prohibido: huecos / rellenar espacios / «Completa:»
  const CLOZE_RE = /_{2,}|…\s*…|\.{4,}|\[\s*\]|\(\s*\)|^\s*(completa|completar|rellena|rellenar|omple|completeu|fill in|complete)\b|espacio en blanco|palabra que falta|paraula que falta/i;
  // --- Calidad de las opciones (v8): nada de interrogativos ni palabras funcionales como respuesta ---
  // Palabras que nunca pueden ser una respuesta por sí solas (català + castellano), ya normalizadas (sin acentos)
  const FUNC = new Set(('que com como quin quina quins quines qui quien quienes quan quando cuando on onde donde ' +
    'per perque porque por cual cuales quant quanta quants quantes cuanto cuanta cuantos cuantas ' +
    'el la els les los las lo l un una uns unes unos unas de del dels d al als a i y o u e ni en amb con para pel pels ' +
    'se es son ser era eren fue fueron no si ja ya mes mas menys menos molt muy tambe tambien pero ' +
    'aixo allo esto eso aquello aquest aquesta aquests aquestes este esta estos estas ese esa esos esas ' +
    'su sus seu seva seus seves mi tu nos hi ho li ha han hay cap algun alguna ningun ninguna tot tots tota totes todo todos').split(/\s+/));
  // Palabras del «marco» de la pregunta (no aportan contenido)
  const FRAME = new Set('anomena anomenen anomenat llama llaman llamado denomina nom nombre significa defineix define'.split(' '));
  const toks = s => norm(String(s == null ? '' : s)).replace(/['’]/g, ' ').match(/[\p{L}\p{N}]+/gu) || [];
  const phraseIn = (needle, hay) => { const n = needle.join(' '); return !!n && (' ' + hay.join(' ') + ' ').includes(' ' + n + ' '); };
  // Motivo por el que una opción no vale ('' = vale)
  function badOption(o, question) {
    const raw = String(o == null ? '' : o).trim();
    const t = toks(raw);
    if (!t.length) return 'vacía';
    if (t.every(w => FUNC.has(w))) return 'palabra funcional / interrogativo';
    if (t.length === 1 && !/\d/.test(t[0]) && t[0].length < 3 && !/^\p{Lu}{2,}$/u.test(raw)) return 'demasiado corta';
    // opción corta copiada tal cual del enunciado («Com» en «Com s'anomena…?»)
    if (t.length <= 3 && phraseIn(t, toks(question))) return 'copiada del enunciado';
    return '';
  }
  // «Com s'anomena la Unió Europea?» / «¿Cómo se llama España?»: el nombre ya está en la pregunta
  const NAMING_RE = /^[¿¡]?\s*(?:com\s+s['’]anomen(?:a|en)|c[oó]mo\s+se\s+llama(?:n)?|qu[ií]n(?:a|s|es)?\s+(?:és|es|era)\s+el\s+nom\s+d(?:e\s+|['’])|cu[aá]l\s+es\s+el\s+nombre\s+de)\s*(.+?)\s*[?？]?$/i;
  const WHAT_RE = /^[¿¡]?\s*(?:qu[eè]\s+(?:és|es|són|son))\s+(.+?)\s*[?？]?$/i;
  const startsWithName = x => /^(?:(?:el|la|els|les|los|las|un|una|l['’])\s*)?\p{Lu}/u.test(String(x).trim());
  // Motivo por el que una pregunta A/B/C no vale por calidad ('' = vale)
  function mcProblem(question, options, answer) {
    question = String(question || '').trim();
    const qt = toks(question);
    if (!qt.some(w => !FUNC.has(w) && !FRAME.has(w) && w.length >= 3)) return 'enunciado sin contenido';
    for (const o of options) { const b = badOption(o, question); if (b) return 'opción «' + o + '»: ' + b; }
    const ans = options[answer];
    const at = toks(ans).filter(w => !FUNC.has(w));
    if (at.length && at.join('').length >= 4 && phraseIn(toks(ans), qt)) return 'la respuesta ya está en el enunciado';
    const nm = question.match(NAMING_RE);
    if (nm && (startsWithName(nm[1]) || toks(nm[1]).filter(w => !FUNC.has(w)).length < 2)) return 'pregunta que se responde sola («Com s\'anomena X?»)';
    const wm = question.match(WHAT_RE);
    if (wm && options.some(o => toks(o).filter(w => !FUNC.has(w)).length < 1 || toks(o).length < 2) && !options.every(o => /^\p{Ll}/u.test(String(o).trim()))) return 'opciones que no definen («Què és X?»)';
    // mismo tipo de respuesta: no mezclar números/años con palabras
    const isNum = o => /^[\d\s.,%ºª°/-]+(?:\s*\p{L}{0,8})?$/u.test(String(o).trim()) && /\d/.test(o);
    const nNum = options.filter(isNum).length;
    if (nNum && nNum !== options.length) return 'opciones de tipo distinto';
    // longitud parecida
    const lens = options.map(o => String(o).trim().length), ws = options.map(o => toks(o).length);
    if (Math.min(...ws) <= 2 && Math.max(...ws) >= 8) return 'longitudes muy distintas';
    if (Math.max(...lens) > 5 * Math.min(...lens) && Math.min(...lens) < 12) return 'longitudes muy distintas';
    return '';
  }
  // Pregunta tipo test clásica válida: enunciado completo + 3 opciones (A, B, C), una correcta
  function isCleanMC(q) {
    if (!q || typeof q.question !== 'string') return false;
    const question = q.question.trim();
    if ((question.match(W) || []).length < 3 || CLOZE_RE.test(question)) return false;
    if (!Array.isArray(q.options) || q.options.length !== 3) return false;
    const opts = q.options.map(o => String(o == null ? '' : o).trim());
    if (opts.some(o => !o || /_{2,}/.test(o) || !/[\p{L}\p{N}]/u.test(o))) return false;
    if (new Set(opts.map(norm)).size !== 3) return false;
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 2) return false;
    if (q.answerText != null && norm(opts[q.answer]) !== norm(q.answerText)) return false;
    if (mcProblem(question, opts, q.answer)) return false;
    return true;
  }
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
      .replace(/[•▪●■◆◇○]\s*/g, '').replace(/(^|\s)·\s*/gm, '$1')
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
        res.push({ text: ptxt, i: t.i, e: toks[j].e, nw: j - k + 1, type: 'prop', w: 2.6 + (freq.get(l) || 0) * 0.15, prev, next: j + 1 < toks.length ? low(toks[j + 1].w) : '' });
        k = j; continue;
      }
      if (DETS.has(prev) && /^\p{Ll}/u.test(w) && l.length >= 5 && !STOP.has(l) && !WEAK.has(l) && !/(mente|ando|iendo|ado|ido|aba|ían|aron)$/.test(l)) {
        res.push({ text: w, i: t.i, e: t.e, type: 'term', w: 1.2 + (freq.get(l) || 0) * 1.1, det: prev, g: GENDER[prev] || '', plural: /s$/.test(l), next: k + 1 < toks.length ? low(toks[k + 1].w) : '' });
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
  // Frases que ya son preguntas o encabezados («Què és la Unió Europea?») no sirven de fuente
  const isQuestionSentence = s => /[?？]\s*$/.test(String(s).trim()) || /^[¿]/.test(String(s).trim());
  const badSubject = subj => { const t = toks(subj); return !t.length || FUNC.has(t[0]) && t.every(w => FUNC.has(w)) || /^(qu[eèé]|com|c[oó]mo|quin|quina|quins|quines|qui|qui[eé]n|quan|cu[aá]ndo|on|d[oó]nde|cu[aá]l|cu[aá]les|per\s+qu[eè]|por\s+qu[eé])\b/i.test(String(subj).trim()); };
  function naturalQuestionCa(s) {
    if (isQuestionSentence(s)) return null;
    // Definició: «La fotosíntesi és …» / «Els rius són …»
    const m = s.match(/^((?:El|La|Els|Les|Un|Una)\s+[^.]{3,60}?|L['’][^.\s][^.]{2,58}?|[A-ZÀÈÉÍÏÒÓÚÜÇ][^.]{1,40}?)\s+(és|són)\s+(.+)$/);
    if (!m) return null;
    const subj = m[1].trim(), sw = subj.match(W) || [];
    let pred = m[3].trim().replace(/[.!?]$/, '');
    if (badSubject(subj)) return null;
    if (sw.length < 1 || sw.length > 8 || pred.length < 12 || /^\d/.test(subj) || /^(Això|Allò|Aquest|Aquesta|Ell|Ella)$/i.test(subj)) return null;
    if (/^(molt|més|menys|important|necessari|possible|clau)\b/i.test(pred)) return null;
    let ans = pred.replace(/^(el|la|els|les|un|una)\s+/i, '').replace(/^l['’]/i, '');
    if (ans.length > 85) ans = ans.slice(0, 82).replace(/\s+\S*$/, '') + '…';
    const sl = /^\p{Lu}\p{Ll}*$/u.test(sw[0]) && !/^(El|La|Els|Les|Un|Una|L)$/.test(sw[0]) ? subj : subj.charAt(0).toLocaleLowerCase('es') + subj.slice(1);
    return { question: ensureQ((m[2] === 'són' ? STR.ca.whatPl : STR.ca.what) + sl, 'ca'), answer: ans, type: 'def', source: s, kind: 'natural', long: ans.length > 40, subj: sl, pred, plural: m[2] === 'són' };
  }

  function naturalQuestion(s, freq, r, lang) {
    if (lang === 'ca') return naturalQuestionCa(s);
    if (isQuestionSentence(s)) return null;
    const words = s.match(W) || [];

    // "Este proceso se llama X" / "se llama condensación"
    let m = s.match(/^(.+?)\s*[;,]?\s*(?:este|ese|el)?\s*proceso\s+se\s+(?:llama|denomina|conoce como)\s+(?:la|el|los|las)?\s*([A-Za-zÁÉÍÓÚáéíóúÑñ][\wÁÉÍÓÚáéíóúñ\-]{3,})/i);
    if (m && !WEAK.has(low(m[2]))) {
      let ctx = m[1].replace(/[.!?]$/, '').trim();
      ctx = ctx.replace(/^(cuando|si|al|tras|después de)\s+/i, '');
      if (ctx.length > 95) ctx = ctx.slice(0, 92).replace(/\s+\S*$/, '') + '…';
      if (ctx.length >= 18) {
        return { question: ensureQ('Cómo se llama el proceso en el que ' + low(ctx)), answer: low(m[2]), type: 'def', source: s, kind: 'natural' };
      }
    }

    // "…, lo que se conoce como precipitación"
    m = s.match(/^(.+?),\s*lo que se conoce como\s+(?:la|el)?\s*([A-Za-zÁÉÍÓÚáéíóúÑñ][\wÁÉÍÓÚáéíóúñ\-]{3,})/i);
    if (m && !WEAK.has(low(m[2]))) {
      let ctx = m[1].replace(/[.!?]$/, '').trim();
      if (ctx.length > 90) ctx = ctx.slice(0, 87).replace(/\s+\S*$/, '') + '…';
      return { question: ensureQ('Cómo se llama el hecho de que ' + low(ctx)), answer: low(m[2]), type: 'def', source: s, kind: 'natural' };
    }

    // Definición corta: "La fotosíntesis es …" / "El ciclo del agua es …"
    m = s.match(/^((?:El|La|Los|Las|Un|Una)\s+[^.]{3,60}?|[A-ZÁÉÍÓÚÑ][^.]{1,40}?)\s+(es|son)\s+(.+)$/i);
    if (m) {
      const subjFull = m[1].trim();
      const subjWords = subjFull.match(W) || [];
      let pred = m[3].trim().replace(/[.!?]$/, '');
      // sujeto corto y predicado útil; evita frases que empiezan por adverbio/número
      if (!badSubject(subjFull) && subjWords.length >= 1 && subjWords.length <= 8 && pred.length >= 12 && !/^(aprox|aproximadamente|\d)/i.test(subjFull) && !/^(Esto|Eso|Aquello|Él|Ella)$/i.test(subjFull)) {
        // si predicado es "el proceso … se llama X" ya lo cubrimos arriba
        if (!/\bse\s+(llama|denomina|conoce como)\b/i.test(pred)) {
          const q = ensureQ((m[2].toLowerCase() === 'son' ? 'Qué son ' : 'Qué es ') + low(subjFull));
          let ans = pred;
          // "el proceso por el cual X" → respuesta X (más clara)
          const porElCual = pred.match(/^(?:el|la|los|las|un|una)\s+(?:proceso|fenómeno|mecanismo)\s+(?:por el cual|mediante el cual|que)\s+(.+)/i);
          if (porElCual) ans = pred.replace(/^(el|la|los|las|un|una)\s+/i, '');
          else {
            // "el pigmento verde…" → deja el sintagma nominal completo
            ans = pred.replace(/^(el|la|los|las|un|una)\s+/i, '');
          }
          if (ans.length > 85) ans = ans.slice(0, 82).replace(/\s+\S*$/, '') + '…';
          return { question: q, answer: ans, type: 'def', source: s, kind: 'natural', long: ans.length > 40, subj: /^(El|La|Los|Las|Un|Una)\s/.test(subjFull) ? low(subjFull.split(/\s+/)[0]) + subjFull.slice(subjFull.indexOf(' ')) : subjFull, pred, plural: m[2].toLowerCase() === 'son' };
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

  function pickDistractors(c, bank, x, r, level, forbid) {
    const key = norm(c.text);
    const banned = new Set([key, ...(forbid || []).map(norm)]);
    let ds;
    if (c.type === 'year' || c.type === 'num') {
      ds = [...bank[c.type].values()].filter(d => norm(d.text) !== key && (c.type === 'year' || d.unit === c.unit)).map(d => d.text).concat(numDistractors(c, r));
    } else if (c.type === 'roman') ds = romanDistractors(c);
    else if (c.type === 'def') {
      // distractores: otros términos de definición / términos del texto
      ds = [...bank.term.values(), ...bank.prop.values(), ...bank.def.values()]
        .filter(d => norm(d.text) !== key && Math.abs(d.text.length - c.text.length) < 18)
        .map(d => d.text);
    } else {
      let cand = [...bank[c.type].values()].filter(d =>
        norm(d.text) !== key &&
        sameForm(c, d) &&
        !x.s.includes(d.text) &&
        !norm(d.text).includes(key) &&
        !key.includes(norm(d.text)) &&
        !WEAK.has(low(d.text))
      );
      if (level === 'ninos') cand.sort((a, b) => Math.abs(a.text.length - c.text.length) - Math.abs(b.text.length - c.text.length) + (r() - 0.5) * 3);
      else cand.sort((a, b) => Math.abs(a.text.length - c.text.length) - Math.abs(b.text.length - c.text.length) + (r() - 0.5) * 3 + (b.w - a.w) * 0.2);
      const g = cand.filter(d => sameGender(c, d));
      ds = (c.g ? g : cand).map(d => d.text);
    }
    const uniq = []; const seen = new Set(banned);
    for (const d of ds) {
      const raw = String(d).trim();
      if (!raw) continue;
      const k = norm(raw);
      if (seen.has(k) || banned.has(k)) continue;
      // evita distractores demasiado cortos o débiles
      if (raw.length < 3 || WEAK.has(low(raw))) continue;
      seen.add(k);
      if (c.type === 'term' || (c.type === 'def' && !/[A-ZÁÉÍÓÚ]/.test(c.text[0]))) uniq.push(low(raw));
      else uniq.push(raw);
      if (uniq.length === 3) break;
    }
    return uniq;
  }

  // Cambia un dato concreto (año, número, nombre o término) de una frase real de los apuntes
  // para crear afirmaciones completas falsas pero creíbles (opciones del mismo tipo).
  function statementQuestion(x, cs, bank, r, level, lang, freq, text) {
    const s = x.s.trim();
    const n = (s.match(W) || []).length;
    // solo frases completas (con punto final); descarta títulos/encabezados
    if (!/[.!…]$/.test(s) || isQuestionSentence(s) || n < 6 || n > (level === 'ninos' ? 22 : 32) || s.length > 220) return null;
    if (/_/.test(s) || !/^[\p{Lu}¿¡"«(\d]/u.test(s)) return null;
    const esc = t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const occurs = t => (text.match(new RegExp(esc(t), 'g')) || []).length;
    // nombres de varias palabras: solo si tienen conector («Isabel de Castilla») o se repiten (evita «UE Representa»)
    const okProp = t => !/\s/.test(t.trim()) ? t.length >= 4 : (/\s(de|del|la|los|las|y|i|dels)\s/.test(t) || occurs(t) >= 2);
    const LINK = /^(|de|del|dels|d|i|y|o|u|a|al|als|en|que|amb|con|per|para|por|pel|pels|sobre|entre|durant|durante|mediante|hasta|fins|desde|des)$/;
    const pri = { year: 4, num: 3, roman: 3, term: 2.4, prop: 2 };
    const pool = cs.filter(c => pri[c.type] && (c.type !== 'prop' || okProp(c.text)) && (c.type !== 'term' || (!WEAK.has(low(c.text)) && LINK.test(c.next || ''))))
      .filter(c => {
        const key = norm(c.text), rest = norm(s.slice(0, c.i) + ' ' + s.slice(c.e));
        return !new RegExp('(^|[^\\p{L}\\p{N}])' + esc(key) + '([^\\p{L}\\p{N}]|$)', 'u').test(rest);
      })
      .sort((a, b) => (pri[b.type] + (freq.get(low(b.text)) || 0) * 0.1) - (pri[a.type] + (freq.get(low(a.text)) || 0) * 0.1) + (r() - 0.5) * 0.6);
    const propCtx = new Map([...bank.prop.values()].map(d => [d.text, d.prev]));
    for (const c of pool) {
      let reps = pickDistractors(c, bank, x, r, level).filter(d => !s.includes(d));
      // un nombre solo se cambia por otro que aparece en el mismo contexto («a Frankfurt» ↔ «a Brussel·les»)
      if (c.type === 'prop') reps = reps.filter(d => okProp(d) && c.prev && propCtx.get(d) === c.prev);
      if (reps.length < 2) continue;
      const swap = d => s.slice(0, c.i) + d + s.slice(c.e);
      const options = [s, swap(reps[0]), swap(reps[1])];
      if (new Set(options.map(norm)).size !== 3) continue;
      const kw = (s.match(W) || []).filter(w => {
        const k = low(w); return /^\p{Ll}/u.test(w) && k.length >= 5 && !STOP.has(k) && !WEAK.has(k) && !norm(c.text).includes(norm(w));
      }).sort((a, b) => (freq.get(low(b)) || 0) - (freq.get(low(a)) || 0))[0];
      const question = kw && (freq.get(low(kw)) || 0) >= 2 ? STR[lang].stmtAbout(kw) : STR[lang].stmt;
      const sh = shuffle(options, r);
      return { question, options: sh, answer: sh.indexOf(s), answerText: s, source: s, type: c.type, kind: 'statement', sentenceIndex: x.i };
    }
    return null;
  }

  function generate(text, opts = {}) {
    const level = opts.level || 'adultos';
    const lang = opts.lang || detectLang(text);
    const r = rng(opts.seed || Date.now());
    const sents = sentences(text);
    const freq = tf(sents);
    let max = opts.count || (level === 'ninos' ? 5 : 10);
    if (max > 100) max = 100;
    if (max < 1) max = 1;
    const flat = clean(text).replace(/\s+/g, ' ');
    const scored = scoreSentences(sents, freq, level);
    const all = scored.map(x => ({ x, cs: candidates(x.s, freq) }));
    const bank = { prop: new Map(), term: new Map(), year: new Map(), num: new Map(), roman: new Map(), def: new Map() };
    for (const { cs } of all) for (const c of cs) {
      const k = norm(c.text);
      if (!bank[c.type].has(k)) bank[c.type].set(k, c);
    }

    const usedAns = new Set();
    const usedSrc = new Set();
    const usedQ = new Set();
    const qs = [];

    const order = all
      .filter(a => (level !== 'ninos' || a.x.n <= 28) && a.x.n >= 5)
      .sort((a, b) => b.x.sc - a.x.sc);
    const nats = new Map(order.map(o => [o.x.i, naturalQuestion(o.x.s, freq, r, lang)]));
    const defAnswers = [...nats.values()].filter(n => n && n.type === 'def').map(n => n.answer);
    const isName = a => /^\p{Lu}/u.test(a);

    // 1) Preguntas directas (¿Qué es…? ¿En qué año…? ¿Cómo se llama…?) sobre las frases más importantes
    for (const { x } of order) {
      if (qs.length >= max) break;
      if (usedSrc.has(x.i)) continue;
      const nat = nats.get(x.i);
      if (!nat) continue;
      const ak = norm(nat.answer);
      if (usedAns.has(ak)) continue;
      if (nat.long && nat.answer.length > 70) continue; // evita respuestas kilométricas
      const forbidSet = new Set([ak, ...(nat.question.match(W) || []).map(norm)]);
      const single = !/\s/.test(nat.answer.trim());
      const uniq = [];
      const push = d => {
        const k = norm(d);
        if (!d || forbidSet.has(k) || k === ak || uniq.some(u => norm(u) === k)) return;
        if (ak.includes(k) || k.includes(ak)) return;
        if (badOption(d, nat.question)) return; // nunca «Quins», «Com», «Què»…
        uniq.push(d);
      };
      if (nat.type === 'year') {
        for (const d of pickDistractors({ text: nat.answer, type: 'year', w: 3, unit: '' }, bank, x, r, level)) push(d);
      } else if (nat.type === 'def') {
        // otras definiciones de los mismos apuntes: respuestas del mismo tipo
        for (const d of shuffle(defAnswers, r)) {
          if (uniq.length >= 2) break;
          if (single !== !/\s/.test(d.trim())) continue;
          if (isName(d) !== isName(nat.answer)) continue; // nombre propio vs. definición
          if (nat.long && d.length < 18) continue;
          if (!nat.long && d.length > 55) continue;
          push(d.length > 70 ? d.slice(0, 67).replace(/\s+\S*$/, '') + '…' : d);
        }
        // predicados de otras frases «X es/son …»
        if (uniq.length < 2 && !single && !isName(nat.answer)) {
          for (const o of order) {
            if (uniq.length >= 2) break;
            if (o.x.i === x.i || isQuestionSentence(o.x.s)) continue;
            const mm = o.x.s.replace(/[.!?]$/, '').match(/^[^,;:]{3,60}?\s+(?:es|son|és|són)\s+(?:el|la|los|las|els|les|un|una)\s+(.{12,85})$/i);
            if (mm && !/^\p{Lu}/u.test(mm[1])) push(mm[1]);
          }
        }
        // respuesta de una palabra («condensación»): otros términos de una palabra del texto
        if (uniq.length < 2 && single) {
          const pl = /s$/i.test(nat.answer);
          for (const d of shuffle([...bank.term.values()], r)) {
            if (uniq.length >= 2) break;
            if (/\s/.test(d.text) || d.text.length < 5 || WEAK.has(low(d.text)) || /s$/i.test(d.text) !== pl) continue;
            push(low(d.text));
          }
        }
      } else {
        const fakeC = { text: nat.answer, type: 'term', w: 3, unit: '', plural: /s$/i.test(nat.answer) };
        for (const d of pickDistractors(fakeC, bank, x, r, level, (nat.source.match(W) || []).slice(0, 8))) push(low(d));
      }
      let answer = nat.answer, qtext = nat.question;
      if (uniq.length < 2 && nat.type === 'def' && nat.subj && nat.pred && /^\p{Ll}/u.test(nat.pred) && nat.pred.length <= 110 &&
          !startsWithName(nat.pred) && toks(nat.pred).filter(w => !FUNC.has(w)).length >= 3 && !badSubject(nat.subj)) {
        // al revés: «¿Cómo se llama el pigmento verde de las hojas…?» → la clorofila / la fotosíntesis / …
        const predN = norm(nat.pred);
        const alt = [];
        const add = d => { const k = norm(d); if (d && !badSubject(d) && !badOption(d, nat.pred) && k !== norm(nat.subj) && !predN.includes(k.replace(/^(el|la|los|las|els|les|l')\s*/, '')) && !alt.some(a => norm(a) === k)) alt.push(d); };
        for (const n of nats.values()) if (n && n.subj && n !== nat && /^\p{Ll}/u.test(n.subj) === /^\p{Ll}/u.test(nat.subj)) add(n.subj);
        if (/^\p{Ll}/u.test(nat.subj)) {
          const ART = /^(el|la|los|las|els|les)$/;
          [...bank.term.values()].filter(d => ART.test(d.det || '') && d.text.length >= 6 && !WEAK.has(low(d.text)))
            .sort((a, b) => b.w - a.w).forEach(d => add(d.det + ' ' + low(d.text)));
        }
        if (alt.length >= 2) {
          answer = nat.subj;
          uniq.length = 0; uniq.push(...alt.slice(0, 2));
          qtext = lang === 'ca' ? ensureQ((nat.plural ? "Com s'anomenen " : "Com s'anomena ") + nat.pred, 'ca')
            : ensureQ((nat.plural ? 'Cómo se llaman ' : 'Cómo se llama ') + nat.pred);
        }
      }
      if (uniq.length < 2) continue; // sin alternativas reales: mejor no preguntar
      const options = shuffle([answer, ...uniq.slice(0, 2)], r);
      if (new Set(options.map(norm)).size !== 3) continue;
      if (usedQ.has(norm(qtext))) continue;
      const q = { id: qs.length + 1, question: qtext, options, answer: options.findIndex(o => norm(o) === norm(answer)), answerText: answer, source: nat.source, type: nat.type, kind: 'natural', sentenceIndex: x.i };
      if (!isCleanMC(q)) continue;
      qs.push(q);
      usedAns.add(ak);
      usedSrc.add(x.i);
      usedQ.add(norm(qtext));
    }

    // 2) «¿Cuál de estas afirmaciones es correcta?»: frase real + 2 versiones con un dato cambiado
    for (const { x, cs } of order) {
      if (qs.length >= max) break;
      if (usedSrc.has(x.i)) continue;
      const q = statementQuestion(x, cs, bank, r, level, lang, freq, flat);
      if (!q || !isCleanMC(q)) continue;
      qs.push(q);
      usedSrc.add(x.i);
    }

    return qs
      .sort((a, b) => a.sentenceIndex - b.sentenceIndex)
      .map((q, i) => {
        q.id = i + 1;
        if (q.answer < 0 || norm(q.options[q.answer]) !== norm(q.answerText)) {
          q.answer = q.options.findIndex(o => norm(o) === norm(q.answerText));
        }
        return q;
      })
      .filter(isCleanMC);
  }

  // Convierte preguntas antiguas (4 opciones) al formato A/B/C; descarta las de huecos
  function toThree(q, seed) {
    if (!q || !Array.isArray(q.options)) return null;
    if (CLOZE_RE.test(String(q.question || '')) || q.kind === 'cloze') return null;
    if (q.options.length === 3) return isCleanMC(q) ? q : null;
    if (q.options.length !== 4) return null;
    const r = rng(seed || 1);
    const wrong = shuffle(q.options.filter(o => norm(o) !== norm(q.answerText)), r).slice(0, 2);
    const options = shuffle([q.answerText, ...wrong], r);
    const out = Object.assign({}, q, { options, answer: options.findIndex(o => norm(o) === norm(q.answerText)) });
    return isCleanMC(out) ? out : null;
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
  return { clean, sentences, summarize, keywords, generate, grade, reshuffle, candidates, tf, naturalQuestion, scoreSentences, isCleanMC, isClassicMC: isCleanMC, mcProblem, badOption, FUNC, N_OPTS: 3, toThree, detectLang, CLOZE_RE };
});
