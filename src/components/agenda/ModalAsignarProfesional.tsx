import React, { useState } from 'react';
import { collection, query, where, getDocs, setDoc, doc, serverTimestamp } from 'firebase/firestore';
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
  const [profesionalId, setProfesionalId] = useState('');
  const [isCerrado, setIsCerrado] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const dKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;

  const handleAsignar = async () => {
    if (!profesionalId) return;
    setGuardando(true);
    try {
      // Guardamos la asignación usando la fecha como ID de documento para que sea única por día
      await setDoc(doc(db, 'asignaciones', dKey), {
        fecha: dKey,
        profesionalId: isCerrado ? null : profesionalId,
        cerrado: isCerrado,
        actualizadoEn: serverTimestamp()
      });
      onAsignado();
    } catch (err) {
      console.error('Error al asignar profesional:', err);
    } finally {
      setGuardando(false);
    }
  };

  const handleLimpiar = async () => {
    setGuardando(true);
    try {
      // Para limpiar, simplemente borramos el documento o lo dejamos vacío
      // En este caso, lo borraremos para que vuelva a la lógica de horario por defecto
      const { deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'asignaciones', dKey));
      onAsignado();
    } catch (err) {
      console.error('Error al limpiar asignación:', err);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-5">
        <div>
          <h3 className="text-base font-semibold text-slate-800">Estado del Día</h3>
          <p className="text-xs text-slate-500 mt-1">
            Gestiona la disponibilidad del centro para el {dKey}.
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

        {!isCerrado && (
          <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Seleccionar Tecnólogo</p>
            {profesionales.filter(p => p.activo).map(p => (
              <button
                key={p.id}
                onClick={() => setProfesionalId(p.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  profesionalId === p.id
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
                <div className="text-left">
                  <p className={`text-sm font-medium ${profesionalId === p.id ? 'text-[#0E7490]' : 'text-slate-700'}`}>
                    {p.nombre}
                  </p>
                  <p className="text-[10px] text-slate-500">{p.rol}</p>
                </div>
                {profesionalId === p.id && (
                  <div className="ml-auto">
                    <svg className="w-5 h-5 text-[#0E7490]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleLimpiar}
            disabled={guardando}
            className="flex-1 px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            Limpiar turno
          </button>
          <button
            onClick={onCerrar}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors"
          >
            Cerrar
          </button>
          <button
            onClick={handleAsignar}
            disabled={guardando || (!isCerrado && !profesionalId)}
            className={`px-5 py-2 flex-1 rounded-xl text-xs font-bold text-white transition-colors shadow-sm ${
              isCerrado ? 'bg-rose-600 hover:bg-rose-700' : 'bg-[#0E7490] hover:bg-[#0C4A6E]'
            } disabled:opacity-50`}
          >
            {guardando ? 'Guardando...' : isCerrado ? 'Confirmar Cierre' : 'Asignar Turno'}
          </button>
        </div>
      </div>
    </div>
  );
};
