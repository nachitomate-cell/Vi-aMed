import { useState, useEffect } from 'react';
import { isSignInWithEmailLink, signInWithEmailLink, updatePassword } from 'firebase/auth';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { authVinamed, dbVinamed } from '../lib/firebase';

export default function ActivarCuenta() {
  const [estado, setEstado] = useState<'verificando' | 'formulario' | 'link-invalido'>('verificando');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [listo, setListo] = useState(false);

  useEffect(() => {
    if (isSignInWithEmailLink(authVinamed, window.location.href)) {
      setEstado('formulario');
    } else {
      setEstado('link-invalido');
    }
  }, []);

  async function handleActivar() {
    if (password.length < 8) {
      setError('Mínimo 8 caracteres'); return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden'); return;
    }

    try {
      // Email guardado en localStorage al hacer clic en el link o preguntarlo
      // Si no tenemos el email de antemano, SignInWithEmailLink lanza un error y hay que pedirlo.
      // Pero asumiendo que lo pasamos en el URL o lo solicitamos
      let email = window.localStorage.getItem('emailForSignIn');
      if (!email) {
        // Obtenemos el email por prompt si no está en el local storage
        email = window.prompt('Por favor ingresa tu correo electrónico para confirmación');
      }

      if (!email) {
        setError('Es necesario tu correo electrónico para confirmar la cuenta.');
        return;
      }

      const cred = await signInWithEmailLink(
        authVinamed, email, window.location.href
      );

      // Cambiar contraseña temporal por la personal
      if (cred.user) {
        await updatePassword(cred.user, password);

        // Marcar como activo en Firestore
        await updateDoc(
          doc(dbVinamed, 'profesionales', cred.user.uid), {
            estado: 'active',
            activadoEn: serverTimestamp(),
          }
        );

        window.localStorage.removeItem('emailForSignIn');
        setListo(true);
      }
    } catch (e: any) {
      setError('Link inválido o expirado. Solicita una nueva invitación.');
    }
  }

  if (listo) return (
    <div style={{ textAlign: 'center', padding: 48 }}>
      <p style={{ fontSize: 20, fontWeight: 500, color: '#0F172A' }}>
        ¡Cuenta activada!
      </p>
      <p style={{ color: '#64748B', marginBottom: 24 }}>
        Ya puedes ingresar al portal clínico.
      </p>
      <a href="/login" style={{
        padding: '12px 32px', background: '#0E7490',
        color: '#fff', borderRadius: 10, textDecoration: 'none',
        fontSize: 14, fontWeight: 500,
      }}>
        Ir al login
      </a>
    </div>
  );

  if (estado === 'link-invalido') return (
    <div style={{ textAlign: 'center', padding: 48 }}>
      <p style={{ color: '#EF4444' }}>
        Link inválido o expirado.
      </p>
    </div>
  );

  return (
    <div style={{ maxWidth: 400, margin: '48px auto', padding: '0 24px', fontFamily: 'system-ui, sans-serif' }}>
      <p style={{ fontSize: 20, fontWeight: 500, color: '#0F172A', marginBottom: 8 }}>
        Activar cuenta
      </p>
      <p style={{ fontSize: 14, color: '#64748B', marginBottom: 24, lineHeight: 1.6 }}>
        Crea tu contraseña personal para acceder al portal clínico.
      </p>

      {['Contraseña nueva', 'Confirmar contraseña'].map((label, i) => (
        <div key={label} style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 12, color: '#64748B', marginBottom: 6 }}>{label}</p>
          <input
            type="password"
            value={i === 0 ? password : confirm}
            onChange={e => i === 0
              ? setPassword(e.target.value)
              : setConfirm(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            style={{
              width: '100%', padding: '12px 14px', borderRadius: 10,
              border: '1px solid #E2E8F0',
              background: '#FFFFFF',
              fontSize: 15, color: '#0F172A',
              outline: 'none', boxSizing: 'border-box' as const,
            }}
          />
        </div>
      ))}

      {error && (
        <p style={{ fontSize: 12, color: '#EF4444', marginBottom: 12 }}>{error}</p>
      )}

      <button onClick={handleActivar} style={{
        width: '100%', padding: '13px 0', borderRadius: 12,
        border: 'none', background: '#0E7490', color: '#fff',
        fontSize: 14, fontWeight: 500, cursor: 'pointer',
      }}>
        Activar y entrar al portal
      </button>
    </div>
  );
}
