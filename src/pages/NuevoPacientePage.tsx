import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface PacienteForm {
  nombre: string;
  rut: string;
  edad: string;
  motivo: string;
  box: string;
}

const BOXES = [
  { value: '', label: 'Sin asignar' },
  { value: 'eco', label: 'Box Ecografía' },
  { value: 'enfermeria', label: 'Box Enfermería' },
  { value: 'muestras', label: 'Sala Muestras' },
  { value: 'atencion', label: 'Atención Médica' },
];

const EMPTY: PacienteForm = { nombre: '', rut: '', edad: '', motivo: '', box: '' };

const NuevoPacientePage: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState<PacienteForm>(EMPTY);
  const [saved, setSaved] = useState(false);

  const set = (k: keyof PacienteForm, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (!form.nombre || !form.rut) { alert('Nombre y RUT son obligatorios.'); return; }
    setSaved(true);
    setTimeout(() => {
      setForm(EMPTY);
      setSaved(false);
      navigate('/dashboard');
    }, 1500);
  };

  return (
    <div className="p-5 max-w-lg mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Registrar Paciente</h1>
        <p className="text-sm text-slate-500 mt-0.5">Ingresa un nuevo paciente para el turno actual</p>
      </div>

      {saved ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
          <div className="text-2xl mb-2 text-emerald-600">✓</div>
          <p className="text-emerald-700 font-semibold">Paciente registrado correctamente</p>
          <p className="text-slate-500 text-sm mt-1">Redirigiendo al dashboard...</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5 space-y-4">
          <Field label="Nombre completo *">
            <input value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Juan Pérez González" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="RUT *">
              <input value={form.rut} onChange={e => set('rut', e.target.value)} placeholder="12.345.678-9" />
            </Field>
            <Field label="Edad">
              <input type="number" value={form.edad} onChange={e => set('edad', e.target.value)} placeholder="35" min={0} max={120} />
            </Field>
          </div>
          <Field label="Motivo de consulta">
            <input value={form.motivo} onChange={e => set('motivo', e.target.value)} placeholder="Ej: Ecografía abdominal" />
          </Field>
          <Field label="Box de atención">
            <select value={form.box} onChange={e => set('box', e.target.value)}>
              {BOXES.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
            </select>
          </Field>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 text-sm transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-2 rounded-xl bg-[#0E7490] hover:bg-[#0c6680] text-white font-semibold text-sm transition-colors shadow-lg shadow-[#0E7490]/20"
            >
              Registrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="space-y-1">
    <label className="text-xs text-slate-500">{label}</label>
    <div className="[&_input]:w-full [&_input]:bg-white [&_input]:border [&_input]:border-slate-200 [&_input]:rounded-lg [&_input]:px-3 [&_input]:py-2 [&_input]:text-sm [&_input]:text-slate-800 [&_input]:placeholder-slate-400 [&_input]:outline-none [&_input]:focus:border-[#0E7490]/60 [&_select]:w-full [&_select]:bg-white [&_select]:border [&_select]:border-slate-200 [&_select]:rounded-lg [&_select]:px-3 [&_select]:py-2 [&_select]:text-sm [&_select]:text-slate-800 [&_select]:outline-none [&_select]:focus:border-[#0E7490]/60">
      {children}
    </div>
  </div>
);

export default NuevoPacientePage;
