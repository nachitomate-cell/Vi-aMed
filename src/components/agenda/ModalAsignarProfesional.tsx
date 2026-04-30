import React, { useState, useEffect } from 'react';
import { setDoc, doc, serverTimestamp, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { Profesional } from '../../types/agenda';

interface Props {
  fecha: Date;
  profesionales: Profesional[];
  onCerrar: () => void;
  onAsignado: () => void;
}

export const ModalAsignarProfesional: React.FC<Props> = ({
  fecha, profesionales, onCerrar, onAsignado
}) => {
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [isCerrado, setIsCerrado] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const dKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;

  // Cargar asignación existente al abrir el modal
  useEffect(() => {
    getDoc(doc(db, 'asignaciones', dKey)).then(snap => {
      if (snap.exists()) {
        const data = snap.data();
        setIsCerrado(data.cerrado ?? false);
        // Soportar tanto el array nuevo como el campo único legacy
        if (Array.isArray(data.profesionalesIds)) {
          setSeleccionados(data.profesionalesIds);
        } else if (data.profesionalId) {
          setSeleccionados([data.profesionalId]);
        }
      }
    }).catch(() => {});
  }, [dKey]);

  const toggleProfesional = (id: string) => {
    setSeleccionados(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleAsignar = async () => {
    if (!isCerrado && seleccionados.length === 0) return;
    setGuardando(true);
    try {
      await setDoc(doc(db, 'asignaciones', dKey), {
        fecha: dKey,
        profesionalesIds: isCerrado ? [] : seleccionados,
        // Legacy compat: primer profesional seleccionado
        profesionalId: isCerrado ? null : (seleccionados[0] ?? null),
        cerrado: isCerrado,
        actualizadoEn: serverTimestamp(),
      });
      onAsignado();
    } catch (err) {
      console.error('Error al asignar turno:', err);
    } finally {
      setGuardando(false);
    }
  };

  const handleLimpiar = async () => {
    setGuardando(true);
    try {
      await deleteDoc(doc(db, 'asignaciones', dKey));
      onAsignado();
    } catch (err) {
      console.error('Error al limpiar asignación:', err);
    } finally {
      setGuardando(false);
    }
  };

  const activos = profesionales.filter(p => p.activo);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-5">
        <div>
          <h3 className="text-base font-semibold text-slate-800">Turno del Día</h3>
          <p className="text-xs text-slate-500 mt-1">
            {dKey} · Selecciona uno o más profesionales para el turno.
          </p>
        </div>

        {/* Toggle Cerrado */}
        <button
          onClick={() => setIsCerrado(!isCerrado)}
          className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
            isCerrado
              ? 'bg-rose-50 border-rose-200 ring-1 ring-rose-500'
              : 'bg-emerald-50 border-emerald-200 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isCerrado ? 'bg-rose-500' : 'bg-emerald-500'}`}>
              {isCerrado ? (
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <div className="text-left">
              <p className={`text-sm font-bold ${isCerrado ? 'text-rose-700' : 'text-emerald-700'}`}>
                {isCerrado ? 'Centro Cerrado' : 'Centro Abierto'}
              </p>
              <p className="text-[10px] text-slate-500">Haz clic para cambiar estado</p>
            </div>
          </div>
          <div className={`w-12 h-6 rounded-full p-1 transition-colors ${isCerrado ? 'bg-rose-200' : 'bg-emerald-200'}`}>
            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${isCerrado ? 'translate-x-6' : 'translate-x-0'}`} />
          </div>
        </button>

        {/* Lista multi-selección de profesionales */}
        {!isCerrado && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Profesionales en turno</p>
              {seleccionados.length > 0 && (
                <span className="text-[10px] font-semibold bg-[#0E7490]/10 text-[#0E7490] px-2 py-0.5 rounded-full">
                  {seleccionados.length} seleccionado{seleccionados.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {activos.map(p => {
                const selected = seleccionados.includes(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => toggleProfesional(p.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      selected
                        ? 'border-[#0E7490] bg-[#0E7490]/5 ring-1 ring-[#0E7490]'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                      style={{ backgroundColor: p.color }}
                    >
                      {p.nombre.slice(0, 1)}
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${selected ? 'text-[#0E7490]' : 'text-slate-700'}`}>
                        {p.nombre}
                      </p>
                      <p className="text-[10px] text-slate-500">{p.especialidad ?? p.rol}</p>
                    </div>
                    {/* Checkbox visual */}
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                      selected ? 'bg-[#0E7490] border-[#0E7490]' : 'border-slate-300'
                    }`}>
                      {selected && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })}
              {activos.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4">No hay profesionales activos.</p>
              )}
            </div>
          </div>
        )}

        {/* Acciones */}
        <div className="flex gap-3 pt-2 border-t border-slate-100">
          <button
            onClick={handleLimpiar}
            disabled={guardando}
            className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors disabled:opacity-50"
          >
            Limpiar turno
          </button>
          <button
            onClick={onCerrar}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleAsignar}
            disabled={guardando || (!isCerrado && seleccionados.length === 0)}
            className={`px-5 py-2 flex-1 rounded-xl text-xs font-bold text-white transition-colors shadow-sm ${
              isCerrado ? 'bg-rose-600 hover:bg-rose-700' : 'bg-[#0E7490] hover:bg-[#0C4A6E]'
            } disabled:opacity-50`}
          >
            {guardando
              ? 'Guardando...'
              : isCerrado
              ? 'Confirmar Cierre'
              : `Asignar ${seleccionados.length > 0 ? `(${seleccionados.length})` : 'Turno'}`
            }
          </button>
        </div>
      </div>
    </div>
  );
};
