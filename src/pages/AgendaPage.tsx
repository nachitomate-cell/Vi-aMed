import React, { useState, useMemo, useEffect } from 'react';
import { CalendarioMini } from '../components/agenda/CalendarioMini';
import { ListaCitasDia } from '../components/agenda/ListaCitasDia';
import { ModalNuevaCita } from '../components/agenda/ModalNuevaCita';
import { ModalNuevoBloqueo } from '../components/agenda/ModalNuevoBloqueo';
import { ModalAsignarProfesional } from '../components/agenda/ModalAsignarProfesional';
import { VistaColumnas } from '../components/agenda/VistaColumnas';
import { useAgendaTiempoReal } from '../hooks/useAgendaTiempoReal';
import { useAgendaColumnas } from '../hooks/useAgendaColumnas';
import { actualizarEstadoCita, getProfesionales, getTiposAtencion } from '../services/agendaService';
import type { Cita, Profesional } from '../types/agenda';

/* ── Helpers de fecha ─────────────────────────────────────────────── */
const sod = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
const eod = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
const som = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
const eom = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
const toKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const DIAS  = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

/* ── Componente ───────────────────────────────────────────────────── */
const AgendaPage: React.FC = () => {
  const [fechaSel, setFechaSel] = useState<Date>(() => new Date());
  const [mesCal, setMesCal] = useState<Date>(() => new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [modalBloqueoOpen, setModalBloqueoOpen] = useState(false);
  const [citaEditando, setCitaEditando] = useState<Cita | undefined>();
  const [confirmando, setConfirmando] = useState<Cita | null>(null);
  const [modalAsignacionOpen, setModalAsignacionOpen] = useState(false);
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [tiposAtencion, setTiposAtencion] = useState<string[]>([]);
  const [horaPreseleccionada, setHoraPreseleccionada] = useState<string | undefined>();

  /* Filtros */
  const [filProfesional, setFilProfesional] = useState('');
  const [filEstado, setFilEstado] = useState('');
  const [filTipo, setFilTipo] = useState('');

  /* Modo vista: columnas o lista */
  const { columnas, hayAtencion, proximosDiasConAtencion, cargando: cargandoColumnas } = useAgendaColumnas(
    fechaSel,
    profesionales,
    { profesionalId: filProfesional || undefined }
  );

  const esVistaColumnas = hayAtencion && !filProfesional && !filEstado && !filTipo;

  useEffect(() => {
    getProfesionales().then(setProfesionales).catch(console.error);
    getTiposAtencion().then(setTiposAtencion).catch(console.error);
  }, []);

  /* Listener mensual (para puntos del calendario) */
  const mesInicio = useMemo(() => som(mesCal), [mesCal]);
  const mesFin = useMemo(() => eom(mesCal), [mesCal]);
  const { citas: citasMes } = useAgendaTiempoReal(mesInicio, mesFin, {});

  /* Listener diario con filtros (para vista lista) */
  const diaInicio = useMemo(() => sod(fechaSel), [fechaSel]);
  const diaFin = useMemo(() => eod(fechaSel), [fechaSel]);
  const filtros = useMemo(() => ({
    profesionalId: filProfesional || undefined,
    estado: filEstado || undefined,
    tipoAtencion: filTipo || undefined,
  }), [filProfesional, filEstado, filTipo]);
  const { citas: citasDia, cargando } = useAgendaTiempoReal(diaInicio, diaFin, filtros);

  /* Fechas con citas para los puntos del mini-calendario */
  const fechasConCitas = useMemo<Set<string>>(() => {
    const s = new Set<string>();
    citasMes.forEach(c => s.add(toKey(c.fecha.toDate())));
    return s;
  }, [citasMes]);

  /* Handlers */
  const handleDaySelect = (d: Date) => {
    setFechaSel(d);
    if (d.getMonth() !== mesCal.getMonth() || d.getFullYear() !== mesCal.getFullYear()) {
      setMesCal(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  };

  const handleEditar = (c: Cita) => { setCitaEditando(c); setModalOpen(true); };
  const handleNueva = (hora?: string) => {
    setCitaEditando(undefined);
    setHoraPreseleccionada(hora);
    setModalOpen(true);
  };
  const handleModalOk = () => { setModalOpen(false); setCitaEditando(undefined); setHoraPreseleccionada(undefined); };

  const handleCancelar = (c: Cita) => setConfirmando(c);
  const confirmarCancelacion = async () => {
    if (!confirmando) return;
    await actualizarEstadoCita(confirmando.id, 'cancelada').catch(console.error);
    setConfirmando(null);
  };

  const limpiarFiltros = () => { setFilProfesional(''); setFilEstado(''); setFilTipo(''); };
  const hayFiltros = filProfesional || filEstado || filTipo;

  /* Citas pendientes */
  const [citasPendientes, setCitasPendientes] = useState<Cita[]>([]);
  useEffect(() => {
    import('../services/citasService').then(({ escucharCitasSolicitadas }) => {
      escucharCitasSolicitadas(setCitasPendientes);
    });
  }, []);

  /* Fecha inicial para el modal de nueva cita (combinando fecha seleccionada + hora del slot) */
  const fechaInicialModal = useMemo(() => {
    if (!horaPreseleccionada) return fechaSel;
    const [h, m] = horaPreseleccionada.split(':').map(Number);
    return new Date(fechaSel.getFullYear(), fechaSel.getMonth(), fechaSel.getDate(), h, m, 0, 0);
  }, [fechaSel, horaPreseleccionada]);

  return (
    <div className="flex gap-5 items-start">
      {/* ── Columna izquierda: calendario + filtros ────────────────── */}
      <div className="w-64 flex-shrink-0 space-y-4 sticky top-0 self-start">
        {/* Calendario mini */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <CalendarioMini
            mesActual={mesCal}
            fechaSeleccionada={fechaSel}
            fechasConCitas={fechasConCitas}
            onDaySelect={handleDaySelect}
            onPrevMes={() => setMesCal(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
            onNextMes={() => setMesCal(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
          />
        </div>

        {/* Filtros */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-sm">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Filtros</p>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Profesional</label>
            <select
              value={filProfesional}
              onChange={e => setFilProfesional(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-[#0E7490] appearance-none"
            >
              <option value="">Todos</option>
              {profesionales.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Estado</label>
            <select
              value={filEstado}
              onChange={e => setFilEstado(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-[#0E7490] appearance-none"
            >
              <option value="">Todos</option>
              <option value="solicitada">Solicitadas</option>
              <option value="confirmada">Confirmadas</option>
              <option value="realizada">Realizadas</option>
              <option value="cancelada">Canceladas</option>
              <option value="no_asistio">No asistió</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Tipo de atención</label>
            <select
              value={filTipo}
              onChange={e => setFilTipo(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-[#0E7490] appearance-none"
            >
              <option value="">Todos</option>
              {tiposAtencion.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {hayFiltros && (
            <button
              onClick={limpiarFiltros}
              className="w-full text-xs text-slate-500 hover:text-slate-700 transition-colors py-1 border-t border-slate-200 pt-2"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {/* Citas pendientes */}
        {citasPendientes.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-sm space-y-2">
            <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">
              Pendientes ({citasPendientes.length})
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {citasPendientes.map(cita => (
                <div key={cita.id} className="bg-white p-2.5 rounded-xl border border-amber-100 text-xs">
                  <p className="font-semibold text-slate-800 truncate">{cita.pacienteNombre}</p>
                  <p className="text-slate-500 truncate">{cita.tipoAtencion}</p>
                  <button
                    onClick={() => handleEditar(cita)}
                    className="mt-1.5 w-full text-center text-amber-700 bg-amber-100 hover:bg-amber-200 py-1 rounded font-medium transition-colors"
                  >
                    Asignar
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Columna derecha ─────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 bg-[#F3F4F6] border border-slate-200 rounded-2xl p-5 shadow-sm" style={{ minHeight: 'calc(100vh - 10rem)' }}>

        {esVistaColumnas ? (
          <>
            {/* Header con botón + Bloqueo */}
            <div className="flex items-center justify-between mb-1">
              <div />
              <div className="flex gap-2">
                <button
                  onClick={() => setModalAsignacionOpen(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 text-xs font-semibold rounded-xl transition-all shadow-sm"
                >
                  <svg className="w-3.5 h-3.5 text-[#0E7490]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Turno
                </button>
                <button
                  onClick={() => setModalBloqueoOpen(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-[#0E7490] hover:bg-[#0C4A6E] text-white text-xs font-semibold rounded-xl transition-colors shadow-sm"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  + Bloqueo
                </button>
              </div>
            </div>

            {/* Vista columnas */}
            {cargandoColumnas ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-6 h-6 rounded-full border-2 border-slate-200 border-t-[#0E7490] animate-spin" />
              </div>
            ) : (
              <VistaColumnas
                columnas={columnas}
                fecha={fechaSel}
                onSlotLibreClick={(_profId, hora, _f) => handleNueva(hora)}
                onCitaClick={handleEditar}
              />
            )}
          </>
        ) : !hayAtencion && !hayFiltros ? (
          /* Día sin atención */
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mb-5">
              <svg className="w-8 h-8 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-slate-300 mb-1">
              Sin atención de tecnólogos
            </h2>
            <p className="text-slate-500 text-sm mb-2">
              {DIAS[fechaSel.getDay()]} no es día de trabajo.
            </p>
            <p className="text-slate-600 text-xs mb-6">
              Los tecnólogos atienden los días Lunes, Miércoles y Sábado.
            </p>

            {/* Accesos rápidos a próximos días */}
            <div className="space-y-6 flex flex-col items-center">
              <button
                onClick={() => setModalAsignacionOpen(true)}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#0E7490] hover:bg-[#0C4A6E] text-white text-sm font-bold rounded-xl transition-all shadow-lg hover:scale-105"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Abrir este día (Asignar Turno)
              </button>

              {proximosDiasConAtencion.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-slate-600 mb-3">Próximos días con atención programada:</p>
                  <div className="flex gap-2 flex-wrap justify-center">
                    {proximosDiasConAtencion.map(d => (
                      <button
                        key={d.toISOString()}
                        onClick={() => handleDaySelect(d)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-cyan-900/40 border border-slate-700 hover:border-cyan-700 text-slate-300 hover:text-cyan-400 text-xs font-medium rounded-xl transition-all"
                      >
                        {DIAS[d.getDay()].slice(0, 3)} {d.getDate()} {MESES[d.getMonth()].slice(0, 3)}.
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Vista lista con filtros activos */
          <ListaCitasDia
            fecha={fechaSel}
            citas={citasDia}
            cargando={cargando}
            onNuevaCita={() => handleNueva()}
            onEditar={handleEditar}
            onCancelar={handleCancelar}
          />
        )}
      </div>

      {/* ── Modal nueva / editar cita ──────────────────────────────── */}
      {modalOpen && (
        <ModalNuevaCita
          citaEditar={citaEditando}
          fechaInicial={fechaInicialModal}
          onGuardado={handleModalOk}
          onCerrar={() => { setModalOpen(false); setCitaEditando(undefined); setHoraPreseleccionada(undefined); }}
        />
      )}

      {/* ── Modal nuevo bloqueo ─────────────────────────────────────── */}
      {modalBloqueoOpen && (
        <ModalNuevoBloqueo
          profesionales={profesionales}
          fechaDefault={fechaSel}
          onCerrar={() => setModalBloqueoOpen(false)}
          onCreado={() => setModalBloqueoOpen(false)}
        />
      )}

      {/* ── Modal asignar profesional ─────────────────────────────── */}
      {modalAsignacionOpen && (
        <ModalAsignarProfesional
          fecha={fechaSel}
          profesionales={profesionales}
          onCerrar={() => setModalAsignacionOpen(false)}
          onAsignado={() => setModalAsignacionOpen(false)}
        />
      )}

      {/* ── Confirmación de cancelación ────────────────────────────── */}
      {confirmando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-base font-semibold text-slate-800 mb-2">Cancelar cita</h3>
            <p className="text-sm text-slate-500 mb-5">
              ¿Confirma que desea cancelar la cita de{' '}
              <strong className="text-slate-800">{confirmando.pacienteNombre}</strong>?
              El cambio se reflejará en la app del paciente.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmando(null)}
                className="px-4 py-2 text-sm text-slate-500 hover:text-slate-800 transition-colors"
              >
                Volver
              </button>
              <button
                onClick={confirmarCancelacion}
                className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                Sí, cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgendaPage;
