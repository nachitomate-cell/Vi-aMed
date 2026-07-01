import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Timestamp } from 'firebase/firestore';
import { suscribirJornadasDeFecha, actualizarEstadoFila } from '../../services/planillaService';
import {
  ESTADOS_PLANILLA, ESTADO_PLANILLA_COLOR, PROFESIONALES_PLANILLA,
} from '../../types/planilla';
import type { EstadoPlanilla, FilaPlanilla } from '../../types/planilla';
import ModalOrdenPago from '../recepcion/ModalOrdenPago';

/** ¿La previsión corresponde a atención particular? */
const esParticular = (prevision: string) => (prevision ?? '').toLowerCase().includes('particular');

/**
 * Agenda del día en el dashboard. Lee — en vivo — todos los pacientes
 * agendados para hoy en la Planilla Diaria (todas las jornadas) y permite
 * cambiar su estado: En atención, Finalizado, Reagendado o No asistió / Canceló.
 *
 * La planilla es la fuente de verdad: cambiar el estado aquí lo guarda
 * directamente en la jornada correspondiente.
 */

function hoyISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface AgendaItem {
  fecha: string;
  iniciales: string;
  filaId: string;
  hora: string;
  paciente: string;
  rut: string;
  examen: string;
  prevision: string;
  estado: EstadoPlanilla;
  fila: FilaPlanilla;
}

const nombreProf = (iniciales: string) =>
  PROFESIONALES_PLANILLA.find(p => p.iniciales === iniciales)?.nombre ?? iniciales;

