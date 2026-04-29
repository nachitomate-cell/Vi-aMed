import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { Cita, EstadoCita } from '../../types/agenda';
import { ESTADO_COLORS, ESTADO_LABELS } from '../../types/agenda';
import { exportarCitasCSV } from '../../services/profesionalesService';
import { DrawerDetalleCita } from './DrawerDetalleCita';
import { LABELS_ECO } from '../../constants/prestacionesEco';

const PAGE_SIZE = 20;

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function formatFila(d: Date): string {
  return `${DIAS[d.getDay()]} ${d.getDate()} ${MESES_CORTO[d.getMonth()]} ${d.getFullYear()} · ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

interface Props {
  profesionalId: string;
}

export const ListaAtenciones: React.FC<Props> = ({ profesionalId }) => {
  const [citasRaw, setCitasRaw] = useState<Cita[]>([]);
  const [cargando, setCargando] = useState(true);
  const [pagina, setPagina] = useState(1);
  const [citaDrawer, setCitaDrawer] = useState<Cita | null>(null);

  const [buscar, setBuscar] = useState('');
  const [filTipo, setFilTipo] = useState('');
  const [filEstado, setFilEstado] = useState('');

  useEffect(() => {
    setCargando(true);
    const q = query(
      collection(db, 'citas'),
      where('profesionalId', '==', profesionalId),
    );
    const unsub = onSnapshot(q, snap => {
      const all = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Cita))
        .sort((a, b) => b.fecha.toDate().getTime() - a.fecha.toDate().getTime());
      setCitasRaw(all);
      setCargando(false);
    }, () => setCargando(false));
    return () => unsub();
  }, [profesionalId]);

  const filtradas = useMemo(() => {
    const lower = buscar.toLowerCase();
    return citasRaw.filter(c => {
      if (buscar && !c.pacienteNombre.toLowerCase().includes(lower) && !c.pacienteRut.includes(buscar)) return false;
      if (filTipo && c.tipoAtencion !== filTipo) return false;
      if (filEstado && c.estado !== filEstado) return false;
      return true;
    });
  }, [citasRaw, buscar, filTipo, filEstado]);

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / PAGE_SIZE));
  const paginaActual = Math.min(pagina, totalPaginas);
  const citasPagina = filtradas.slice((paginaActual - 1) * PAGE_SIZE, paginaActual * PAGE_SIZE);

  const handleBuscar = (v: string) => { setBuscar(v); setPagina(1); };
  const handleTipo = (v: string) => { setFilTipo(v); setPagina(1); };
  const handleEstado = (v: string) => { setFilEstado(v); setPagina(1); };

  return (
    <div className="space-y-4">
      {/* Header del tab: filtros + exportar */}
      <div className="flex flex-wrap gap-2 items-center">
        <input
          type="text"
          placeholder="Buscar paciente..."
          value={buscar}
          onChange={e => handleBuscar(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:border-[#0E7490] w-44"
        />
        <select
          value={filTipo}
          onChange={e => handleTipo(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-[#0E7490] appearance-none"
        >
          <option value="">Tipo de atención ▾</option>
          {LABELS_ECO.map(label => <option key={label} value={label}>{label}</option>)}
        </select>
        <select
          value={filEstado}
          onChange={e => handleEstado(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-[#0E7490] appearance-none"
        >
          <option value="">Estado ▾</option>
          <option value="solicitada">Solicitada</option>
          <option value="confirmada">Confirmada</option>
          <option value="realizada">Realizada</option>
          <option value="cancelada">Cancelada</option>
          <option value="no_asistio">No asistió</option>
        </select>
        <div className="flex-1" />
        <button
          onClick={() => exportarCitasCSV(filtradas, `atenciones-${profesionalId}.csv`)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 rounded-lg transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          </svg>
          Exportar CSV
        </button>
      </div>

      {/* Lista */}
      {cargando ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-slate-800/50 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : citasPagina.length === 0 ? (
        <div className="py-16 text-center text-slate-500 text-sm">
          No hay atenciones que coincidan con los filtros.
        </div>
      ) : (
        <div className="space-y-2">
          {citasPagina.map(cita => {
            const d = cita.fecha.toDate();
            return (
              <div
                key={cita.id}
                className="bg-slate-800/30 border border-slate-800 hover:border-slate-700 rounded-xl px-4 py-3 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-slate-400">{formatFila(d)}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${ESTADO_COLORS[cita.estado as EstadoCita]}`}>
                        {ESTADO_LABELS[cita.estado as EstadoCita]}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-200 mt-0.5">
                      {cita.pacienteNombre}
                      <span className="text-slate-500 font-normal ml-2 text-xs">· {cita.pacienteRut}</span>
                    </p>
                    <p className="text-xs text-slate-400">{cita.tipoAtencion} · {cita.box}</p>
                    {cita.notas && (
                      <p className="text-xs text-slate-500 italic mt-0.5 truncate">"{cita.notas}"</p>
                    )}
                  </div>
                  <button
                    onClick={() => setCitaDrawer(cita)}
                    className="p-1.5 rounded-lg text-slate-600 hover:text-[#0E7490] hover:bg-[#0E7490]/10 transition-colors flex-shrink-0"
                    title="Ver detalle"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Paginación */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-center gap-4 pt-2">
          <button
            onClick={() => setPagina(p => Math.max(1, p - 1))}
            disabled={paginaActual === 1}
            className="text-xs text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            ← Anterior
          </button>
          <span className="text-xs text-slate-500">
            Página {paginaActual} de {totalPaginas}
          </span>
          <button
            onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
            disabled={paginaActual === totalPaginas}
            className="text-xs text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Siguiente →
          </button>
        </div>
      )}

      {/* Drawer */}
      <DrawerDetalleCita
        cita={citaDrawer}
        onCerrar={() => setCitaDrawer(null)}
      />
    </div>
  );
};
