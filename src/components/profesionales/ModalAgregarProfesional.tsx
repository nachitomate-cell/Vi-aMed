import React, { useState } from 'react';
import type { RolProfesional } from '../../types/agenda';
import { crearProfesional } from '../../services/profesionalesService';
import { ColorPicker, COLORES_PREDEFINIDOS } from './ColorPicker';
import { useGestionDatos } from '../../hooks/useGestionDatos';

interface Props {
  onCreado: () => void;
  onCerrar: () => void;
}

const ROLES: { value: RolProfesional; label: string }[] = [
  { value: 'medico', label: 'Médico' },
  { value: 'tecnologo', label: 'Tecnólogo' },
  { value: 'enfermero', label: 'Enfermero' },
  { value: 'secretaria', label: 'Secretaria' },
];

export const ModalAgregarProfesional: React.FC<Props> = ({ onCreado, onCerrar }) => {
  const [form, setForm] = useState({
    nombre: '',
    apellidoPaterno: '',
    apellidoMaterno: '',
    rut: '',
    telefono: '',
    comision: 50,
    rol: 'medico' as RolProfesional,
    especialidad: '',
    color: COLORES_PREDEFINIDOS[0],
    email: '',
    activo: true,
  });

  const isValid = 
    form.rut?.trim() && 
    form.nombre?.trim() && 
    form.especialidad?.trim() && 
    form.activo !== undefined;

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { opciones } = useGestionDatos();

  const set = (field: string, value: string | boolean) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleCrear = async () => {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return; }
    if (!form.email.trim()) { setError('El email es obligatorio para enviar la invitación'); return; }
    if (!form.rut.trim()) { setError('El RUT es obligatorio'); return; }
    setGuardando(true);
    setError(null);
    try {
      await crearProfesional(form);
      onCreado();
    } catch {
      setError('Error al crear profesional. Inténtalo de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-800">Agregar profesional</h2>
          <button
            onClick={onCerrar}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nombre completo *</label>
            <input
              type="text"
              value={form.nombre}
              onChange={e => set('nombre', e.target.value)}
              placeholder="Ej: Dr. Martín Rojas"
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0E7490] transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Apellido Paterno</label>
              <input
                type="text"
                value={form.apellidoPaterno}
                onChange={e => set('apellidoPaterno', e.target.value)}
                placeholder="Ej: Pérez"
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#0E7490] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Apellido Materno</label>
              <input
                type="text"
                value={form.apellidoMaterno}
                onChange={e => set('apellidoMaterno', e.target.value)}
                placeholder="Ej: Soto"
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#0E7490] transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">RUT *</label>
              <input
                type="text"
                value={form.rut}
                onChange={e => set('rut', e.target.value)}
                placeholder="Ej: 12.345.678-9"
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#0E7490] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Teléfono</label>
              <input
                type="tel"
                value={form.telefono}
                onChange={e => set('telefono', e.target.value)}
                placeholder="Ej: 997836861"
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#0E7490] transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Rol</label>
              <select
                value={form.rol}
                onChange={e => set('rol', e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#0E7490] appearance-none"
              >
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Especialidad</label>
              <select
                value={form.especialidad}
                onChange={e => set('especialidad', e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#0E7490] appearance-none"
              >
                <option value="">Seleccionar...</option>
                {opciones.especialidades.map(esp => (
                  <option key={esp} value={esp}>{esp}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Comisión (%)</label>
            <input
              type="number"
              value={form.comision}
              onChange={e => set('comision', Number(e.target.value))}
              placeholder="Ej: 50"
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#0E7490] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">Color en calendario</label>
            <ColorPicker value={form.color} onChange={c => set('color', c)} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              placeholder="correo@ejemplo.com"
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0E7490] transition-colors"
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200">
          <button
            onClick={onCerrar}
            className="px-4 py-2 text-sm text-slate-500 hover:text-slate-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleCrear}
            disabled={guardando}
            className="px-5 py-2 bg-[#0E7490] hover:bg-[#0c6680] disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {guardando ? 'Creando...' : 'Crear profesional'}
          </button>
        </div>
      </div>
    </div>
  );
};
