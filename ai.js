/* Estudia Pro by Julián Lenis — cliente Gemini (clave solo en localStorage) */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.EPAi = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Modelo free-tier Flash-Lite (docs oficiales: https://ai.google.dev/gemini-api/docs/models
  // y precios https://aistudio.google.com/docs/pricing — Free of charge para gemini-3.5-flash-lite)
  const MODEL = 'gemini-3.5-flash-lite';
  const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';
  const KEY_LS = 'ep_gemini_key';

  const SCHEMA = {
    type: 'OBJECT',
    properties: {
      summary: {
        type: 'ARRAY',
        items: { type: 'STRING' },
        description: '3 a 6 frases cortas con lo más importante'
      },
      questions: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            question: { type: 'STRING' },
            options: { type: 'ARRAY', items: { type: 'STRING' } },
            correct: { type: 'INTEGER' },
            explanation: { type: 'STRING' },
            source: { type: 'STRING' }
          },
          required: ['question', 'options', 'correct', 'explanation']
        }
      }
    },
    required: ['summary', 'questions']
  };

  function getKey() {
    try { return (localStorage.getItem(KEY_LS) || '').trim(); } catch { return ''; }
  }
  function setKey(k) {
    k = String(k || '').trim();
    try {
      if (!k) localStorage.removeItem(KEY_LS);
      else localStorage.setItem(KEY_LS, k);
      return true;
    } catch { return false; }
  }
  function clearKey() { return setKey(''); }
  function hasKey() { return !!getKey(); }

  function spanishError(err, status) {
    const msg = String(err && err.message || err || '');
    if (status === 429 || /resource.?exhausted|quota|rate.?limit/i.test(msg))
      return 'Has llegado al límite gratuito de Gemini por hoy (cuota). Prueba más tarde o usa el generador sin IA.';
    if (status === 400 && /API_KEY_INVALID|api key not valid|invalid.*key/i.test(msg))
      return 'La clave de Gemini no es válida. Revísala en Ajustes.';
    if (status === 403 || /permission|forbidden/i.test(msg))
      return 'Gemini ha rechazado la clave (sin permiso). Crea otra en AI Studio.';
    if (status === 404 || /not found|model/i.test(msg))
      return 'No se encontró el modelo de IA. Actualiza la app o prueba más tarde.';
    if (/Failed to fetch|NetworkError|network|offline|TypeError/i.test(msg))
      return 'Sin conexión o Gemini no responde. Se usará el generador gratis sin IA.';
    if (/no key|sin clave/i.test(msg))
      return 'No hay clave de Gemini guardada. Ve a Ajustes para pegarla (es gratis).';
    if (/JSON|parse|schema|invalid response/i.test(msg))
      return 'La IA devolvió un formato raro. Se usará el generador gratis sin IA.';
    return msg || 'Error al usar la IA. Se usará el generador gratis sin IA.';
  }

  async function callGemini(parts, { key, temperature } = {}) {
    const k = key || getKey();
    if (!k) { const e = new Error('no key'); e.status = 0; throw e; }
    const url = API_BASE + encodeURIComponent(MODEL) + ':generateContent';
    const body = {
      contents: [{ role: 'user', parts }],
      generationConfig: {
        temperature: temperature == null ? 0.4 : temperature,
        responseMimeType: 'application/json',
        responseSchema: SCHEMA
      }
    };
    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': k },
        body: JSON.stringify(body)
      });
    } catch (e) {
      e.status = 0;
      throw e;
    }
    const raw = await res.text();
    let data;
    try { data = JSON.parse(raw); } catch { data = { error: { message: raw.slice(0, 200) } }; }
    if (!res.ok) {
      const e = new Error((data.error && data.error.message) || ('HTTP ' + res.status));
      e.status = res.status;
      e.data = data;
      throw e;
    }
    const text = (((data.candidates || [])[0] || {}).content || {}).parts;
    const joined = (text || []).map(p => p.text || '').join('');
    if (!joined) {
      const e = new Error('invalid response: empty');
      e.status = res.status;
      throw e;
    }
    return joined;
  }

  function validateQuestions(data, want) {
    if (!data || typeof data !== 'object') return { summary: [], questions: [] };
    const summary = Array.isArray(data.summary)
      ? data.summary.map(s => String(s || '').trim()).filter(Boolean).slice(0, 8)
      : [];
    const raw = Array.isArray(data.questions) ? data.questions : [];
    const out = [];
    const seenQ = new Set();
    for (const item of raw) {
      if (!item || typeof item !== 'object') continue;
      let options = Array.isArray(item.options) ? item.options.map(o => String(o || '').trim()).filter(Boolean) : [];
      // dedupe options case-insensitive keeping first
      const uniq = []; const seenO = new Set();
      for (const o of options) {
        const k = o.toLocaleLowerCase('es');
        if (seenO.has(k)) continue;
        seenO.add(k); uniq.push(o);
      }
      options = uniq;
      if (options.length !== 4) continue;
      let correct = item.correct;
      if (typeof correct === 'string' && /^[A-Da-d]$/.test(correct)) correct = correct.toUpperCase().charCodeAt(0) - 65;
      correct = +correct;
      if (!Number.isInteger(correct) || correct < 0 || correct > 3) continue;
      const question = String(item.question || '').trim();
      if (question.length < 8) continue;
      const qk = question.toLocaleLowerCase('es');
      if (seenQ.has(qk)) continue;
      seenQ.add(qk);
      const explanation = String(item.explanation || '').trim();
      const source = String(item.source || '').trim();
      out.push({
        id: out.length + 1,
        question,
        options,
        answer: correct,
        answerText: options[correct],
        explanation,
        source: source || explanation,
        kind: 'ai',
        type: 'ai',
        sentenceIndex: out.length
      });
      if (want && out.length >= want) break;
    }
    return { summary, questions: out };
  }

  function parseResponse(text, want) {
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      // intenta extraer bloque JSON
      const m = String(text).match(/\{[\s\S]*\}/);
      if (!m) throw Object.assign(new Error('JSON parse'), { status: 0 });
      data = JSON.parse(m[0]);
    }
    return validateQuestions(data, want);
  }

  function buildPrompt({ level, count, title }) {
    const n = count || (level === 'ninos' ? 5 : 10);
    const lvl = level === 'ninos'
      ? 'Nivel niños: vocabulario sencillo, frases cortas, tono amable.'
      : 'Nivel adultos: preciso y claro, sin infantilizar.';
    return `Eres un profesor que crea tests de estudio en español a partir de apuntes.
${lvl}
Crea exactamente ${n} preguntas tipo test (4 opciones, UNA sola correcta) sobre LO MÁS IMPORTANTE del material (definiciones, fechas, causas, procesos, datos clave).
Reglas:
- Preguntas claras, sin errores de ortografía ni gramática.
- Las 4 opciones deben ser distintas, plausibles y de longitud similar; nunca dos iguales.
- correct = índice 0..3 de la opción correcta.
- explanation: 1 frase corta que explique por qué es correcta.
- summary: 3 a 6 frases con lo esencial del tema${title ? ' «' + title + '»' : ''}.
- No inventes datos que no estén en el material.
Responde SOLO con el JSON pedido.`;
  }

  async function generate({ text, images, level, count, title, key } = {}) {
    const n = count || (level === 'ninos' ? 5 : 10);
    const parts = [{ text: buildPrompt({ level, count: n, title }) }];
    if (text && String(text).trim()) {
      parts.push({ text: '\n\n--- APUNTES (texto) ---\n' + String(text).trim().slice(0, 60000) });
    }
    if (images && images.length) {
      for (const img of images.slice(0, 8)) {
        parts.push({
          inlineData: {
            mimeType: img.mimeType || 'image/jpeg',
            data: img.data // base64 sin prefijo data:
          }
        });
      }
      parts.push({ text: '\n(Las imágenes anteriores son fotos de los apuntes. Léelas y úsalas.)' });
    }
    if (parts.length < 2) {
      const e = new Error('no content');
      e.status = 0;
      throw e;
    }
    const raw = await callGemini(parts, { key, temperature: 0.35 });
    const parsed = parseResponse(raw, n);
    if (!parsed.questions.length) {
      const e = new Error('invalid response: no valid questions');
      e.status = 0;
      throw e;
    }
    return parsed;
  }

  async function testKey(key) {
    const k = (key || getKey()).trim();
    if (!k) throw Object.assign(new Error('no key'), { status: 0 });
    // llamada mínima (sin schema estricto de test): usa generate con texto corto
    const url = API_BASE + encodeURIComponent(MODEL) + ':generateContent';
    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': k },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Responde solo con la palabra OK' }] }],
          generationConfig: { temperature: 0, maxOutputTokens: 16 }
        })
      });
    } catch (e) {
      e.status = 0;
      throw e;
    }
    const raw = await res.text();
    let data; try { data = JSON.parse(raw); } catch { data = {}; }
    if (!res.ok) {
      const e = new Error((data.error && data.error.message) || ('HTTP ' + res.status));
      e.status = res.status;
      throw e;
    }
    return true;
  }

  async function blobToInline(blob, maxSide) {
    maxSide = maxSide || 1600;
    const bmp = await createImageBitmap(blob).catch(async () => {
      const url = URL.createObjectURL(blob);
      try {
        const img = await new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = url; });
        return img;
      } finally { URL.revokeObjectURL(url); }
    });
    const k = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(bmp.width * k));
    c.height = Math.max(1, Math.round(bmp.height * k));
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const dataUrl = c.toDataURL('image/jpeg', 0.85);
    const data = dataUrl.split(',')[1];
    return { mimeType: 'image/jpeg', data };
  }

  return {
    MODEL, SCHEMA, KEY_LS,
    getKey, setKey, clearKey, hasKey,
    spanishError, callGemini, parseResponse, validateQuestions,
    generate, testKey, blobToInline, buildPrompt
  };
});
