import React, { useId, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthError, getDefaultRoute, loginWithCredentials } from '../auth/authService';
import { useAuth } from '../auth/AuthContext';
import RecuperarContrasena from '../components/RecuperarContrasena';

// ─── Estilos de animación (inyectados una sola vez) ───────────────────────────
const STYLES = `
  @keyframes slideInLeft {
    from { opacity: 0; transform: translateX(-20px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .anim-left {
    animation: slideInLeft 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
  }
  .anim-form-0 { animation: fadeInUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.05s both; }
  .anim-form-1 { animation: fadeInUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.13s both; }
  .anim-form-2 { animation: fadeInUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.21s both; }
  .anim-form-3 { animation: fadeInUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.29s both; }
  .anim-form-4 { animation: fadeInUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.37s both; }
  .anim-form-5 { animation: fadeInUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.45s both; }

  .lp-input {
    width: 100%;
    border: 1.5px solid #E2E8F0;
    border-radius: 10px;
    background: #FFFFFF;
    color: #0F172A;
    padding: 12px 16px;
    font-size: 15px;
    outline: none;
    transition: border-color 0.18s, box-shadow 0.18s;
    font-family: inherit;
  }
  .lp-input:focus {
    border-color: #0E7490;
    box-shadow: 0 0 0 3px rgba(14, 116, 144, 0.12);
  }
  .lp-input::placeholder { color: #CBD5E1; }
  .lp-input:disabled { background: #F8FAFC; color: #94A3B8; cursor: not-allowed; }

  .lp-input--error {
    border-color: #EF4444;
    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.12);
  }
  .lp-input--valid:not(:focus) {
    border-color: #0E7490;
  }

  .lp-btn {
    width: 100%;
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    border-radius: 10px;
    background: #0E7490;
    color: #fff;
    font-weight: 600;
    font-size: 15px;
    border: none;
    cursor: pointer;
    transition: background 0.18s, transform 0.1s, box-shadow 0.18s;
    font-family: inherit;
    box-shadow: 0 4px 14px rgba(14, 116, 144, 0.30);
  }
  .lp-btn:hover:not(:disabled) {
    background: #0C6880;
    box-shadow: 0 6px 18px rgba(14, 116, 144, 0.38);
    transform: translateY(-1px);
  }
  .lp-btn:active:not(:disabled) { transform: translateY(0); }
  .lp-btn:disabled { background: #94A3B8; cursor: not-allowed; box-shadow: none; }

  @keyframes spin { to { transform: rotate(360deg); } }
  .lp-spinner {
    width: 17px; height: 17px;
    border: 2.5px solid rgba(255,255,255,0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    flex-shrink: 0;
  }

  /* Bullet decorativo lado izquierdo */
  .lp-bullet::before {
    content: '';
    display: inline-block;
    width: 7px; height: 7px;
    border-radius: 50%;
    background: #67E8F9;
    margin-right: 12px;
    flex-shrink: 0;
  }
`;

// ─── Utilidades RUT ───────────────────────────────────────────────────────────

