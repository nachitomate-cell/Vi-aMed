import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import type { ColumnaAgenda, Slot, Bloqueo } from '../../types/horarios';
import type { Cita } from '../../types/agenda';
import { eliminarBloqueo, excluirDiaBloqueo, truncarRecurrencia } from '../../services/horariosService';

interface Props {
  columnas: ColumnaAgenda[];
  fecha: Date;
  onSlotLibreClick: (profesionalId: string, hora: string, fecha: Date) => void;
  onCitaClick: (cita: Cita) => void;
}

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const DIAS = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

// ─── Avatar con iniciales ─────────────────────────────────────────────────────
const Avatar: React.FC<{ nombre: string; color: string }> = ({ nombre, color }) => {
  const iniciales = nombre.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return (
    <div
      className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
      style={{ background: color || '#0E7490' }}
    >
      {iniciales}
    </div>
  );
};

// ─── Slot Libre ───────────────────────────────────────────────────────────────
const SlotLibre: React.FC<{
  slot: Slot;
  onClick: () => void;
}> = ({ slot, onClick }) => (
  <div
    onClick={onClick}
    className={`group flex items-center gap-2 px-3 py-2.5 border border-dashed hover:border-[#0E7490] rounded-lg cursor-pointer transition-all duration-150 ${
      slot.esSobrecupo ? 'bg-green-100/50 border-green-300 hover:bg-green-200/50' : 'bg-white border-slate-200 hover:bg-[#0E7490]/5'
    }`}
    title={`Agendar ${slot.hora}`}
  >
    <span className={`text-[10px] font-mono group-hover:text-[#0E7490] w-10 flex-shrink-0 ${slot.esSobrecupo ? 'text-green-700 font-bold' : 'text-slate-500'}`}>{slot.hora}</span>
    <span className={`text-xs group-hover:text-[#0E7490] ${slot.esSobrecupo ? 'text-green-800 font-semibold' : 'text-slate-500'}`}>Libre {slot.esSobrecupo && '(Sobrecupo)'}</span>
    <span className="ml-auto opacity-0 group-hover:opacity-100 text-[#0E7490] text-xs transition-opacity">+ Agendar</span>
  </div>
);

// ─── Slot Bloqueado ───────────────────────────────────────────────────────────
const SlotBloqueado: React.FC<{
  slot: Slot;
  fecha: Date;
  onEliminar: (b: Bloqueo, fecha: Date) => void;
}> = ({ slot, fecha, onEliminar }) => (
  <div
    className="flex items-start gap-2 px-3 py-2.5 rounded-lg border border-slate-200"
    style={{
      background: 'repeating-linear-gradient(135deg, #F8FAFC 0px, #F8FAFC 8px, #F1F5F9 8px, #F1F5F9 16px)',
    }}
  >
    <span className="text-[10px] font-mono text-slate-500 w-10 flex-shrink-0 pt-0.5">{slot.hora}</span>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-1.5">
        <svg className="w-3 h-3 text-slate-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <span className="text-xs font-medium text-slate-700 truncate">
          {slot.bloqueo?.motivo || 'Bloqueado'}
        </span>
      </div>
      {slot.duracionMinutos && (
        <span className="text-[10px] text-slate-600">
          {slot.duracionMinutos} min
          {slot.bloqueo?.recurrente ? ' · Recurrente' : ''}
        </span>
      )}
    </div>
    {slot.bloqueo && (
      <button
        onClick={() => onEliminar(slot.bloqueo!, fecha)}
        className="p-0.5 text-slate-400 hover:text-red-600 transition-colors flex-shrink-0"
        title="Eliminar bloqueo"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    )}
  </div>
);

// ─── Slot Tiempo Muerto ───────────────────────────────────────────────────────
const SlotTiempoMuerto: React.FC = () => (
  <div className="flex items-center gap-2 px-3 py-1 bg-[#0E7490]/5 border-l-2 border-[#0E7490]/30">
    <span className="text-[9px] font-medium text-[#0E7490] uppercase tracking-wider">Preparación</span>
  </div>
);

