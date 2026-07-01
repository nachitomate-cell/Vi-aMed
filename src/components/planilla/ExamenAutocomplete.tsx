import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { PrestacionTarifa } from '../../services/prestacionesService';

// Normaliza para buscar sin distinguir acentos ni mayúsculas.
const norm = (s: string) =>
  s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

const fmt = (n: number) => '$' + n.toLocaleString('es-CL');

interface Props {
  value: string;
  prestaciones: PrestacionTarifa[];
  vinculado?: boolean;
  onType: (texto: string) => void;
  onSelect: (p: PrestacionTarifa) => void;
}

const ExamenAutocomplete: React.FC<Props> = ({ value, prestaciones, vinculado, onType, onSelect }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);

  // Filtra prestaciones por nombre o código.
  const resultados = useMemo(() => {
    const q = norm(value.trim());
    const base = !q
      ? prestaciones
      : prestaciones.filter(p => norm(p.nombre).includes(q) || norm(p.codigo).includes(q));
    return base.slice(0, 60);
  }, [value, prestaciones]);

  // Posiciona el dropdown (fixed) bajo el input; se recalcula al hacer scroll.
  const actualizarPos = () => {
    const el = inputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setRect({ top: r.bottom, left: r.left, width: Math.max(r.width, 320) });
  };

  useLayoutEffect(() => {
    if (!abierto) return;
    actualizarPos();
    const handler = () => actualizarPos();
    window.addEventListener('scroll', handler, true);
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('scroll', handler, true);
      window.removeEventListener('resize', handler);
    };
  }, [abierto]);

  useEffect(() => { setActivo(0); }, [value, abierto]);

  const elegir = (p: PrestacionTarifa) => {
    onSelect(p);
    setAbierto(false);
    inputRef.current?.blur();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!abierto && (e.key === 'ArrowDown' || e.key === 'Enter')) { setAbierto(true); return; }
    if (!abierto) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActivo(a => Math.min(a + 1, resultados.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActivo(a => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (resultados[activo]) elegir(resultados[activo]); }
    else if (e.key === 'Escape') { setAbierto(false); }
  };

  // Precio de referencia para mostrar en la lista (primer valor de previsión).
  const precioRef = (p: PrestacionTarifa) => {
    const vp = p.valoresPrevision?.[0];
    return vp ? (vp.copago > 0 ? vp.copago : vp.valor) : 0;
  };

  return (
    <>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          ref={inputRef}
          value={value}
          onChange={e => { onType(e.target.value); if (!abierto) setAbierto(true); }}
          onFocus={() => setAbierto(true)}
          onBlur={() => setTimeout(() => setAbierto(false), 150)}
          onKeyDown={onKeyDown}
          placeholder="Buscar examen…"
          title={vinculado ? 'Examen registrado — precios automáticos' : 'Escribe para buscar o registra texto libre'}
          style={{ fontWeight: vinculado ? 600 : 400, paddingRight: 28 }}
        />
        {value.trim() && (
          <span
            title={vinculado
              ? 'Vinculado a una prestación registrada (su plantilla se reconoce en el Box).'
              : 'Examen libre (sin vincular). Elígelo del listado para que se reconozca su plantilla.'}
            style={{
              position: 'absolute', right: 16, width: 7, height: 7, borderRadius: '50%',
              background: vinculado ? '#16A34A' : '#F59E0B', pointerEvents: 'none',
              boxShadow: '0 0 0 1.5px #fff',
            }}
          />
        )}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#9aa" strokeWidth="3"
          style={{ position: 'absolute', right: 4, pointerEvents: 'none' }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
        </svg>
      </div>

      {abierto && rect && createPortal(
        <div
          style={{
            position: 'fixed', top: rect.top, left: rect.left, width: rect.width,
            maxHeight: 320, overflowY: 'auto', background: 'var(--surface-card)', zIndex: 9999,
            border: '1px solid var(--surface-card-border)', borderRadius: 6,
            boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
          }}
          // evita que el blur del input cierre antes del click
          onMouseDown={e => e.preventDefault()}
        >
          {resultados.length === 0 ? (
            <div style={{ padding: '14px 12px', fontSize: 12, color: 'var(--text-muted)' }}>
              Sin coincidencias. Se guardará como examen libre.
            </div>
          ) : (
            resultados.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => elegir(p)}
                onMouseEnter={() => setActivo(i)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                  width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
                  padding: '8px 12px', borderBottom: '1px solid var(--surface-card-border)',
                  background: i === activo ? 'var(--color-primary-light)' : 'transparent',
                }}
              >
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.nombre}
                  </span>
                  <span style={{ display: 'block', fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                    {p.codigo || '—'}{p.especialidad ? ` · ${p.especialidad}` : ''}
                  </span>
                </span>
                {precioRef(p) > 0 && (
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#1F7246', whiteSpace: 'nowrap' }}>
                    {fmt(precioRef(p))}
                  </span>
                )}
              </button>
            ))
          )}
        </div>,
        document.body,
      )}
    </>
  );
};

export default ExamenAutocomplete;
