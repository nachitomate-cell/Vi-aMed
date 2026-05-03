import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Cita, EstadoCita } from '../../types/agenda';
import { ESTADO_COLORS, ESTADO_LABELS } from '../../types/agenda';
import { actualizarEstadoCita } from '../../services/agendaService';

interface Props {
  cita: Cita | null;
  onCerrar: () => void;
}

const ESTADOS: EstadoCita[] = ['Agendado', 'Confirmado', 'En espera', 'En atención', 'Rezagado', 'Finalizado', 'Anulado', 'No asistió'];

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function formatFechaLarga(d: Date): string {
  return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

function formatHora(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function toDateInputValue(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export const DrawerDetalleCita: React.FC<Props> = ({ cita, onCerrar }) => {
  const navigate = useNavigate();
  const [estado, setEstado] = useState<EstadoCita | null>(null);
  const [cambiando, setCambiando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastOk, setToastOk] = useState(false);

  const estadoActual = estado ?? cita?.estado ?? 'Agendado';

  const handleEstado = async (nuevo: EstadoCita) => {
    if (!cita) return;
    setCambiando(true);
    try {
      await actualizarEstadoCita(cita.id, nuevo);
      setEstado(nuevo);
      setToastOk(true);
      setTimeout(() => setToastOk(false), 2000);
    } catch {
      setError('Error al actualizar estado');
      setTimeout(() => setError(null), 3000);
    } finally {
      setCambiando(false);
    }
  };

  if (!cita) return null;

  const fechaDate = cita.fecha.toDate();
  const fechaInput = toDateInputValue(fechaDate);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onCerrar}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-[#0b1120] border-l border-slate-800 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
              estadoActual === 'Finalizado' ? 'bg-indigo-500' :
              estadoActual === 'Anulado' ? 'bg-red-500' :
              estadoActual === 'En atención' ? 'bg-emerald-500' :
              estadoActual === 'En espera' ? 'bg-amber-500' :
              'bg-slate-500'
            }`} />
            <h3 className="font-semibold text-slate-200 text-sm">Detalle de atención</h3>
          </div>
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
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Fecha + hora + estado */}
          <div className="bg-slate-800/40 rounded-xl p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-200">{formatFechaLarga(fechaDate)}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {formatHora(fechaDate)}
                  {cita.duracionMinutos ? ` · ${cita.duracionMinutos} min` : ''}
                  {cita.box ? ` · ${cita.box}` : ''}
                </p>
              </div>
              <span className={`text-[10px] px-2.5 py-1 rounded-full border font-semibold flex-shrink-0 ${ESTADO_COLORS[estadoActual]}`}>
                {ESTADO_LABELS[estadoActual]}
              </span>
            </div>
          </div>

          {/* Paciente */}
          <div className="bg-slate-800/40 rounded-xl p-4 space-y-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Paciente</p>
            <p className="font-semibold text-slate-100 leading-tight">{cita.pacienteNombre}</p>
            <div className="grid grid-cols-2 gap-1 text-xs text-slate-400">
              <span>RUT: <span className="text-slate-300 font-mono">{cita.pacienteRut}</span></span>
              {cita.pacienteEdad && <span>Edad: <span className="text-slate-300">{cita.pacienteEdad} años</span></span>}
              {cita.pacienteSexo && <span>Sexo: <span className="text-slate-300">{cita.pacienteSexo}</span></span>}
              {cita.pacienteTelefono && (
                <span className="col-span-2">
                  Tel:{' '}
                  <a href={`tel:${cita.pacienteTelefono}`} className="text-[#0E7490] hover:underline font-mono">
                    {cita.pacienteTelefono}
                  </a>
                </span>
              )}
            </div>
          </div>

          {/* Atención */}
          <div className="bg-slate-800/40 rounded-xl p-4 space-y-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Atención</p>
            <p className="font-semibold text-slate-100 leading-tight">{cita.tipoAtencion}</p>
            <div className="text-xs text-slate-400 space-y-0.5">
              <p>{cita.profesionalNombre}</p>
              {cita.prevision && (
                <p>Previsión: <span className="text-slate-300">{cita.prevision}</span></p>
              )}
              {cita.origenCita && (
                <p>Origen: <span className="text-slate-300">{cita.origenCita}</span></p>
              )}
            </div>
          </div>

          {/* Notas */}
          {cita.notas && (
            <div className="bg-slate-800/40 rounded-xl p-4 space-y-1.5">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Notas</p>
              <p className="text-sm text-slate-300 leading-relaxed">{cita.notas}</p>
            </div>
          )}

          {/* Cambiar estado */}
          <div className="space-y-2.5">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cambiar estado</p>
            <div className="grid grid-cols-2 gap-1.5">
              {ESTADOS.map(s => (
                <button
                  key={s}
                  onClick={() => s !== estadoActual && handleEstado(s)}
                  disabled={cambiando || s === estadoActual}
                  className={`py-2 px-2 text-[11px] font-semibold rounded-lg border transition-all disabled:cursor-default ${
                    s === estadoActual
                      ? `${ESTADO_COLORS[s]} ring-1 ring-offset-1 ring-offset-slate-900 ring-current`
                      : `${ESTADO_COLORS[s]} opacity-50 hover:opacity-100 disabled:opacity-50`
                  }`}
                >
                  {s === estadoActual && '✓ '}{ESTADO_LABELS[s]}
                </button>
              ))}
            </div>
            {toastOk && (
              <p className="text-xs text-emerald-400 text-center">Estado actualizado correctamente</p>
            )}
            {error && <p className="text-xs text-red-400 text-center">{error}</p>}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex-shrink-0 space-y-2">
          <button
            onClick={() => {
              onCerrar();
              navigate(`/agenda?fecha=${fechaInput}`);
            }}
            className="w-full py-2.5 text-sm font-semibold text-[#0E7490] border border-[#0E7490]/30 rounded-xl hover:bg-[#0E7490]/10 transition-colors"
          >
            Ver en Agenda →
          </button>
          <button
            onClick={() => {
              onCerrar();
              navigate(`/pacientes/${encodeURIComponent(cita.pacienteRut)}`);
            }}
            className="w-full py-2.5 text-sm font-semibold text-slate-400 border border-slate-700 rounded-xl hover:bg-slate-800 hover:text-slate-200 transition-colors"
          >
            Ver ficha paciente →
          </button>
        </div>
      </div>
    </>
  );
};
