import React, { useState, useEffect, useCallback } from 'react';
import {
  collection, query, where, orderBy, onSnapshot, updateDoc, doc, deleteDoc, Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import type { EstadoCita } from '../types/agenda';
import ModalOrdenPago from '../components/recepcion/ModalOrdenPago';


import { ESTADO_COLORS, ESTADO_LABELS } from '../types/agenda';

/* ── Types ─────────────────────────────────────────────── */
interface RegistroRecepcion {
  id: string;
  pacienteNombre: string;
  pacienteRut: string;
  fecha: Timestamp;
  estado: EstadoCita;
  tipoAtencion: string;
  profesionalNombre: string;
  box: string;
  nOperacion?: string;
  notas?: string;
  ordenPagoGenerada?: boolean;
}

/* ── Constantes ─────────────────────────────────────────── */
const ESTADOS_OPCIONES: EstadoCita[] = ['Agendado', 'Confirmado', 'En espera', 'En atención', 'Rezagado', 'Finalizado', 'Anulado', 'No asistió'];

/* ── Selector de estado inline ─────────────────────────── */
const SelectorEstado: React.FC<{
  value: EstadoCita;
  onChange: (e: EstadoCita) => void;
}> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation(); // Evitar que el clic en el botón active el edit del paciente
          setOpen(o => !o);
        }}
        className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border-2 transition-all duration-200 shadow-sm ${ESTADO_COLORS[value] || 'bg-slate-100'}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
        {ESTADO_LABELS[value] || value}
        <svg className={`w-3 h-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setOpen(false); }} />
          <div className="absolute top-full left-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-20 overflow-hidden min-w-[180px] animate-in fade-in zoom-in-95 duration-200 p-1.5">
            <div className="px-2 py-1.5 mb-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cambiar estado</span>
            </div>
            {ESTADOS_OPCIONES.map(est => (
              <button
                key={est}
                onClick={(e) => { 
                  e.stopPropagation();
                  onChange(est); 
                  setOpen(false); 
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-3 mb-0.5 last:mb-0 ${
                  value === est ? 'bg-slate-50 text-[#0E7490]' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${ESTADO_COLORS[est].split(' ')[1].replace('text-', 'bg-')}`} />
                {ESTADO_LABELS[est]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

/* ── Page ────────────────────────────────────────────────── */
const RecepcionPage: React.FC = () => {
  const navigate = useNavigate();
  const today = new Date();
  
  // Calcular lunes y domingo de esta semana
  const getWeekRange = () => {
    const d = new Date(today);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // lunes
    const lunes = new Date(d.setDate(diff));
    const domingo = new Date(lunes);
    domingo.setDate(lunes.getDate() + 6);
    return {
      lunes: lunes.toISOString().split('T')[0],
      domingo: domingo.toISOString().split('T')[0]
    };
  };

  const { lunes: initialDesde, domingo: initialHasta } = getWeekRange();
  const todayStr = today.toISOString().split('T')[0];

  const [registros, setRegistros] = useState<RegistroRecepcion[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [fechaDesde, setFechaDesde] = useState(initialDesde);
  const [fechaHasta, setFechaHasta] = useState(initialHasta);
  const [ordenPagoRegistro, setOrdenPagoRegistro] = useState<RegistroRecepcion | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  /* ── Listener Firestore ────────────────────────────────── */
  const cargar = useCallback(() => {
    setLoading(true);
    const desde = new Date(fechaDesde + 'T00:00:00');
    const hasta = new Date(fechaHasta + 'T23:59:59');

    const q = query(
      collection(db, 'citas'),
      where('fecha', '>=', Timestamp.fromDate(desde)),
      where('fecha', '<=', Timestamp.fromDate(hasta)),
      orderBy('fecha', 'asc'),
    );

    const unsub = onSnapshot(q, snap => {
      const data = snap.docs.map(d => ({
        id: d.id,
        pacienteNombre: d.data().pacienteNombre ?? '',
        pacienteRut: d.data().pacienteRut ?? '',
        fecha: d.data().fecha as Timestamp,
        estado: (d.data().estado ?? 'Agendado') as EstadoCita,
        tipoAtencion: d.data().tipoAtencion ?? '',
        profesionalNombre: d.data().profesionalNombre ?? '',
        box: d.data().box ?? '',
        nOperacion: d.data().nOperacion ?? '',
        notas: d.data().notas ?? '',
        ordenPagoGenerada: d.data().ordenPagoGenerada ?? false,
      } as RegistroRecepcion));
      setRegistros(data);
      setLoading(false);
    });
    return unsub;
  }, [fechaDesde, fechaHasta]);

  useEffect(() => {
    const unsub = cargar();
    return () => { if (unsub) unsub(); };
  }, [cargar]);

  /* ── Handlers ───────────────────────────────────────────── */
  const handleCambiarEstado = async (id: string, nuevoEstado: EstadoCita) => {
    await updateDoc(doc(db, 'citas', id), { estado: nuevoEstado });
  };

  const handleEliminar = async (id: string, nombre: string) => {
    if (!window.confirm(`¿Eliminar el registro de "${nombre}"? Esta acción no se puede deshacer.`)) return;
    await deleteDoc(doc(db, 'citas', id));
  };

  /* ── Filtros ────────────────────────────────────────────── */
  const filtrados = registros.filter(r => {
    if (!busqueda.trim()) return true;
    const q = busqueda.toLowerCase();
    return (
      r.pacienteNombre.toLowerCase().includes(q) ||
      r.pacienteRut.toLowerCase().includes(q) ||
      r.tipoAtencion.toLowerCase().includes(q) ||
      (r.nOperacion ?? '').toLowerCase().includes(q)
    );
  });

  const ordenados = [...filtrados].sort((a, b) => {
    const timeA = a.fecha.toMillis();
    const timeB = b.fecha.toMillis();
    return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
  });

  const formatFecha = (ts: Timestamp) => {
    const d = ts.toDate();
    return d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };
  const formatHora = (ts: Timestamp) => {
    const d = ts.toDate();
    return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Recepción</h1>
          <p className="text-sm text-slate-500 mt-0.5">Control de atenciones, pagos y estados</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs font-semibold text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-sm">
            {filtrados.length} registro{filtrados.length !== 1 ? 's' : ''}
          </div>
          <button
            onClick={() => navigate('/atencion')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Nueva Atención
          </button>
          <button
            onClick={() => navigate('/nuevopaciente', { state: { from: '/recepcion' } })}
            className="flex items-center gap-2 px-4 py-2 bg-[#0E7490] hover:bg-[#0c6680] text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /><line x1="12" y1="11" x2="12" y2="17" /><line x1="9" y1="14" x2="15" y2="14" />
            </svg>
            Nuevo Paciente
          </button>
        </div>
      </div>

      {/* Barra de filtros */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-wrap gap-3 items-end">
        {/* Buscador */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Buscar</label>
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Paciente, RUT, tipo o N° operación..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="pl-9 pr-4 py-2 w-full border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-[#0E7490]"
            />
            {busqueda && (
              <button onClick={() => setBusqueda('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>
        </div>

        {/* Rango de fechas */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Desde</label>
          <input
            type="date"
            value={fechaDesde}
            onChange={e => setFechaDesde(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-[#0E7490]"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Hasta</label>
          <input
            type="date"
            value={fechaHasta}
            onChange={e => setFechaHasta(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-[#0E7490]"
          />
        </div>

        {/* Atajo: hoy / semana */}
        <div className="flex gap-2">
          <button
            onClick={() => { setFechaDesde(todayStr); setFechaHasta(todayStr); }}
            className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-600 hover:border-[#0E7490] hover:text-[#0E7490] transition-colors"
          >
            Hoy
          </button>
          <button
            onClick={() => {
              const d = new Date();
              const lunes = new Date(d); lunes.setDate(d.getDate() - ((d.getDay() + 6) % 7));
              const domingo = new Date(lunes); domingo.setDate(lunes.getDate() + 6);
              setFechaDesde(lunes.toISOString().split('T')[0]);
              setFechaHasta(domingo.toISOString().split('T')[0]);
            }}
            className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-600 hover:border-[#0E7490] hover:text-[#0E7490] transition-colors"
          >
            Esta semana
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Encabezado */}
        <div className="grid px-5 py-3 bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-widest"
          style={{ gridTemplateColumns: '2.5fr 2fr 1.4fr 1.6fr 1.8fr 1fr' }}>
          <span>Paciente</span>
          <span>Prestación</span>
          <span className="flex items-center gap-1">
            Fecha / Hora
            <button
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="p-0.5 hover:bg-slate-200 rounded transition-colors text-slate-500"
              title={sortOrder === 'asc' ? 'Ver últimas primero' : 'Ver primeras primero'}
            >
              <svg className={`w-3 h-3 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </span>
          <span>N° Operación</span>
          <span>Estado</span>
          <span className="text-right">Acciones</span>
        </div>

        {/* Cuerpo */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-[#0E7490] animate-spin" />
          </div>
        ) : filtrados.length === 0 ? (
          <div className="py-16 text-center">
            <svg className="w-12 h-12 text-slate-200 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-sm text-slate-400">No hay registros para el período seleccionado.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {ordenados.map(r => {
              const initials = r.pacienteNombre
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map(w => w[0])
                .join('')
                .toUpperCase();

              return (
                <div
                  key={r.id}
                  onClick={() => navigate(`/atencion/${r.id}`)}
                  className="grid px-5 py-3.5 hover:bg-slate-50/70 transition-all group items-center cursor-pointer border-l-4 border-l-transparent hover:border-l-[#0E7490]"
                  style={{ gridTemplateColumns: '2.5fr 2fr 1.4fr 1.6fr 1.8fr 1fr' }}
                >
                  {/* Paciente */}
                  <div className="flex items-center gap-3 min-w-0 pr-3">
                    <div className="w-9 h-9 rounded-xl bg-[#0E7490]/10 text-[#0E7490] flex items-center justify-center text-xs font-bold shrink-0 group-hover:bg-[#0E7490] group-hover:text-white transition-colors">
                      {initials || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate group-hover:text-[#0E7490] transition-colors leading-tight">
                        {r.pacienteNombre}
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono tracking-tight leading-tight mt-0.5">
                        {r.pacienteRut}
                      </p>
                    </div>
                  </div>

                  {/* Prestación */}
                  <div className="min-w-0 pr-3">
                    {r.tipoAtencion ? (
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#0E7490] bg-[#0E7490]/8 border border-[#0E7490]/20 px-2.5 py-1 rounded-lg w-fit max-w-full">
                          <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          <span className="truncate">{r.tipoAtencion}</span>
                        </span>
                        {r.profesionalNombre && (
                          <span className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                            <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            {r.profesionalNombre}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-300 italic">Sin prestación</span>
                    )}
                  </div>

                  {/* Fecha / Hora */}
                  <div>
                    <p className="text-sm font-semibold text-slate-700 tabular-nums leading-tight">
                      {formatFecha(r.fecha)}
                    </p>
                    <p className="text-[11px] text-slate-400 font-medium tabular-nums leading-tight mt-0.5 flex items-center gap-1">
                      <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                      </svg>
                      {formatHora(r.fecha)}
                      {r.box && <span className="text-slate-300">·</span>}
                      {r.box && <span>{r.box}</span>}
                    </p>
                  </div>

                  {/* N° Operación */}
                  <div>
                    {r.nOperacion ? (
                      <div className="flex items-center gap-1.5 text-emerald-700">
                        <svg className="w-3.5 h-3.5 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-[12px] font-mono font-bold tracking-tight truncate">{r.nOperacion}</p>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-300 italic">Pendiente</span>
                    )}
                  </div>

                  {/* Estado */}
                  <div>
                    <SelectorEstado
                      value={r.estado}
                      onChange={nuevoEstado => handleCambiarEstado(r.id, nuevoEstado)}
                    />
                  </div>

                  {/* Acciones */}
                  <div className="flex justify-end items-center gap-1">
                    <div className="relative">
                      <button
                        onClick={(e) => { e.stopPropagation(); setOrdenPagoRegistro(r); }}
                        title={r.ordenPagoGenerada ? 'Orden de pago generada' : 'Generar Orden de Pago'}
                        className={`p-2 rounded-xl transition-all ${r.ordenPagoGenerada ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
                      >
                        <svg className="w-4.5 h-4.5" style={{ width: '18px', height: '18px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </button>
                      {r.ordenPagoGenerada && (
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-white" />
                      )}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleEliminar(r.id, r.pacienteNombre); }}
                      title="Eliminar registro"
                      className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <svg style={{ width: '18px', height: '18px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Orden de Pago */}
      {ordenPagoRegistro && (
        <ModalOrdenPago
          registro={ordenPagoRegistro}
          onCerrar={() => setOrdenPagoRegistro(null)}
        />
      )}
    </div>
  );
};

export default RecepcionPage;
