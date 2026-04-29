import { useEffect, useRef, useState, useCallback } from 'react';
import {
  inicializarCornerstone,
  cornerstone,
  cornerstoneTools,
} from '../../lib/cornerstone';

const HERRAMIENTAS = [
  { nombre: 'Wwwc',   icono: '☀',  label: 'Brillo'   },
  { nombre: 'Zoom',   icono: '⊕',  label: 'Zoom'     },
  { nombre: 'Pan',    icono: '✥',  label: 'Mover'    },
  { nombre: 'Length', icono: '↔',  label: 'Medir'    },
];

export default function DicomViewer({
  url,
  altura      = 600,
  mobile      = false,
  mostrarTools = true,
}: {
  url:          string;
  altura?:      number;
  mobile?:      boolean;
  mostrarTools?: boolean;
}) {
  const elRef         = useRef<HTMLDivElement>(null);
  const habilitadoRef = useRef(false);   // ← trackear si enable tuvo éxito
  const urlActualRef  = useRef('');      // ← evitar cargas duplicadas

  const [activo,   setActivo]   = useState('Wwwc');
  const [cargando, setCargando] = useState(true);
  const [error,    setError]    = useState('');
  const [metadata, setMetadata] = useState<any>(null);

  // Inicializar Cornerstone una sola vez
  useEffect(() => {
    inicializarCornerstone();
  }, []);

  // Cargar imagen cuando cambia la URL
  useEffect(() => {
    if (!url || !elRef.current) return;
    if (url === urlActualRef.current) return; // evitar re-carga duplicada
    urlActualRef.current = url;

    const el = elRef.current;
    setCargando(true);
    setError('');
    setMetadata(null);

    // Habilitar elemento si no está habilitado
    if (!habilitadoRef.current) {
      try {
        (cornerstone as any).enable(el);
        habilitadoRef.current = true;
      } catch (e) {
        // Ya estaba habilitado — está bien
        habilitadoRef.current = true;
      }
    }

    // Cargar imagen DICOM
    // Usamos fetch + Blob para manejar URLs de Firebase con tokens temporales
    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob);
        return (cornerstone as any).loadAndCacheImage(`wadouri:${blobUrl}`);
      })
      .then((image: any) => {
        if (!elRef.current || !habilitadoRef.current) return;

        // Calcular viewport con window/level del DICOM
        const defaultVp = (cornerstone as any).getDefaultViewportForImage(
          elRef.current, image
        );

        // Intentar leer WWL de los metadatos DICOM
        try {
          const ww = image.data.string('x00281051');
          const wc = image.data.string('x00281050');
          if (ww && wc) {
            defaultVp.voi = {
              windowWidth:  parseFloat(ww),
              windowCenter: parseFloat(wc),
            };
          } else {
            // Calcular desde rango de pixels
            const range = image.maxPixelValue - image.minPixelValue;
            defaultVp.voi = {
              windowWidth:  range,
              windowCenter: image.minPixelValue + range / 2,
            };
          }
        } catch (_) {}

        (cornerstone as any).displayImage(el, image, defaultVp);
        (cornerstone as any).fitToWindow(el);

        // ── SOLUCIÓN RECOMENDADA: Activar herramientas SOLO después de displayImage ──
        HERRAMIENTAS.forEach(({ nombre }) => {
          try {
            const ToolClass = (cornerstoneTools as any)[`${nombre}Tool`];
            if (!ToolClass) return;
            const existing = (cornerstoneTools as any).getToolForElement(el, nombre);
            if (!existing) {
              (cornerstoneTools as any).addToolForElement(el, ToolClass);
            }
          } catch (_) {}
        });

        try {
          (cornerstoneTools as any).setToolActiveForElement(
            el, 'Wwwc',
            { mouseButtonMask: 1, isTouchActive: true }
          );
        } catch (_) {}

        // Leer metadatos
        try {
          const d = image.data;
          setMetadata({
            paciente:  d.string('x00100010') || 'Anónimo',
            fecha:     d.string('x00080020') || '',
            estudio:   d.string('x00081030') || 'Estudio sin nombre',
            modalidad: d.string('x00080060') || '',
          });
        } catch (_) {}

        setCargando(false);
      })
      .catch((err: any) => {
        if (!elRef.current) return;
        console.error('Error al cargar DICOM:', err);
        setError('No se pudo cargar la imagen DICOM.');
        setCargando(false);
      });

    // Cleanup: solo deshabilitar si nos vamos del componente completamente
    // NO deshabilitar al cambiar URL — reusar el elemento habilitado
    return () => {
      urlActualRef.current = '';
    };
  }, [url]);

  // Cleanup final al desmontar el componente
  useEffect(() => {
    return () => {
      if (habilitadoRef.current && elRef.current) {
        try {
          const enabled = (cornerstone as any).getEnabledElements() as any[];
          const existe  = enabled.some(e => e.element === elRef.current);
          if (existe) {
            (cornerstone as any).disable(elRef.current);
          }
        } catch (_) {}
        habilitadoRef.current = false;
      }
    };
  }, []); // ← array vacío: solo al desmontar

  // Activar herramienta con guards
  const activarHerramienta = useCallback((nombre: string) => {
    if (!elRef.current || !habilitadoRef.current) return;

    // Verificar que hay imagen cargada
    try {
      const enabled = (cornerstone as any).getEnabledElements() as any[];
      const info    = enabled.find((e: any) => e.element === elRef.current);
      if (!info?.image) return;
    } catch (_) {
      return;
    }

    setActivo(nombre);

    if (nombre === 'Invert') {
      try {
        const vp = (cornerstone as any).getViewport(elRef.current);
        if (vp) {
          vp.invert = !vp.invert;
          (cornerstone as any).setViewport(elRef.current, vp);
          (cornerstone as any).updateImage(elRef.current);
        }
      } catch (_) {}
      return;
    }

    if (nombre === 'Rotate') {
      try {
        const vp = (cornerstone as any).getViewport(elRef.current);
        if (vp) {
          vp.rotation = ((vp.rotation || 0) + 90) % 360;
          (cornerstone as any).setViewport(elRef.current, vp);
          (cornerstone as any).updateImage(elRef.current);
        }
      } catch (_) {}
      return;
    }

    try {
      (cornerstoneTools as any).setToolActiveForElement(
        elRef.current,
        nombre,
        { mouseButtonMask: 1, isTouchActive: true }
      );
    } catch (e) {
      console.warn(`No se pudo activar herramienta ${nombre}:`, e);
    }
  }, []);

  const resetearVista = useCallback(() => {
    if (!elRef.current || !habilitadoRef.current) return;
    try {
      (cornerstone as any).reset(elRef.current);
    } catch (_) {}
  }, []);

  return (
    <div style={{ display:'flex', flexDirection:'column',
                  height: altura, background:'#000', borderRadius: '12px', overflow: 'hidden' }}>

      {/* Toolbar */}
      {mostrarTools && (
        <div style={{
          display:'flex', gap:4, padding:'8px 12px',
          background:'#111', borderBottom:'1px solid #222',
          overflowX:'auto', flexShrink:0, scrollbarWidth:'none',
        }}>
          {HERRAMIENTAS.map(({ nombre, icono, label }) => (
            <button key={nombre}
                    onClick={() => activarHerramienta(nombre)}
                    title={label}
                    disabled={cargando}
                    style={{
                      padding: mobile ? '8px 14px' : '6px 10px',
                      borderRadius:8, border:'none',
                      background: activo === nombre
                        ? '#0E7490' : 'rgba(255,255,255,0.08)',
                      color: cargando
                        ? 'rgba(255,255,255,0.3)' : '#fff',
                      fontSize: mobile ? 18 : 13,
                      cursor: cargando ? 'not-allowed' : 'pointer',
                      flexShrink:0,
                      transition: 'all 0.15s',
                    }}>
              {icono}{!mobile && ` ${label}`}
            </button>
          ))}

          <button onClick={() => activarHerramienta('Invert')}
                  disabled={cargando}
                  style={{
                    padding: mobile ? '8px 14px' : '6px 10px',
                    borderRadius:8, border:'none',
                    background:'rgba(255,255,255,0.08)',
                    color: cargando ? 'rgba(255,255,255,0.3)' : '#fff',
                    fontSize: mobile ? 18 : 13,
                    cursor: cargando ? 'not-allowed' : 'pointer',
                    flexShrink:0,
                  }}>
            ◑{!mobile && ' Invertir'}
          </button>

          <button onClick={() => activarHerramienta('Rotate')}
                  disabled={cargando}
                  style={{
                    padding: mobile ? '8px 14px' : '6px 10px',
                    borderRadius:8, border:'none',
                    background:'rgba(255,255,255,0.08)',
                    color: cargando ? 'rgba(255,255,255,0.3)' : '#fff',
                    fontSize: mobile ? 18 : 13,
                    cursor: cargando ? 'not-allowed' : 'pointer',
                    flexShrink:0,
                  }}>
            ↻{!mobile && ' Rotar'}
          </button>

          <button onClick={resetearVista}
                  disabled={cargando}
                  style={{
                    marginLeft:'auto',
                    padding: mobile ? '8px 14px' : '6px 10px',
                    borderRadius:8, border:'none',
                    background:'rgba(255,255,255,0.06)',
                    color: cargando
                      ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.5)',
                    fontSize: mobile ? 18 : 13,
                    cursor: cargando ? 'not-allowed' : 'pointer',
                    flexShrink:0,
                  }}>
            ↺{!mobile && ' Resetear'}
          </button>
        </div>
      )}

      {/* Canvas */}
      <div style={{ flex:1, position:'relative' }}>
        {cargando && (
          <div style={{
            position:'absolute', inset:0, zIndex:10,
            display:'flex', flexDirection:'column',
            alignItems:'center', justifyContent:'center',
            background:'#000', gap:16,
          }}>
            <svg width="40" height="40" viewBox="0 0 40 40"
                 style={{ animation:'spin 1s linear infinite' }}>
              <circle cx="20" cy="20" r="16" stroke="#0E7490"
                strokeWidth="3" strokeDasharray="60 30"
                strokeLinecap="round" fill="none"/>
            </svg>
            <p style={{ color:'#555', fontSize:13, margin:0 }}>
              Cargando imagen DICOM...
            </p>
            <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
          </div>
        )}

        {error && !cargando && (
          <div style={{
            position:'absolute', inset:0, zIndex:10,
            display:'flex', flexDirection:'column',
            alignItems:'center', justifyContent:'center',
            background:'#000', gap:8,
          }}>
            <p style={{ color:'#EF4444', fontSize:14, margin:0 }}>
              {error}
            </p>
            <p style={{ color:'#555', fontSize:12, margin:0 }}>
              Verifica que el archivo sea un DICOM válido (.dcm)
            </p>
          </div>
        )}

        {/* Elemento Cornerstone — siempre presente en el DOM */}
        <div
          ref={elRef}
          style={{ width:'100%', height:'100%' }}
          onContextMenu={e => e.preventDefault()}
          onMouseMove={e  => { if (cargando) e.stopPropagation(); }}
          onMouseDown={e  => { if (cargando) e.stopPropagation(); }}
          onTouchStart={e => { if (cargando) e.stopPropagation(); }}
        />

        {/* Overlay metadata */}
        {metadata && !cargando && (
          <>
            <div style={{
              position:'absolute', top:8, left:10,
              color:'#0E7490', fontSize:11,
              fontFamily:'monospace', pointerEvents:'none',
              lineHeight:1.6, textShadow:'0 1px 3px #000',
            }}>
              {metadata.paciente && <p style={{margin:0}}>{metadata.paciente}</p>}
              {metadata.estudio  && <p style={{margin:0}}>{metadata.estudio}</p>}
              {metadata.fecha    && <p style={{margin:0}}>{metadata.fecha}</p>}
            </div>
            <div style={{
              position:'absolute', bottom:8, right:10,
              color:'rgba(255,255,255,0.25)', fontSize:10,
              fontFamily:'monospace', pointerEvents:'none',
            }}>
              {metadata.modalidad && <p style={{margin:0}}>{metadata.modalidad}</p>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
