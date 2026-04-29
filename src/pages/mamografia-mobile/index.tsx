import { useState, useEffect } from 'react';
import DicomViewer             from '../../components/shared/DicomViewer';
import { escucharMamografiasHoy } from '../../services/mamografiaService';

export default function MamografiaMobilePage() {
  const [lista,        setLista]        = useState<any[]>([]);
  const [activa,       setActiva]       = useState<any>(null);
  const [busqueda,     setBusqueda]     = useState('');
  const [visorAbierto, setVisorAbierto] = useState(false);

  useEffect(() => {
    const unsub = escucharMamografiasHoy(setLista);
    return () => unsub();
  }, []);

  const filtradas = lista.filter(img =>
    img.pacienteNombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    img.pacienteRut.includes(busqueda)
  );

  // Visor a pantalla completa
  if (visorAbierto && activa) {
    return (
      <div style={{
        position:'fixed', inset:0, background:'#000', zIndex:100,
      }}>
        {/* Header */}
        <div style={{
          display:'flex', alignItems:'center', gap:12,
          padding:'12px 16px',
          paddingTop:'calc(12px + env(safe-area-inset-top))',
          background:'rgba(0,0,0,0.85)',
          borderBottom:'1px solid #222',
        }}>
          <button onClick={() => setVisorAbierto(false)} style={{
            background:'none', border:'none', color:'#fff',
            fontSize:24, cursor:'pointer', padding:0, lineHeight:1,
          }}>←</button>
          <div style={{ flex:1 }}>
            <p style={{ fontSize:14, fontWeight:500,
                        color:'#fff', margin:0 }}>
              {activa.pacienteNombre}
            </p>
            <p style={{ fontSize:11,
                        color:'rgba(255,255,255,0.5)', margin:0 }}>
              Mamografía {activa.lado} · {activa.pacienteRut}
            </p>
          </div>
        </div>

        <DicomViewer
          url={activa.storageUrl}
          altura={window.innerHeight - 60}
          mobile={true}
          mostrarTools={true}
        />

        <div style={{ height:'env(safe-area-inset-bottom)',
                      background:'#000' }}/>
      </div>
    );
  }

  // Lista de estudios del día
  return (
    <div style={{
      background:'var(--surface-page)',
      minHeight:'100svh',
      paddingTop:'env(safe-area-inset-top)',
    }}>
      {/* Header */}
      <div style={{
        background:'var(--surface-card)',
        borderBottom:'0.5px solid var(--surface-card-border)',
        padding:'16px 16px 0',
      }}>
        <p style={{ fontSize:18, fontWeight:500,
                    color:'var(--text-primary)', marginBottom:4 }}>
          Mamografías de hoy
        </p>
        <p style={{ fontSize:12, color:'var(--text-muted)',
                    marginBottom:12 }}>
          {filtradas.length} estudio{filtradas.length !== 1 ? 's' : ''}
        </p>
        <div style={{ position:'relative', marginBottom:12 }}>
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o RUT..."
            style={{
              width:'100%', padding:'10px 14px 10px 36px',
              borderRadius:10,
              border:'0.5px solid var(--surface-card-border)',
              background:'var(--surface-page)',
              fontSize:14, color:'var(--text-primary)',
              outline:'none', boxSizing:'border-box',
            }}
          />
          <span style={{
            position:'absolute', left:12, top:'50%',
            transform:'translateY(-50%)',
            color:'var(--text-muted)', fontSize:14,
          }}>⌕</span>
        </div>
      </div>

      {/* Lista */}
      <div style={{ padding:16 }}>
        {filtradas.length === 0 ? (
          <div style={{ textAlign:'center', padding:48 }}>
            <p style={{ fontSize:14,
                        color:'var(--text-muted)' }}>
              {busqueda
                ? 'Sin resultados para tu búsqueda'
                : 'No hay mamografías subidas hoy'}
            </p>
          </div>
        ) : filtradas.map(img => (
          <div key={img.id}
               onClick={() => { setActiva(img); setVisorAbierto(true); }}
               style={{
                 background:'var(--surface-card)',
                 border:'0.5px solid var(--surface-card-border)',
                 borderRadius:14, padding:16, marginBottom:10,
                 cursor:'pointer', display:'flex',
                 alignItems:'center', gap:12,
                 transition: 'all 0.15s',
               }}>
            {/* Ícono */}
            <div style={{
              width:52, height:52, borderRadius:10,
              background:'#111', flexShrink:0,
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="18" height="18" rx="2"
                  stroke="#0E7490" strokeWidth="1.5"/>
                <circle cx="12" cy="12" r="4"
                  stroke="#0E7490" strokeWidth="1.5"/>
              </svg>
            </div>

            <div style={{ flex:1 }}>
              <p style={{ fontSize:15, fontWeight:500,
                          color:'var(--text-primary)',
                          margin:'0 0 3px' }}>
                {img.pacienteNombre}
              </p>
              <p style={{ fontSize:12,
                          color:'var(--text-secondary)',
                          margin:'0 0 3px' }}>
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
                          alignItems:'flex-end', gap:6 }}>
              <span style={{
                fontSize:10, padding:'3px 8px', borderRadius:20,
                background: img.visiblePaciente
                  ? 'rgba(16,185,129,0.1)'
                  : 'rgba(107,114,128,0.1)',
                color: img.visiblePaciente
                  ? '#10B981'
                  : 'var(--text-muted)',
              }}>
                {img.visiblePaciente ? 'Visible' : 'Interno'}
              </span>
              <span style={{ fontSize:18,
                             color:'var(--text-muted)' }}>›</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ height:'env(safe-area-inset-bottom)' }}/>
    </div>
  );
}
