import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { esMobile } from '../utils/device';

// ─── Tipos ────────────────────────────────────────────────────────────────────
type BoxState = 'available' | 'busy' | 'maintenance';

// ─── Helpers de fecha ─────────────────────────────────────────────────────────
const DIAS_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function getFechaLarga(): string {
  const now = new Date();
  return `${DIAS_ES[now.getDay()]}, ${now.getDate()} de ${MESES_ES[now.getMonth()]} de ${now.getFullYear()}`;
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
const KpiCard: React.FC<{ label: string; valor: string; sub: string; accent?: boolean }> = ({
  label, valor, sub, accent = false,
}) => (
  <div style={{
    background: 'var(--surface-card)',
    border: '0.5px solid var(--surface-card-border)',
    borderRadius: 12,
    padding: '16px 20px',
    transition: 'box-shadow 0.15s',
  }}
    onMouseOver={e => (e.currentTarget.style.boxShadow = '0 0 0 2px rgba(14,116,144,0.10)')}
    onMouseOut={e => (e.currentTarget.style.boxShadow = 'none')}
  >
    <p style={{
      fontSize: 11,
      fontWeight: 600,
      color: 'var(--text-secondary)',
      textTransform: 'uppercase',
      letterSpacing: '0.07em',
      margin: '0 0 10px',
    }}>
      {label}
    </p>
    <p style={{
      fontSize: 34,
      fontWeight: 500,
      color: accent ? 'var(--color-primary)' : '#0F172A',
      lineHeight: 1,
      margin: '0 0 6px',
    }}>
      {valor}
    </p>
    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>{sub}</p>
  </div>
);

// ─── Box Status dot ───────────────────────────────────────────────────────────
const DOT_COLORS: Record<BoxState, string> = {
  available:   'var(--color-success)',
  busy:        'var(--color-danger)',
  maintenance: 'var(--color-warning)',
};
const BOX_LABELS: Record<BoxState, string> = {
  available:   'Disponible',
  busy:        'Ocupado',
  maintenance: 'En mantención',
};

// ─── Acceso Rápido Card ───────────────────────────────────────────────────────
const QuickCard: React.FC<{
  label: string;
  desc: string;
  cta: string;
  path: string;
  icon: React.ReactNode;
  accent: boolean;
  navigate: (path: string) => void;
}> = ({ label, desc, cta, path, icon, accent, navigate }) => (
  <button
    onClick={() => navigate(path)}
    style={{
      textAlign: 'left',
      background: 'var(--surface-card)',
      border: '0.5px solid var(--surface-card-border)',
      borderRadius: 12,
      padding: '18px',
      cursor: 'pointer',
      transition: 'border-color 0.15s, box-shadow 0.15s',
      width: '100%',
    }}
    onMouseOver={e => {
      (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-primary)';
      (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 0 3px rgba(14,116,144,0.08)';
    }}
    onMouseOut={e => {
      (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--surface-card-border)';
      (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
    }}
  >
    {/* Icono */}
    <div style={{
      width: 38,
      height: 38,
      borderRadius: 10,
      background: accent ? 'rgba(14,116,144,0.10)' : '#F1F5F9',
      color: accent ? 'var(--color-primary)' : 'var(--text-secondary)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
    }}>
      {icon}
    </div>
    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 6px' }}>{label}</p>
    <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 12px', lineHeight: 1.5 }}>{desc}</p>
    <p style={{ fontSize: 12, fontWeight: 500, color: accent ? 'var(--color-primary)' : 'var(--text-secondary)', margin: 0 }}>
      {cta}
    </p>
  </button>
);

// ─── Componente principal ─────────────────────────────────────────────────────
const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const fechaLarga = useMemo(getFechaLarga, []);

  useEffect(() => {
    // Si accede desde móvil, redirigir a eco-mobile
    if (esMobile()) {
      navigate('/eco-mobile', { replace: true });
    }
  }, [navigate]);

  const [boxes, setBoxes] = useState<Record<string, BoxState>>({
    eco: 'available',
    enf: 'available',
    muestras: 'available',
  });

  const toggleBox = (key: string) => {
    setBoxes(prev => ({
      ...prev,
      [key]: prev[key] === 'available' ? 'busy' : 'available',
    }));
  };

  const boxLabel: Record<string, string> = {
    eco: 'Box Ecografía',
    enf: 'Box Enfermería',
    muestras: 'Sala Muestras',
  };

  const sectionLabel = (text: string) => (
    <p style={{
      fontSize: 11,
      fontWeight: 600,
      color: 'var(--text-secondary)',
      textTransform: 'uppercase',
      letterSpacing: '0.07em',
      margin: '0 0 12px',
    }}>
      {text}
    </p>
  );

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>

      {/* ── Encabezado del dashboard ──────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, color: 'var(--text-primary)', margin: '0 0 4px' }}>
          Dashboard
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>
          {fechaLarga}
        </p>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        <KpiCard label="Pacientes hoy"  valor="3" sub="Registrados"     accent />
        <KpiCard label="Informes eco"   valor="1" sub="Generados hoy"   accent />
        <KpiCard label="Muestras"       valor="2" sub="Pendientes"       />
        <KpiCard label="Procedimientos" valor="0" sub="Enfermería"       />
      </div>

      {/* ── Estado de Boxes ───────────────────────────────────────── */}
      <div style={{
        background: 'var(--surface-card)',
        border: '0.5px solid var(--surface-card-border)',
        borderRadius: 12,
        padding: '20px 24px',
        marginBottom: 24,
      }}>
        {sectionLabel('Estado de Boxes')}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {Object.entries(boxes).map(([key, state]) => (
            <button
              key={key}
              onClick={() => toggleBox(key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                background: '#F8FAFC',
                border: '0.5px solid var(--surface-card-border)',
                borderRadius: 10,
                padding: '12px 16px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'border-color 0.15s',
              }}
              onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = DOT_COLORS[state]; }}
              onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--surface-card-border)'; }}
            >
              <span style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                flexShrink: 0,
                background: DOT_COLORS[state],
                boxShadow: `0 0 0 3px ${DOT_COLORS[state]}22`,
              }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>
                  {boxLabel[key]}
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                  {BOX_LABELS[state]}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Acceso Rápido ─────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        {sectionLabel('Acceso Rápido')}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {([
            {
              label: 'Generar Informe Eco',
              desc: 'Completa y exporta informes con plantilla oficial ViñaMed.',
              cta: 'Ir al Box →',
              path: '/box-ecografia',
              accent: true,
              icon: (
                <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <ellipse cx="12" cy="12" rx="10" ry="6" /><path d="M12 6c2 3.5 2 8.5 0 12" /><path d="M2 12h20" />
                </svg>
              ),
            },
            {
              label: 'Toma de Muestras',
              desc: 'Registro de órdenes y seguimiento de exámenes de laboratorio.',
              cta: 'Ir a Sala →',
              path: '/setm',
              accent: false,
              icon: (
                <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2v6l3 3-7 7-7-7 3-3V2" /><line x1="14" y1="2" x2="10" y2="2" />
                </svg>
              ),
            },
            {
              label: 'Reporte del Día',
              desc: 'Descarga el desglose diario en CSV o Excel.',
              cta: 'Ver reportes →',
              path: '/reportes',
              accent: true,
              icon: (
                <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
                </svg>
              ),
            },
            {
              label: 'Registrar Paciente',
              desc: 'Ingresa un nuevo paciente para el turno actual.',
              cta: 'Nuevo registro →',
              path: '/nuevopaciente',
              accent: false,
              icon: (
                <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                  <line x1="12" y1="11" x2="12" y2="17" /><line x1="9" y1="14" x2="15" y2="14" />
                </svg>
              ),
            },
          ] as const).map(card => (
            <QuickCard key={card.label} navigate={navigate} {...card} />
          ))}
        </div>
      </div>

      {/* ── Actividad Reciente ────────────────────────────────────── */}
      <div>
        {sectionLabel('Actividad Reciente')}
        <div style={{
          background: 'var(--surface-card)',
          border: '0.5px solid var(--surface-card-border)',
          borderRadius: 12,
          overflow: 'hidden',
        }}>
          <div style={{ padding: '32px', textAlign: 'center' }}>
            <div style={{ 
              width: 40, 
              height: 40, 
              borderRadius: '50%', 
              border: '3px solid #f1f5f9',
              borderTopColor: 'var(--color-primary)',
              margin: '0 auto 16px',
              animation: 'spin 1s linear infinite'
            }} />
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
              Sincronizando actividad en tiempo real...
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              Los últimos registros de atención aparecerán aquí automáticamente.
            </p>
          </div>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
