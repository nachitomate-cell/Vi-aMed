import React, { useRef, useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { Timestamp } from 'firebase/firestore';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface Prestacion {
  codigo?: string;
  descripcion?: string;
  nombre?: string;
  prestacion?: string;
  valor?: number;
  copago?: number;
  exento?: number;
  afecto?: number;
  iva?: number;
}

interface OrdenData {
  id: string;
  pacienteNombre: string;
  pacienteRut: string;
  fecha: Timestamp;
  nOperacion?: string;
  metodoPago?: string;
  prevision?: string;
  pacienteFechaNacimiento?: string;
  pacienteSexo?: string;
  pacienteTelefono?: string;
  pacienteCorreo?: string;
  tipoAtencion?: string;
  prestaciones?: Prestacion[];
}

interface ModalOrdenPagoProps {
  registro: {
    id: string;
    pacienteNombre: string;
    pacienteRut: string;
    fecha: Timestamp;
    nOperacion?: string;
    tipoAtencion?: string;
  };
  onCerrar: () => void;
}

const formatCLP = (n: number) =>
  n.toLocaleString('es-CL', { minimumFractionDigits: 0 });

const calcularEdad = (fechaNac: string): number => {
  if (!fechaNac) return 0;
  const [d, m, y] = fechaNac.includes('/')
    ? fechaNac.split('/').map(Number)
    : fechaNac.split('-').map(Number);
  const hoy = new Date();
  const nac = fechaNac.includes('/')
    ? new Date(y, m - 1, d)
    : new Date(d, m - 1, y);
  let edad = hoy.getFullYear() - nac.getFullYear();
  if (
    hoy.getMonth() < nac.getMonth() ||
    (hoy.getMonth() === nac.getMonth() && hoy.getDate() < nac.getDate())
  ) edad--;
  return edad;
};

const sexoLabel = (s?: string) => {
  if (!s) return '—';
  if (s.toLowerCase().includes('femen') || s.toLowerCase() === 'f') return 'Femenino';
  if (s.toLowerCase().includes('masc') || s.toLowerCase() === 'm') return 'Masculino';
  return s;
};

/* ── estilos inline reutilizables ─────────────────────────── */
const S = {
  sectionHeader: {
    background: '#0E7490',
    color: 'white',
    textAlign: 'center' as const,
    fontWeight: 'bold' as const,
    fontSize: '9px',
    padding: '3px 6px',
    marginBottom: '0',
    letterSpacing: '0.5px',
  },
  th: {
    padding: '3px 6px',
    fontWeight: 'bold' as const,
    color: '#0E7490',
    borderBottom: '1px solid #ccc',
    background: '#f0f7fa',
    fontSize: '8px',
    whiteSpace: 'nowrap' as const,
  },
  td: {
    padding: '3px 6px',
    fontSize: '8px',
    borderBottom: '1px solid #eee',
  },
};

const ModalOrdenPago: React.FC<ModalOrdenPagoProps> = ({ registro, onCerrar }) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [cargando, setCargando] = useState(false);
  const [datosCompletos, setDatosCompletos] = useState<OrdenData | null>(null);
  const [cargandoDatos, setCargandoDatos] = useState(true);

  /* ── Cargar datos completos de Firebase ──────────────────── */
  useEffect(() => {
    const cargar = async () => {
      try {
        const snap = await getDoc(doc(db, 'citas', registro.id));
        if (snap.exists()) {
          setDatosCompletos({ id: snap.id, ...snap.data() } as OrdenData);
        } else {
          setDatosCompletos({
            id: registro.id,
            pacienteNombre: registro.pacienteNombre,
            pacienteRut: registro.pacienteRut,
            fecha: registro.fecha,
            nOperacion: registro.nOperacion,
            tipoAtencion: registro.tipoAtencion,
          });
        }
      } catch (e) {
        console.error(e);
        setDatosCompletos({
          id: registro.id,
          pacienteNombre: registro.pacienteNombre,
          pacienteRut: registro.pacienteRut,
          fecha: registro.fecha,
          nOperacion: registro.nOperacion,
          tipoAtencion: registro.tipoAtencion,
        });
      } finally {
        setCargandoDatos(false);
      }
    };
    cargar();
  }, [registro.id]);

  const datos = datosCompletos;

  const fechaIngreso = datos?.fecha
    ? datos.fecha.toDate().toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '—';

  const hoy = new Date().toLocaleDateString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });

  const prestaciones: Prestacion[] = datos?.prestaciones ?? [];

  const totalGeneral = prestaciones.reduce((acc, p) => {
    const exento = p.exento ?? p.valor ?? 0;
    const afecto = p.afecto ?? 0;
    const iva = p.iva ?? 0;
    return acc + exento + afecto + iva;
  }, 0);

  /* ── Descargar PDF ──────────────────────────────────────── */
  const handleDescargarPDF = async () => {
    if (!printRef.current) return;
    setCargando(true);
    try {
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`orden_pago_${datos?.pacienteRut ?? 'paciente'}.pdf`);
    } catch (e) {
      console.error(e);
    }
    setCargando(false);
  };

  const handleImprimir = () => window.print();

  /* ─────────────────────────────────────────────────────────── */
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[95vh] flex flex-col border border-slate-200">

        {/* ── Barra de acciones ─────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="text-sm font-bold text-slate-800">Orden de Pago</h2>
            <p className="text-xs text-slate-400 mt-0.5">Previsualización del documento</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleImprimir}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Imprimir
            </button>
            <button
              onClick={handleDescargarPDF}
              disabled={cargando || cargandoDatos}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-[#0E7490] hover:bg-[#0c6680] text-white rounded-xl transition-colors disabled:opacity-50"
            >
              {cargando ? (
                <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              )}
              Descargar PDF
            </button>
            <button
              onClick={onCerrar}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Previsualización del documento ────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-100">
          {cargandoDatos ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-[#0E7490] animate-spin" />
            </div>
          ) : (
            /* ─── DOCUMENTO A4 ──────────────────────────────── */
            <div
              ref={printRef}
              className="bg-white mx-auto shadow-lg"
              style={{
                width: '297mm',
                minHeight: '210mm',
                maxHeight: '210mm',
                padding: '8mm 12mm',
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: '9px',
                color: '#1a1a1a',
                boxSizing: 'border-box',
                lineHeight: '1.3',
              }}
            >

              {/* ══ ENCABEZADO (centrado) ══════════════════════ */}
              <div style={{ textAlign: 'center', marginBottom: '10px', borderBottom: '2px solid #0E7490', paddingBottom: '8px' }}>
                <img
                  src="/logo4.png"
                  alt="Logo ViñaMed"
                  style={{ width: '90px', height: 'auto', display: 'block', margin: '0 auto 4px auto' }}
                  crossOrigin="anonymous"
                />
                <p style={{ fontWeight: 'bold', fontSize: '13px', color: '#0E7490', margin: '0 0 1px 0' }}>ViñaMed</p>
                <p style={{ fontSize: '9px', color: '#444', margin: '0 0 1px 0' }}>Imagenología y Rehabilitación</p>
                <p style={{ fontSize: '8px', color: '#555', margin: '0 0 1px 0' }}>Centro médico: Viñamed</p>
                <p style={{ fontWeight: 'bold', fontSize: '9px', color: '#0E7490', margin: '2px 0 1px 0' }}>RADIODIAGNÓSTICO VIÑA DEL MAR SPA</p>
                <p style={{ fontSize: '8px', color: '#555', margin: '0 0 1px 0' }}>77.500.907-1</p>
                <p style={{ fontSize: '8px', color: '#555', margin: '0 0 1px 0' }}>MEDIO ORIENTE #831 OFICINA 408, VIÑA DEL MAR</p>
                <p style={{ fontSize: '8px', color: '#555', margin: '0' }}>FONO: 9 34222146</p>
              </div>

              {/* ══ DATOS DE ATENCIÓN ══════════════════════════ */}
              <div style={S.sectionHeader}>DATOS DE ATENCIÓN</div>

              {/*
                Tabla sin encabezados visibles, dos columnas:
                Col izquierda: Tipo atención / Nombre / Fecha nac. / Sexo / Fecha ingreso
                Col derecha: RUN / Edad / Teléfono / Fecha emisión
              */}
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                marginBottom: '8px',
                border: '1px solid #ddd',
                fontSize: '8px',
              }}>
                <tbody>
                  {/* Fila 1: Tipo de atención (col izq) — sólo ocupa col izquierda */}
                  <tr>
                    <td style={{ padding: '3px 8px', color: '#555', width: '23%', borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>
                      <strong>Tipo de atención</strong>
                    </td>
                    <td style={{ padding: '3px 8px', width: '27%', borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>
                      {datos?.tipoAtencion || 'Ambulatoria'}
                    </td>
                    <td style={{ padding: '3px 8px', color: '#555', width: '20%', borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>
                      <strong>R.U.N</strong>
                    </td>
                    <td style={{ padding: '3px 8px', width: '30%', borderBottom: '1px solid #eee' }}>
                      {datos?.pacienteRut || '—'}
                    </td>
                  </tr>
                  {/* Fila 2: Nombre | RUN → ya en fila 1 */}
                  <tr>
                    <td style={{ padding: '3px 8px', color: '#555', borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>
                      <strong>Nombre y apellidos</strong>
                    </td>
                    <td style={{ padding: '3px 8px', borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>
                      {datos?.pacienteNombre || '—'}
                    </td>
                    <td style={{ padding: '3px 8px', color: '#555', borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>
                      <strong>Edad</strong>
                    </td>
                    <td style={{ padding: '3px 8px', borderBottom: '1px solid #eee' }}>
                      {datos?.pacienteFechaNacimiento ? `${calcularEdad(datos.pacienteFechaNacimiento)} años` : '—'}
                    </td>
                  </tr>
                  {/* Fila 3: Fecha nacimiento | Teléfono */}
                  <tr>
                    <td style={{ padding: '3px 8px', color: '#555', borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>
                      <strong>Fecha de nacimiento</strong>
                    </td>
                    <td style={{ padding: '3px 8px', borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>
                      {datos?.pacienteFechaNacimiento || '—'}
                    </td>
                    <td style={{ padding: '3px 8px', color: '#555', borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>
                      <strong>Teléfono</strong>
                    </td>
                    <td style={{ padding: '3px 8px', borderBottom: '1px solid #eee' }}>
                      {datos?.pacienteTelefono || '—'}
                    </td>
                  </tr>
                  {/* Fila 4: Sexo | Fecha emisión */}
                  <tr>
                    <td style={{ padding: '3px 8px', color: '#555', borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>
                      <strong>Sexo</strong>
                    </td>
                    <td style={{ padding: '3px 8px', borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>
                      {sexoLabel(datos?.pacienteSexo)}
                    </td>
                    <td style={{ padding: '3px 8px', color: '#555', borderBottom: '1px solid #eee', borderRight: '1px solid #eee' }}>
                      <strong>Fecha emisión</strong>
                    </td>
                    <td style={{ padding: '3px 8px', borderBottom: '1px solid #eee' }}>
                      {hoy}
                    </td>
                  </tr>
                  {/* Fila 5: Fecha de ingreso (sólo col izquierda) */}
                  <tr>
                    <td style={{ padding: '3px 8px', color: '#555', borderRight: '1px solid #eee' }}>
                      <strong>Fecha de ingreso</strong>
                    </td>
                    <td style={{ padding: '3px 8px', borderRight: '1px solid #eee' }}>
                      {fechaIngreso}
                    </td>
                    <td style={{ padding: '3px 8px', borderRight: '1px solid #eee' }} />
                    <td style={{ padding: '3px 8px' }} />
                  </tr>
                </tbody>
              </table>

              {/* ══ DETALLE ════════════════════════════════════ */}
              <div style={{ ...S.sectionHeader, marginBottom: '0' }}>DETALLE</div>

              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                border: '1px solid #ddd',
                fontSize: '8px',
              }}>
                <thead>
                  <tr>
                    <th style={{ ...S.th, textAlign: 'left', width: '70px' }}>Código</th>
                    <th style={{ ...S.th, textAlign: 'left' }}>Descripción</th>
                    <th style={{ ...S.th, textAlign: 'center', width: '50px' }}>Cantidad</th>
                    <th style={{ ...S.th, textAlign: 'right', width: '60px' }}>Exento</th>
                    <th style={{ ...S.th, textAlign: 'right', width: '55px' }}>Afecto</th>
                    <th style={{ ...S.th, textAlign: 'right', width: '40px' }}>IVA</th>
                    <th style={{ ...S.th, textAlign: 'right', width: '60px' }}>TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {prestaciones.length > 0 ? prestaciones.map((p, i) => {
                    const exento = p.exento ?? p.valor ?? 0;
                    const afecto = p.afecto ?? 0;
                    const iva    = p.iva ?? 0;
                    const total  = exento + afecto + iva;
                    const nombre = p.descripcion || p.nombre || p.prestacion || '—';
                    const codigo = p.codigo ?? (nombre.split(' - ')[0] ?? '—');
                    const desc   = nombre.includes(' - ') ? nombre.split(' - ').slice(1).join(' - ') : nombre;
                    return (
                      <tr key={i}>
                        <td style={{ ...S.td, color: '#0E7490', fontWeight: 'bold' }}>{codigo}</td>
                        <td style={S.td}>{desc.toUpperCase()}</td>
                        <td style={{ ...S.td, textAlign: 'center' }}>1</td>
                        <td style={{ ...S.td, textAlign: 'right' }}>{formatCLP(exento)}</td>
                        <td style={{ ...S.td, textAlign: 'right' }}>{formatCLP(afecto)}</td>
                        <td style={{ ...S.td, textAlign: 'right' }}>{formatCLP(iva)}</td>
                        <td style={{ ...S.td, textAlign: 'right' }}>{formatCLP(total)}</td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={7} style={{ ...S.td, textAlign: 'center', color: '#999', fontStyle: 'italic', borderBottom: 'none' }}>
                        Sin prestaciones registradas
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* ── TOTAL (alineado a la derecha, negrita) ──── */}
              <div style={{
                textAlign: 'right',
                fontWeight: 'bold',
                fontSize: '10px',
                padding: '5px 6px 3px',
                borderTop: '2px solid #0E7490',
                color: '#0E7490',
                marginBottom: '24px',
              }}>
                TOTAL ${formatCLP(totalGeneral)}
              </div>

              {/* ══ PIE DE PÁGINA ══════════════════════════════ */}
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: '10px' }}>
                {/* Método de pago + N° operación */}
                <div style={{ fontSize: '8px', color: '#444' }}>
                  {datos?.metodoPago && (
                    <p style={{ margin: '2px 0' }}>
                      <strong>Método de pago:</strong> {datos.metodoPago}
                    </p>
                  )}
                  {datos?.nOperacion && (
                    <p style={{ margin: '2px 0' }}>
                      <strong>N° de operación:</strong> {datos.nOperacion}
                    </p>
                  )}
                </div>

                {/* Timbre + firma institucional */}
                <div style={{ textAlign: 'center' }}>
                  <img
                    src="/timbre.png"
                    alt="Timbre"
                    style={{ width: '110px', height: 'auto', display: 'block', margin: '0 auto 4px auto' }}
                    crossOrigin="anonymous"
                  />
                  <p style={{ fontSize: '8px', fontWeight: 'bold', color: '#0E7490', margin: '0 0 1px 0' }}>ViñaMed</p>
                  <p style={{ fontSize: '7.5px', color: '#555', margin: '0 0 1px 0' }}>Imagenologia y Rehabilitacion</p>
                  <p style={{ fontSize: '7.5px', color: '#555', margin: '0 0 1px 0' }}>Radiodiagnóstico Viña Del Mar SpA</p>
                  <p style={{ fontSize: '7.5px', color: '#555', margin: '0' }}>Rut: 77.500.907-1</p>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModalOrdenPago;
