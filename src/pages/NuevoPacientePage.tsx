import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useGestionDatos } from '../hooks/useGestionDatos';

interface PacienteForm {
  tipoDocumento: 'rut' | 'pasaporte';
  rut: string;
  pasaporte: string;
  pais: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  fechaNacimiento: string;
  telefono: string;
  correo: string;
  sexo: string;
  direccion: string;
}

const EMPTY: PacienteForm = {
  tipoDocumento: 'rut',
  rut: '',
  pasaporte: '',
  pais: '',
  nombres: '',
  apellidoPaterno: '',
  apellidoMaterno: '',
  fechaNacimiento: '',
  telefono: '',
  correo: '',
  sexo: '',
  direccion: ''
};

const NuevoPacientePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from ?? '/dashboard';
  const [form, setForm] = useState<PacienteForm>(EMPTY);
  const [saved, setSaved] = useState(false);
  const [showError, setShowError] = useState(false);
  const { opciones } = useGestionDatos();

  const set = (k: keyof PacienteForm, v: string) => setForm(f => ({ ...f, [k]: v }));

  const isExtranjero = form.tipoDocumento === 'pasaporte';

  const handleSave = () => {
    // Validations
    if (isExtranjero) {
      if (!form.pasaporte || !form.pais || !form.nombres || !form.apellidoPaterno || !form.apellidoMaterno || !form.fechaNacimiento || !form.telefono) {
        setShowError(true);
        return;
      }
    } else {
      if (!form.rut || !form.nombres || !form.apellidoPaterno || !form.apellidoMaterno || !form.fechaNacimiento || !form.telefono) {
        setShowError(true);
        return;
      }
    }

    setShowError(false);
    setSaved(true);
    setTimeout(() => {
      setForm(EMPTY);
      setSaved(false);
      navigate(from);
    }, 1500);
  };

  return (
    <div className="p-5 max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Registrar Paciente</h1>
        <p className="text-sm text-slate-500 mt-0.5">Ingresa un nuevo paciente en el sistema</p>
      </div>

      {saved ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
          <div className="text-2xl mb-2 text-emerald-600">✓</div>
          <p className="text-emerald-700 font-semibold">Paciente registrado correctamente</p>
          <p className="text-slate-500 text-sm mt-1">Redirigiendo al dashboard...</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-amber-600 bg-amber-50 px-4 py-2 rounded-lg border border-amber-200 inline-block">
              (*) Obligatorio
            </p>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="nacionalidad"
                  checked={!isExtranjero}
                  onChange={() => set('tipoDocumento', 'rut')}
                  className="w-4 h-4 text-[#0E7490] focus:ring-[#0E7490]"
                />
                <span className="text-sm font-medium text-slate-700">Chileno(a)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="nacionalidad"
                  checked={isExtranjero}
                  onChange={() => set('tipoDocumento', 'pasaporte')}
                  className="w-4 h-4 text-[#0E7490] focus:ring-[#0E7490]"
                />
                <span className="text-sm font-medium text-slate-700">Extranjero(a)</span>
              </label>
            </div>
          </div>

          {showError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg font-semibold text-sm">
              FORMULARIO INVÁLIDO: Por favor completa todos los campos obligatorios.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isExtranjero ? (
              <>
                <Field label="Pasaporte *">
                  <input value={form.pasaporte} onChange={e => set('pasaporte', e.target.value)} placeholder="Ej: AB123456" />
                </Field>
                <Field label="País *">
                  <input value={form.pais} onChange={e => set('pais', e.target.value)} placeholder="Ej: Argentina" />
                </Field>
              </>
            ) : (
              <div className="md:col-span-2">
                <Field label="RUT *">
                  <input value={form.rut} onChange={e => set('rut', e.target.value)} placeholder="12.345.678-9" />
                </Field>
              </div>
            )}

            <div className="md:col-span-2">
               <Field label="Nombres *">
                 <input 
                   value={form.nombres} 
                   onChange={e => set('nombres', e.target.value)} 
                   placeholder="Ej: Juan Pablo"
                   maxLength={isExtranjero ? 50 : undefined} 
                 />
                 {isExtranjero && <span className="text-[10px] text-slate-400 mt-1 block">Máximo 50 caracteres</span>}
               </Field>
            </div>

            <Field label="Apellido paterno *">
              <input value={form.apellidoPaterno} onChange={e => set('apellidoPaterno', e.target.value)} placeholder="Ej: Pérez" />
            </Field>

            <Field label="Apellido materno *">
              <input value={form.apellidoMaterno} onChange={e => set('apellidoMaterno', e.target.value)} placeholder="Ej: González" />
            </Field>

            <Field label="Fecha de nacimiento *">
              <input type="date" value={form.fechaNacimiento} onChange={e => set('fechaNacimiento', e.target.value)} />
            </Field>

            <Field label="Teléfono *">
              <input type="tel" value={form.telefono} onChange={e => set('telefono', e.target.value)} placeholder="+56 9 1234 5678" />
            </Field>

            <Field label="Correo">
              <input type="email" value={form.correo} onChange={e => set('correo', e.target.value)} placeholder="correo@ejemplo.com" />
            </Field>

            <Field label="Sexo">
              <select value={form.sexo} onChange={e => set('sexo', e.target.value)}>
                <option value="">Seleccionar...</option>
                {opciones.sexos.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>

            <div className="md:col-span-2">
              <Field label="Dirección">
                <input value={form.direccion} onChange={e => set('direccion', e.target.value)} placeholder="Ej: Av. Siempreviva 123" />
              </Field>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <button
              onClick={() => navigate(from)}
              className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-2.5 rounded-xl bg-[#0E7490] hover:bg-[#0C4A6E] text-white font-semibold shadow-lg shadow-[#0E7490]/20 transition-all"
            >
              Registrar Paciente
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="space-y-1">
    <label className="block text-xs font-medium text-slate-500">{label}</label>
    <div className="[&_input]:w-full [&_input]:bg-slate-50 [&_input]:border [&_input]:border-slate-200 [&_input]:rounded-xl [&_input]:px-4 [&_input]:py-2.5 [&_input]:text-sm [&_input]:text-slate-800 [&_input]:placeholder-slate-400 [&_input]:outline-none [&_input]:focus:border-[#0E7490] [&_input]:focus:ring-1 [&_input]:focus:ring-[#0E7490]/20 [&_select]:w-full [&_select]:bg-slate-50 [&_select]:border [&_select]:border-slate-200 [&_select]:rounded-xl [&_select]:px-4 [&_select]:py-2.5 [&_select]:text-sm [&_select]:text-slate-800 [&_select]:outline-none [&_select]:focus:border-[#0E7490] [&_select]:focus:ring-1 [&_select]:focus:ring-[#0E7490]/20">
      {children}
    </div>
  </div>
);

export default NuevoPacientePage;
