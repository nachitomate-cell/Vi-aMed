import React, { useEffect } from 'react';
import { Outlet, useNavigate, NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const ECO_MANIFEST_PATH = '/eco-mobile/manifest.json';
const DESKTOP_MANIFEST_PATH = '/manifest.json';

function useSwapManifest(href: string): void {
  useEffect(() => {
    const link = document.getElementById('pwa-manifest') as HTMLLinkElement | null;
    if (!link) return;
    const previous = link.href;
    link.href = href;
    return () => {
      link.href = previous;
    };
  }, [href]);
}

const LogoutIcon: React.FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="w-[18px] h-[18px] text-slate-400"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const ChevronLeftIcon: React.FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="w-5 h-5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const MobilePwaLayout: React.FC = () => {
  useSwapManifest(ECO_MANIFEST_PATH);

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = (): void => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleBack = (): void => {
    navigate(-1);
  };

  return (
    <div className="min-h-[100dvh] w-full flex flex-col bg-[#F3F4F6] text-slate-800 overflow-x-hidden scrollbar-none">
      <header
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between gap-3 px-4 bg-white/95 backdrop-blur-md border-b border-slate-200"
        style={{ height: '56px', paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="flex items-center gap-1 min-w-0">
          <button
            onClick={handleBack}
            className="flex items-center justify-center w-10 h-10 rounded-xl text-slate-500 active:bg-slate-100 transition-colors shrink-0"
            aria-label="Volver"
          >
            <ChevronLeftIcon />
          </button>

          <NavLink
            to="/eco-mobile"
            className="font-semibold text-[15px] tracking-tight text-[#0E7490] truncate leading-none"
          >
            Eco ViñaMed
          </NavLink>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 h-10 min-w-0 max-w-[160px] px-3 rounded-xl bg-slate-100 active:bg-slate-200 transition-colors shrink-0"
          aria-label="Cerrar sesión"
        >
          <span className="text-xs text-slate-600 leading-none truncate hidden xs:block">
            {user?.name ?? 'Usuario'}
          </span>
          <LogoutIcon />
        </button>
      </header>

      <main
        className="flex-1 overflow-y-auto scrollbar-none"
        style={{ paddingTop: '56px', paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
      >
        <Outlet />
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around bg-white/95 backdrop-blur-md border-t border-slate-200"
        style={{
          height: 'calc(56px + env(safe-area-inset-bottom, 0px))',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <BottomNavItem to="/eco-mobile" label="Agenda" end>
          <CalendarIcon />
        </BottomNavItem>
        <BottomNavItem to="/eco-mobile/historial" label="Historial">
          <ClipboardIcon />
        </BottomNavItem>
        {/* <BottomNavItem to="/mamografia-mobile" label="Imágenes">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2"/>
            <circle cx="12" cy="12" r="3" strokeWidth="2"/>
          </svg>
        </BottomNavItem> */}
        <BottomNavItem to="/eco-mobile/perfil" label="Perfil">
          <UserIcon />
        </BottomNavItem>
      </nav>
    </div>
  );
};

interface BottomNavItemProps {
  to: string;
  label: string;
  end?: boolean;
  children: React.ReactNode;
}

const BottomNavItem: React.FC<BottomNavItemProps> = ({ to, label, end, children }) => (
  <NavLink
    to={to}
    end={end}
    className={({ isActive }) =>
      `flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${
        isActive ? 'text-[#0E7490]' : 'text-slate-400 active:text-slate-600'
      }`
    }
  >
    <span className="w-6 h-6">{children}</span>
    <span className="text-[10px] font-medium leading-none">{label}</span>
  </NavLink>
);

const CalendarIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const ClipboardIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
  </svg>
);

const UserIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

export default MobilePwaLayout;

export { DESKTOP_MANIFEST_PATH };
