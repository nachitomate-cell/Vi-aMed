import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { formatearRutInput } from '../../utils/rut';

export const Omnibox: React.FC = () => {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (q.trim().length < 3) {
      setResults([]);
      setLoading(false);
      return;
    }

    const fetchResults = async () => {
      setLoading(true);
      try {
        const val = q.trim();
        const upperVal = val.toUpperCase();
        const lowerVal = val.toLowerCase();
        const capVal = val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();
        
        // Buscar por RUT o nombre
        const byRut = getDocs(query(collection(db, 'pacientes'), where('rut', '>=', upperVal), where('rut', '<=', upperVal + '\uf8ff'), limit(4)));
        const byNameLower = getDocs(query(collection(db, 'pacientes'), where('nombreLower', '>=', lowerVal), where('nombreLower', '<=', lowerVal + '\uf8ff'), limit(4)));
        const byNameCap = getDocs(query(collection(db, 'pacientes'), where('nombre', '>=', capVal), where('nombre', '<=', capVal + '\uf8ff'), limit(4)));
        const byNombresCap = getDocs(query(collection(db, 'pacientes'), where('nombres', '>=', capVal), where('nombres', '<=', capVal + '\uf8ff'), limit(4)));
        
        const snaps = await Promise.all([byRut, byNameLower, byNameCap, byNombresCap]);
        
        const combined = new Map();
        snaps.forEach(snap => {
          snap.docs.forEach(d => {
            const data = d.data();
            const patientName = data.nombre || data.nombres || data.name || 'Desconocido';
            combined.set(d.id, { id: d.id, ...data, nombres: patientName });
          });
        });
        
        setResults(Array.from(combined.values()).slice(0, 5));
      } catch (err) {
        console.error("Omnibox search error", err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchResults, 350);
    return () => clearTimeout(timer);
  }, [q]);

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%', maxWidth: '360px', zIndex: 50 }}>
      <div style={{ position: 'relative' }}>
        <svg 
          style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', width: 16, height: 16 }}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={q}
          onChange={e => {
            let val = e.target.value;
            if (/^[0-9kK.-]+$/.test(val)) val = formatearRutInput(val);
            setQ(val);
            setOpen(true);
          }}
          onFocus={() => { if (q.trim().length >= 3) setOpen(true); }}
          placeholder="Buscar pacientes por RUT o nombre..."
          style={{
            width: '100%',
            background: 'var(--surface-page)',
            border: '1px solid var(--surface-card-border)',
            borderRadius: 20,
            padding: '8px 12px 8px 36px',
            fontSize: 13,
            color: 'var(--text-primary)',
            outline: 'none',
            transition: 'border-color 0.2s'
          }}
        />
      </div>

      {open && (q.trim().length >= 3) && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0,
          background: 'var(--surface-card)', border: '1px solid var(--surface-card-border)',
          borderRadius: 12, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          {loading ? (
            <div style={{ padding: '16px', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>Buscando en clínica...</div>
          ) : results.length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>No se encontraron pacientes</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '10px 16px', background: 'var(--surface-page)', borderBottom: '1px solid var(--surface-card-border)', fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Pacientes encontrados
              </div>
              {results.map(p => (
                <button
                  key={p.id}
                  onClick={() => {
                    setOpen(false);
                    setQ('');
                    navigate(`/pacientes/${p.rut}`);
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                    borderBottom: '1px solid var(--surface-card-border)',
                    background: 'transparent', textAlign: 'left', cursor: 'pointer',
                    width: '100%', border: 'none'
                  }}
                  onMouseOver={e => (e.currentTarget.style.background = 'var(--surface-page)')}
                  onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--color-primary-light)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                    {p.nombres?.[0] || '?'}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.nombres} {p.apellidoPaterno ? p.apellidoPaterno : ''} {p.apellidoMaterno ? p.apellidoMaterno : ''}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '2px 0 0' }}>RUT: {p.rut}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
