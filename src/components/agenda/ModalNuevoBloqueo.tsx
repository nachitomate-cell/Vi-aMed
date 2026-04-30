import React, { useState } from 'react';
import { Timestamp } from 'firebase/firestore';
import type { Bloqueo } from '../../types/horarios';
import type { Profesional } from '../../types/agenda';
import { crearBloqueo, crearBloqueoAmbos } from '../../services/horariosService';
import { useAuth } from '../../auth/AuthContext';

interface Props {
  profesionales: Profesional[];
  fechaDefault?: Date;
  onCerrar: () => void;
  onCreado: () => void;
}

type TipoBloqUI = 'rango' | 'dia_completo';

const inputCls =
  'w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0E7490] transition-colors';
const selectCls = `${inputCls} appearance-none cursor-pointer`;

function formatDateInput(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export const ModalNuevoBloqueo: React.FC<Props> = ({
  profesionales, fechaDefault, onCerrar, onCreado,
}) => {
  const { user } = useAuth();
  const [profSel, setProfSel] = useState<'todos' | string>(
    profesionales.length > 0 ? profesionales[0].id : 'todos'
  );
  const [tipo, setTipo] = useState<TipoBloqUI>('rango');
  const [fecha, setFecha] = useState(fechaDefault ? formatDateInput(fechaDefault) : formatDateInput(new Date()));
  const [horaInicio, setHoraInicio] = useState('09:00');
  const [horaFin, setHoraFin] = useState('09:00');
  const [motivo, setMotivo] = useState('');
  const [recurrente, setRecurrente] = useState(false);
  const [diasRec, setDiasRec] = useState<number[]>([1, 3, 6]);
  const [fechaFinRec, setFechaFinRec] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleDiaRec = (dia: number) => {
    setDiasRec(prev =>
      prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia]
    );
  };

  const handleCrear = async () => {
    if (!motivo.trim()) { setError('Ingrese un motivo para el bloqueo'); return; }
    if (tipo === 'rango' && horaInicio >= horaFin) { setError('La hora de inicio debe ser anterior a la hora de fin'); return; }
    if (recurrente && diasRec.length === 0) { setError('Seleccione al menos un día de recurrencia'); return; }

    setGuardando(true);
    setError(null);

    try {
      const fechaDate = new Date(fecha + 'T00:00:00');
      const datos: Omit<Bloqueo, 'id' | 'creadoEn' | 'profesionalId'> = {
        tipo: tipo === 'dia_completo' ? 'dia_completo' : 'rango',
        motivo: motivo.trim(),
        fecha: Timestamp.fromDate(fechaDate),
        horaInicio: tipo === 'rango' ? horaInicio : undefined,
        horaFin: tipo === 'rango' ? horaFin : undefined,
        diaCompleto: tipo === 'dia_completo',
        recurrente,
        diasRecurrencia: recurrente ? diasRec : [],
        fechaFinRecurrencia: recurrente && fechaFinRec
          ? Timestamp.fromDate(new Date(fechaFinRec + 'T23:59:59'))
          : undefined,
        fechasExcluidas: [],
        creadoPor: user?.rut ?? 'sistema',
      };

      if (profSel === 'todos') {
        await crearBloqueoAmbos(profesionales.map(p => p.id), datos);
      } else {
        await crearBloqueo({ ...datos, profesionalId: profSel });
      }

      onCreado();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear el bloqueo');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="relative bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-[#0E7490]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <h2 className="text-base font-semibold text-slate-800">Nuevo bloqueo</h2>
          </div>
          <button onClick={onCerrar} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {error && (
            <div className="p-3 bg-red-900/40 border border-red-700/50 rounded-xl text-xs text-red-300">
              {error}
            </div>
          )}

          {/* Profesional */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Profesional</label>
            <select value={profSel} onChange={e => setProfSel(e.target.value)} className={selectCls}>
              {profesionales.map(p => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
              <option value="todos">Ambos profesionales</option>
            </select>
          </div>

          {/* Tipo */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-2">Tipo de bloqueo</label>
            <div className="flex gap-3">
              {(['rango', 'dia_completo'] as TipoBloqUI[]).map(t => (
                <label key={t} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="radio"
                    name="tipo"
                    checked={tipo === t}
                    onChange={() => setTipo(t)}
                    className="accent-[#0E7490]"
                  />
                  <span className="text-sm text-slate-600 group-hover:text-slate-800">
                    {t === 'rango' ? 'Rango de horas' : 'Día completo'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Fecha */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Fecha</label>
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className={inputCls} />
          </div>

          {/* Rango de horas */}
          {tipo === 'rango' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Desde</label>
                <input type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Hasta</label>
                <input type="time" value={horaFin} onChange={e => setHoraFin(e.target.value)} className={inputCls} />
              </div>
            </div>
          )}

          {/* Motivo */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Motivo <span className="text-slate-400">(visible solo al equipo)</span>
            </label>
            <input
              type="text"
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder="Ej: Reunión interna, Licencia médica..."
              className={inputCls}
            />
          </div>

          {/* Recurrente */}
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={recurrente}
              onChange={e => setRecurrente(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 bg-white accent-[#0E7490] cursor-pointer"
            />
            <span className="text-sm text-slate-600 group-hover:text-slate-800">Bloqueo recurrente</span>
          </label>

          {recurrente && (
            <div className="pl-7 space-y-4 border-l-2 border-slate-200 ml-2">
              {/* Días de recurrencia */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">Repetir los días</label>
                <div className="flex gap-2 flex-wrap">
                  {DIAS_SEMANA.map((d, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleDiaRec(i)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                        diasRec.includes(i)
                          ? 'bg-[#0E7490] text-white'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              {/* Fecha fin recurrencia */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Hasta</label>
                <input
                  type="date"
                  value={fechaFinRec}
                  onChange={e => setFechaFinRec(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 flex-shrink-0">
          <button onClick={onCerrar} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-800 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleCrear}
            disabled={guardando}
            className="flex items-center gap-2 px-5 py-2 bg-[#0E7490] hover:bg-[#0c6680] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {guardando && (
              <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
            )}
            {guardando ? 'Creando...' : 'Crear bloqueo'}
          </button>
        </div>
      </div>
    </div>
  );
};
