import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { Cita, EstadoCita } from '../../types/agenda';
import { ESTADO_COLORS, ESTADO_LABELS, ESTADO_BORDER } from '../../types/agenda';
import { exportarCitasCSV } from '../../services/profesionalesService';
import { DrawerDetalleCita } from './DrawerDetalleCita';

const PAGE_SIZE = 25;

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const ESTADOS_FILTER: EstadoCita[] = [
  'Agendado', 'Confirmado', 'En espera', 'En atención',
  'Rezagado', 'Finalizado', 'Anulado', 'No asistió',
];

function formatFila(d: Date): string {
  return `${DIAS[d.getDay()]} ${d.getDate()} ${MESES_CORTO[d.getMonth()]} ${d.getFullYear()}`;
}

function formatHora(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
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

  // Tipos únicos de los datos reales (no lista estática)
  const tiposUnicos = useMemo(() => {
    const set = new Set(citasRaw.map(c => c.tipoAtencion).filter(Boolean));
    return Array.from(set).sort();
  }, [citasRaw]);

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

  const hayFiltros = buscar || filTipo || filEstado;

  const handleBuscar = (v: string) => { setBuscar(v); setPagina(1); };
  const handleTipo = (v: string) => { setFilTipo(v); setPagina(1); };
  const handleEstado = (v: string) => { setFilEstado(v); setPagina(1); };
  const limpiarFiltros = () => { setBuscar(''); setFilTipo(''); setFilEstado(''); setPagina(1); };

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Buscador */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Paciente o RUT…"
            value={buscar}
            onChange={e => handleBuscar(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:border-[#0E7490] w-44"
          />
        </div>

        {/* Tipo de atención — dinámico */}
        <select
          value={filTipo}
          onChange={e => handleTipo(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-[#0E7490] max-w-[200px]"
        >
          <option value="">Todos los tipos</option>
          {tiposUnicos.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        {/* Estado — usa valores correctos de EstadoCita */}
        <select
          value={filEstado}
          onChange={e => handleEstado(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-[#0E7490]"
        >
          <option value="">Todos los estados</option>
          {ESTADOS_FILTER.map(s => (
            <option key={s} value={s}>{ESTADO_LABELS[s]}</option>
          ))}
        </select>

        {hayFiltros && (
          <button
            onClick={limpiarFiltros}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors underline underline-offset-2"
          >
            Limpiar
          </button>
        )}

        <div className="flex-1" />

        {/* Conteo */}
        <span className="text-xs text-slate-500">
          {hayFiltros
            ? <>{filtradas.length} de {citasRaw.length}</>
            : <>{citasRaw.length} atenciones</>
          }
        </span>

        {/* Exportar */}
        <button
          onClick={() => exportarCitasCSV(filtradas, `atenciones-${profesionalId}.csv`)}
          title="Exportar CSV"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 rounded-lg transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          </svg>
          CSV
        </button>
      </div>

      {/* Lista */}
      {cargando ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 bg-slate-800/50 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : citasPagina.length === 0 ? (
        <div className="py-16 text-center space-y-2">
          <p className="text-slate-500 text-sm">
            {hayFiltros ? 'No hay atenciones que coincidan con los filtros.' : 'Este profesional aún no tiene atenciones registradas.'}
          </p>
          {hayFiltros && (
            <button onClick={limpiarFiltros} className="text-xs text-[#0E7490] hover:underline">
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-1.5">
          {citasPagina.map(cita => {
            const d = cita.fecha.toDate();
            const estadoColors = ESTADO_COLORS[cita.estado as EstadoCita];
            const borderColor = ESTADO_BORDER[cita.estado as EstadoCita];
            return (
              <div
                key={cita.id}
                onClick={() => setCitaDrawer(cita)}
                className={`bg-slate-800/30 border border-slate-800 hover:border-slate-600 hover:bg-slate-800/60 rounded-xl px-4 py-3 transition-all cursor-pointer border-l-2 ${borderColor}`}
              >
                <div className="flex items-center gap-3">
                  {/* Fecha/Hora */}
                  <div className="flex-shrink-0 text-center w-14 hidden sm:block">
                    <div className="text-xs font-bold text-slate-300 leading-tight">{formatHora(d)}</div>
                    <div className="text-[10px] text-slate-500 leading-tight mt-0.5">{formatFila(d)}</div>
                  </div>

                  {/* Divider */}
                  <div className="hidden sm:block w-px h-8 bg-slate-700/50 flex-shrink-0" />

                  {/* Info principal */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-200 truncate">{cita.pacienteNombre}</p>
                      <span className="text-xs text-slate-500 font-mono flex-shrink-0">{cita.pacienteRut}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-slate-400 truncate">{cita.tipoAtencion}</span>
                      {cita.box && <span className="text-[10px] text-slate-600">· {cita.box}</span>}
                      {/* Fecha en mobile */}
                      <span className="text-[10px] text-slate-600 sm:hidden">· {formatFila(d)} {formatHora(d)}</span>
                    </div>
                  </div>

                  {/* Estado */}
                  <span className={`flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full border font-semibold ${estadoColors}`}>
                    {ESTADO_LABELS[cita.estado as EstadoCita] ?? cita.estado}
                  </span>

                  {/* Chevron */}
                  <svg className="w-4 h-4 text-slate-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Paginación */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setPagina(1)}
            disabled={paginaActual === 1}
            className="text-xs text-slate-500 hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            ««
          </button>
          <button
            onClick={() => setPagina(p => Math.max(1, p - 1))}
            disabled={paginaActual === 1}
            className="text-xs text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed px-3 py-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            ← Anterior
          </button>
          <span className="text-xs text-slate-500 px-2">
            {paginaActual} / {totalPaginas}
          </span>
          <button
            onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
            disabled={paginaActual === totalPaginas}
            className="text-xs text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed px-3 py-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            Siguiente →
          </button>
          <button
            onClick={() => setPagina(totalPaginas)}
            disabled={paginaActual === totalPaginas}
            className="text-xs text-slate-500 hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            »»
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
