'use strict';

const http         = require('http');
const PdfPrinter   = require('pdfmake');
const { buildOrdenPago } = require('./api/plantilla.js');

const printer = new PdfPrinter({
  Helvetica: {
    normal:      'Helvetica',
    bold:        'Helvetica-Bold',
    italics:     'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique',
  },
});

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (req.method !== 'POST' || req.url !== '/orden-pago') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    try {
      const datos = JSON.parse(body);
      if (!datos || typeof datos !== 'object') throw new Error('Body JSON inválido');

      const docDefinition = buildOrdenPago(datos);
      const pdfDoc = printer.createPdfKitDocument(docDefinition);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="OrdenPago_${sanitize(datos.run)}.pdf"`,
      );
      pdfDoc.pipe(res);
      pdfDoc.end();
    } catch (err) {
      console.error('[dev-api]', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  });
});

function sanitize(s) {
  return String(s || 'paciente').replace(/[^a-zA-Z0-9\-_]/g, '_');
}

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`[dev-api] corriendo en http://localhost:${PORT}`);
  console.log(`[dev-api] POST /orden-pago → genera PDF`);
});
