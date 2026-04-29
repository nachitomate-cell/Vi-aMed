import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Cita, EstadoCita } from '../../types/agenda';
import { ESTADO_COLORS, ESTADO_LABELS } from '../../types/agenda';
import { actualizarEstadoCita } from '../../services/agendaService';

interface Props {
  cita: Cita | null;
  onCerrar: () => void;
}

const ESTADOS: EstadoCita[] = ['solicitada', 'confirmada', 'realizada', 'cancelada', 'no_asistio'];

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function formatFechaLarga(d: Date): string {
  return `${DIAS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()} · ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export const DrawerDetalleCita: React.FC<Props> = ({ cita, onCerrar }) => {
  const navigate = useNavigate();
  const [estado, setEstado] = useState<EstadoCita | null>(null);
  const [cambiando, setCambiando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const estadoActual = estado ?? cita?.estado ?? 'solicitada';

  const handleEstado = async (nuevo: EstadoCita) => {
    if (!cita) return;
    setCambiando(true);
    try {
      await actualizarEstadoCita(cita.id, nuevo);
      setEstado(nuevo);
    } catch {
      setError('Error al actualizar estado');
      setTimeout(() => setError(null), 3000);
    } finally {
      setCambiando(false);
    }
  };

  if (!cita) return null;

  const fechaDate = cita.fecha.toDate();

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onCerrar}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-96 bg-[#0f1623] border-l border-slate-800 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h3 className="font-semibold text-slate-200">Detalle de cita</h3>
          <button
            onClick={onCerrar}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Fecha y estado */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-200">{formatFechaLarga(fechaDate)}</p>
              <p className="text-xs text-slate-500 mt-0.5">{cita.duracionMinutos} minutos · {cita.box}</p>
            </div>
            <span className={`text-[11px] px-2.5 py-1 rounded-full border font-semibold flex-shrink-0 ${ESTADO_COLORS[estadoActual]}`}>
              {ESTADO_LABELS[estadoActual]}
            </span>
          </div>

          {/* Paciente */}
          <div className="bg-slate-800/50 rounded-xl p-4 space-y-1.5">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Paciente</p>
            <p className="font-semibold text-slate-200">{cita.pacienteNombre}</p>
            <p className="text-sm text-slate-400">RUT: {cita.pacienteRut}</p>
            {cita.pacienteTelefono && (
              <p className="text-sm text-slate-400">Tel: {cita.pacienteTelefono}</p>
            )}
          </div>

          {/* Atención */}
          <div className="bg-slate-800/50 rounded-xl p-4 space-y-1.5">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Atención</p>
            <p className="font-semibold text-slate-200">{cita.tipoAtencion}</p>
            <p className="text-sm text-slate-400">{cita.profesionalNombre} · {cita.box}</p>
          </div>

          {/* Notas */}
          {cita.notas && (
            <div className="bg-slate-800/50 rounded-xl p-4 space-y-1.5">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Notas</p>
              <p className="text-sm text-slate-300">{cita.notas}</p>
            </div>
          )}

          {/* Cambiar estado */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cambiar estado</p>
            <div className="grid grid-cols-2 gap-2">
              {ESTADOS.filter(s => s !== estadoActual).map(s => (
                <button
                  key={s}
                  onClick={() => handleEstado(s)}
                  disabled={cambiando}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-colors disabled:opacity-50 ${ESTADO_COLORS[s]} hover:opacity-80`}
                >
                  {ESTADO_LABELS[s]}
                </button>
              ))}
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={() => { onCerrar(); navigate('/agenda'); }}
            className="w-full py-2.5 text-sm font-semibold text-[#0E7490] border border-[#0E7490]/30 rounded-xl hover:bg-[#0E7490]/10 transition-colors"
          >
            Ver en Agenda →
          </button>
        </div>
      </div>
    </>
  );
};
