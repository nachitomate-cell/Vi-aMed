import React, { useMemo } from 'react';
import type { Cita } from '../../types/agenda';
import { TarjetaCita } from './TarjetaCita';

interface Props {
  fecha: Date;
  citas: Cita[];
  cargando: boolean;
  onNuevaCita: () => void;
  onEditar: (cita: Cita) => void;
  onCancelar: (cita: Cita) => void;
}

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

const HoraActualLine: React.FC = () => {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  return (
    <div className="flex items-center gap-2 py-1 pointer-events-none">
      <span className="text-[10px] font-bold text-cyan-400 font-mono w-14 text-right flex-shrink-0">
        {h}:{m}
      </span>
      <div className="flex-1 h-px bg-cyan-700 relative">
        <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
      </div>
    </div>
  );
};

export const ListaCitasDia: React.FC<Props> = ({
  fecha, citas, cargando, onNuevaCita, onEditar, onCancelar,
}) => {
  const esHoy = isSameDay(fecha, new Date());

  const citasOrdenadas = useMemo(
    () => [...citas].sort((a, b) => a.fecha.toDate().getTime() - b.fecha.toDate().getTime()),
    [citas]
  );

  const nowMinutos = esHoy
    ? new Date().getHours() * 60 + new Date().getMinutes()
    : -1;

  const nuevasBadge = citas.filter(c => c.estado === 'solicitada').length;

  const headerFecha = `${DIAS[fecha.getDay()]} ${fecha.getDate()} de ${MESES[fecha.getMonth()]}`;
  const countLabel = cargando ? 'Cargando...' : `${citas.length} ${citas.length === 1 ? 'cita' : 'citas'}`;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-200">{headerFecha}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{countLabel}</p>
          </div>
          {nuevasBadge > 0 && (
            <span className="px-2 py-0.5 text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded-full animate-pulse">
              {nuevasBadge} nueva{nuevasBadge > 1 ? 's' : ''} solicitud{nuevasBadge > 1 ? 'es' : ''}
            </span>
          )}
        </div>
        <button
          onClick={onNuevaCita}
          className="flex items-center gap-2 px-3 py-2 bg-cyan-700 hover:bg-cyan-600 text-white text-xs font-semibold rounded-xl transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nueva cita
        </button>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {cargando ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 rounded-full border-2 border-cyan-600 border-t-transparent animate-spin" />
          </div>
        ) : citasOrdenadas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-slate-500 text-sm">No hay citas para este día</p>
            <button
              onClick={onNuevaCita}
              className="mt-3 text-xs text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
            >
              + Agendar primera cita
            </button>
          </div>
        ) : (
          citasOrdenadas.map((cita, idx) => {
            const citaMin = cita.fecha.toDate().getHours() * 60 + cita.fecha.toDate().getMinutes();
            const prevMin = idx > 0
              ? citasOrdenadas[idx - 1].fecha.toDate().getHours() * 60 + citasOrdenadas[idx - 1].fecha.toDate().getMinutes()
              : -1;
            const showNow = esHoy && nowMinutos >= prevMin && nowMinutos < citaMin;

            return (
              <React.Fragment key={cita.id}>
                {showNow && <HoraActualLine />}
                <TarjetaCita cita={cita} onEditar={onEditar} onCancelar={onCancelar} />
              </React.Fragment>
            );
          })
        )}

        {/* Línea ahora al final, si el tiempo actual superó la última cita */}
        {esHoy && citasOrdenadas.length > 0 && (() => {
          const lastMin =
            citasOrdenadas[citasOrdenadas.length - 1].fecha.toDate().getHours() * 60 +
            citasOrdenadas[citasOrdenadas.length - 1].fecha.toDate().getMinutes();
          return nowMinutos > lastMin ? <HoraActualLine /> : null;
        })()}
      </div>
    </div>
  );
};
