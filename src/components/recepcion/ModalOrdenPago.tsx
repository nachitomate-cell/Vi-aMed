import React, { useState, useEffect } from 'react';
import type { Timestamp } from 'firebase/firestore';
import { getDoc, doc, addDoc, updateDoc, collection, serverTimestamp } from 'firebase/firestore';
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

const soloNumeros = (codigo?: string) =>
  (codigo ?? '').match(/^\d+/)?.[0] ?? (codigo || '—');

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


const ModalOrdenPago: React.FC<ModalOrdenPagoProps> = ({ registro, onCerrar }) => {
  const [cargando, setCargando] = useState(false);
  const [errorPdf, setErrorPdf] = useState<string | null>(null);
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

  const esFonasa = datos?.prevision?.toLowerCase().includes('fonasa') ?? false;

  const montoPresta = (p: Prestacion) =>
    esFonasa && p.copago != null
      ? p.copago
      : (p.exento ?? p.valor ?? 0) + (p.afecto ?? 0) + (p.iva ?? 0);

  const totalGeneral = prestaciones.reduce((acc, p) => acc + montoPresta(p), 0);

  /* ── Descargar PDF ──────────────────────────────────────── */
  const handleDescargarPDF = async () => {
    setCargando(true);
    setErrorPdf(null);
    try {
      const prestacionesPayload = prestaciones.map(p => {
        const usaCopago = esFonasa && p.copago != null;
        const exento = usaCopago ? p.copago! : (p.exento ?? p.valor ?? 0);
        const afecto = usaCopago ? 0 : (p.afecto ?? 0);
        const iva    = usaCopago ? 0 : (p.iva ?? 0);
        const nombre = p.descripcion || p.nombre || p.prestacion || '';
        return {
          codigo:      soloNumeros(p.codigo),
          descripcion: nombre.toUpperCase(),
          cantidad:    1,
          exento,
          afecto,
          iva,
          total: exento + afecto + iva,
        };
      });

      const res = await fetch('/api/orden-pago', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          centroMedico:        'Viñamed',
          fechaEmision:        hoy,
          tipoAtencion:        datos?.tipoAtencion || 'Ambulatoria',
          nombreApellidos:     datos?.pacienteNombre || '',
          run:                 datos?.pacienteRut || '',
          fechaNacimiento:     datos?.pacienteFechaNacimiento || '',
          edad:                datos?.pacienteFechaNacimiento
                                 ? String(calcularEdad(datos.pacienteFechaNacimiento))
                                 : '',
          sexo:                sexoLabel(datos?.pacienteSexo),
          telefono:            datos?.pacienteTelefono || '',
          fechaIngreso,
          fechaEmisionDetalle: hoy,
          prestaciones:        prestacionesPayload,
          metodoPago:          datos?.metodoPago || '',
          nroOperacion:        datos?.nOperacion || '',
        }),
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        throw new Error(`El servidor respondió ${res.status}${errBody ? ': ' + errBody : ''}`);
      }

      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `OrdenPago_${datos?.pacienteRut ?? 'paciente'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      // Guardar registro en Firestore
      const total = prestaciones.reduce((acc, p) => {
        return acc + (p.exento ?? p.valor ?? 0) + (p.afecto ?? 0) + (p.iva ?? 0);
      }, 0);
      await Promise.all([
        addDoc(collection(db, 'ordenes_pago'), {
          citaId:          registro.id,
          pacienteNombre:  datos?.pacienteNombre ?? '',
          pacienteRut:     datos?.pacienteRut ?? '',
          metodoPago:      datos?.metodoPago ?? '',
          nOperacion:      datos?.nOperacion ?? '',
          prestaciones:    prestaciones,
          total,
          generadoEn:      serverTimestamp(),
        }),
        updateDoc(doc(db, 'citas', registro.id), {
          ordenPagoGenerada: true,
          fechaOrdenPago:    serverTimestamp(),
        }),
      ]);
    } catch (err) {
      console.error('Error generando PDF:', err);
      setErrorPdf(err instanceof Error ? err.message : 'No se pudo generar el PDF');
    } finally {
      setCargando(false);
    }
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

        {/* ── Error PDF ─────────────────────────────────────── */}
        {errorPdf && (
          <div className="mx-5 mt-3 flex items-start gap-3 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl text-xs font-semibold">
            <svg className="w-4 h-4 shrink-0 mt-0.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="flex-1">
              <strong>No se pudo generar el PDF.</strong> {errorPdf}
              <br /><span className="font-normal opacity-75">Verifica que el servidor de PDFs esté activo (<code className="bg-red-100 px-1 rounded">npm run dev:api</code>).</span>
            </span>
            <button onClick={() => setErrorPdf(null)} className="opacity-50 hover:opacity-100">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}

        {/* ── Previsualización del documento ────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-100">
          {cargandoDatos ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-[#0E7490] animate-spin" />
            </div>
          ) : (
            /* ─── DOCUMENTO A4 landscape (preview fiel al PDF) ── */
            <div
              className="bg-white mx-auto shadow-lg"
              style={{
                width: '277mm',
                minHeight: '190mm',
                padding: '8mm 11mm',
                fontFamily: 'Helvetica, Arial, sans-serif',
                fontSize: '8.5px',
                color: '#000',
                boxSizing: 'border-box',
                lineHeight: '1.4',
              }}
            >
              {/* ══ ENCABEZADO: logo izq + datos empresa der ══ */}
              <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '6px' }}>
                <img
                  src="/logo4.png"
                  alt="Logo ViñaMed"
                  style={{ width: '130px', height: 'auto', flexShrink: 0 }}
                />
                <div style={{ marginLeft: '10px', marginTop: '4px', fontSize: '8px', lineHeight: '1.6' }}>
                  <div>RADIODIAGNÓSTICO VIÑA DEL MAR SPA</div>
                  <div>77.500.907-1</div>
                  <div>MEDIO ORIENTE #831 OFICINA 408, VIÑA DEL MAR</div>
                  <div>FONO: 9 34222146</div>
                </div>
              </div>

              {/* Centro médico + fecha emisión */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', marginBottom: '4px' }}>
                <span>Centro médico: Viñamed</span>
                <span>Fecha emisión: {hoy}</span>
              </div>

              {/* Línea */}
              <hr style={{ border: 'none', borderTop: '0.5px solid #999', margin: '4px 0' }} />

              {/* ══ DATOS DE ATENCIÓN ══ */}
              <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '9px', margin: '6px 0' }}>DATOS DE ATENCIÓN</div>

              {/* Filas de datos: izquierda (55%) | derecha (45%) */}
              {[
                ['Tipo de atención', datos?.tipoAtencion || 'Ambulatoria', 'R.U.N',         datos?.pacienteRut || '—'],
                ['Nombre y apellidos', datos?.pacienteNombre || '—',       'Edad',           datos?.pacienteFechaNacimiento ? `${calcularEdad(datos.pacienteFechaNacimiento)}` : '—'],
                ['Fecha de nacimiento', datos?.pacienteFechaNacimiento || '—', 'Teléfono',   datos?.pacienteTelefono || '—'],
                ['Sexo', sexoLabel(datos?.pacienteSexo),                   'Fecha emisión',  hoy],
                ['Fecha de ingreso', fechaIngreso,                         '',               ''],
              ].map(([lbl1, val1, lbl2, val2], i) => (
                <div key={i} style={{ display: 'flex', marginBottom: '4px', fontSize: '8.5px' }}>
                  <div style={{ width: '55%', display: 'flex' }}>
                    <span style={{ width: '115px', flexShrink: 0 }}>{lbl1}</span>
                    <span style={{ width: '10px', flexShrink: 0 }}>:</span>
                    <span>{val1}</span>
                  </div>
                  <div style={{ width: '45%', display: 'flex' }}>
                    <span style={{ width: '90px', flexShrink: 0 }}>{lbl2}</span>
                    {lbl2 && <span style={{ width: '10px', flexShrink: 0 }}>:</span>}
                    <span>{val2}</span>
                  </div>
                </div>
              ))}

              {/* Línea */}
              <hr style={{ border: 'none', borderTop: '0.5px solid #999', margin: '6px 0' }} />

              {/* ══ DETALLE ══ */}
              <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '9px', margin: '6px 0' }}>DETALLE</div>
              <hr style={{ border: 'none', borderTop: '0.5px solid #999', margin: '0 0 4px 0' }} />

              {/* Encabezado tabla */}
              <div style={{ display: 'flex', fontWeight: 'bold', fontSize: '8.5px', marginBottom: '2px' }}>
                <span style={{ width: '70px', flexShrink: 0 }}>Código</span>
                <span style={{ flex: 1 }}>Descripción</span>
                <span style={{ width: '55px', flexShrink: 0, textAlign: 'right' }}>Cantidad</span>
                <span style={{ width: '60px', flexShrink: 0, textAlign: 'right' }}>Exento</span>
                <span style={{ width: '45px', flexShrink: 0, textAlign: 'right' }}>Afecto</span>
                <span style={{ width: '28px', flexShrink: 0, textAlign: 'right' }}>IVA</span>
                <span style={{ width: '60px', flexShrink: 0, textAlign: 'right' }}>TOTAL</span>
              </div>
              <hr style={{ border: 'none', borderTop: '0.5px solid #999', margin: '2px 0 4px 0' }} />

              {/* Filas prestaciones */}
              {prestaciones.length > 0 ? prestaciones.map((p, i) => {
                const usaCopago = esFonasa && p.copago != null;
                const exento = usaCopago ? p.copago! : (p.exento ?? p.valor ?? 0);
                const afecto = usaCopago ? 0 : (p.afecto ?? 0);
                const iva    = usaCopago ? 0 : (p.iva ?? 0);
                const total  = exento + afecto + iva;
                const nombre = p.descripcion || p.nombre || p.prestacion || '—';
                const codigo = soloNumeros(p.codigo);
                return (
                  <div key={i} style={{ display: 'flex', fontSize: '8.5px', marginBottom: '3px' }}>
                    <span style={{ width: '70px', flexShrink: 0 }}>{codigo}</span>
                    <span style={{ flex: 1 }}>{nombre.toUpperCase()}</span>
                    <span style={{ width: '55px', flexShrink: 0, textAlign: 'right' }}>1</span>
                    <span style={{ width: '60px', flexShrink: 0, textAlign: 'right' }}>{formatCLP(exento)}</span>
                    <span style={{ width: '45px', flexShrink: 0, textAlign: 'right' }}>{formatCLP(afecto)}</span>
                    <span style={{ width: '28px', flexShrink: 0, textAlign: 'right' }}>{formatCLP(iva)}</span>
                    <span style={{ width: '60px', flexShrink: 0, textAlign: 'right' }}>{formatCLP(total)}</span>
                  </div>
                );
              }) : (
                <div style={{ textAlign: 'center', color: '#555', fontStyle: 'italic', fontSize: '8px', margin: '4px 0' }}>
                  Sin prestaciones registradas.
                </div>
              )}

              <hr style={{ border: 'none', borderTop: '0.5px solid #999', margin: '4px 0' }} />

              {/* Total */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', fontWeight: 'bold', fontSize: '8.5px', marginBottom: '16px' }}>
                TOTAL ${formatCLP(totalGeneral)}
              </div>

              {/* ══ PIE: pago izq + sello der ══ */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '16px' }}>
                <div style={{ fontSize: '8.5px' }}>
                  {datos?.metodoPago && <div>Método de pago: {datos.metodoPago}</div>}
                  {datos?.nOperacion  && <div>N° de operación: {datos.nOperacion}</div>}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <img
                    src="/timbre.png"
                    alt="Sello"
                    style={{ width: '90px', height: 'auto', display: 'block', margin: '0 auto' }}
                  />
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
