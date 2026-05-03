import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Timestamp } from 'firebase/firestore';
import { getApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '../auth/AuthContext';
import {
  subirPdfStorage,
  crearRegistroPdf,
  actualizarRegistroPdf,
  eliminarRegistroPdf,
  escucharPdfsGenerados,
  calcularDiasRestantes,
  fechaLegible,
} from '../services/generarPdfService';
import { inicializarCornerstone, cornerstone } from '../lib/cornerstone';
import type { GeneradorPdfDoc } from '../types/generarPdf';

// ── Tipos locales ─────────────────────────────────────────────

interface ArchivoItem {
  file: File;
  preview: string;
  tipo: 'imagen' | 'dicom';
}

// ── Helpers de procesamiento ──────────────────────────────────

async function imagenADataURL(file: File, maxW = 1200, quality = 0.65): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target!.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function dicomADataURL(file: File): Promise<string> {
  inicializarCornerstone();
  const container = document.createElement('div');
  Object.assign(container.style, {
    position: 'fixed',
    left: '-9999px',
    top: '0',
    width: '512px',
    height: '512px',
    visibility: 'hidden',
  });
  document.body.appendChild(container);
  try {
    (cornerstone as any).enable(container);
    const blobUrl = URL.createObjectURL(file);
    const image = await (cornerstone as any).loadAndCacheImage(`wadouri:${blobUrl}`);
    const viewport = (cornerstone as any).getDefaultViewportForImage(container, image);
    try {
      const ww = image.data.string('x00281051');
      const wc = image.data.string('x00281050');
      if (ww && wc) viewport.voi = { windowWidth: parseFloat(ww), windowCenter: parseFloat(wc) };
    } catch (_) {}
    (cornerstone as any).displayImage(container, image, viewport);
    const enabled = (cornerstone as any).getEnabledElement(container);
    const dataUrl = (enabled.canvas as HTMLCanvasElement).toDataURL('image/jpeg', 0.72);
    URL.revokeObjectURL(blobUrl);
    return dataUrl;
  } finally {
    try { (cornerstone as any).disable(container); } catch (_) {}
    try { document.body.removeChild(container); } catch (_) {}
  }
}

async function generarPdfBlob(
  imagenes: string[],
  pacienteNombre: string,
  fecha: string,
): Promise<Blob> {
  const [pdfMakeModule, pdfFontsModule] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/vfs_fonts'),
  ]);
  const pdfMake = (pdfMakeModule as any).default ?? pdfMakeModule;
  const pdfFonts = (pdfFontsModule as any).default ?? pdfFontsModule;
  pdfMake.vfs = pdfFonts?.pdfMake?.vfs ?? pdfFonts?.vfs ?? {};

  const docDefinition: any = {
    pageSize: 'A4',
    pageMargins: [30, 70, 30, 50],
    header: (_page: number) => ({
      columns: [
        { text: 'ViñaMed — Imágenes Ecográficas', style: 'hdr', alignment: 'left' },
        { text: `${pacienteNombre} · ${fecha}`, style: 'hdr', alignment: 'right' },
      ],
      margin: [30, 20],
    }),
    footer: (currentPage: number, pageCount: number) => ({
      text: `Página ${currentPage} de ${pageCount}  ·  Documento confidencial — ViñaMed`,
      alignment: 'center',
      style: 'ftr',
      margin: [30, 10],
    }),
    content: imagenes.map((dataUrl, i) => ({
      image: dataUrl,
      width: 535,
      alignment: 'center',
      margin: [0, i === 0 ? 0 : 20, 0, 20],
      pageBreak: i > 0 ? 'before' : undefined,
    })),
    styles: {
      hdr: { fontSize: 9, color: '#64748B' },
      ftr: { fontSize: 8, color: '#94A3B8' },
    },
  };

  return new Promise(resolve => pdfMake.createPdf(docDefinition).getBlob(resolve));
}

// ── Colores de días restantes ─────────────────────────────────

function colorDias(dias: number): { bg: string; text: string } {
  if (dias <= 5)  return { bg: '#FEF2F2', text: '#EF4444' };
  if (dias <= 12) return { bg: '#FFFBEB', text: '#D97706' };
  return { bg: '#F0FDF4', text: '#16A34A' };
}

