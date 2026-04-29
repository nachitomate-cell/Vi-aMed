import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { getDefaultRoute } from '../auth/authService';

type Phase = 'enter' | 'visible' | 'exit';

const LoginIntroPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Determinar el destino con mayor robustez
  const stateTo = (location.state as { to?: string } | null)?.to;
  const defaultRoute = user ? getDefaultRoute(user.role) : '/dashboard';
  
  // Si el destino es /intro o es igual a la ruta actual, usamos la ruta por defecto del rol
  // para evitar bucles infinitos.
  let destination = stateTo ?? defaultRoute;
  if (destination === '/intro' || destination === location.pathname) {
    destination = defaultRoute;
  }

  const [phase, setPhase] = useState<Phase>('enter');

  useEffect(() => {
    // Si por algún motivo el destino sigue siendo /intro (no debería), forzamos dashboard
    const finalDest = destination === '/intro' ? '/dashboard' : destination;

    // enter → visible: trigger CSS transitions on next frame
    const t0 = requestAnimationFrame(() => setPhase('visible'));

    // visible → exit after 2.4s
    const t1 = setTimeout(() => setPhase('exit'), 2400);

    // navigate after exit animation completes (600ms)
    const t2 = setTimeout(() => navigate(finalDest, { replace: true }), 3000);

    return () => {
      cancelAnimationFrame(t0);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [navigate, destination]);

  const isVisible = phase === 'visible';
  const isExit    = phase === 'exit';

  const firstName = user?.name?.split(' ')[0] ?? 'Usuario';

  return (
    <div
      className={`fixed inset-0 flex flex-col items-center justify-center bg-[#F8FAFC] overflow-hidden
        transition-opacity duration-700
        ${isExit ? 'opacity-0' : 'opacity-100'}`}
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

      {/* Ring pulse */}
      <div
        className={`absolute rounded-full border border-[#0E7490]/10 pointer-events-none
          transition-all duration-1000
          ${isVisible ? 'w-72 h-72 opacity-100' : 'w-40 h-40 opacity-0'}`}
      />
      <div
        className={`absolute rounded-full border border-[#0E7490]/5 pointer-events-none
          transition-all duration-[1200ms]
          ${isVisible ? 'w-96 h-96 opacity-100' : 'w-48 h-48 opacity-0'}`}
      />

      {/* Logo */}
      <div
        className={`relative z-10 transition-all duration-700 ease-out
          ${isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-75 translate-y-6'}`}
      >
        <img
          src="/logo2.png"
          alt="ViñaMed"
          className="h-28 w-28 object-contain drop-shadow-[0_0_40px_rgba(14,116,144,0.15)]"
          onError={e => {
            const el = e.currentTarget as HTMLImageElement;
            el.style.display = 'none';
          }}
        />
      </div>

      {/* Divider line */}
      <div
        className={`relative z-10 mt-7 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent
          transition-all duration-700 delay-200
          ${isVisible ? 'w-48 opacity-100' : 'w-0 opacity-0'}`}
      />

      {/* Text */}
      <div
        className={`relative z-10 mt-6 text-center transition-all duration-600 delay-300
          ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}
      >
        <p className="text-slate-500 text-sm tracking-widest uppercase font-medium">
          Bienvenido
        </p>
        <p
          className="mt-2 text-3xl font-bold tracking-tight"
          style={{
            background: 'linear-gradient(90deg, #0E7490, #0C4A6E)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {firstName}
        </p>
        {user?.role && (
          <p className="mt-1.5 text-slate-600 text-xs tracking-wide">
            {user.role}
          </p>
        )}
      </div>

      {/* Bottom loading dots */}
      <div
        className={`absolute bottom-16 flex items-center gap-2
          transition-all duration-700 delay-500
          ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      >
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-pulse"
            style={{ animationDelay: `${i * 200}ms` }}
          />
        ))}
      </div>
    </div>
  );
};

export default LoginIntroPage;
