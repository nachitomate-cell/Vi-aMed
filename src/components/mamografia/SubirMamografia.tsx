import React, { useState }         from 'react';
import { subirMamografia }  from '../../services/mamografiaService';
import { useAuth }          from '../../hooks/useAuth';

const LADOS = ['Bilateral', 'Derecho', 'Izquierdo'];

interface Props {
  onSubida?: (res: any) => void;
}

export default function SubirMamografia({ onSubida }: Props) {
  const { user }                          = useAuth();
  const [archivo,    setArchivo]          = useState<File | null>(null);
  const [rut,        setRut]             = useState('');
  const [nombre,     setNombre]          = useState('');
  const [lado,       setLado]            = useState('Bilateral');
  const [medico,     setMedico]          = useState('');
  const [progreso,   setProgreso]        = useState(0);
  const [subiendo,   setSubiendo]        = useState(false);
  const [error,      setError]           = useState('');

  function handleArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.name.match(/\.(dcm|dicom)$/i)) {
      setError('Solo se aceptan archivos .dcm o .dicom'); return;
    }
    setArchivo(f);
    setError('');
  }

  async function handleSubir() {
    if (!archivo || !rut || !nombre) return;
    setSubiendo(true);
    setError('');
    try {
      const res = await subirMamografia(
        archivo,
        { pacienteRut: rut, pacienteNombre: nombre,
          lado: lado.toLowerCase(), medicoSolicitante: medico,
          usuarioId: user?.uid || '' },
        setProgreso
      );
      if (onSubida) onSubida(res);
      setArchivo(null); setRut('');
      setNombre(''); setMedico('');
      setProgreso(0);
    } catch (e: any) {
      setError(e.message || 'Error al subir. Intenta de nuevo.');
    } finally {
      setSubiendo(false);
    }
  }

  const completo = archivo && rut && nombre;

  return (
    <div style={{
      background:'var(--surface-card)',
      border:'0.5px solid var(--surface-card-border)',
      borderRadius:12, padding:'20px 24px',
    }}>
      <p style={{ fontSize:15, fontWeight:500,
                  color:'var(--text-primary)', marginBottom:16 }}>
        Subir mamografía DICOM
      </p>

      {/* Drop zone */}
      <label style={{
        display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center', gap:8,
        padding:'24px 16px',
        border:`2px dashed ${archivo
          ? 'var(--color-primary)'
          : 'var(--surface-card-border)'}`,
        borderRadius:10, marginBottom:16,
        background: archivo
          ? 'rgba(14,116,144,0.05)'
          : 'var(--surface-page)',
        cursor:'pointer',
        transition: 'all 0.2s',
      }}>
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <path d="M16 4v16M8 12l8-8 8 8" stroke="#0E7490"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M4 24h24" stroke="var(--text-muted)"
                strokeWidth="2" strokeLinecap="round" opacity="0.3"/>
        </svg>
        <p style={{ fontSize:13, color:'var(--text-secondary)',
                    margin:0, textAlign:'center' }}>
          {archivo
            ? `✓ ${archivo.name} (${(archivo.size/1024/1024).toFixed(1)} MB)`
            : 'Arrastra el .dcm aquí o haz clic para seleccionar'}
        </p>
        <input type="file" accept=".dcm,.dicom"
               onChange={handleArchivo} style={{ display:'none' }}/>
      </label>

      {/* Datos */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr',
                    gap:10, marginBottom:10 }}>
        {[
          { label:'RUT del paciente', val:rut,    set:setRut,
            ph:'17.543.210-K', mode:'numeric' },
          { label:'Nombre completo',  val:nombre, set:setNombre,
            ph:'Ana Ramírez',  mode:'text' },
        ].map(({ label, val, set, ph, mode }) => (
          <div key={label}>
            <p style={{ fontSize:11, color:'var(--text-muted)',
                        textTransform:'uppercase', letterSpacing:'.05em',
                        marginBottom:4 }}>{label}</p>
            <input value={val} onChange={e => set(e.target.value)}
                   placeholder={ph} inputMode={mode as any}
                   style={{
                     width:'100%', padding:'10px 12px', borderRadius:8,
                     border:'0.5px solid var(--surface-card-border)',
                     background:'var(--surface-page)',
                     fontSize:14, color:'var(--text-primary)',
                     outline:'none', boxSizing:'border-box',
                   }}/>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr',
                    gap:10, marginBottom:16 }}>
        <div>
          <p style={{ fontSize:11, color:'var(--text-muted)',
                      textTransform:'uppercase', letterSpacing:'.05em',
                      marginBottom:4 }}>Lado</p>
          <select value={lado} onChange={e => setLado(e.target.value)}
                  style={{
                    width:'100%', padding:'10px 12px', borderRadius:8,
                    border:'0.5px solid var(--surface-card-border)',
                    background:'var(--surface-page)',
                    fontSize:14, color:'var(--text-primary)',
                    outline: 'none',
                  }}>
            {LADOS.map(l => <option key={l}>{l}</option>)}
          </select>
        </div>
        <div>
          <p style={{ fontSize:11, color:'var(--text-muted)',
                      textTransform:'uppercase', letterSpacing:'.05em',
                      marginBottom:4 }}>Médico solicitante</p>
          <input value={medico} onChange={e => setMedico(e.target.value)}
                 placeholder="Dr. / Dra." style={{
                   width:'100%', padding:'10px 12px', borderRadius:8,
                   border:'0.5px solid var(--surface-card-border)',
                   background:'var(--surface-page)',
                   fontSize:14, color:'var(--text-primary)',
                   outline:'none', boxSizing:'border-box',
                 }}/>
        </div>
      </div>

      {/* Progreso */}
      {subiendo && (
        <div style={{ marginBottom:12 }}>
          <div style={{ display:'flex', justifyContent:'space-between',
                        fontSize:12, color:'var(--text-secondary)',
                        marginBottom:4 }}>
            <span>Subiendo a Firebase Storage...</span>
            <span>{progreso}%</span>
          </div>
          <div style={{ height:6, borderRadius:3,
                        background:'var(--surface-page)' }}>
            <div style={{
              height:'100%', borderRadius:3, background:'#0E7490',
              width:`${progreso}%`, transition:'width .3s',
            }}/>
          </div>
        </div>
      )}

      {error && (
        <p style={{ fontSize:12, color:'var(--color-danger)',
                    marginBottom:10 }}>{error}</p>
      )}

      <button onClick={handleSubir} disabled={!completo || subiendo}
              style={{
                width:'100%', padding:'12px 0', borderRadius:10,
                border:'none',
                background: completo && !subiendo
                  ? '#0E7490' : 'var(--surface-card-border)',
                color:'#fff', fontSize:14, fontWeight:500,
                cursor: completo && !subiendo ? 'pointer':'not-allowed',
                transition: 'all 0.15s',
              }}>
        {subiendo ? `Subiendo... ${progreso}%` : 'Subir mamografía'}
      </button>
    </div>
  );
}