// ── Constantes de estilo ──────────────────────────────────────

const card: React.CSSProperties = {
  background: '#fff',
  borderRadius: 16,
  border: '1px solid #E2E8F0',
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  padding: 24,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  border: '1px solid #E2E8F0',
  borderRadius: 10,
  fontSize: 13,
  color: '#0F172A',
  background: '#fff',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: '#64748B',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  marginBottom: 6,
};

// ── Componente principal ──────────────────────────────────────

const GenerarPdfPage: React.FC = () => {
  const { user } = useAuth();

  const [nombre, setNombre]   = useState('');
  const [email, setEmail]     = useState('');
  const [archivos, setArchivos] = useState<ArchivoItem[]>([]);
  const [dragging, setDragging] = useState(false);

  const [progreso, setProgreso] = useState<{ activo: boolean; paso: string; pct: number }>({
    activo: false, paso: '', pct: 0,
  });
  const [historial, setHistorial] = useState<GeneradorPdfDoc[]>([]);
  const [enviando, setEnviando]   = useState<string | null>(null);
  const [error, setError]         = useState('');
  const [exito, setExito]         = useState('');

  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = escucharPdfsGenerados(setHistorial);
    return unsub;
  }, []);

  // Limpiar previews al desmontar
  useEffect(() => {
    return () => archivos.forEach(a => { if (a.preview) URL.revokeObjectURL(a.preview); });
  }, [archivos]);

  // ── Manejo de archivos ──────────────────────────────────────

  const agregarArchivos = useCallback((files: FileList | File[]) => {
    const validos = Array.from(files).filter(f => {
      const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
      return ['jpg', 'jpeg', 'png', 'dcm', 'dicom'].includes(ext);
    });
    const items: ArchivoItem[] = validos.map(file => {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
      const esDicom = ext === 'dcm' || ext === 'dicom';
      return {
        file,
        preview: esDicom ? '' : URL.createObjectURL(file),
        tipo: esDicom ? 'dicom' : 'imagen',
      };
    });
    setArchivos(prev => [...prev, ...items]);
  }, []);

  const eliminarArchivo = (i: number) => {
    setArchivos(prev => {
      const item = prev[i];
      if (item.preview) URL.revokeObjectURL(item.preview);
      return prev.filter((_, idx) => idx !== i);
    });
  };

  // ── Drag & Drop ─────────────────────────────────────────────

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) agregarArchivos(e.dataTransfer.files);
  };

  // ── Generar PDF ─────────────────────────────────────────────

  const handleGenerar = async () => {
    if (!nombre.trim() || archivos.length === 0) return;
    setError('');
    setExito('');
    setProgreso({ activo: true, paso: 'Creando registro…', pct: 5 });

    try {
      const now = new Date();
      const expira = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const docId = await crearRegistroPdf({
        pacienteNombre:  nombre.trim(),
        pacienteEmail:   email.trim(),
        totalImagenes:   archivos.length,
        pdfStoragePath:  '',
        pdfUrl:          '',
        estado:          'generando',
        emailEnviado:    false,
        emailEnviadoEn:  null,
        emailEnviadoPor: null,
        creadoEn:        Timestamp.fromDate(now),
        expiraEn:        Timestamp.fromDate(expira),
        creadoPor:       user?.name ?? 'desconocido',
      });

      // Procesar imágenes
      const dataUrls: string[] = [];
      for (let i = 0; i < archivos.length; i++) {
        const item = archivos[i];
        setProgreso({
          activo: true,
          paso: `Procesando imagen ${i + 1} de ${archivos.length}…`,
          pct: 10 + Math.round((i / archivos.length) * 55),
        });
        try {
          const dataUrl = item.tipo === 'dicom'
            ? await dicomADataURL(item.file)
            : await imagenADataURL(item.file);
          dataUrls.push(dataUrl);
        } catch (_) {
          // Si falla una imagen, continuar con las demás
        }
      }

      if (dataUrls.length === 0) {
        throw new Error('No se pudo procesar ninguna imagen.');
      }

      setProgreso({ activo: true, paso: 'Generando PDF…', pct: 68 });
      const fechaStr = now.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const blob = await generarPdfBlob(dataUrls, nombre.trim(), fechaStr);

      setProgreso({ activo: true, paso: 'Subiendo PDF…', pct: 85 });
      const { path, url } = await subirPdfStorage(blob, docId);

      await actualizarRegistroPdf(docId, {
        pdfStoragePath: path,
        pdfUrl: url,
        estado: 'listo',
        totalImagenes: dataUrls.length,
      });

      setProgreso({ activo: false, paso: '', pct: 100 });
      setNombre('');
      setEmail('');
      setArchivos([]);
      setExito('PDF generado y guardado correctamente.');
    } catch (e: any) {
      setError(e.message ?? 'Error al generar el PDF.');
      setProgreso({ activo: false, paso: '', pct: 0 });
    }
  };

  // ── Enviar email ────────────────────────────────────────────

  const handleEnviarEmail = async (doc: GeneradorPdfDoc) => {
    if (!doc.pacienteEmail) {
      setError('Este registro no tiene un correo de paciente registrado.');
      return;
    }
    setEnviando(doc.id);
    setError('');
    try {
      const app = getApp('vinamed');
      const fns = getFunctions(app);
      const fn = httpsCallable(fns, 'enviarPdfEcografia');
      await fn({
        docId:           doc.id,
        pacienteNombre:  doc.pacienteNombre,
        pacienteEmail:   doc.pacienteEmail,
        pdfUrl:          doc.pdfUrl,
      });
      setExito(`Correo enviado a ${doc.pacienteEmail}`);
    } catch (e: any) {
      setError('No se pudo enviar el correo. Verifica que la función esté desplegada.');
    } finally {
      setEnviando(null);
    }
  };

  const toggleEmailEnviado = async (doc: GeneradorPdfDoc) => {
    await actualizarRegistroPdf(doc.id, {
      emailEnviado:    !doc.emailEnviado,
      emailEnviadoEn:  !doc.emailEnviado ? Timestamp.now() : null,
      emailEnviadoPor: !doc.emailEnviado ? (user?.name ?? 'manual') : null,
    });
  };

  const handleEliminar = async (doc: GeneradorPdfDoc) => {
    if (!confirm(`¿Eliminar el PDF de ${doc.pacienteNombre}? Esta acción no se puede deshacer.`)) return;
    await eliminarRegistroPdf(doc.id, doc.pdfStoragePath);
  };

  // ── Render ──────────────────────────────────────────────────

  const puedeGenerar = nombre.trim().length > 0 && archivos.length > 0 && !progreso.activo;

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Encabezado ──────────────────────────────────────── */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', margin: 0 }}>
          Generar PDF de Imágenes
        </h1>
        <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0' }}>
          Sube imágenes JPG o DICOM para convertirlas en un PDF liviano y enviárselo al paciente.
        </p>
      </div>

      {/* ── Alertas globales ─────────────────────────────────── */}
      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 10, background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#DC2626', fontSize: 13 }}>
          {error}
        </div>
      )}
      {exito && (
        <div style={{ padding: '12px 16px', borderRadius: 10, background: '#F0FDF4', border: '1px solid #86EFAC', color: '#16A34A', fontSize: 13 }}>
          {exito}
        </div>
      )}

      {/* ── Formulario generador ─────────────────────────────── */}
      <div style={card}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: '0 0 20px' }}>
          Nuevo PDF
        </h2>

        {/* Datos del paciente */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          <div>
            <label style={labelStyle}>Nombre del Paciente *</label>
            <input
              style={inputStyle}
              placeholder="Ej: Juan Pérez González"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              disabled={progreso.activo}
            />
          </div>
          <div>
            <label style={labelStyle}>Correo del Paciente</label>
            <input
              type="email"
              style={inputStyle}
              placeholder="paciente@correo.cl"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={progreso.activo}
            />
          </div>
        </div>

        {/* Zona de carga */}
        <div
          ref={dropRef}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = true;
            input.accept = '.jpg,.jpeg,.png,.dcm,.dicom';
            input.onchange = e => {
              const files = (e.target as HTMLInputElement).files;
              if (files) agregarArchivos(files);
            };
            input.click();
          }}
          style={{
            border: `2px dashed ${dragging ? '#0E7490' : '#CBD5E1'}`,
            borderRadius: 12,
            padding: '32px 20px',
            textAlign: 'center',
            cursor: 'pointer',
            background: dragging ? '#F0F9FF' : '#F8FAFC',
            transition: 'all 0.15s',
            marginBottom: archivos.length > 0 ? 16 : 0,
          }}
        >
          <svg width={32} height={32} fill="none" viewBox="0 0 24 24" stroke={dragging ? '#0E7490' : '#94A3B8'} strokeWidth={1.5} style={{ margin: '0 auto 8px', display: 'block' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          <p style={{ fontSize: 13, fontWeight: 600, color: dragging ? '#0E7490' : '#475569', margin: '0 0 4px' }}>
            Arrastra las imágenes aquí o haz clic para seleccionarlas
          </p>
          <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>
            Formatos aceptados: JPG, PNG, DICOM (.dcm, .dicom)
          </p>
        </div>

        {/* Thumbnails */}
        {archivos.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
            {archivos.map((item, i) => (
              <div
                key={i}
                style={{
                  position: 'relative',
                  width: 80,
                  height: 80,
                  borderRadius: 8,
                  overflow: 'hidden',
                  border: '1px solid #E2E8F0',
                  background: '#F1F5F9',
                  flexShrink: 0,
                }}
              >
                {item.tipo === 'dicom' ? (
                  <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                    <svg width={24} height={24} fill="none" viewBox="0 0 24 24" stroke="#0E7490" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                    <span style={{ fontSize: 9, color: '#0E7490', fontWeight: 600 }}>DICOM</span>
                  </div>
                ) : (
                  <img
                    src={item.preview}
                    alt={item.file.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                )}
                <button
                  onClick={e => { e.stopPropagation(); eliminarArchivo(i); }}
                  style={{
                    position: 'absolute',
                    top: 2,
                    right: 2,
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: 'rgba(0,0,0,0.55)',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Progreso */}
        {progreso.activo && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: '#0E7490', fontWeight: 500 }}>{progreso.paso}</span>
              <span style={{ fontSize: 12, color: '#0E7490' }}>{progreso.pct}%</span>
            </div>
            <div style={{ height: 6, borderRadius: 99, background: '#E2E8F0', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${progreso.pct}%`,
                background: 'linear-gradient(90deg, #0E7490, #06B6D4)',
                borderRadius: 99,
                transition: 'width 0.3s ease',
              }} />
            </div>
          </div>
        )}

        {/* Botón generar */}
        <button
          onClick={handleGenerar}
          disabled={!puedeGenerar}
          style={{
            padding: '11px 28px',
            borderRadius: 10,
            border: 'none',
            background: puedeGenerar ? 'linear-gradient(135deg, #0E7490, #0891B2)' : '#E2E8F0',
            color: puedeGenerar ? '#fff' : '#94A3B8',
            fontSize: 13,
            fontWeight: 600,
            cursor: puedeGenerar ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.15s',
          }}
        >
          {progreso.activo ? (
            <>
              <svg style={{ animation: 'spin 1s linear infinite' }} width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
              Procesando…
            </>
          ) : (
            <>
              <svg width={14} height={14} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              Generar PDF
              {archivos.length > 0 && ` (${archivos.length} imagen${archivos.length > 1 ? 'es' : ''})`}
            </>
          )}
        </button>
      </div>

      {/* ── Historial ────────────────────────────────────────── */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>
            Historial de PDFs
          </h2>
          {historial.length > 0 && (
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 99,
              background: '#F0F9FF',
              color: '#0E7490',
              border: '1px solid #BAE6FD',
            }}>
              {historial.length}
            </span>
          )}
        </div>

        {historial.length === 0 ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
            No hay PDFs generados aún.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #F1F5F9' }}>
                  {['Paciente', 'Correo', 'Imgs', 'Creado', 'Expira en', 'Email', 'Acciones'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {historial.map(item => {
                  const dias = item.expiraEn ? calcularDiasRestantes(item.expiraEn) : 0;
                  const { bg, text: clr } = colorDias(dias);
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid #F8FAFC' }}>

                      {/* Paciente */}
                      <td style={{ padding: '12px 12px' }}>
                        <span style={{ fontWeight: 600, color: '#0F172A' }}>
                          {item.pacienteNombre}
                        </span>
                        {item.estado === 'generando' && (
                          <span style={{ marginLeft: 6, fontSize: 10, color: '#D97706', background: '#FFFBEB', padding: '1px 6px', borderRadius: 99 }}>
                            generando…
                          </span>
                        )}
                      </td>

                      {/* Correo */}
                      <td style={{ padding: '12px 12px', color: '#475569' }}>
                        {item.pacienteEmail || <span style={{ color: '#CBD5E1' }}>—</span>}
                      </td>

                      {/* Imágenes */}
                      <td style={{ padding: '12px 12px', color: '#475569', textAlign: 'center' }}>
                        {item.totalImagenes}
                      </td>

                      {/* Fecha creación */}
                      <td style={{ padding: '12px 12px', color: '#475569', whiteSpace: 'nowrap' }}>
                        {item.creadoEn ? fechaLegible(item.creadoEn) : '—'}
                      </td>

                      {/* Días restantes */}
                      <td style={{ padding: '12px 12px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 10px',
                          borderRadius: 99,
                          background: bg,
                          color: clr,
                          fontSize: 12,
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                        }}>
                          {dias === 0 ? 'Expirado' : `${dias} días`}
                        </span>
                      </td>

                      {/* Email enviado */}
                      <td style={{ padding: '12px 12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', userSelect: 'none' }}>
                            <input
                              type="checkbox"
                              checked={item.emailEnviado}
                              onChange={() => toggleEmailEnviado(item)}
                              style={{ accentColor: '#0E7490', width: 14, height: 14 }}
                            />
                            <span style={{ fontSize: 11, color: item.emailEnviado ? '#16A34A' : '#94A3B8', fontWeight: 500 }}>
                              {item.emailEnviado ? 'Enviado' : 'No enviado'}
                            </span>
                          </label>
                          {item.emailEnviado && item.emailEnviadoEn && (
                            <span style={{ fontSize: 10, color: '#94A3B8' }}>
                              {item.emailEnviadoEn.toDate().toLocaleDateString('es-CL')}
                              {item.emailEnviadoPor ? ` · ${item.emailEnviadoPor}` : ''}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Acciones */}
                      <td style={{ padding: '12px 12px' }}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'nowrap' }}>
                          {/* Descargar */}
                          {item.pdfUrl && item.estado === 'listo' && (
                            <a
                              href={item.pdfUrl}
                              target="_blank"
                              rel="noreferrer"
                              title="Descargar PDF"
                              style={{
                                padding: '6px 10px',
                                borderRadius: 8,
                                border: '1px solid #E2E8F0',
                                background: '#F8FAFC',
                                color: '#0E7490',
                                fontSize: 12,
                                fontWeight: 600,
                                textDecoration: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <svg width={12} height={12} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                              </svg>
                              PDF
                            </a>
                          )}

                          {/* Enviar correo */}
                          {item.pacienteEmail && item.estado === 'listo' && (
                            <button
                              onClick={() => handleEnviarEmail(item)}
                              disabled={enviando === item.id}
                              title="Enviar por correo"
                              style={{
                                padding: '6px 10px',
                                borderRadius: 8,
                                border: '1px solid #E0F2FE',
                                background: '#F0F9FF',
                                color: '#0369A1',
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: enviando === item.id ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                whiteSpace: 'nowrap',
                                opacity: enviando === item.id ? 0.6 : 1,
                              }}
                            >
                              <svg width={12} height={12} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                              </svg>
                              {enviando === item.id ? '…' : 'Enviar'}
                            </button>
                          )}

                          {/* Eliminar */}
                          <button
                            onClick={() => handleEliminar(item)}
                            title="Eliminar"
                            style={{
                              padding: '6px 10px',
                              borderRadius: 8,
                              border: '1px solid #FFE4E6',
                              background: '#FFF1F2',
                              color: '#E11D48',
                              fontSize: 12,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <svg width={12} height={12} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {historial.some(h => calcularDiasRestantes(h.expiraEn) <= 5 && calcularDiasRestantes(h.expiraEn) > 0) && (
          <p style={{ fontSize: 11, color: '#D97706', marginTop: 12, margin: '16px 0 0', padding: '8px 12px', background: '#FFFBEB', borderRadius: 8, borderLeft: '3px solid #F59E0B' }}>
            Algunos PDFs expiran en menos de 5 días. Se eliminan automáticamente a los 30 días.
          </p>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default GenerarPdfPage;
