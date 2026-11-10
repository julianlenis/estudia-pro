# Estudia Pro by Julián Lenis — versión de prueba
PWA estática, sin servidor ni claves. Abrir con cualquier servidor estático (`python3 -m http.server -d .`).
- OCR: Tesseract.js 5.1.1 (español) · PDF: pdf.js 3.11.174 · cargados de jsdelivr solo al usarlos y guardados en caché por el service worker.
- Generador de resumen/test por reglas: `gen.js`. Tests: `node tests/test-gen.js`, `node tests/test-ai.js`, `node tests/test-ai-quality.js`, `node tests/test-quality.js`, `python3 tests/headless-mc.py` (Gemini simulado, sin clave), `python3 tests/headless.py`, `node tests/test-exam.js`, `python3 tests/headless-exam.py` (test ya hecho en PDF + solucionario).
- Test ya hecho (PDF/texto con preguntas numeradas a/b/c y «Solucions» al final): `exam.js` lo detecta, copia enunciados y opciones tal cual y corrige al final con el solucionario; nunca inventa respuestas.
