'use strict';

const PdfPrinter = require('pdfmake');
const { buildOrdenPago } = require('./plantilla');

const printer = new PdfPrinter({
  Helvetica: {
    normal:      'Helvetica',
    bold:        'Helvetica-Bold',
    italics:     'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique',
  },
});

module.exports = (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const datos = req.body;
    if (!datos || typeof datos !== 'object') {
      return res.status(400).json({ error: 'Body JSON requerido' });
    }
    const docDefinition = buildOrdenPago(datos);
    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="OrdenPago_${sanitize(datos.run)}.pdf"`
    );
    pdfDoc.pipe(res);
    pdfDoc.end();
  } catch (err) {
    console.error('Error generando PDF:', err);
    res.status(500).json({ error: 'Error interno', detalle: err.message });
  }
};

function sanitize(s) {
  return String(s || 'paciente').replace(/[^a-zA-Z0-9\-_]/g, '_');
}
