import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { db } from '../../lib/firebase';
import type { RolProfesional } from '../../types/agenda';

const CONFIG_VINAMED = {
  apiKey:            "AIzaSyBdedhr4yUsc1F665UXeBWBEj03U-ttO6Y",
  authDomain:        "vinamed-10b76.firebaseapp.com",
  projectId:         "vinamed-10b76",
  storageBucket:     "vinamed-10b76.firebasestorage.app",
  messagingSenderId: "902644783277",
  appId:             "1:902644783277:web:ce55f4024a6ce4fd578e24",
};

const ROLES: { value: RolProfesional; label: string }[] = [
  { value: 'medico',      label: 'Médico' },
  { value: 'tecnologo',   label: 'Tecnólogo' },
  { value: 'enfermero',   label: 'Enfermero/a' },
  { value: 'secretaria',  label: 'Secretaria' },
  { value: 'admin',       label: 'Administrador' },
];

const COLORES = [
  '#0E7490', '#0369A1', '#6D28D9', '#DB2777',
  '#DC2626', '#D97706', '#16A34A', '#475569',
];

interface FormState {
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  rut: string;
  email: string;
  telefono: string;
  especialidad: string;
  rol: RolProfesional;
  comision: string;
  color: string;
}

const INITIAL: FormState = {
  nombre: '',
  apellidoPaterno: '',
  apellidoMaterno: '',
  rut: '',
  email: '',
  telefono: '',
  especialidad: '',
  rol: 'medico',
  comision: '',
  color: COLORES[0],
};

const NuevoProfesionalPage: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(INITIAL);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (field: keyof FormState, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim() || !form.email.trim()) {
      setError('Nombre y correo son obligatorios.');
      return;
    }

    setGuardando(true);
    setError(null);

    let tempApp: ReturnType<typeof initializeApp> | null = null;

    try {
      // Create Auth user via a temporary secondary app instance
      // to avoid signing out the current admin session.
      const tempName = `temp-create-${Date.now()}`;
      tempApp = initializeApp(CONFIG_VINAMED, tempName);
      const tempAuth = getAuth(tempApp);
      const credential = await createUserWithEmailAndPassword(
        tempAuth,
        form.email.trim(),
        'vinamed2026',
      );
      const uid = credential.user.uid;

      await addDoc(collection(db, 'profesionales'), {
        uid,
        nombre:          form.nombre.trim(),
        apellidoPaterno: form.apellidoPaterno.trim(),
        apellidoMaterno: form.apellidoMaterno.trim(),
        rut:             form.rut.trim(),
        email:           form.email.trim(),
        telefono:        form.telefono.trim(),
        especialidad:    form.especialidad.trim(),
        rol:             form.rol,
        comision:        form.comision ? Number(form.comision) : 0,
        color:           form.color,
        activo:          true,
        creadoEn:        serverTimestamp(),
      });

      navigate('/profesionales');
    } catch (err: any) {
      const msg: Record<string, string> = {
        'auth/email-already-in-use': 'Ya existe un usuario con ese correo.',
        'auth/invalid-email':        'El correo ingresado no es válido.',
        'auth/weak-password':        'La contraseña es demasiado débil.',
      };
      setError(msg[err.code] ?? err.message ?? 'Error al crear el profesional.');
    } finally {
      if (tempApp) {
        try { await deleteApp(tempApp); } catch { /* ignore */ }
      }
      setGuardando(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-5 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/profesionales')}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"
          aria-label="Volver"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Nuevo Profesional</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Se creará una cuenta con contraseña <span className="font-mono font-semibold">vinamed2026</span>
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Datos personales */}
        <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Datos personales</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Nombre *" value={form.nombre} onChange={v => set('nombre', v)} placeholder="Ej: Carlos" />
            <Field label="Apellido paterno" value={form.apellidoPaterno} onChange={v => set('apellidoPaterno', v)} placeholder="Ej: González" />
            <Field label="Apellido materno" value={form.apellidoMaterno} onChange={v => set('apellidoMaterno', v)} placeholder="Ej: Pérez" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="RUT" value={form.rut} onChange={v => set('rut', v)} placeholder="Ej: 12.345.678-9" />
            <Field label="Teléfono" value={form.telefono} onChange={v => set('telefono', v)} placeholder="Ej: +56 9 1234 5678" />
          </div>
        </section>

        {/* Acceso */}
        <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Acceso al sistema</p>
          <Field
            label="Correo electrónico *"
            type="email"
            value={form.email}
            onChange={v => set('email', v)}
            placeholder="Ej: carlos@vinamed.cl"
          />
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-amber-800 text-sm">
            Se creará una cuenta Firebase con contraseña temporal{' '}
            <span className="font-mono font-bold">vinamed2026</span>.
            El profesional deberá cambiarla al iniciar sesión.
          </div>
        </section>

        {/* Rol y especialidad */}
        <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Rol y especialidad</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Rol</label>
              <select
                value={form.rol}
                onChange={e => set('rol', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#0E7490]/30 focus:border-[#0E7490]"
              >
                {ROLES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <Field
              label="Especialidad"
              value={form.especialidad}
              onChange={v => set('especialidad', v)}
              placeholder="Ej: Ecografía"
            />
          </div>

          <Field
            label="Comisión (%)"
            type="number"
            value={form.comision}
            onChange={v => set('comision', v)}
            placeholder="Ej: 30"
          />
        </section>

        {/* Color de agenda */}
        <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Color en agenda</p>
          <div className="flex items-center gap-3 flex-wrap">
            {COLORES.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => set('color', c)}
                className="w-9 h-9 rounded-full border-2 transition-all"
                style={{
                  backgroundColor: c,
                  borderColor: form.color === c ? '#1e293b' : 'transparent',
                  boxShadow: form.color === c ? '0 0 0 2px white, 0 0 0 4px #1e293b' : 'none',
                }}
              />
            ))}
          </div>
        </section>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-800 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3 pb-6">
          <button
            type="button"
            onClick={() => navigate('/profesionales')}
            className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={guardando}
            className="flex-1 py-3 rounded-xl bg-[#0E7490] hover:bg-[#0c6680] disabled:opacity-60 text-white text-sm font-semibold transition-colors shadow-sm"
          >
            {guardando ? 'Creando cuenta...' : 'Crear profesional'}
          </button>
        </div>
      </form>
    </div>
  );
};

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}

const Field: React.FC<FieldProps> = ({ label, value, onChange, placeholder, type = 'text' }) => (
  <div className="space-y-1.5">
    <label className="text-sm font-medium text-slate-700">{label}</label>
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0E7490]/30 focus:border-[#0E7490] transition-colors"
    />
  </div>
);

export default NuevoProfesionalPage;
