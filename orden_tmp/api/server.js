// ============================================================
// server.js — API REST para generar Órdenes de Pago en PDF
// ============================================================
'use strict';

const express    = require('express');
const PdfPrinter = require('pdfmake');
const { buildOrdenPago } = require('./plantilla');

const app  = express();
app.use(express.json());

// Fuentes estándar (sin archivos externos)
const fonts = {
  Helvetica: {
    normal:      'Helvetica',
    bold:        'Helvetica-Bold',
    italics:     'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique',
  },
};

const printer = new PdfPrinter(fonts);

// ──────────────────────────────────────────────────────────────
// POST /orden-pago
//
// Body JSON (ejemplo):
// {
//   "centroMedico":        "Viñamed",
//   "fechaEmision":        "30/04/2026",
//   "tipoAtencion":        "Ecografía Doppler arterial",
//   "nombreApellidos":     "Juan Pérez",
//   "run":                 "12.345.678-9",
//   "fechaNacimiento":     "01/01/1990",
//   "edad":                "34",
//   "sexo":                "Masculino",
//   "telefono":            "961752344",
//   "fechaIngreso":        "02/05/2026",
//   "fechaEmisionDetalle": "30/04/2026",
//   "prestaciones": [
//     {
//       "codigo":      "0404016MUD",
//       "descripcion": "ECOGRAFÍA PARTES BLANDAS MUSLO DERECHO",
//       "cantidad":    1,
//       "exento":      15100,
//       "afecto":      0,
//       "iva":         0,
//       "total":       15100
//     }
//   ],
//   "metodoPago":    "Débito",
//   "nroOperacion":  "800061959976"
// }
//
// Respuesta: archivo PDF (application/pdf)
// ──────────────────────────────────────────────────────────────
app.post('/orden-pago', (req, res) => {
  try {
    const datos = req.body;

    // Validación mínima
    if (!datos || typeof datos !== 'object') {
      return res.status(400).json({ error: 'Body JSON requerido' });
    }

    const docDefinition = buildOrdenPago(datos);
    const pdfDoc = printer.createPdfKitDocument(docDefinition);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="OrdenPago_${sanitize(datos.run || 'paciente')}.pdf"`
    );

    pdfDoc.pipe(res);
    pdfDoc.end();

  } catch (err) {
    console.error('Error generando PDF:', err);
    res.status(500).json({ error: 'Error interno al generar el PDF', detalle: err.message });
  }
});

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅  API Orden de Pago corriendo en http://localhost:${PORT}`);
  console.log(`   POST http://localhost:${PORT}/orden-pago`);
});

function sanitize(str) {
  return String(str).replace(/[^a-zA-Z0-9\-_]/g, '_');
}
