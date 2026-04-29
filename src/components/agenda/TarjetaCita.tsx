import React, { useState } from 'react';
import type { Cita, EstadoCita } from '../../types/agenda';
import { ESTADO_COLORS, ESTADO_LABELS, ESTADO_BORDER } from '../../types/agenda';
import { actualizarEstadoCita } from '../../services/agendaService';

interface Props {
  cita: Cita;
  onEditar: (cita: Cita) => void;
  onCancelar: (cita: Cita) => void;
  profesionalInactivo?: boolean;
}

const ESTADOS: EstadoCita[] = ['solicitada', 'confirmada', 'realizada', 'cancelada', 'no_asistio'];

function formatHora(d: Date) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export const TarjetaCita: React.FC<Props> = ({ cita, onEditar, onCancelar, profesionalInactivo }) => {
  const [estadoLocal, setEstadoLocal] = useState<EstadoCita>(cita.estado);
  const [cambiando, setCambiando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fechaDate = cita.fecha.toDate();

  const handleEstado = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nuevo = e.target.value as EstadoCita;
    setCambiando(true);
    try {
      await actualizarEstadoCita(cita.id, nuevo);
      setEstadoLocal(nuevo);
    } catch {
      setErrorMsg('Error al actualizar');
      setTimeout(() => setErrorMsg(null), 3000);
    } finally {
      setCambiando(false);
    }
  };

  return (
    <div
      className={`relative bg-white border border-slate-200 shadow-sm border-l-4 ${ESTADO_BORDER[estadoLocal]} rounded-xl px-4 py-3 flex gap-3 group hover:border-[#0E7490] transition-colors`}
    >
      {/* Punto parpadeante para citas solicitadas (vienen de la app del paciente) */}
      {estadoLocal === 'solicitada' && (
        <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
      )}

      {/* Columna hora */}
      <div className="w-14 flex-shrink-0 text-right pt-0.5">
        <div className="text-sm font-bold text-slate-800 font-mono leading-none">
          {formatHora(fechaDate)}
        </div>
        <div className="text-[11px] text-slate-500 mt-1">{cita.duracionMinutos} min</div>
      </div>

      {/* Divisor */}
      <div className="w-px bg-slate-200 self-stretch flex-shrink-0" />

      {/* Contenido */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-800 truncate">
              {cita.pacienteNombre}
              <span className="text-slate-500 font-normal ml-2 text-xs">· {cita.pacienteRut}</span>
            </div>
            <div className="text-xs text-slate-600 mt-0.5">{cita.tipoAtencion}</div>
            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
              {cita.profesionalNombre} · {cita.box}
              {cita.origenCita === 'app_paciente' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#EEEDFE] text-[#534AB7] text-[10px] font-semibold">
                  App
                </span>
              )}
              {profesionalInactivo && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-orange-50 border border-orange-200 text-orange-600 text-[10px] font-semibold">
                  Profesional inactivo
                </span>
              )}
            </div>
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <select
              value={estadoLocal}
              onChange={handleEstado}
              disabled={cambiando}
              className={`text-[11px] px-2 py-1 rounded-md border font-medium bg-transparent cursor-pointer focus:outline-none transition-colors ${ESTADO_COLORS[estadoLocal]}`}
            >
              {ESTADOS.map(s => (
                <option key={s} value={s} className="bg-white text-slate-800">
                  {ESTADO_LABELS[s]}
                </option>
              ))}
            </select>

            <button
              onClick={() => onEditar(cita)}
              title="Editar cita"
              className="p-1.5 rounded-lg text-slate-400 hover:text-[#0E7490] hover:bg-[#0E7490]/10 transition-colors opacity-0 group-hover:opacity-100"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>

            <button
              onClick={() => onCancelar(cita)}
              title="Cancelar cita"
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Error inline */}
      {errorMsg && (
        <div className="absolute bottom-full left-0 mb-1 px-3 py-1.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg shadow-lg">
          {errorMsg}
        </div>
      )}
    </div>
  );
};