// ── Selector de estado inline ─────────────────────────────────────────────────
const SelectorEstado: React.FC<{
  value: EstadoPlanilla;
  onChange: (e: EstadoPlanilla) => void;
}> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const c = ESTADO_PLANILLA_COLOR[value];

  useEffect(() => {
    if (!open) return;
    const cerrar = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    window.addEventListener('mousedown', cerrar);
    return () => window.removeEventListener('mousedown', cerrar);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 7,
          background: c.bg, color: c.text, border: 'none', borderRadius: 8,
          padding: '6px 11px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
        {value}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 50,
          background: '#fff', border: '0.5px solid var(--surface-card-border)',
          borderRadius: 10, boxShadow: '0 12px 32px rgba(0,0,0,0.16)', padding: 5, minWidth: 190,
        }}>
          {ESTADOS_PLANILLA.map(est => {
            const ec = ESTADO_PLANILLA_COLOR[est];
            return (
              <button key={est}
                onClick={() => { onChange(est); setOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 9, width: '100%', textAlign: 'left',
                  background: value === est ? ec.bg : 'transparent', color: value === est ? ec.text : '#475569',
                  border: 'none', borderRadius: 7, padding: '8px 10px', fontSize: 12.5,
                  fontWeight: 600, cursor: 'pointer', marginBottom: 2,
                }}
                onMouseOver={e => { if (value !== est) (e.currentTarget as HTMLButtonElement).style.background = '#F8FAFC'; }}
                onMouseOut={e => { if (value !== est) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: ec.dot, flexShrink: 0 }} />
                {est}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const AgendaDelDia: React.FC = () => {
  const hoy = useMemo(hoyISO, []);
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<EstadoPlanilla | 'Todos'>('Todos');
  const [bonoItem, setBonoItem] = useState<AgendaItem | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsub = suscribirJornadasDeFecha(hoy, jornadas => {
      const list: AgendaItem[] = [];
      jornadas.forEach(j => {
        j.filas.forEach(f => {
          if (f.paciente?.trim()) {
            list.push({
              fecha: j.fecha,
              iniciales: j.profesionalIniciales,
              filaId: f.id,
              hora: f.hora ?? '',
              paciente: f.paciente.trim(),
              rut: f.rut ?? '',
              examen: f.examen ?? '',
              prevision: f.prevision ?? '',
              estado: (f.estado as EstadoPlanilla) ?? 'Agendado',
              fila: f,
            });
          }
        });
      });
      list.sort((a, b) => a.hora.localeCompare(b.hora) || a.paciente.localeCompare(b.paciente));
      setItems(list);
      setLoading(false);
    });
    return () => unsub();
  }, [hoy]);

  const cambiarEstado = (item: AgendaItem, nuevo: EstadoPlanilla) => {
    // Optimista: refleja el cambio de inmediato (el snapshot luego confirma).
    setItems(prev => prev.map(i =>
      i.filaId === item.filaId && i.iniciales === item.iniciales ? { ...i, estado: nuevo } : i,
    ));
    actualizarEstadoFila(item.fecha, item.iniciales, item.filaId, nuevo).catch(console.error);
  };

  const conteo = useMemo(() => {
    const acc: Record<string, number> = {};
    items.forEach(i => { acc[i.estado] = (acc[i.estado] ?? 0) + 1; });
    return acc;
  }, [items]);

  const visibles = filtro === 'Todos' ? items : items.filter(i => i.estado === filtro);

  return (
    <div style={{
      background: 'var(--surface-card)',
      border: '0.5px solid var(--surface-card-border)',
      borderRadius: 12,
      padding: '20px 24px',
      marginBottom: 24,
    }}>
      {/* Encabezado */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 }}>
            Agenda del día — Pacientes agendados
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '3px 0 0' }}>
            Desde la Planilla Diaria · {items.length} paciente(s) hoy
          </p>
        </div>
      </div>

      {/* Filtros por estado */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        <button
          onClick={() => setFiltro('Todos')}
          style={{
            fontSize: 11.5, fontWeight: 600, padding: '5px 11px', borderRadius: 999, cursor: 'pointer',
            border: '0.5px solid', borderColor: filtro === 'Todos' ? '#0F172A' : 'var(--surface-card-border)',
            background: filtro === 'Todos' ? '#0F172A' : '#fff', color: filtro === 'Todos' ? '#fff' : 'var(--text-secondary)',
          }}
        >
          Todos ({items.length})
        </button>
        {ESTADOS_PLANILLA.map(est => {
          const n = conteo[est] ?? 0;
          if (n === 0 && filtro !== est) return null;
          const c = ESTADO_PLANILLA_COLOR[est];
          const activo = filtro === est;
          return (
            <button key={est}
              onClick={() => setFiltro(activo ? 'Todos' : est)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 11.5, fontWeight: 600, padding: '5px 11px', borderRadius: 999, cursor: 'pointer',
                border: '0.5px solid', borderColor: activo ? c.dot : 'var(--surface-card-border)',
                background: activo ? c.bg : '#fff', color: activo ? c.text : 'var(--text-secondary)',
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: c.dot }} />
              {est} ({n})
            </button>
          );
        })}
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ padding: '28px', textAlign: 'center' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #f1f5f9', borderTopColor: 'var(--color-primary)', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>Cargando agenda…</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : items.length === 0 ? (
        <div style={{ padding: '28px', textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
            No hay pacientes agendados para hoy en la planilla.
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Agéndalos en la Planilla Diaria y aparecerán aquí automáticamente.
          </p>
        </div>
      ) : visibles.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center', padding: '20px 0', margin: 0 }}>
          Sin pacientes en el estado seleccionado.
        </p>
      ) : (
        <div style={{ border: '0.5px solid var(--surface-card-border)', borderRadius: 10, overflow: 'hidden' }}>
          {visibles.map((item, i) => (
            <div key={`${item.iniciales}:${item.filaId}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px',
                borderBottom: i < visibles.length - 1 ? '0.5px solid var(--surface-card-border)' : 'none',
                background: item.estado === 'No asistió / Canceló' ? '#FEF2F2' : item.estado === 'Finalizado' ? '#F6FEFB' : '#fff',
              }}
            >
              {/* Hora */}
              <div style={{ width: 52, flexShrink: 0, textAlign: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{item.hora || '—'}</span>
              </div>
              {/* Paciente */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.paciente}
                </p>
                <p style={{ fontSize: 11.5, color: 'var(--text-secondary)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {[item.examen, item.rut, item.prevision].filter(Boolean).join(' · ') || 'Sin detalle'}
                </p>
              </div>
              {/* Profesional */}
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', background: '#F1F5F9', padding: '3px 8px', borderRadius: 8, flexShrink: 0, whiteSpace: 'nowrap' }}>
                {nombreProf(item.iniciales)}
              </span>
              {/* Imprimir bono (orden de pago) — solo pacientes particulares */}
              {esParticular(item.prevision) && (
                <button
                  onClick={() => setBonoItem(item)}
                  title="Imprimir bono / orden de pago (paciente particular)"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
                    fontSize: 12, fontWeight: 600, color: 'var(--color-primary)',
                    background: 'rgba(14,116,144,0.08)', border: '0.5px solid rgba(14,116,144,0.25)',
                    borderRadius: 8, padding: '6px 10px', cursor: 'pointer', whiteSpace: 'nowrap',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Bono
                </button>
              )}
              {/* Estado */}
              <div style={{ flexShrink: 0 }}>
                <SelectorEstado value={item.estado} onChange={nuevo => cambiarEstado(item, nuevo)} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de orden de pago / bono (solo particulares) */}
      {bonoItem && (
        <ModalOrdenPago
          datos={{
            id: `planilla_${bonoItem.fecha}_${bonoItem.filaId}`,
            pacienteNombre: bonoItem.fila.paciente,
            pacienteRut: bonoItem.fila.rut,
            fecha: Timestamp.fromDate(new Date(`${bonoItem.fecha}T00:00:00`)),
            metodoPago: bonoItem.fila.modoPago,
            prevision: bonoItem.fila.prevision,
            pacienteFechaNacimiento: bonoItem.fila.fechaNac,
            pacienteTelefono: bonoItem.fila.fono,
            pacienteCorreo: bonoItem.fila.correo,
            tipoAtencion: 'Ambulatoria',
            prestaciones: [{
              codigo: bonoItem.fila.codigo,
              descripcion: bonoItem.fila.examen,
              valor: bonoItem.fila.montoCancelar,
              exento: bonoItem.fila.montoCancelar,
              afecto: 0,
              iva: 0,
            }],
          }}
          onCerrar={() => setBonoItem(null)}
        />
      )}
    </div>
  );
};

export default AgendaDelDia;
