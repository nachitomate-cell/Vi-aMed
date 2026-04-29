import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { authVinamed, dbVinamed } from '../lib/firebase';
import { useAuth } from '../auth/AuthContext';
import type { RolProfesional } from '../types/agenda';

const COLORES_PROFESIONAL = ['#0E7490', '#0F766E', '#7C3AED', '#B45309', '#BE185D', '#1D4ED8'];

const ROL_MAP: Record<string, string> = {
  medico: 'MEDICO_RADIOLOGO',
  tecnologo: 'TECNOLOGO_MEDICO',
  enfermero: 'ENFERMERO',
};

export default function RegistroProfesionalPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({
    rut: '',
    nombre: '',
    email: '',
    password: '',
    passwordConfirm: '',
    rol: 'medico',
    especialidad: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const formatRut = (raw: string) => {
    const clean = raw.replace(/[^0-9kK]/g, '').toUpperCase();
    if (clean.length < 2) return clean;
    const body = clean.slice(0, -1);
    const dv = clean.slice(-1);
    const withDots = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${withDots}-${dv}`;
  };

  const handleRutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, rut: formatRut(e.target.value) }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.rut || !form.nombre || !form.email || !form.password) {
      setError('Por favor completa todos los campos obligatorios.');
      return;
    }
    if (form.password !== form.passwordConfirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (form.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const credential = await createUserWithEmailAndPassword(authVinamed, form.email, form.password);
      const uid = credential.user.uid;

      await setDoc(doc(dbVinamed, 'profesionales', uid), {
        rut: form.rut,
        nombre: form.nombre,
        email: form.email,
        rol: form.rol as RolProfesional,
        especialidad: form.especialidad || '',
        color: COLORES_PROFESIONAL[Math.floor(Math.random() * COLORES_PROFESIONAL.length)],
        activo: true,
        creadoEn: serverTimestamp(),
      });

      const authRole = ROL_MAP[form.rol] ?? 'TECNOLOGO_MEDICO';
      login({ uid, rut: form.rut, name: form.nombre, role: authRole });
      navigate('/intro', { replace: true, state: { to: '/eco-mobile' } });
    } catch (err: any) {
      console.error(err);
      const msg: Record<string, string> = {
        'auth/email-already-in-use': 'Este correo ya está registrado.',
        'auth/invalid-email': 'El correo ingresado no es válido.',
        'auth/weak-password': 'La contraseña es demasiado débil.',
      };
      setError(msg[err.code] ?? (err.message || 'Ocurrió un error al registrar la cuenta.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', padding: '20px' }}>
      <div style={{ background: '#fff', padding: '40px', borderRadius: '16px', width: '100%', maxWidth: '500px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', marginBottom: '8px', textAlign: 'center' }}>Crear Cuenta Profesional</h1>
        <p style={{ color: '#64748B', fontSize: '14px', marginBottom: '32px', textAlign: 'center' }}>Ingresa tus datos para registrarte en el portal clínico.</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>RUT *</label>
              <input type="text" name="rut" value={form.rut} onChange={handleRutChange} placeholder="12.345.678-9" required style={{ width: '100%', padding: '10px 14px', border: '1px solid #E2E8F0', borderRadius: '8px', outline: 'none' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Nombre Completo *</label>
              <input type="text" name="nombre" value={form.nombre} onChange={handleChange} placeholder="Ej: Dra. Ana Pérez" required style={{ width: '100%', padding: '10px 14px', border: '1px solid #E2E8F0', borderRadius: '8px', outline: 'none' }} />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Correo Electrónico *</label>
            <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="correo@ejemplo.com" required style={{ width: '100%', padding: '10px 14px', border: '1px solid #E2E8F0', borderRadius: '8px', outline: 'none' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Contraseña *</label>
              <input type="password" name="password" value={form.password} onChange={handleChange} placeholder="Mínimo 6 caracteres" required style={{ width: '100%', padding: '10px 14px', border: '1px solid #E2E8F0', borderRadius: '8px', outline: 'none' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Confirmar Contraseña *</label>
              <input type="password" name="passwordConfirm" value={form.passwordConfirm} onChange={handleChange} required style={{ width: '100%', padding: '10px 14px', border: '1px solid #E2E8F0', borderRadius: '8px', outline: 'none' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Rol</label>
              <select name="rol" value={form.rol} onChange={handleChange} style={{ width: '100%', padding: '10px 14px', border: '1px solid #E2E8F0', borderRadius: '8px', outline: 'none', background: '#fff' }}>
                <option value="medico">Médico</option>
                <option value="tecnologo">Tecnólogo</option>
                <option value="enfermero">Enfermero</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Especialidad</label>
              <input type="text" name="especialidad" value={form.especialidad} onChange={handleChange} placeholder="Ej: Radiología" style={{ width: '100%', padding: '10px 14px', border: '1px solid #E2E8F0', borderRadius: '8px', outline: 'none' }} />
            </div>
          </div>

          {error && (
            <div style={{ padding: '12px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', color: '#991B1B', fontSize: '13px' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{ width: '100%', padding: '14px', background: '#0E7490', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, marginTop: '8px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: '#64748B' }}>
          ¿Ya tienes cuenta? <Link to="/login" style={{ color: '#0E7490', fontWeight: 600, textDecoration: 'none' }}>Inicia sesión aquí</Link>
        </p>
      </div>
    </div>
  );
}
