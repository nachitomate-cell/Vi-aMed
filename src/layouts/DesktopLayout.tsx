import React, { useMemo } from 'react';
import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getSaludo(): string {
  const h = new Date().getHours();
  if (h < 13) return 'Buenos días';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

function getIniciales(nombre: string): string {
  return nombre
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();
}

// ─── Sidebar nav link classes ─────────────────────────────────────────────────

const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-200 group relative ${
    isActive
      ? 'bg-white/10 text-white font-bold shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]'
      : 'text-white/60 hover:bg-white/5 hover:text-white/90'
  }`;

const activeIndicatorClasses = "absolute left-0 top-1/4 bottom-1/4 w-1 bg-white rounded-r-full shadow-[0_0_8px_rgba(255,255,255,0.5)]";

const badgeClasses =
  'ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#67E8F9]/10 text-[#67E8F9] border border-[#67E8F9]/20 group-hover:bg-[#67E8F9]/20 transition-colors';

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.15em] px-4 mb-3 mt-6">
    {children}
  </p>
);

// ─── Layout principal ─────────────────────────────────────────────────────────

const DesktopLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = React.useState(false);
  const [supportOpen, setSupportOpen] = React.useState(false);
  const saludo = useMemo(getSaludo, []);
  const nombreCorto = user?.name?.split(' ')[0] ?? 'Usuario';
  const iniciales = getIniciales(user?.name ?? 'U');

  const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null);

  React.useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert('La aplicación ya está instalada o tu navegador no soporta la instalación directa.');
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--surface-page)', overflow: 'hidden' }}>

      {/* ═══════════════════════════════════════════════════════════
          SIDEBAR
      ═══════════════════════════════════════════════════════════ */}
      <aside
        className="sidebar-scroll"
        style={{
          width: 'var(--sidebar-width)',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(180deg, #072E45 0%, #041D2B 100%)',
          borderRight: '1px solid rgba(255,255,255,0.05)',
          position: 'sticky',
          top: 0,
          height: '100vh',
          minHeight: '100vh',
          overflowY: 'auto',
          overflowX: 'hidden',
          boxShadow: '4px 0 24px rgba(0,0,0,0.2)',
        }}
      >

        {/* Logo */}
        <Link to="/dashboard" style={{ textDecoration: 'none' }}>
          <div style={{ padding: '32px 24px 24px', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0, cursor: 'pointer' }} className="hover:opacity-80 transition-opacity">
            <div className="relative">
              <img
                src={`/logo2.png?v=${Date.now()}`}
                alt="ViñaMed"
                style={{ height: 42, objectFit: 'contain', filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.2))' }}
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
            <div>
              <p style={{ color: '#fff', fontWeight: 800, fontSize: 18, margin: 0, lineHeight: 1, letterSpacing: '-0.02em' }}>ViñaMed</p>
              <p style={{ color: 'rgba(255,255,255,0.40)', fontSize: 10, fontWeight: 600, margin: '4px 0 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Portal Clínico</p>
            </div>
          </div>
        </Link>

        {/* Divisor */}
        <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.08)', marginBottom: 16, flexShrink: 0 }} />

        {/* Navegación */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '0 12px 32px' }}>

          {/* Principal */}
          <div style={{ marginBottom: 20 }}>
            <SectionLabel>Principal</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <NavLink to="/dashboard" className={navLinkClasses}>
                {({ isActive }) => (
                  <>
                    {isActive && <div className={activeIndicatorClasses} />}
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
                      <rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
                    </svg>
                    Dashboard
                  </>
                )}
              </NavLink>
              <NavLink to="/agenda" className={navLinkClasses}>
                {({ isActive }) => (
                  <>
                    {isActive && <div className={activeIndicatorClasses} />}
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Agenda
                  </>
                )}
              </NavLink>
              <NavLink to="/recepcion" className={navLinkClasses}>
                {({ isActive }) => (
                  <>
                    {isActive && <div className={activeIndicatorClasses} />}
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    Recepción
                  </>
                )}
              </NavLink>
            </div>
          </div>

          {/* Clínica */}
          <div style={{ marginBottom: 20 }}>
            <SectionLabel>Clínica</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <NavLink to="/atencion-medica" className={navLinkClasses}>
                {({ isActive }) => (
                  <>
                    {isActive && <div className={activeIndicatorClasses} />}
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                    </svg>
                    Box Medicina
                  </>
                )}
              </NavLink>
              <NavLink to="/box-ecografia" className={navLinkClasses}>
                {({ isActive }) => (
                  <>
                    {isActive && <div className={activeIndicatorClasses} />}
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <ellipse cx="12" cy="12" rx="10" ry="6" /><path d="M12 6c2 3.5 2 8.5 0 12" /><path d="M2 12h20" />
                    </svg>
                    Box Ecografía
                    <span className={badgeClasses}>1</span>
                  </>
                )}
              </NavLink>
              <NavLink to="/box-enfermeria" className={navLinkClasses}>
                {({ isActive }) => (
                  <>
                    {isActive && <div className={activeIndicatorClasses} />}
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M22 12h-4l-3 9L9 3l-3 9H2" />
                    </svg>
                    Box Enfermería
                  </>
                )}
              </NavLink>
              <NavLink to="/validar-informe" className={navLinkClasses}>
                {({ isActive }) => (
                  <>
                    {isActive && <div className={activeIndicatorClasses} />}
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                    </svg>
                    Validar Informe
                  </>
                )}
              </NavLink>
              <NavLink to="/setm" className={navLinkClasses}>
                {({ isActive }) => (
                  <>
                    {isActive && <div className={activeIndicatorClasses} />}
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 2v6l3 3-7 7-7-7 3-3V2" /><line x1="14" y1="2" x2="10" y2="2" />
                    </svg>
                    Toma de Muestras
                    <span className={badgeClasses}>2</span>
                  </>
                )}
              </NavLink>
              {/* <NavLink to="/mamografia" className={navLinkClasses}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path d="M21 12c0 1.2-4.03 6-9 6s-9-4.8-9-6c0-1.2 4.03-6 9-6s9 4.8 9 6Z" />
                  <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                </svg>
                Mamografías
              </NavLink> */}
            </div>
          </div>

          {/* Gestión */}
          <div>
            <SectionLabel>Gestión</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <NavLink to="/profesionales" className={navLinkClasses}>
                {({ isActive }) => (
                  <>
                    {isActive && <div className={activeIndicatorClasses} />}
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Profesionales
                  </>
                )}
              </NavLink>
              <NavLink to="/inventario" className={navLinkClasses}>
                {({ isActive }) => (
                  <>
                    {isActive && <div className={activeIndicatorClasses} />}
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    </svg>
                    Inventario / REAS
                  </>
                )}
              </NavLink>
              <NavLink to="/protocolos" className={navLinkClasses}>
                {({ isActive }) => (
                  <>
                    {isActive && <div className={activeIndicatorClasses} />}
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path strokeLinecap="round" strokeLinejoin="round" d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                    </svg>
                    Protocolos
                  </>
                )}
              </NavLink>
              <NavLink to="/reportes" className={navLinkClasses}>
                {({ isActive }) => (
                  <>
                    {isActive && <div className={activeIndicatorClasses} />}
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
                    </svg>
                    Reportes
                  </>
                )}
              </NavLink>
              <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '12px 16px' }} />
              <NavLink to="/gestion" className={navLinkClasses}>
                {({ isActive }) => (
                  <>
                    {isActive && <div className={activeIndicatorClasses} />}
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Gestión interna
                  </>
                )}
              </NavLink>
              <NavLink to="/pacientes" className={navLinkClasses}>
                {({ isActive }) => (
                  <>
                    {isActive && <div className={activeIndicatorClasses} />}
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    Pacientes
                  </>
                )}
              </NavLink>
              <NavLink to="/nuevopaciente" className={navLinkClasses}>
                {({ isActive }) => (
                  <>
                    {isActive && <div className={activeIndicatorClasses} />}
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /><line x1="12" y1="11" x2="12" y2="17" /><line x1="9" y1="14" x2="15" y2="14" />
                    </svg>
                    Nuevo Paciente
                  </>
                )}
              </NavLink>
            </div>
          </div>
        </nav>

        {/* Footer sidebar */}
        <div style={{ padding: '12px 16px 16px', flexShrink: 0, position: 'relative' }}>
          {/* Synaptech branding */}
          <div 
            onClick={() => setSupportOpen(!supportOpen)}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8, 
              opacity: supportOpen ? 1 : 0.55,
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '12px',
              background: supportOpen ? 'rgba(255,255,255,0.08)' : 'transparent',
              transition: 'all 0.2s'
            }}
          >
            <img
              src={`/logo3.png?v=${Date.now()}`}
              alt="Synaptech Spa"
              style={{ height: 20, objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
            <div>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', margin: 0 }}>Desarrollado por</p>
              <p style={{ fontSize: 11, color: '#fff', fontWeight: 500, margin: 0 }}>Synaptech Spa</p>
            </div>
          </div>

          {supportOpen && (
            <div style={{
              position: 'absolute',
              bottom: 'calc(100% + 10px)',
              left: 16,
              right: 16,
              background: '#0F172A',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12,
              padding: '12px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)',
              zIndex: 100,
              animation: 'fadeInUp 0.2s ease-out'
            }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#38BDF8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Soporte Técnico
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <a 
                  href="mailto:hola@synaptech.cl" 
                  style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'rgba(255,255,255,0.8)', textDecoration: 'none', padding: '4px 0' }}
                  onMouseOver={e => (e.currentTarget.style.color = '#fff')}
                  onMouseOut={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.8)')}
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  hola@synaptech.cl
                </a>
                <a 
                  href="https://wa.me/56983568212" 
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'rgba(255,255,255,0.8)', textDecoration: 'none', padding: '4px 0' }}
                  onMouseOver={e => (e.currentTarget.style.color = '#fff')}
                  onMouseOut={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.8)')}
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  +569 8356 8212
                </a>
                <a href="https://synaptechspa.cl" target="_blank" rel="noreferrer" style={{ display: 'block', fontSize: 10, color: 'rgba(255,255,255,0.4)', textDecoration: 'none', marginTop: 4, textAlign: 'center' }}>Botón secreto</a>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ═══════════════════════════════════════════════════════════
          ÁREA PRINCIPAL
      ═══════════════════════════════════════════════════════════ */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100vh', overflow: 'hidden' }}>

        {/* Header superior */}
        <header style={{
          height: 'var(--header-height)',
          background: 'var(--header-bg)',
          borderBottom: '0.5px solid var(--header-border)',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 20,
          flexShrink: 0,
        }}>
          {/* Saludo dinámico */}
          <div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>{saludo},</p>
            <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>
              {nombreCorto}
            </p>
          </div>

          {/* Acciones derecha */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Badge modo protegido */}
            <div style={{
              fontSize: 11,
              fontWeight: 500,
              color: 'var(--text-secondary)',
              background: '#F1F5F9',
              border: '0.5px solid #E2E8F0',
              borderRadius: 6,
              padding: '3px 10px',
            }}>
              Modo protegido
            </div>

            {/* Icono notificaciones */}
            <button
              aria-label="Notificaciones"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                padding: 4,
                display: 'flex',
                alignItems: 'center',
                borderRadius: 8,
                transition: 'color 0.15s',
              }}
              onMouseOver={e => (e.currentTarget.style.color = 'var(--color-primary)')}
              onMouseOut={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
            >
              <svg width={20} height={20} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>

            {/* Avatar con Dropdown */}
            <div style={{ position: 'relative' }}>
              <div 
                onClick={() => setProfileOpen(!profileOpen)}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  background: 'var(--color-primary)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 600,
                  flexShrink: 0,
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
                title={user?.name ?? ''}
              >
                {iniciales}
              </div>

              {profileOpen && (
                <>
                  <div 
                    onClick={() => setProfileOpen(false)}
                    style={{ position: 'fixed', inset: 0, zIndex: 40 }} 
                  />
                  <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 12px)',
                    right: 0,
                    width: 240,
                    background: '#fff',
                    border: '1px solid #E2E8F0',
                    borderRadius: 12,
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
                    padding: '16px',
                    zIndex: 50,
                    animation: 'fadeInScale 0.2s ease-out',
                  }}>
                    <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #F1F5F9' }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', margin: 0 }}>{user?.name}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0', textTransform: 'capitalize' }}>
                        {user?.role}
                      </p>
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>RUT</span>
                        <span style={{ fontSize: 11, fontWeight: 500, color: '#475569' }}>{user?.rut}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>ID</span>
                        <span style={{ fontSize: 10, color: '#94A3B8', fontFamily: 'monospace' }}>
                          {user?.uid.slice(0, 8)}...
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => { navigate('/contraseña'); setProfileOpen(false); }}
                      style={{
                        width: '100%',
                        padding: '8px',
                        background: '#F1F5F9',
                        color: '#475569',
                        border: '1px solid #E2E8F0',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        transition: 'all 0.15s',
                        marginBottom: 8,
                      }}
                      onMouseOver={e => (e.currentTarget.style.background = '#E2E8F0')}
                      onMouseOut={e => (e.currentTarget.style.background = '#F1F5F9')}
                    >
                      <svg width={14} height={14} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                      Cambiar contraseña
                    </button>

                    <button
                      onClick={handleLogout}
                      style={{
                        width: '100%',
                        padding: '8px',
                        background: '#FFF1F2',
                        color: '#E11D48',
                        border: '1px solid #FFE4E6',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        transition: 'all 0.15s',
                        marginBottom: 8,
                      }}
                      onMouseOver={e => (e.currentTarget.style.background = '#FFE4E6')}
                      onMouseOut={e => (e.currentTarget.style.background = '#FFF1F2')}
                    >
                      <svg width={14} height={14} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-6 0v-1m6 0H9" />
                      </svg>
                      Cerrar sesión
                    </button>

                    <button
                      onClick={handleInstallClick}
                      style={{
                        width: '100%',
                        padding: '8px',
                        background: '#F0F9FF',
                        color: '#0369A1',
                        border: '1px solid #E0F2FE',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        transition: 'all 0.15s',
                      }}
                      onMouseOver={e => (e.currentTarget.style.background = '#E0F2FE')}
                      onMouseOut={e => (e.currentTarget.style.background = '#F0F9FF')}
                    >
                      <svg width={14} height={14} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Instalar app
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
          <style>{`
            @keyframes fadeInScale {
              from { opacity: 0; transform: scale(0.95); }
              to { opacity: 1; transform: scale(1); }
            }
            @keyframes fadeInUp {
              from { opacity: 0; transform: translateY(10px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .sidebar-scroll {
              scrollbar-width: thin;
              scrollbar-color: rgba(14, 116, 144, 0.4) transparent;
            }
            .sidebar-scroll::-webkit-scrollbar {
              width: 3px;
            }
            .sidebar-scroll::-webkit-scrollbar-track {
              background: transparent;
            }
            .sidebar-scroll::-webkit-scrollbar-thumb {
              background: rgba(14, 116, 144, 0.35);
              border-radius: 10px;
            }
            .sidebar-scroll:hover::-webkit-scrollbar-thumb {
              background: rgba(103, 232, 249, 0.5);
            }
          `}</style>
        </header>

        {/* Contenido de la página */}
        <div
          className="content-scroll"
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            background: 'var(--surface-page)',
            padding: 24,
          }}
        >
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DesktopLayout;
