import React, { useState, useRef, useEffect, useCallback } from 'react';
import { inicializarCornerstone, cornerstone } from '../lib/cornerstone';

// ── Tipos locales ─────────────────────────────────────────────

interface ArchivoItem {
  file: File;
  preview: string;
  tipo: 'imagen' | 'dicom';
}

/** Entrada de historial SIMBÓLICO (solo en memoria, esta sesión). */
interface HistorialLocal {
  id: string;
  pacienteNombre: string;
  totalImagenes: number;
  creadoEn: Date;
  blobUrl: string;   // se conserva para re-descargar durante la sesión
  fileName: string;
}

function fechaCorta(d: Date): string {
  return d.toLocaleDateString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

/** Dispara la descarga de un blob/URL en el navegador. */
function descargar(url: string, fileName: string): void {
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// ── Helpers de procesamiento ──────────────────────────────────

// Embebe la imagen ORIGINAL (JPG/PNG) tal cual en el PDF. No se re-codifica
// por canvas para evitar que ciertos JPEG/PNG (perfiles de color, etc.) salgan
// en negro. pdfmake soporta data URLs JPEG y PNG de forma nativa.
async function imagenADataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target!.result as string);
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
  const pdfMakeModule = await import('pdfmake/build/pdfmake');
  const pdfMake: any =
    (pdfMakeModule as any).default ??
    (pdfMakeModule as any).pdfMake ??
    pdfMakeModule;

  if (!pdfMake || typeof pdfMake.createPdf !== 'function') {
    throw new Error('No se pudo cargar pdfmake. Verifique la instalación del paquete "pdfmake".');
  }

  // vfs_fonts.js hace internamente `this.pdfMake.vfs = {...}`. Bajo ESM/Vite `this`
  // queda undefined y revienta ("cannot read properties of undefined (reading 'pdfMake')").
  // Se expone pdfMake en el global ANTES de cargar vfs_fonts para que la asignación
  // resuelva y las fuentes queden montadas en pdfMake.vfs.
  if (!pdfMake.vfs || Object.keys(pdfMake.vfs).length === 0) {
    (globalThis as any).pdfMake = pdfMake;
    const pdfFontsModule: any = await import('pdfmake/build/vfs_fonts');
    const vfs =
      pdfMake.vfs ??
      pdfFontsModule?.pdfMake?.vfs ??
      pdfFontsModule?.vfs ??
      pdfFontsModule?.default?.pdfMake?.vfs ??
      pdfFontsModule?.default?.vfs;
    if (vfs) pdfMake.vfs = vfs;
    else {
      console.warn('pdfmake/build/vfs_fonts no expuso las fuentes virtuales.');
      pdfMake.vfs = {};
    }
  }

  // Plantilla réplica del Word de ecografía: página vertical ~25×35 cm
  // (709×1001 pt, igual al export real), FONDO NEGRO y ~2 imágenes por hoja.
  // Las capturas del ecógrafo ya vienen con fondo negro, por lo que calzan.
  const PAGE_W = 709;
  const PAGE_H = 1001;
  const MARGIN = 28;
  const IMG_W = 600; // centrada; deja ~2 por página según proporción

  // Agrupa las imágenes de a 2 por página.
  const contenido: any[] = [];
  for (let i = 0; i < imagenes.length; i += 2) {
    const grupo = imagenes.slice(i, i + 2).map((dataUrl, j) => ({
      image: dataUrl,
      width: IMG_W,
      alignment: 'center',
      margin: [0, j === 0 ? 0 : 24, 0, 0],
    }));
    contenido.push({ stack: grupo, pageBreak: i > 0 ? 'before' : undefined });
  }

  const docDefinition: any = {
    pageSize: { width: PAGE_W, height: PAGE_H },
    pageMargins: [MARGIN, MARGIN, MARGIN, MARGIN],
    // Fondo negro que cubre toda la hoja (como la plantilla).
    background: (_currentPage: number, pageSize: { width: number; height: number }) => ({
      canvas: [{ type: 'rect', x: 0, y: 0, w: pageSize.width, h: pageSize.height, color: '#000000' }],
    }),
    info: { title: `ECO ${pacienteNombre} ${fecha}`.trim() },
    content: contenido,
  };

  return new Promise(resolve => pdfMake.createPdf(docDefinition).getBlob(resolve));
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
  const [nombre, setNombre]   = useState('');
  const [archivos, setArchivos] = useState<ArchivoItem[]>([]);
  const [dragging, setDragging] = useState(false);

  const [progreso, setProgreso] = useState<{ activo: boolean; paso: string; pct: number }>({
    activo: false, paso: '', pct: 0,
  });
  const [historial, setHistorial] = useState<HistorialLocal[]>([]);
  const [error, setError]         = useState('');
  const [exito, setExito]         = useState('');

  const dropRef = useRef<HTMLDivElement>(null);

  // Liberar las URLs de objeto del historial al desmontar.
  useEffect(() => {
    return () => historial.forEach(h => URL.revokeObjectURL(h.blobUrl));
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setProgreso({ activo: true, paso: 'Procesando imágenes…', pct: 5 });

    try {
      const now = new Date();

      // Procesar imágenes
      const dataUrls: string[] = [];
      for (let i = 0; i < archivos.length; i++) {
        const item = archivos[i];
        setProgreso({
          activo: true,
          paso: `Procesando imagen ${i + 1} de ${archivos.length}…`,
          pct: 5 + Math.round((i / archivos.length) * 70),
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

      setProgreso({ activo: true, paso: 'Generando PDF…', pct: 85 });
      const fechaStr = now.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const blob = await generarPdfBlob(dataUrls, nombre.trim(), fechaStr);

      // Nombre de archivo y DESCARGA AUTOMÁTICA (sin Storage).
      const slug = nombre.trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
      const fileName = `ECO_${slug}_${fechaStr.replace(/\//g, '-')}.pdf`;
      const blobUrl = URL.createObjectURL(blob);
      descargar(blobUrl, fileName);

      // Historial SIMBÓLICO (en memoria, permite re-descargar esta sesión).
      setHistorial(prev => [
        { id: `h_${now.getTime()}`, pacienteNombre: nombre.trim(), totalImagenes: dataUrls.length, creadoEn: now, blobUrl, fileName },
        ...prev,
      ]);

      setProgreso({ activo: false, paso: '', pct: 100 });
      setNombre('');
      setArchivos([]);
      setExito('PDF generado y descargado.');
    } catch (e: any) {
      setError(e.message ?? 'Error al generar el PDF.');
      setProgreso({ activo: false, paso: '', pct: 0 });
    }
  };

  // ── Historial simbólico ─────────────────────────────────────

  const reDescargar = (item: HistorialLocal) => descargar(item.blobUrl, item.fileName);

  const handleEliminar = (item: HistorialLocal) => {
    URL.revokeObjectURL(item.blobUrl);
    setHistorial(prev => prev.filter(h => h.id !== item.id));
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
          Sube imágenes JPG o DICOM y genera el PDF (fondo negro, 2 por hoja). Se descarga automáticamente.
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
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Nombre del Paciente *</label>
          <input
            style={inputStyle}
            placeholder="Ej: Juan Pérez González"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            disabled={progreso.activo}
          />
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

      {/* ── Historial (simbólico, solo esta sesión) ──────────── */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
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
            No hay PDFs generados en esta sesión.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #F1F5F9' }}>
                  {['Paciente', 'Imágenes', 'Generado', 'Acciones'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {historial.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #F8FAFC' }}>
                    <td style={{ padding: '12px 12px', fontWeight: 600, color: '#0F172A' }}>
                      {item.pacienteNombre}
                    </td>
                    <td style={{ padding: '12px 12px', color: '#475569', textAlign: 'center' }}>
                      {item.totalImagenes}
                    </td>
                    <td style={{ padding: '12px 12px', color: '#475569', whiteSpace: 'nowrap' }}>
                      {fechaCorta(item.creadoEn)}
                    </td>
                    <td style={{ padding: '12px 12px' }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'nowrap' }}>
                        <button
                          onClick={() => reDescargar(item)}
                          title="Descargar de nuevo"
                          style={{
                            padding: '6px 10px', borderRadius: 8, border: '1px solid #E2E8F0',
                            background: '#F8FAFC', color: '#0E7490', fontSize: 12, fontWeight: 600,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
                          }}
                        >
                          <svg width={12} height={12} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                          </svg>
                          Descargar
                        </button>
                        <button
                          onClick={() => handleEliminar(item)}
                          title="Quitar del historial"
                          style={{
                            padding: '6px 10px', borderRadius: 8, border: '1px solid #FFE4E6',
                            background: '#FFF1F2', color: '#E11D48', fontSize: 12,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                          }}
                        >
                          <svg width={12} height={12} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p style={{ fontSize: 11, color: '#94A3B8', margin: '14px 0 0' }}>
          El historial es simbólico: existe solo durante esta sesión y no se guarda en la nube.
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default GenerarPdfPage;
