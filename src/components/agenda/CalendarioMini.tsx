import React, { useMemo } from 'react';

// Días de atención configurados para los tecnólogos
export const DIAS_CON_ATENCION = new Set([1, 3, 6]); // Lun=1, Mié=3, Sáb=6

interface Props {
  mesActual: Date;
  fechaSeleccionada: Date;
  fechasConCitas: Set<string>;
  /** Fechas con todos los slots bloqueados (string YYYY-MM-DD) */
  fechasTotalBloqueadas?: Set<string>;
  /** Fechas con bloqueo parcial */
  fechasBloqueParcial?: Set<string>;
  onDaySelect: (date: Date) => void;
  onPrevMes: () => void;
  onNextMes: () => void;
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const CABECERA = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function toKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const CalendarioMini: React.FC<Props> = ({
  mesActual, fechaSeleccionada, fechasConCitas,
  fechasTotalBloqueadas = new Set(),
  fechasBloqueParcial = new Set(),
  onDaySelect, onPrevMes, onNextMes,
}) => {
  const year = mesActual.getFullYear();
  const month = mesActual.getMonth();

  const cells = useMemo<Array<Date | null>>(() => {
    const firstDay = new Date(year, month, 1);
    let offset = firstDay.getDay() - 1;
    if (offset < 0) offset = 6;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const arr: Array<Date | null> = [];
    for (let i = 0; i < offset; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(new Date(year, month, d));
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [year, month]);

  const todayKey = toKey(new Date());
  const selectedKey = toKey(fechaSeleccionada);

  return (
    <div>
      {/* Encabezado mes */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onPrevMes}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-sm font-semibold text-slate-800">
          {MESES[month]} {year}
        </span>
        <button
          onClick={onNextMes}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Días de semana */}
      <div className="grid grid-cols-7 mb-1">
        {CABECERA.map((d, i) => (
          <div key={i} className="text-center text-[10px] font-bold text-[#9CA3AF] uppercase py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Celdas */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const key = toKey(day);
          const isSelected = key === selectedKey;
          const isToday = key === todayKey;
          const hasCita = fechasConCitas.has(key);
          const tieneDia = DIAS_CON_ATENCION.has(day.getDay());
          const totalBloqueado = fechasTotalBloqueadas.has(key);
          const bloqueParcial = fechasBloqueParcial.has(key);
          const clickeable = true; // Siempre clickeable para permitir apertura extraordinaria

          return (
            <button
              key={i}
              onClick={() => clickeable ? onDaySelect(day) : undefined}
              disabled={!clickeable}
              className={`relative flex flex-col items-center justify-center aspect-square text-xs font-medium rounded-lg transition-colors ${
                isSelected
                  ? 'bg-[#0E7490] text-white font-bold shadow-sm'
                  : totalBloqueado
                  ? 'text-red-500/70 line-through'
                  : isToday
                  ? 'text-[#0E7490] border border-[#0E7490]/30 hover:bg-[#0E7490]/10 font-bold'
                  : !tieneDia
                  ? 'text-slate-300 hover:bg-slate-50'
                  : 'text-[#374151] hover:bg-slate-100'
              }`}
            >
              {day.getDate()}
              {/* Punto teal: día con citas */}
              {hasCita && !isSelected && !totalBloqueado && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#0E7490]" />
              )}
              {/* Punto naranja: bloqueo parcial */}
              {bloqueParcial && !isSelected && !totalBloqueado && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-orange-500" />
              )}
            </button>
          );
        })}
      </div>

      {/* Leyenda */}
      <div className="mt-3 pt-3 border-t border-slate-200 space-y-1">
        <div className="flex items-center gap-2 text-[10px] text-slate-700">
          <span className="w-2 h-2 rounded-full bg-[#0E7490] flex-shrink-0" />
          Con citas
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-700">
          <span className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0" />
          Bloqueo parcial
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-700">
          <span className="w-2 h-2 rounded-full bg-slate-300 flex-shrink-0" />
          Sin atención L·M·S
        </div>
      </div>
    </div>
  );
};
