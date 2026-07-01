import React, { useEffect } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Atajos de navegación (se activan con la secuencia: tecla "g" y luego la tecla).
// Esta lista es la fuente de verdad: la usa el manejador de teclado y este modal.
// ─────────────────────────────────────────────────────────────────────────────

export interface NavShortcut {
  key: string;
  label: string;
  path: string;
}

export const NAV_SHORTCUTS: NavShortcut[] = [
  { key: 'd', label: 'Dashboard', path: '/dashboard' },
  { key: 'r', label: 'Recepción', path: '/recepcion' },
  { key: 'p', label: 'Pacientes', path: '/pacientes' },
  { key: 'n', label: 'Nuevo paciente', path: '/nuevopaciente' },
  { key: 'c', label: 'Planilla / Caja', path: '/planilla' },
  { key: 'i', label: 'Imágenes a PDF', path: '/generar' },
  { key: 'f', label: 'Profesionales', path: '/profesionales' },
  { key: 'v', label: 'Inventario / REAS', path: '/inventario' },
  { key: 'e', label: 'Reportes', path: '/reportes' },
  { key: 's', label: 'Gestión interna', path: '/gestion' },
  { key: 't', label: 'Toma de muestras', path: '/setm' },
  { key: 'm', label: 'Box Medicina', path: '/atencion-medica' },
  { key: 'o', label: 'Box Ecografía', path: '/box-ecografia' },
];

const GENERAL: Array<{ keys: string[]; label: string }> = [
  { keys: ['?'], label: 'Mostrar / ocultar esta ayuda' },
  { keys: ['Ctrl', 'K'], label: 'Buscar paciente' },
  { keys: ['/'], label: 'Buscar paciente' },
  { keys: ['Esc'], label: 'Cerrar modales / ayuda' },
];

const ACCIONES: Array<{ keys: string[]; label: string }> = [
  { keys: ['Shift', 'D'], label: 'Modo claro / oscuro' },
  { keys: ['Shift', 'L'], label: 'Cerrar sesión' },
];

// ─── Estilos ─────────────────────────────────────────────────────────────────

const Kbd: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <kbd
    style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      minWidth: 22, height: 24, padding: '0 7px', borderRadius: 6,
      background: '#F1F5F9', border: '1px solid #E2E8F0', borderBottomWidth: 2,
      fontSize: 12, fontWeight: 700, color: '#334155',
      fontFamily: '"Inter", system-ui, sans-serif',
    }}
  >
    {children}
  </kbd>
);

const Fila: React.FC<{ keys: string[]; label: string }> = ({ keys, label }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '6px 0' }}>
    <span style={{ fontSize: 13, color: '#475569' }}>{label}</span>
    <span style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
      {keys.map((k, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span style={{ color: '#94A3B8', fontSize: 11 }}>+</span>}
          <Kbd>{k}</Kbd>
        </React.Fragment>
      ))}
    </span>
  </div>
);

const Seccion: React.FC<{ titulo: string; children: React.ReactNode }> = ({ titulo, children }) => (
  <div>
    <p style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' }}>
      {titulo}
    </p>
    <div>{children}</div>
  </div>
);

// ─── Modal ───────────────────────────────────────────────────────────────────

export const ShortcutsHelp: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onMouseDown={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 10001,
        background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(2px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        animation: 'vmDlgFade 0.15s ease-out',
      }}
    >
      <div
        onMouseDown={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{
          width: '100%', maxWidth: 720, maxHeight: '85vh', overflowY: 'auto',
          background: '#fff', borderRadius: 18, boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
          fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
          animation: 'vmDlgPop 0.18s cubic-bezier(0.22,1,0.36,1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 14px', borderBottom: '1px solid #F1F5F9' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0F172A' }}>Atajos de teclado</h2>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: '#94A3B8' }}>
              Para navegar, presiona <Kbd>G</Kbd> y luego la tecla del módulo.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 6, lineHeight: 0, borderRadius: 8 }}
            aria-label="Cerrar"
          >
            <svg width={20} height={20} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 32px', padding: '18px 24px 24px' }}>
          <Seccion titulo="General">
            {GENERAL.map((s, i) => <Fila key={i} keys={s.keys} label={s.label} />)}
          </Seccion>
          <Seccion titulo="Acciones">
            {ACCIONES.map((s, i) => <Fila key={i} keys={s.keys} label={s.label} />)}
          </Seccion>
          <div style={{ gridColumn: '1 / -1' }}>
            <Seccion titulo="Navegación  ( G  +  tecla )">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px' }}>
                {NAV_SHORTCUTS.map(s => (
                  <Fila key={s.key} keys={['G', s.key.toUpperCase()]} label={s.label} />
                ))}
              </div>
            </Seccion>
          </div>
        </div>
      </div>
    </div>
  );
};