// ─── Tarjeta Cita ─────────────────────────────────────────────────────────────
const TarjetaCitaSlot: React.FC<{ slot: Slot; onClick: () => void }> = ({ slot, onClick }) => {
  const cita = slot.cita!;
  const estadoColors: Record<string, string> = {
    confirmada: 'bg-white border-slate-200 border-l-[#0E7490] shadow-sm',
    solicitada: 'bg-white border-slate-200 border-l-[#D97706] shadow-sm',
    realizada: 'bg-slate-50 border-slate-200 border-l-slate-400',
  };
  const cls = estadoColors[cita.estado] ?? 'bg-white border-slate-200 border-l-[#0E7490] shadow-sm';

  return (
    <div
      onClick={onClick}
      className={`flex items-start gap-2 px-3 py-2.5 rounded-lg border border-l-4 cursor-pointer hover:border-slate-300 transition-all duration-150 ${cls}`}
    >
      <span className="text-[10px] font-mono text-slate-500 w-10 flex-shrink-0 pt-0.5">{slot.hora}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-800 truncate">{cita.pacienteNombre}</p>
            <p className="text-[10px] text-slate-500 truncate">{cita.tipoAtencion}</p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {cita.origenCita === 'app_paciente' && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#EEEDFE] text-[#534AB7] font-semibold">
                App
              </span>
            )}
            {cita.estado === 'Confirmado' && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#CCFBF1] text-[#0F766E] font-semibold">
                Confirmada
              </span>
            )}
          </div>
        </div>
        <p className="text-[9px] text-slate-500">{cita.duracionMinutos} min · {cita.box}</p>
      </div>
    </div>
  );
};