function calcVerifier(digits: string): string {
  let sum = 0;
  let factor = 2;
  for (let i = digits.length - 1; i >= 0; i--) {
    sum += parseInt(digits[i], 10) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const rem = 11 - (sum % 11);
  if (rem === 11) return '0';
  if (rem === 10) return 'K';
  return String(rem);
}

function formatRut(raw: string): string {
  const clean = raw.replace(/[^0-9kK]/g, '').toUpperCase();
  if (clean.length < 2) return clean;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  const withDots = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${withDots}-${dv}`;
}

type RutState = 'idle' | 'valid' | 'invalid';

function getRutState(raw: string): RutState {
  const clean = raw.replace(/[^0-9kK]/g, '').toUpperCase();
  if (clean.length < 7) return 'idle';
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  if (!/^\d+$/.test(body)) return 'invalid';
  return calcVerifier(body) === dv ? 'valid' : 'invalid';
}

// ─── Iconos SVG inline ────────────────────────────────────────────────────────

const EyeOpen: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const EyeClosed: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

// ─── Componente principal ─────────────────────────────────────────────────────

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const rutId = useId();
  const passwordId = useId();
  const rutRef = useRef<HTMLInputElement>(null);

  const [rut, setRut] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rutTouched, setRutTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [vista, setVista] = useState<'login' | 'recuperar'>('login');

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
  const rutState = getRutState(rut);
  const showRutError = rutTouched && rutState === 'invalid';

  // Quitamos la redirección automática aquí para que el flujo de handleSubmit
  // pueda llevar al usuario a /intro sin ser interrumpido por un re-render.
  // Si el usuario ya está autenticado y entra a /login manualmente, 
  // el sistema lo dejará entrar al formulario, pero al intentar loguearse
  // o refrescar, el AuthContext se encargará de la persistencia.

  const handleRutChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setRut(e.target.value);
    if (authError) setAuthError(null);
  };

  const handleRutBlur = (): void => {
    setRutTouched(true);
    if (rut) setRut(formatRut(rut));
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setRutTouched(true);
    setAuthError(null);

    const formattedRut = formatRut(rut);
    setRut(formattedRut);

    if (getRutState(formattedRut) !== 'valid') {
      rutRef.current?.focus();
      return;
    }
    if (!password) return;

    setLoading(true);
    try {
      const { user } = await loginWithCredentials(formattedRut, password);
      login(user);
      navigate('/intro', { replace: true, state: { to: from ?? getDefaultRoute(user.role) } });
    } catch (err) {
      setAuthError(
        err instanceof AuthError
          ? err.message
          : 'Error de conexión. Intente nuevamente.',
      );
    } finally {
      setLoading(false);
    }
  };

  const rutInputClass = [
    'lp-input',
    showRutError ? 'lp-input--error' : '',
    rutTouched && rutState === 'valid' ? 'lp-input--valid' : '',
  ].filter(Boolean).join(' ');

  const bullets = [
    'Generación de informes ecográficos',
    'Trazabilidad de autoría y firma',
    'Historial clínico por paciente',
  ];

  return (
    <>
      {/* ── Estilos globales de la pantalla ──────────────────────────── */}
      <style>{STYLES}</style>

      <div style={{
        minHeight: '100dvh',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
        colorScheme: 'light',
        backgroundColor: '#F8FAFC',
      }}>

        {/* ═══════════════════════════════════════════════════════════════
            PANEL IZQUIERDO
        ═══════════════════════════════════════════════════════════════ */}
        <aside
          className="anim-left"
          style={{
            backgroundColor: '#0E7490',
            backgroundImage: [
              '-webkit-linear-gradient(145deg, #0C4A6E 0%, #0E7490 50%, #0F766E 100%)',
              'linear-gradient(145deg, #0C4A6E 0%, #0E7490 50%, #0F766E 100%)',
            ].join(', '),
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '40px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Círculos decorativos de fondo */}
          <div style={{
            position: 'absolute', top: '-80px', right: '-80px',
            width: '320px', height: '320px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)', pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', bottom: '-60px', left: '-60px',
            width: '240px', height: '240px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)', pointerEvents: 'none',
          }} />

          {/* Logo ViñaMed arriba-izquierda */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', position: 'relative' }}>
            <img
              src="/logo2.png"
              alt="ViñaMed"
              style={{ height: '48px', width: 'auto', objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <div>
              <p style={{ color: '#fff', fontWeight: 700, fontSize: '18px', lineHeight: 1, margin: 0 }}>ViñaMed</p>
              <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '12px', margin: '3px 0 0' }}>Centro de Diagnóstico</p>
            </div>
          </div>

          {/* Contenido central */}
          <div style={{ position: 'relative' }}>
            {/* Label SISTEMA CLÍNICO */}
            <p style={{
              color: '#67E8F9',
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              marginBottom: '16px',
            }}>
              Sistema Clínico
            </p>

            {/* Título grande */}
            <h2 style={{
              color: '#fff',
              fontSize: 'clamp(30px, 3vw, 40px)',
              fontWeight: 300,
              lineHeight: 1.25,
              margin: '0 0 28px',
            }}>
              Portal de<br />Ecografía y<br />Diagnóstico
            </h2>

            {/* Separador */}
            <div style={{
              height: '1px',
              background: 'rgba(255,255,255,0.20)',
              marginBottom: '28px',
              width: '80%',
            }} />

            {/* Bullets */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {bullets.map((item) => (
                <div key={item} style={{ display: 'flex', alignItems: 'center' }}>
                  <span
                    className="lp-bullet"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      color: 'rgba(255,255,255,0.80)',
                      fontSize: '14px',
                      lineHeight: 1.4,
                    }}
                  >
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer izquierdo */}
          <div style={{ position: 'relative' }}>
            {/* Logo empresa desarrolladora */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', opacity: 0.60 }}>
              <img
                src="/logo3.png"
                alt="Empresa desarrolladora"
                style={{ height: '28px', width: 'auto', objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <span style={{ color: 'rgba(255,255,255,0.90)', fontSize: '11px', fontWeight: 500 }}>
                Desarrollado por SynapTech Spa
              </span>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.40)', fontSize: '11px', margin: 0 }}>
              Acceso restringido · Personal autorizado únicamente
            </p>
          </div>
        </aside>

        {/* ═══════════════════════════════════════════════════════════════
            PANEL DERECHO — Formulario
        ═══════════════════════════════════════════════════════════════ */}
        <main style={{
          background: '#F8FAFC',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 40px',
          position: 'relative',
        }}>

          {/* Logo móvil (oculto en desktop vía media query en STYLES) */}
          <div style={{ display: 'none', marginBottom: '32px', alignItems: 'center', gap: '12px' }}
               id="lp-mobile-logo">
            <img src="/logo2.png" alt="ViñaMed" style={{ height: '40px', objectFit: 'contain' }} />
          </div>

          <div style={{ width: '100%', maxWidth: '400px' }}>

            {/* Encabezado */}
            <header className="anim-form-0" style={{ marginBottom: '32px' }}>
              <h1 style={{
                fontSize: '28px',
                fontWeight: 700,
                color: '#0F172A',
                margin: '0 0 8px',
                lineHeight: 1.2,
              }}>
                Acceso al Sistema
              </h1>
              <p style={{ color: '#64748B', fontSize: '14px', margin: 0, lineHeight: 1.6 }}>
                Ingrese sus credenciales de acceso para continuar.
              </p>
            </header>

            {/* Separador */}
            <div className="anim-form-0" style={{
              height: '1px', background: '#E2E8F0', marginBottom: '28px',
            }} />

            {/* Formulario / Recuperación */}
            {vista === 'login' ? (
              <>
                <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Campo RUT */}
                  <div className="anim-form-1" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label htmlFor={rutId} style={{
                      fontSize: '13px', fontWeight: 600, color: '#374151',
                    }}>
                      RUT de Usuario
                    </label>
                    <input
                      ref={rutRef}
                      id={rutId}
                      type="text"
                      autoComplete="username"
                      inputMode="numeric"
                      placeholder="12.345.678-9"
                      value={rut}
                      onChange={handleRutChange}
                      onBlur={handleRutBlur}
                      disabled={loading}
                      className={rutInputClass}
                    />
                    {showRutError ? (
                      <p style={{ fontSize: '12px', color: '#EF4444', margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden>
                          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><circle cx="12" cy="16" r="0.5" fill="currentColor" />
                        </svg>
                        RUT inválido — verifique el dígito verificador
                      </p>
                    ) : (
                      <p style={{ fontSize: '12px', color: '#94A3B8', margin: 0 }}>Formato: 12.345.678-9</p>
                    )}
                  </div>

                  {/* Campo Contraseña */}
                  <div className="anim-form-2" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label htmlFor={passwordId} style={{
                      fontSize: '13px', fontWeight: 600, color: '#374151',
                    }}>
                      Contraseña
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        id={passwordId}
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        placeholder="••••••••••"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); if (authError) setAuthError(null); }}
                        disabled={loading}
                        className="lp-input"
                        style={{ paddingRight: '44px' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        style={{
                          position: 'absolute', right: '12px', top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: '#94A3B8', padding: '4px', lineHeight: 0,
                          transition: 'color 0.15s',
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.color = '#0E7490')}
                        onMouseOut={(e) => (e.currentTarget.style.color = '#94A3B8')}
                        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOpen /> : <EyeClosed />}
                      </button>
                    </div>
                  </div>

                  {/* Banner de error de autenticación */}
                  {authError && (
                    <div className="anim-form-3" style={{
                      display: 'flex', alignItems: 'flex-start', gap: '10px',
                      background: '#FEF2F2', border: '1.5px solid #FECACA',
                      borderRadius: '10px', padding: '12px 14px',
                      color: '#991B1B', fontSize: '13px', lineHeight: 1.5,
                    }}>
                      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }} aria-hidden>
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                      <span>{authError}</span>
                    </div>
                  )}

                  {/* Botón */}
                  <div className="anim-form-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="lp-btn"
                    >
                      {loading ? (
                        <>
                          <span className="lp-spinner" />
                          <span>Verificando...</span>
                        </>
                      ) : (
                        'Ingresar al Sistema'
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setVista('recuperar')}
                      style={{
                        width: '100%', padding: '10px 0',
                        background: 'none', border: 'none',
                        color: '#64748B', fontSize: '12px',
                        cursor: 'pointer', marginTop: '12px',
                        fontWeight: 500,
                      }}
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                </form>

                {/* Separador */}
                <div className="anim-form-5" style={{
                  height: '1px', background: '#E2E8F0', margin: '28px 0 20px',
                }} />

                {/* Pie de formulario */}
                <footer className="anim-form-5">
                  <p style={{
                    color: '#94A3B8', fontSize: '12px', textAlign: 'center',
                    lineHeight: 1.7, margin: 0,
                  }}>
                    Si no puede acceder, contacte al administrador del sistema.<br />
                    La sesión expira tras 10 minutos de inactividad.
                  </p>
                </footer>
              </>
            ) : (
              <div className="anim-form-1">
                <RecuperarContrasena onVolver={() => setVista('login')} />
              </div>
            )}
          </div>

          {/* Versión — esquina inferior derecha */}
          <p style={{
            position: 'absolute', bottom: '24px', right: '32px',
            color: '#CBD5E1', fontSize: '11px', margin: 0,
          }}>
            v1.0.0 · ViñaMed Portal Clínico
          </p>
        </main>
      </div>

      {/* ── Media query mobile: ocultar panel izquierdo, mostrar logo ── */}
      <style>{`
        @media (max-width: 767px) {
          /* Cambiar grid a columna única */
          div[style*="grid-template-columns"] {
            grid-template-columns: 1fr !important;
          }
          /* Ocultar panel izquierdo */
          aside.anim-left {
            display: none !important;
          }
          /* Mostrar logo móvil */
          #lp-mobile-logo {
            display: flex !important;
          }
        }
      `}</style>
    </>
  );
};

export default LoginPage;
