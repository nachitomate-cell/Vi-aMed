import React, { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { determinarRedirectPostLogin } from '../utils/device';

type Phase = 'enter' | 'visible' | 'exit';

const LoginIntroPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Determinar el destino con mayor robustez
  const stateTo = (location.state as { to?: string } | null)?.to;
  const defaultRoute = determinarRedirectPostLogin();
  
  let destination = stateTo ?? defaultRoute;
  if (destination === '/intro' || destination === location.pathname) {
    destination = defaultRoute;
  }

  const [phase, setPhase] = useState<Phase>('enter');

  // Función de navegación robusta
  const handleNavigate = useCallback(() => {
    setPhase('exit');
    setTimeout(() => {
      try {
        navigate(destination, { replace: true });
      } catch (err) {
        console.error('Navegación fallida:', err);
        window.location.href = destination;
      }
    }, 400);
  }, [navigate, destination]);

  useEffect(() => {
    // Forzar scroll al top en móvil
    window.scrollTo(0, 0);
    
    // Prevenir que el body tenga overflow:hidden que tape el intro
    document.body.style.overflow = 'visible';
    document.documentElement.style.overflow = 'visible';

    // Animación de entrada
    const t0 = requestAnimationFrame(() => setPhase('visible'));

    // Redirección automática después de 3.5 segundos (un poco más para dar tiempo al usuario)
    const t1 = setTimeout(() => {
      handleNavigate();
    }, 3500);

    // Marcar que este login viene de /intro (móvil) para redirigir a /eco-mobile
    sessionStorage.setItem('loginOrigen', 'eco-mobile');

    return () => {
      cancelAnimationFrame(t0);
      clearTimeout(t1);
      // Limpiar la flag al salir si ya navegamos
      sessionStorage.removeItem('loginOrigen');
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [handleNavigate]);

  const isVisible = phase === 'visible';
  const isExit    = phase === 'exit';

  const firstName = user?.name?.split(' ')[0] ?? 'Usuario';

  return (
    <div
      style={{
        backgroundColor: '#0E7490',
        backgroundImage: [
          '-webkit-linear-gradient(145deg, #0C4A6E 0%, #0E7490 50%, #0F766E 100%)',
          'linear-gradient(145deg, #0C4A6E 0%, #0E7490 50%, #0F766E 100%)',
        ].join(', '),
        minHeight: '100dvh',
        colorScheme: 'light',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 20px',
        paddingTop: 'calc(24px + env(safe-area-inset-top, 0px))',
        paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
        position: 'relative',
        zIndex: 1,
        transition: 'opacity 0.6s ease-in-out',
        opacity: isExit ? 0 : 1,
        overflowX: 'hidden',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch' as any,
      }}
    >
      {/* Radial glow background */}
      <div
        className={`absolute w-[520px] h-[520px] rounded-full pointer-events-none
          transition-opacity duration-1000
          ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        style={{
          background: 'radial-gradient(circle, rgba(61,255,160,0.06) 0%, rgba(0,180,216,0.04) 40%, transparent 70%)',
        }}
      />

      {/* Logo */}
      <div
        className={`relative z-10 transition-all duration-700 ease-out
          ${isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-75 translate-y-6'}`}
      >
        <img
          src="/logo2.png"
          alt="ViñaMed"
          style={{ height: 80, objectFit: 'contain', marginBottom: 24, filter: 'brightness(0) invert(1)' }}
          onError={e => {
            const el = e.currentTarget as HTMLImageElement;
            el.style.display = 'none';
          }}
        />
      </div>

      {/* Título */}
      <div
        className={`relative z-10 text-center transition-all duration-600 delay-300
          ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}
      >
        <p style={{
          fontFamily: 'Georgia, serif',
          fontStyle: 'italic',
          fontSize: 32,
          color: '#fff',
          margin: '0 0 8px',
          textAlign: 'center',
        }}>
          Portal Clínico
        </p>
        <p style={{
          fontSize: 13,
          color: 'rgba(255,255,255,0.6)',
          letterSpacing: '.15em',
          textTransform: 'uppercase',
          fontWeight: 500,
          margin: '0 0 40px',
          textAlign: 'center',
        }}>
          ViñaMed · Centro de Diagnóstico
        </p>
      </div>

      {/* Bienvenida personalizada */}
      <div
        className={`relative z-10 mb-12 text-center transition-all duration-700 delay-500
          ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
      >
        <p className="text-emerald-300 text-xs font-bold uppercase tracking-[0.2em] mb-2">
          Sesión Iniciada
        </p>
        <h2 className="text-white text-2xl font-light">
          Hola, <span className="font-semibold">{firstName}</span>
        </h2>
      </div>

      {/* Botón principal — FIX touch */}
      <button
        onClick={handleNavigate}
        className={`relative z-20 w-full max-w-[320px] py-4 rounded-2xl bg-white text-[#0C4A6E] text-base font-bold shadow-2xl transition-all duration-700 delay-700
          ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        style={{
          border: 'none',
          cursor: 'pointer',
          WebkitTapHighlightColor: 'rgba(0,0,0,0.1)',
          touchAction: 'manipulation',
          userSelect: 'none',
        }}
      >
        Acceder al Sistema
      </button>

      {/* Link alternativo como fallback */}
      <a
        href={destination}
        onClick={(e) => {
          e.preventDefault();
          handleNavigate();
        }}
        className={`relative z-20 mt-6 text-sm text-white/50 no-underline px-5 py-3 transition-all duration-700 delay-[900ms]
          ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        style={{
          touchAction: 'manipulation',
        }}
      >
        Ingresar directamente →
      </a>

      {/* Decoración inferior */}
      <div
        className={`absolute bottom-12 flex items-center gap-1.5 transition-opacity duration-1000 delay-1000
          ${isVisible ? 'opacity-30' : 'opacity-0'}`}
      >
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="w-1 h-1 rounded-full bg-white animate-pulse"
            style={{ animationDelay: `${i * 200}ms` }}
          />
        ))}
      </div>

      {/* SynapTech branding */}
      <div
        className={`absolute bottom-5 flex flex-col items-center gap-1.5 transition-all duration-1000 delay-[1200ms]
          ${isVisible ? 'opacity-60 translate-y-0' : 'opacity-0 translate-y-3'}`}
      >
        <img
          src="/logo3.png"
          alt="SynapTech"
          style={{
            height: 22,
            objectFit: 'contain',
            filter: 'brightness(0) invert(1)',
            animation: isVisible ? 'synapPulse 3s ease-in-out infinite' : 'none',
          }}
          onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
        <p style={{
          fontSize: 9,
          color: 'rgba(255,255,255,0.45)',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          margin: 0,
          fontWeight: 500,
        }}>
          Desarrollado por SynapTech Spa
        </p>
      </div>
      <style>{`
        @keyframes synapPulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.85; transform: scale(1.06); }
        }
      `}</style>
    </div>
  );
};

export default LoginIntroPage;
