// ============================================================
// plantilla.js — Definición pdfmake de la Orden de Pago
// ============================================================
'use strict';

const { LOGO_B64, SELLO_B64 } = require('./assets');

const GRAY = '#999999';

/**
 * Genera el docDefinition de pdfmake para una Orden de Pago.
 *
 * @param {Object} datos
 * @param {string} datos.centroMedico          — ej. "Viñamed"
 * @param {string} datos.fechaEmision          — ej. "30/04/2026"
 * @param {string} datos.tipoAtencion          — ej. "Ecografía Doppler arterial"
 * @param {string} datos.nombreApellidos       — ej. "Juan Pérez"
 * @param {string} datos.run                   — ej. "12.345.678-9"  (o "" si no aplica)
 * @param {string} datos.fechaNacimiento       — ej. "01/01/1990"    (o "")
 * @param {string} datos.edad                  — ej. "34"            (o "")
 * @param {string} datos.sexo                  — ej. "Masculino"     (o "")
 * @param {string} datos.telefono              — ej. "961752344"     (o "")
 * @param {string} datos.fechaIngreso          — ej. "02/05/2026"
 * @param {string} datos.fechaEmisionDetalle   — ej. "30/04/2026" (columna derecha datos atención)
 * @param {Array}  datos.prestaciones          — lista de prestaciones (puede ser vacía)
 *   Cada elemento: { codigo, descripcion, cantidad, exento, afecto, iva, total }
 * @param {string} [datos.metodoPago]          — ej. "Débito"        (opcional)
 * @param {string} [datos.nroOperacion]        — ej. "800061959976"  (opcional)
 *
 * @returns {Object} docDefinition listo para pdfmake
 */
