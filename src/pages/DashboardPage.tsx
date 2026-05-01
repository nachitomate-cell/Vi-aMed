import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, limit, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
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

  // Últimos 5 pacientes (citas)
  const [ultimasCitas, setUltimasCitas] = useState<{
    id: string;
    pacienteNombre: string;
    pacienteRut: string;
    tipoAtencion: string;
    estado: string;
    fecha: Timestamp;
  }[]>([]);
  const [loadingCitas, setLoadingCitas] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'citas'),
      orderBy('fecha', 'desc'),
      limit(5)
    );
    const unsub = onSnapshot(q, snap => {
      setUltimasCitas(snap.docs.map(d => ({ id: d.id, ...d.data() } as any)));
      setLoadingCitas(false);
    }, () => setLoadingCitas(false));
    return () => unsub();
  }, []);

  const [stats, setStats] = useState({
    pacientesHoy: 0,
    informesEco: 0,
    muestras: 0,
    procedimientos: 0,
  });

  useEffect(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const q = query(
      collection(db, 'citas'),
      where('fecha', '>=', Timestamp.fromDate(start)),
      where('fecha', '<=', Timestamp.fromDate(end))
    );

    const unsub = onSnapshot(q, snap => {
      const docs = snap.docs.map(d => d.data());
      const hoy = docs.length;
      const eco = docs.filter(d => 
        (d.prestaciones as any[])?.some(p => p.especialidad === 'Ecografia')
      ).length;
      const muestras = docs.filter(d => 
        (d.prestaciones as any[])?.some(p => p.especialidad === 'Toma de Muestras')
      ).length;
      const proc = docs.filter(d => 
        (d.prestaciones as any[])?.some(p => p.especialidad === 'Medicina')
      ).length;

      setStats({
        pacientesHoy: hoy,
        informesEco: eco,
        muestras: muestras,
        procedimientos: proc,
      });
    });
    return () => unsub();
  }, []);

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
    enf: 'Box de Medicina',
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
        <KpiCard label="Pacientes hoy"  valor={stats.pacientesHoy.toString()} sub="Registrados"     accent />
        <KpiCard label="Informes eco"   valor={stats.informesEco.toString()} sub="Generados hoy"   accent />
        <KpiCard label="Muestras"       valor={stats.muestras.toString()} sub="Pendientes"       />
        <KpiCard label="Procedimientos" valor={stats.procedimientos.toString()} sub="Medicina"       />
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
              label: 'Agregar Atención',
              desc: 'Registra una nueva atención, procedimiento o consulta.',
              cta: 'Nueva atención →',
              path: '/atencion',
              accent: true,
              icon: (
                <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              ),
            },
            {
              label: 'Box de Medicina',
              desc: 'Atención de pacientes, anamnesis y ficha clínica.',
              cta: 'Ir al Box →',
              path: '/atencion-medica',
              accent: false,
              icon: (
                <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              ),
            },
            {
              label: 'Inventario / REAS',
              desc: 'Control de insumos, stock y registro de temperaturas.',
              cta: 'Ver inventario →',
              path: '/inventario',
              accent: true,
              icon: (
                <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                </svg>
              ),
            },
            {
              label: 'Retiros Lab',
              desc: 'Registro de retiro de muestras y parámetros técnicos.',
              cta: 'Ver retiros →',
              path: '/retiros',
              accent: false,
              icon: (
                <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v10m0 0l-3-3m3 3l3-3" /><path d="M20 12a8 8 0 1 1-16 0" /><path d="M12 22v-4" />
                </svg>
              ),
            },
            {
              label: 'Informe Ecografía',
              desc: 'Completa y exporta informes con plantilla oficial.',
              cta: 'Ir al Box →',
              path: '/box-ecografia',
              accent: false,
              icon: (
                <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <ellipse cx="12" cy="12" rx="10" ry="6" /><path d="M12 6c2 3.5 2 8.5 0 12" /><path d="M2 12h20" />
                </svg>
              ),
            },
            {
              label: 'Toma de Muestras',
              desc: 'Registro de órdenes y seguimiento de exámenes.',
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
              accent: false,
              icon: (
                <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
                </svg>
              ),
            },
            {
              label: 'Agenda de profesionales',
              desc: 'Gestión de citas y disponibilidad de profesionales.',
              cta: 'Ver agenda →',
              path: '/agenda',
              accent: false,
              icon: (
                <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
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
        {sectionLabel('Actividad Reciente — Últimos 5 pacientes')}
        <div style={{
          background: 'var(--surface-card)',
          border: '0.5px solid var(--surface-card-border)',
          borderRadius: 12,
          overflow: 'hidden',
        }}>
          {loadingCitas ? (
            <div style={{ padding: '32px', textAlign: 'center' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #f1f5f9', borderTopColor: 'var(--color-primary)', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>Cargando actividad...</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : ultimasCitas.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>No hay atenciones registradas aún.</p>
            </div>
          ) : (
            ultimasCitas.map((cita, i) => {
              const fecha = (cita.fecha as any)?.toDate?.();
              const horaStr = fecha ? fecha.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '—';
              const fechaStr = fecha ? fecha.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
              const estadoColors: Record<string, string> = {
                solicitada: '#D97706', confirmada: '#0891B2', realizada: '#059669',
                cancelada: '#DC2626', no_asistio: '#EA580C',
              };
              const estadoColor = estadoColors[cita.estado] ?? 'var(--text-muted)';
              return (
                <div
                  key={cita.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '12px 20px',
                    borderBottom: i < ultimasCitas.length - 1 ? '0.5px solid var(--surface-card-border)' : 'none',
                  }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'rgba(14,116,144,0.10)', color: 'var(--color-primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: 14, flexShrink: 0,
                  }}>
                    {cita.pacienteNombre?.slice(0, 1) ?? '?'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {cita.pacienteNombre ?? 'Sin nombre'}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {cita.tipoAtencion ?? '—'} · {cita.pacienteRut ?? ''}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: estadoColor, margin: 0, textTransform: 'capitalize' }}>
                      {cita.estado?.replace('_', ' ') ?? '—'}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>
                      {fechaStr} {horaStr}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
