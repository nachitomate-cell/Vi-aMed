import { useState } from 'react';

type Estado = 'idle' | 'cargando' | 'enviado' | 'error';

export default function RecuperarContrasena({
  onVolver
}: {
  onVolver: () => void
}) {
  const [email, setEmail] = useState('');
  const [estado, setEstado] = useState<Estado>('idle');
  const [mensaje, setMensaje] = useState('');

  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  async function handleEnviar() {
    if (!emailValido) return;
    setEstado('cargando');

    try {
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const endpoint = isLocalhost
        ? 'http://127.0.0.1:5001/vinamed-10b76/us-central1/recuperarContrasena'
        : 'https://recuperarcontrasena-us-central1-vinamed-10b76.cloudfunctions.net/recuperarContrasena';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (res.ok) {
        setEstado('enviado');
      } else {
        const data = await res.json();
        setMensaje(data.error || 'Error desconocido');
        setEstado('error');
      }
    } catch {
      setMensaje('No se pudo conectar. Verifica tu conexión.');
      setEstado('error');
    }
  }

  if (estado === 'enviado') {
    return (
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'rgba(14,116,144,0.15)',
          display: 'flex', alignItems: 'center',
          justifyContent: 'center', margin: '0 auto 16px',
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M20 6L9 17l-5-5" stroke="#0E7490"
                  strokeWidth="2" strokeLinecap="round"
                  strokeLinejoin="round"/>
          </svg>
        </div>
        <p style={{
          fontSize: 16, fontWeight: 500,
          color: '#0F172A', margin: '0 0 8px',
        }}>
          Email enviado
        </p>
        <p style={{
          fontSize: 13, color: '#64748B',
          lineHeight: 1.6, margin: '0 0 24px',
        }}>
          Revisa tu bandeja de entrada en
          <br />
          <strong style={{ color: '#0F172A' }}>
            {email}
          </strong>
        </p>
        <button onClick={onVolver} style={{
          width: '100%', height: '50px',
          borderRadius: 10, border: 'none',
          background: '#0E7490', color: '#fff',
          fontSize: 14, fontWeight: 600,
          cursor: 'pointer',
        }}>
          Volver al inicio de sesión
        </button>
      </div>
    );
  }

  return (
    <div>
      <p style={{
        fontSize: 18, fontWeight: 700,
        color: '#0F172A', margin: '0 0 6px',
      }}>
        Recuperar acceso
      </p>
      <p style={{
        fontSize: 13, color: '#64748B',
        margin: '0 0 24px', lineHeight: 1.6,
      }}>
        Ingresa tu correo registrado y te enviaremos
        las instrucciones para recuperar tu acceso.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px' }}>
        <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
          Correo electrónico
        </label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleEnviar()}
          placeholder="nombre@correo.cl"
          disabled={estado === 'cargando'}
          className="lp-input"
          style={{
            borderColor: estado === 'error' ? '#EF4444' : undefined,
          }}
        />
      </div>

      {estado === 'error' && (
        <p style={{
          fontSize: 12, color: '#EF4444',
          margin: '-14px 0 14px',
        }}>
          {mensaje}
        </p>
      )}

      <button
        onClick={handleEnviar}
        disabled={!emailValido || estado === 'cargando'}
        className="lp-btn"
        style={{ marginBottom: 14 }}
      >
        {estado === 'cargando' ? (
          <>
            <span className="lp-spinner" />
            <span>Enviando...</span>
          </>
        ) : (
          'Enviar instrucciones'
        )}
      </button>

      <button onClick={onVolver} style={{
        width: '100%', padding: '10px 0',
        background: 'none', border: 'none',
        color: '#64748B', fontSize: 13, cursor: 'pointer',
        fontWeight: 500,
      }}>
        ← Volver al inicio de sesión
      </button>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