// ─── Columna individual ───────────────────────────────────────────────────────
const ColumnaProfesional: React.FC<{
  columna: ColumnaAgenda;
  fecha: Date;
  onSlotLibreClick: (profesionalId: string, hora: string, fecha: Date) => void;
  onCitaClick: (cita: Cita) => void;
  onEliminarBloqueo: (b: Bloqueo, fecha: Date) => void;
}> = ({ columna, fecha, onSlotLibreClick, onCitaClick, onEliminarBloqueo }) => {
  const { profesional, slots, totalCitas, totalLibres } = columna;

  return (
    <div className="flex flex-col min-w-0">
      {/* Header de columna */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl mb-3 border border-slate-200 shadow-sm">
        <Avatar nombre={profesional.nombre} color={profesional.color} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-slate-800 truncate">{profesional.nombre}</p>
            <Link
              to={`/agenda/${profesional.id}`}
              className="p-0.5 text-slate-300 hover:text-[#0E7490] transition-colors flex-shrink-0"
              title="Ver agenda completa del turno"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </Link>
          </div>
          <p className="text-[10px] text-slate-500 truncate">Tecnólogo Médico</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-[#0E7490] font-medium">{totalCitas} citas</span>
            <span className="text-[10px] text-slate-500">·</span>
            <span className="text-[10px] text-slate-500">{totalLibres} libres</span>
          </div>
        </div>
        <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" title="Activo" />
      </div>

      {/* Slots */}
      <div className="flex flex-col gap-1 overflow-y-auto pr-1" style={{ maxHeight: 'calc(100vh - 22rem)' }}>
        {slots.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-slate-600 text-xs">Sin horario configurado</p>
          </div>
        ) : (
          slots.map((slot, idx) => {
            if (slot.tipo === 'libre') {
              return (
                <SlotLibre
                  key={idx}
                  slot={slot}
                  onClick={() => onSlotLibreClick(profesional.id, slot.hora, fecha)}
                />
              );
            }
            if (slot.tipo === 'cita') {
              return (
                <TarjetaCitaSlot
                  key={idx}
                  slot={slot}
                  onClick={() => onCitaClick(slot.cita!)}
                />
              );
            }
            if (slot.tipo === 'bloqueado') {
              return (
                <SlotBloqueado
                  key={idx}
                  slot={slot}
                  fecha={fecha}
                  onEliminar={onEliminarBloqueo}
                />
              );
            }
            if (slot.tipo === 'tiempo_muerto') {
              return <SlotTiempoMuerto key={idx} />;
            }
            return null;
          })
        )}
      </div>
    </div>
  );
};

// ─── Confirmación eliminar bloqueo ────────────────────────────────────────────
const ConfirmEliminarBloqueo: React.FC<{
  bloqueo: Bloqueo;
  fecha: Date;
  onCancelar: () => void;
  onConfirmar: () => void;
}> = ({ bloqueo, fecha, onCancelar, onConfirmar }) => {
  const [opcion, setOpcion] = useState<'solo_dia' | 'todos'>(bloqueo.recurrente ? 'solo_dia' : 'todos');
  const [ejecutando, setEjecutando] = useState(false);

  const handleConfirmar = async () => {
    setEjecutando(true);
    try {
      if (!bloqueo.recurrente || opcion === 'todos') {
        if (opcion === 'todos' && bloqueo.recurrente) {
          await truncarRecurrencia(bloqueo.id, fecha);
        } else {
          await eliminarBloqueo(bloqueo.id);
        }
      } else {
        await excluirDiaBloqueo(bloqueo.id, fecha);
      }
      onConfirmar();
    } finally {
      setEjecutando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        <h3 className="text-base font-semibold text-slate-800 mb-2">Eliminar bloqueo</h3>
        <p className="text-sm text-slate-500 mb-4">
          <strong className="text-slate-800">{bloqueo.motivo}</strong>
        </p>

        {bloqueo.recurrente && (
          <div className="space-y-2 mb-5">
            {['solo_dia', 'todos'].map(op => (
              <label key={op} className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="radio"
                  name="opElim"
                  checked={opcion === op}
                  onChange={() => setOpcion(op as 'solo_dia' | 'todos')}
                  className="accent-red-600"
                />
                <span className="text-sm text-slate-600 group-hover:text-slate-800">
                  {op === 'solo_dia' ? 'Eliminar solo este día' : 'Eliminar este y todos los siguientes'}
                </span>
              </label>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-3 mt-4">
          <button onClick={onCancelar} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-800 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleConfirmar}
            disabled={ejecutando}
            className="flex items-center gap-2 px-4 py-2 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {ejecutando && <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />}
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Vista de columnas principal ──────────────────────────────────────────────
export const VistaColumnas: React.FC<Props> = ({
  columnas, fecha, onSlotLibreClick, onCitaClick,
}) => {
  const [bloqueoAEliminar, setBloqueoAEliminar] = useState<{ b: Bloqueo; fecha: Date } | null>(null);

  return (
    <>
      {/* Header fecha */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
        <div>
          <h2 className="text-base font-semibold text-slate-800">
            {DIAS[fecha.getDay()]} {fecha.getDate()} de {MESES[fecha.getMonth()]}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {columnas.length} tecnólogo{columnas.length !== 1 ? 's' : ''} · Vista de columnas
          </p>
        </div>
      </div>

      {/* Grid de columnas */}
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: `repeat(${columnas.length}, 1fr)` }}
      >
        {columnas.map(col => (
          <ColumnaProfesional
            key={col.profesional.id}
            columna={col}
            fecha={fecha}
            onSlotLibreClick={onSlotLibreClick}
            onCitaClick={onCitaClick}
            onEliminarBloqueo={(b, f) => setBloqueoAEliminar({ b, fecha: f })}
          />
        ))}
      </div>

      {/* Modal confirmación eliminar bloqueo */}
      {bloqueoAEliminar && (
        <ConfirmEliminarBloqueo
          bloqueo={bloqueoAEliminar.b}
          fecha={bloqueoAEliminar.fecha}
          onCancelar={() => setBloqueoAEliminar(null)}
          onConfirmar={() => setBloqueoAEliminar(null)}
        />
      )}
    </>
  );
};
