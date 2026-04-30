import React, { useState, useEffect } from 'react';
import type { Profesional, RolProfesional } from '../../types/agenda';
import { actualizarProfesional, toggleActivoProfesional } from '../../services/profesionalesService';
import { ColorPicker } from './ColorPicker';

interface Props {
  profesional: Profesional;
  onActualizado: (p: Profesional) => void;
}

const ROLES: { value: RolProfesional; label: string }[] = [
  { value: 'medico', label: 'Médico' },
  { value: 'tecnologo', label: 'Tecnólogo' },
  { value: 'enfermero', label: 'Enfermero' },
  { value: 'secretaria', label: 'Secretaria' },
];

export const FormEditarProfesional: React.FC<Props> = ({ profesional, onActualizado }) => {
  const [form, setForm] = useState({ ...profesional });
  const [guardando, setGuardando] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [confirmDesactivar, setConfirmDesactivar] = useState(false);
  const [procesandoToggle, setProcesandoToggle] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  useEffect(() => { setForm({ ...profesional }); setShowValidation(false); }, [profesional]);

  const set = (field: string, value: string | boolean | number) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const mostrarToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const isValid = 
    form.rut?.trim() && 
    form.nombre?.trim() && 
    form.apellidoPaterno?.trim() && 
    form.apellidoMaterno?.trim() && 
    form.telefono?.trim() && 
    form.especialidad?.trim() && 
    form.comision !== undefined && form.comision !== null &&
    form.activo !== undefined;

  const handleGuardar = async () => {
    setShowValidation(true);
    if (!isValid) return;

    setGuardando(true);
    try {
      const { id, ...datos } = form;
      await actualizarProfesional(id, datos);
      onActualizado(form);
      mostrarToast('Perfil actualizado correctamente');
    } catch {
      mostrarToast('Error al guardar cambios');
    } finally {
      setGuardando(false);
    }
  };

  const handleToggleActivo = async () => {
    setProcesandoToggle(true);
    try {
      const nuevoActivo = !profesional.activo;
      await toggleActivoProfesional(profesional.id, nuevoActivo);
      onActualizado({ ...profesional, activo: nuevoActivo });
      mostrarToast(nuevoActivo ? 'Profesional reactivado' : 'Profesional desactivado');
    } catch {
      mostrarToast('Error al cambiar estado');
    } finally {
      setProcesandoToggle(false);
      setConfirmDesactivar(false);
    }
  };

  return (
    <div className="space-y-6 max-w-xl">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 shadow-xl animate-in fade-in">
          {toast}
        </div>
      )}

      <div>
        <p className="text-sm font-medium text-amber-600 bg-amber-50 px-4 py-2 rounded-lg border border-amber-200 inline-block mb-2">
          (*) Obligatorio
        </p>

        {showValidation && (
          <div className={`px-4 py-3 rounded-lg font-semibold text-sm mb-4 border ${isValid ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
            {isValid ? 'FORMULARIO VÁLIDO' : 'FORMULARIO INVÁLIDO: Complete todos los campos obligatorios'}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">RUT *</label>
            <input
              type="text"
              value={form.rut || ''}
              onChange={e => set('rut', e.target.value)}
              placeholder="Ej: 12.345.678-9"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-[#0E7490] transition-colors"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Nombres *</label>
            <input
              type="text"
              value={form.nombre || ''}
              onChange={e => set('nombre', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-[#0E7490] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Apellido paterno *</label>
            <input
              type="text"
              value={form.apellidoPaterno || ''}
              onChange={e => set('apellidoPaterno', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-[#0E7490] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Apellido materno *</label>
            <input
              type="text"
              value={form.apellidoMaterno || ''}
              onChange={e => set('apellidoMaterno', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-[#0E7490] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Teléfono *</label>
            <input
              type="tel"
              value={form.telefono || ''}
              onChange={e => set('telefono', e.target.value)}
              placeholder="Ej: 997836861"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-[#0E7490] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Correo</label>
            <input
              type="email"
              value={form.email || ''}
              onChange={e => set('email', e.target.value)}
              placeholder="Ej: usuario@gmail.com"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-[#0E7490] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Especialidad *</label>
            <input
              type="text"
              value={form.especialidad || ''}
              onChange={e => set('especialidad', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-[#0E7490] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Comisión * (%)</label>
            <input
              type="number"
              value={form.comision ?? ''}
              onChange={e => set('comision', Number(e.target.value))}
              placeholder="Ej: 50"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-[#0E7490] transition-colors"
            />
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Rol de sistema</label>
            <select
              value={form.rol}
              onChange={e => set('rol', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-[#0E7490] appearance-none"
            >
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
        </div>

        <div className="pt-2">
          <label className="block text-xs font-semibold text-slate-400 mb-2">Color en calendario</label>
          <ColorPicker value={form.color} onChange={c => set('color', c)} />
        </div>

        <div className="pt-2">
          <label className="block text-xs font-semibold text-slate-400 mb-2">Estado *</label>
          <div className="flex gap-4">
            {[true, false].map(v => (
              <label key={String(v)} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="activo"
                  checked={form.activo === v}
                  onChange={() => set('activo', v)}
                  className="accent-[#0E7490]"
                />
                <span className="text-sm text-slate-300">
                  {v ? '● Activo' : '○ Inactivo'}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t border-slate-700/50">
        <button
          onClick={handleGuardar}
          disabled={guardando}
          className="px-5 py-2.5 bg-[#0E7490] hover:bg-[#0c6680] disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          {guardando ? 'Guardando...' : 'Guardar cambios'}
        </button>
        <button
          onClick={() => { setForm({ ...profesional }); setShowValidation(false); }}
          className="px-5 py-2.5 text-sm text-slate-400 hover:text-slate-200 border border-slate-700 rounded-xl transition-colors"
        >
          Cancelar
        </button>
      </div>

      <div className="border border-red-900/40 rounded-2xl p-5 space-y-3 mt-4">
        <p className="text-sm font-semibold text-red-400 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Zona de riesgo
        </p>
        <p className="text-xs text-slate-500">
          {profesional.activo
            ? 'Desactivar al profesional lo ocultará de la agenda. Las citas existentes no se eliminan.'
            : 'Reactivar al profesional lo volverá a mostrar en la agenda.'}
        </p>
        <button
          onClick={() => setConfirmDesactivar(true)}
          className="px-4 py-2 text-sm font-semibold text-red-400 border border-red-900/50 rounded-xl hover:bg-red-900/20 transition-colors"
        >
          {profesional.activo
            ? `Desactivar a ${profesional.nombre}`
            : `Reactivar a ${profesional.nombre}`}
        </button>
      </div>

      {confirmDesactivar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0f1623] border border-slate-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-base font-semibold text-slate-200 mb-2">
              {profesional.activo ? 'Desactivar profesional' : 'Reactivar profesional'}
            </h3>
            <p className="text-sm text-slate-400 mb-5">
              ¿Confirma que desea {profesional.activo ? 'desactivar' : 'reactivar'} a{' '}
              <strong className="text-slate-200">{profesional.nombre}</strong>?
              {profesional.activo && ' Las citas existentes no se eliminarán.'}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDesactivar(false)}
                className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
              >
                Volver
              </button>
              <button
                onClick={handleToggleActivo}
                disabled={procesandoToggle}
                className="px-4 py-2 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                {procesandoToggle ? 'Procesando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
