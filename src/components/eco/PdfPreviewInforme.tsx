import React from 'react';
import type { DatosInformeEco } from '../../services/informeEcoService';

interface Props {
  form: DatosInformeEco;
  fecha: string;
}

const CENTRO = {
  nombre: 'VIÑAMED - Centro de Imagenología y Rehabilitación Física',
  direccion: 'Medio Oriente 831, Oficina 408, Edificio Olympo, Viña del Mar',
  telefono: '934 222 146',
  email: 'contacto@vinamed.cl',
  web: 'www.vinamed.cl',
};

const FIRMA_NOMBRE = 'Dr. ÁLVARO TRULLENQUE SÁNCHEZ';
const FIRMA_CARGO = 'MÉDICO RADIÓLOGO';
const FIRMA_RUT = 'Rut: 7.268.691-8';

/** Formatea "2026-04-29" → "29/04/2026" */
function fmtFecha(str: string): string {
  if (!str) return '-';
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
}

const PdfPreviewInforme: React.FC<Props> = ({ form, fecha }) => {
  const titulo = [form.tipo?.toUpperCase(), form.region ? `: ${form.region.toUpperCase()}` : '']
    .filter(Boolean).join('');

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #d1d5db',
        borderRadius: 8,
        fontFamily: 'Helvetica, Arial, sans-serif',
        fontSize: 9,
        color: '#111',
        width: '100%',
        maxWidth: 794,         // A4 px aprox a 96dpi
        margin: '0 auto',
        padding: '20px 28px',
        boxSizing: 'border-box',
        lineHeight: 1.4,
        boxShadow: '0 4px 32px rgba(0,0,0,0.12)',
      }}
    >
      {/* ── HEADER ────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
        <img
          src="/logo2.png"
          alt="ViñaMed"
          style={{ height: 42, objectFit: 'contain' }}
          onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
        <div style={{ textAlign: 'right', fontSize: 7.5, color: '#444', lineHeight: 1.6 }}>
          <div>{CENTRO.nombre}</div>
          <div>{CENTRO.direccion}</div>
          <div>Teléfono: {CENTRO.telefono}</div>
          <div>{CENTRO.email}</div>
          <div>{CENTRO.web}</div>
        </div>
      </div>

      {/* Separador */}
      <div style={{ borderTop: '0.5px solid #aaa', marginBottom: 8 }} />

      {/* Título */}
      <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 11, letterSpacing: '0.03em', marginBottom: 8 }}>
        INFORME ECOGRÁFICO
      </div>

      {/* Sub-título tipo examen */}
      {titulo && (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 0 }}>
          <thead>
            <tr>
              <th
                colSpan={4}
                style={{
                  background: '#ddd',
                  textAlign: 'center',
                  fontWeight: 'bold',
                  fontSize: 9,
                  padding: '3px 6px',
                  border: '0.5px solid #b0b0b0',
                }}
              >
                {titulo}
              </th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Paciente', form.nombre || '—', 'Edad', form.edad ? `${form.edad} años` : '-'],
              ['Rut', form.rut || '—', 'Sexo', form.sexo || '-'],
              ['Fecha de examen', fmtFecha(form.fecha || fecha), 'Código', form.codigo || '-'],
            ].map((row, i) => (
              <tr key={i}>
                <Celda w={28} bold bg>{row[0]}</Celda>
                <Celda w={62}>{row[1]}</Celda>
                <Celda w={20} bold bg>{row[2]}</Celda>
                <Celda>{row[3]}</Celda>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Indicación clínica */}
      {form.indicacion && (
        <div style={{ fontSize: 8.5, color: '#444', margin: '10px 0 6px' }}>
          Con transductor de alta resolución se realiza barrido sonográfico en{' '}
          {form.region?.toLowerCase() || 'la región indicada'}.
        </div>
      )}

      {/* Hallazgos */}
      <Section title="Hallazgos">{form.hallazgos || <em style={{ color: '#aaa' }}>Sin hallazgos registrados</em>}</Section>

      {/* Impresión ecográfica */}
      <Section title="Impresión ecográfica">{form.diagnostico || <em style={{ color: '#aaa' }}>Sin impresión registrada</em>}</Section>

      {/* Recomendaciones */}
      {form.recomendaciones?.trim() && (
        <Section title="Recomendaciones">{form.recomendaciones}</Section>
      )}

      {/* Firma */}
      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <div style={{
          borderTop: '0.6px solid #000',
          display: 'inline-block',
          width: 180,
          paddingTop: 4,
          textAlign: 'center',
        }}>
          <div style={{ fontWeight: 'bold', fontSize: 8.5 }}>{FIRMA_NOMBRE}</div>
          <div style={{ fontSize: 7.5, color: '#555', marginTop: 1 }}>{FIRMA_CARGO}</div>
          <div style={{ fontSize: 7.5, color: '#555' }}>{FIRMA_RUT}</div>
        </div>
      </div>

      {/* Pie de página */}
      <div style={{ borderTop: '0.4px solid #ccc', marginTop: 16, paddingTop: 4, textAlign: 'center', fontSize: 7, color: '#999' }}>
        ViñaMed · Informe generado el {new Date().toLocaleDateString('es-CL')} · Página 1 de 1
      </div>
    </div>
  );
};

/* ── Helpers de celda de tabla ────────────────────────── */
const Celda: React.FC<{
  children: React.ReactNode;
  bold?: boolean;
  bg?: boolean;
  w?: number;
}> = ({ children, bold, bg, w }) => (
  <td
    style={{
      border: '0.5px solid #b0b0b0',
      padding: '3px 6px',
      fontWeight: bold ? 'bold' : 'normal',
      background: bg ? '#f0f0f0' : '#fff',
      width: w ? `${w}mm` : undefined,
      fontSize: 8.5,
    }}
  >
    {children}
  </td>
);

/* ── Sección de texto ─────────────────────────────────── */
const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{ marginTop: 10 }}>
    <div style={{ fontWeight: 'bold', fontSize: 9.5, marginBottom: 3 }}>{title}</div>
    <div style={{ fontSize: 8.5, color: '#222', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{children}</div>
  </div>
);

export default PdfPreviewInforme;