function buildOrdenPago(datos) {
  const d = datos;

  const val = (v) => (v && String(v).trim() !== '' ? String(v) : '—');

  // ── Fila de datos del paciente (izquierda | derecha) ──────────────────────
  const filasDatos = [
    ['Tipo de atención',   val(d.tipoAtencion),     'R.U.N',          val(d.run)],
    ['Nombre y apellidos', val(d.nombreApellidos),   'Edad',           val(d.edad)],
    ['Fecha de nacimiento',val(d.fechaNacimiento),   'Teléfono',       val(d.telefono)],
    ['Sexo',               val(d.sexo),              'Fecha emisión',  val(d.fechaEmisionDetalle || d.fechaEmision)],
    ['Fecha de ingreso',   val(d.fechaIngreso),      '',               ''],
  ];

  const filasContent = filasDatos.map(([lbl1, val1, lbl2, val2]) => ({
    columns: [
      {
        width: '55%',
        columns: [
          { text: lbl1, width: 135 },
          { text: ':', width: 10 },
          { text: val1, width: '*' },
        ],
      },
      {
        width: '45%',
        columns: [
          { text: lbl2, width: 90 },
          { text: lbl2 ? ':' : '', width: 10 },
          { text: val2, width: '*' },
        ],
      },
    ],
    margin: [0, 0, 0, 6],
  }));

  // ── Filas de prestaciones ─────────────────────────────────────────────────
  const prestaciones = Array.isArray(d.prestaciones) ? d.prestaciones : [];

  let totalGeneral = 0;

  const filasPresta = prestaciones.length > 0
    ? prestaciones.map((p) => {
        totalGeneral += Number(p.total) || 0;
        return {
          columns: [
            { text: val(p.codigo),      width: 82 },
            { text: val(p.descripcion), width: '*' },
            { text: val(p.cantidad),    width: 67,  alignment: 'right' },
            { text: formatNum(p.exento),width: 74,  alignment: 'right' },
            { text: formatNum(p.afecto),width: 52,  alignment: 'right' },
            { text: formatNum(p.iva),   width: 30,  alignment: 'right' },
            { text: formatNum(p.total), width: 74,  alignment: 'right' },
          ],
          margin: [0, 4, 0, 0],
        };
      })
    : [
        {
          text: 'Sin prestaciones registradas.',
          italics: true,
          color: '#555555',
          alignment: 'center',
          margin: [0, 6, 0, 6],
        },
      ];

  const totalTexto = prestaciones.length > 0
    ? `TOTAL $${formatNum(totalGeneral)}`
    : 'TOTAL $0';

  // ── Sección pago (opcional) ───────────────────────────────────────────────
  const seccionPago = [];
  if (d.metodoPago || d.nroOperacion) {
    seccionPago.push(
      { text: '', margin: [0, 20, 0, 0] },
      { text: `Método de pago: ${val(d.metodoPago)}`, fontSize: 12 },
    );
    if (d.nroOperacion) {
      seccionPago.push({ text: `N° de operación: ${d.nroOperacion}`, fontSize: 12 });
    }
  }

  // ── docDefinition ─────────────────────────────────────────────────────────
  return {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [40, 30, 40, 30],

    defaultStyle: { font: 'Helvetica', fontSize: 12, color: '#000000' },

    content: [
      // Cabecera: logo + datos empresa
      {
        columns: [
          { image: LOGO_B64, width: 200 },
          {
            stack: [
              { text: 'RADIODIAGNÓSTICO VIÑA DEL MAR SPA', fontSize: 9.5 },
              { text: '77.500.907-1',                       fontSize: 9.5 },
              { text: 'MEDIO ORIENTE #831 OFICINA 408, VIÑA DEL MAR', fontSize: 9.5 },
              { text: 'FONO: 9 34222146',                   fontSize: 9.5 },
            ],
            margin: [10, 5, 0, 0],
          },
        ],
      },

      // Centro médico + fecha emisión
      {
        columns: [
          { text: `Centro médico: ${val(d.centroMedico)}`, fontSize: 9.5 },
          { text: `Fecha emisión: ${val(d.fechaEmision)}`, fontSize: 9.5, alignment: 'right' },
        ],
        margin: [0, 8, 0, 4],
      },

      // Línea separadora
      line(),

      // Título DATOS DE ATENCIÓN
      { text: 'DATOS DE ATENCIÓN', bold: true, alignment: 'center', margin: [0, 10, 0, 10] },

      // Filas de datos del paciente
      ...filasContent,

      // Línea separadora
      line(),

      // Título DETALLE
      { text: 'DETALLE', bold: true, alignment: 'center', margin: [0, 10, 0, 10] },

      // Línea separadora
      line(),

      // Encabezado tabla
      {
        columns: [
          { text: 'Código',      bold: true, width: 82 },
          { text: 'Descripción', bold: true, width: '*' },
          { text: 'Cantidad',    bold: true, width: 67,  alignment: 'right' },
          { text: 'Exento',      bold: true, width: 74,  alignment: 'right' },
          { text: 'Afecto',      bold: true, width: 52,  alignment: 'right' },
          { text: 'IVA',         bold: true, width: 30,  alignment: 'right' },
          { text: 'TOTAL',       bold: true, width: 74,  alignment: 'right' },
        ],
        margin: [0, 4, 0, 4],
      },

      // Línea bajo encabezado
      line(),

      // Prestaciones
      ...filasPresta,

      // Línea cierre tabla
      line(),

      // Total
      {
        columns: [
          { text: '', width: '*' },
          { text: totalTexto, bold: true, alignment: 'right' },
        ],
        margin: [0, 6, 0, 0],
      },

      // Sección método de pago (opcional)
      ...seccionPago,

      // Espaciado hasta el sello
      { text: '', margin: [0, 80, 0, 0] },

      // Sello centrado
      {
        columns: [
          { text: '', width: '*' },
          { image: SELLO_B64, width: 120, alignment: 'center' },
          { text: '', width: '*' },
        ],
      },
    ],
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function line() {
  return {
    canvas: [{
      type: 'line',
      x1: 0, y1: 0, x2: 761.89, y2: 0,
      lineWidth: 0.5,
      lineColor: GRAY,
    }],
  };
}

function formatNum(n) {
  const num = Number(n);
  if (isNaN(num)) return '0';
  return num.toLocaleString('es-CL');
}

module.exports = { buildOrdenPago };
