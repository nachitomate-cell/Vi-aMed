import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAgendaColumnas } from '../../hooks/useAgendaColumnas';
import { getProfesionales } from '../../services/agendaService';
import { ModalNuevaCita } from '../../components/agenda/ModalNuevaCita';
import type { Cita, Profesional } from '../../types/agenda';
import { ESTADO_LABELS } from '../../types/agenda';
import type { Slot } from '../../types/horarios';

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const DIAS  = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

const ESTADO_DOT: Record<string, string> = {
  solicitada: 'bg-amber-400',
  confirmada:  'bg-cyan-500',
  realizada:   'bg-emerald-500',
  cancelada:   'bg-red-500',
  no_asistio:  'bg-orange-500',
};

/* ── Helpers ─────────────────────────────────────────────── */
const sod = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);

/* ── Page ────────────────────────────────────────────────── */
const AgendaProfesionalPage: React.FC = () => {
  const { profesionalId } = useParams<{ profesionalId: string }>();
  const navigate = useNavigate();

  const [fecha, setFecha] = useState(() => new Date());
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [citaEditando, setCitaEditando] = useState<Cita | undefined>();
  const [horaPresel, setHoraPresel] = useState<string | undefined>();

  useEffect(() => {
    getProfesionales().then(setProfesionales).catch(console.error);
  }, []);

  const { columnas, cargando } = useAgendaColumnas(fecha, profesionales, {
    profesionalId: profesionalId || undefined,
  });

  const columna = columnas.find(c => c.profesional.id === profesionalId) ?? columnas[0];
  const profesional = columna?.profesional;

  const fechaInicial = useMemo(() => {
    if (!horaPresel) return sod(fecha);
    const [h, m] = horaPresel.split(':').map(Number);
    return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), h, m, 0, 0);
  }, [fecha, horaPresel]);

  const handleSlotClick = (hora: string) => {
    setCitaEditando(undefined);
    setHoraPresel(hora);
    setModalOpen(true);
  };

  const handleCitaClick = (cita: Cita) => {
    setCitaEditando(cita);
    setHoraPresel(undefined);
    setModalOpen(true);
  };

  /* ── Navegación de días ─── */
  const prevDay = () => setFecha(d => { const n = new Date(d); n.setDate(n.getDate() - 1); return n; });
  const nextDay = () => setFecha(d => { const n = new Date(d); n.setDate(n.getDate() + 1); return n; });
  const goToday = () => setFecha(new Date());

  return (
    <div className="flex flex-col min-h-[calc(100vh-80px)]">
      {/* Header */}
      <div className="flex items-center gap-4 mb-5 flex-wrap">
        <button
          onClick={() => navigate('/agenda')}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          title="Volver a Agenda"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>

        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-slate-800 truncate">
            Agenda — {profesional?.nombre ?? 'Profesional'}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {DIAS[fecha.getDay()]} {fecha.getDate()} de {MESES[fecha.getMonth()]} · {columna?.totalCitas ?? 0} citas · {columna?.totalLibres ?? 0} horas libres
          </p>
        </div>

        {/* Navegación de fecha */}
        <div className="flex items-center gap-2">
          <button onClick={prevDay} className="p-2 rounded-xl bg-white border border-slate-200 hover:border-[#0E7490] text-slate-600 hover:text-[#0E7490] transition-colors shadow-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button onClick={goToday} className="px-3 py-2 text-xs font-semibold rounded-xl bg-white border border-slate-200 hover:border-[#0E7490] text-slate-600 hover:text-[#0E7490] transition-colors shadow-sm">
            Hoy
          </button>
          <button onClick={nextDay} className="p-2 rounded-xl bg-white border border-slate-200 hover:border-[#0E7490] text-slate-600 hover:text-[#0E7490] transition-colors shadow-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </button>
          <button
            onClick={() => { setCitaEditando(undefined); setHoraPresel(undefined); setModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-[#0E7490] hover:bg-[#0c6680] text-white text-xs font-semibold rounded-xl transition-colors shadow-sm"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Nueva cita
          </button>
        </div>
      </div>

      {/* Columna de slots */}
      {cargando ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-[#0E7490] animate-spin" />
        </div>
      ) : !columna ? (
        <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
          No hay horario configurado para este profesional en este día.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          {/* Leyenda */}
          <div className="flex items-center gap-4 px-5 py-3 bg-slate-50 border-b border-slate-200 flex-wrap">
            {Object.entries(ESTADO_LABELS).map(([k, label]) => (
              <div key={k} className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${ESTADO_DOT[k] ?? 'bg-slate-300'}`} />
                <span className="text-[10px] font-semibold text-slate-500">{label}</span>
              </div>
            ))}
          </div>

          {/* Lista de slots */}
          <div className="divide-y divide-slate-100">
            {columna.slots.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-sm">Sin horario configurado para este día.</div>
            ) : (
              columna.slots.map((slot: Slot, idx: number) => {
                if (slot.tipo === 'libre') {
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSlotClick(slot.hora)}
                      className={`w-full flex items-center gap-4 px-5 py-3 text-left hover:bg-[#0E7490]/5 transition-colors group ${slot.esSobrecupo ? 'bg-green-50/60' : ''}`}
                    >
                      <span className={`text-xs font-mono w-12 flex-shrink-0 ${slot.esSobrecupo ? 'text-green-700 font-bold' : 'text-slate-400'}`}>{slot.hora}</span>
                      <span className={`text-sm ${slot.esSobrecupo ? 'text-green-700 font-semibold' : 'text-slate-400'}`}>
                        Libre {slot.esSobrecupo && <span className="text-[11px] ml-1">(Sobrecupo)</span>}
                      </span>
                      <span className="ml-auto text-xs text-[#0E7490] opacity-0 group-hover:opacity-100 transition-opacity">+ Agendar</span>
                    </button>
                  );
                }

                if (slot.tipo === 'cita' && slot.cita) {
                  const cita = slot.cita;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleCitaClick(cita)}
                      className="w-full flex items-center gap-4 px-5 py-3.5 text-left hover:bg-slate-50 transition-colors group"
                    >
                      <span className="text-xs font-mono w-12 flex-shrink-0 text-slate-500">{slot.hora}</span>
                      <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${ESTADO_DOT[cita.estado] ?? 'bg-slate-300'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{cita.pacienteNombre}</p>
                        <p className="text-xs text-slate-500 truncate">{cita.tipoAtencion} · {cita.duracionMinutos} min · {cita.box}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        cita.estado === 'solicitada' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        cita.estado === 'confirmada' ? 'bg-cyan-50 text-cyan-700 border-cyan-200' :
                        cita.estado === 'realizada' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        cita.estado === 'cancelada' ? 'bg-red-50 text-red-700 border-red-200' :
                        'bg-orange-50 text-orange-700 border-orange-200'
                      }`}>
                        {ESTADO_LABELS[cita.estado]}
                      </span>
                    </button>
                  );
                }

                if (slot.tipo === 'bloqueado') {
                  return (
                    <div key={idx} className="flex items-center gap-4 px-5 py-3 bg-slate-50/80" style={{ background: 'repeating-linear-gradient(135deg,#F8FAFC 0px,#F8FAFC 8px,#F1F5F9 8px,#F1F5F9 16px)' }}>
                      <span className="text-xs font-mono w-12 flex-shrink-0 text-slate-400">{slot.hora}</span>
                      <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                      <span className="text-sm text-slate-500">{slot.bloqueo?.motivo ?? 'Bloqueado'}</span>
                    </div>
                  );
                }

                return null;
              })
            )}
          </div>
        </div>
      )}

      {/* Modal cita */}
      {modalOpen && (
        <ModalNuevaCita
          citaEditar={citaEditando}
          fechaInicial={fechaInicial}
          onGuardado={() => { setModalOpen(false); setCitaEditando(undefined); setHoraPresel(undefined); }}
          onCerrar={() => { setModalOpen(false); setCitaEditando(undefined); setHoraPresel(undefined); }}
        />
      )}
    </div>
  );
};

export default AgendaProfesionalPage;
