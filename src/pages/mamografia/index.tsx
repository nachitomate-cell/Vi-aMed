import { useState, useEffect }           from 'react';
import SubirMamografia                   from '../../components/mamografia/SubirMamografia';
import DicomViewer                       from '../../components/shared/DicomViewer';
import { escucharMamografiasHoy,
         autorizarVisibilidad }          from '../../services/mamografiaService';
import { useAuth }                       from '../../hooks/useAuth';

export default function MamografiaPage() {
  const { user }        = useAuth();
  const [lista,  setLista]  = useState<any[]>([]);
  const [activa, setActiva] = useState<any>(null);
  const [tab,    setTab]    = useState<'lista' | 'subir'>('lista');

  useEffect(() => {
    const unsub = escucharMamografiasHoy(setLista);
    return () => unsub();
  }, []);

  return (
    <div style={{
      display:'flex', height:'calc(100vh - 56px)',
      background:'#000', overflow:'hidden',
    }}>

      {/* Panel izquierdo — lista + subida */}
      <div style={{
        width:340, flexShrink:0,
        background:'var(--surface-card)',
        borderRight:'0.5px solid var(--surface-card-border)',
        display:'flex', flexDirection:'column', overflow:'hidden',
      }}>
        {/* Header + tabs */}
        <div style={{
          padding:'16px 20px 0',
          borderBottom:'0.5px solid var(--surface-card-border)',
        }}>
          <p style={{ fontSize:16, fontWeight:500,
                      color:'var(--text-primary)', marginBottom:12 }}>
            Mamografías
          </p>
          <div style={{ display:'flex' }}>
            {[
              { key:'lista', label:'Estudios de hoy' },
              { key:'subir', label:'Subir nuevo'     },
            ].map(({ key, label }) => (
              <button key={key} onClick={() => setTab(key as any)} style={{
                flex:1, padding:'8px 0', fontSize:13,
                fontWeight: tab === key ? 500 : 400,
                color: tab === key
                  ? '#0E7490' : 'var(--text-secondary)',
                background:'none', border:'none',
                borderBottom: tab === key
                  ? '2px solid #0E7490' : '2px solid transparent',
                cursor:'pointer',
                transition: 'all 0.15s',
              }}>{label}</button>
            ))}
          </div>
        </div>

        {/* Contenido del panel */}
        <div style={{ flex:1, overflowY:'auto', padding:16 }}>
          {tab === 'subir' ? (
            <SubirMamografia onSubida={() => setTab('lista')}/>
          ) : lista.length === 0 ? (
            <div style={{ textAlign:'center', padding:40 }}>
              <p style={{ fontSize:13,
                          color:'var(--text-muted)' }}>
                No hay mamografías subidas hoy
              </p>
            </div>
          ) : lista.map(img => (
            <div key={img.id} onClick={() => setActiva(img)} style={{
              padding:'12px 14px', borderRadius:10, marginBottom:8,
              border: activa?.id === img.id
                ? '1.5px solid #0E7490'
                : '0.5px solid var(--surface-card-border)',
              background: activa?.id === img.id
                ? 'rgba(14,116,144,0.06)'
                : 'var(--surface-card)',
              cursor:'pointer',
              transition: 'all 0.15s',
            }}>
              <div style={{ display:'flex', justifyContent:'space-between',
                            alignItems:'flex-start' }}>
                <div>
                  <p style={{ fontSize:14, fontWeight:500,
                              color:'var(--text-primary)',
                              margin:'0 0 2px' }}>
                    {img.pacienteNombre}
                  </p>
                  <p style={{ fontSize:12,
                              color:'var(--text-secondary)',
                              margin:'0 0 2px' }}>
                    {img.pacienteRut}
                  </p>
                  <p style={{ fontSize:11,
                              color:'var(--text-muted)', margin:0 }}>
                    Mamografía {img.lado}
                    {img.medicoSolicitante
                      ? ` · ${img.medicoSolicitante}` : ''}
                  </p>
                </div>
                <div style={{ display:'flex', flexDirection:'column',
                              alignItems:'flex-end', gap:4 }}>
                  <span style={{
                    fontSize:10, padding:'2px 8px', borderRadius:20,
                    background: img.visiblePaciente
                      ? 'rgba(16,185,129,0.1)'
                      : 'rgba(107,114,128,0.1)',
                    color: img.visiblePaciente
                      ? '#10B981'
                      : 'var(--text-muted)',
                  }}>
                    {img.visiblePaciente ? 'Visible' : 'Interno'}
                  </span>
                  {!img.visiblePaciente && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        autorizarVisibilidad(img.id, user?.uid || '');
                      }}
                      style={{
                        fontSize:10, padding:'2px 8px', borderRadius:20,
                        border:'0.5px solid #0E7490', background:'none',
                        color:'#0E7490', cursor:'pointer',
                        transition: 'all 0.15s',
                      }}>
                      Autorizar →
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Panel derecho — visor */}
      <div style={{ flex:1, overflow:'hidden' }}>
        {activa ? (
          <DicomViewer
            url={activa.storageUrl}
            altura={window.innerHeight - 56}
            mobile={false}
            mostrarTools={true}
          />
        ) : (
          <div style={{
            height:'100%', display:'flex',
            flexDirection:'column',
            alignItems:'center', justifyContent:'center', gap:12,
          }}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect x="8" y="4" width="32" height="40" rx="4"
                stroke="#333" strokeWidth="2"/>
              <path d="M16 16h16M16 24h12M16 32h8"
                stroke="#333" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <p style={{ color:'#555', fontSize:14, margin:0 }}>
              Selecciona una mamografía para visualizarla
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
