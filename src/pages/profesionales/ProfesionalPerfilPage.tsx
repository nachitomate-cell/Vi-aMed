import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Profesional } from '../../types/agenda';
import { getProfesional } from '../../services/profesionalesService';
import { useProfesionalKPIs } from '../../hooks/useProfesionalKPIs';
import { useProfesionalStats } from '../../hooks/useProfesionalStats';
import type { Periodo } from '../../hooks/useProfesionalStats';
import { StatsKPI } from '../../components/profesionales/StatsKPI';
import { GraficoBarras } from '../../components/profesionales/GraficoBarras';
import type { BarDatum } from '../../components/profesionales/GraficoBarras';
import { GraficoDonut } from '../../components/profesionales/GraficoDonut';
import { TablaResumen } from '../../components/profesionales/TablaResumen';
import { ListaAtenciones } from '../../components/profesionales/ListaAtenciones';
import { FormEditarProfesional } from '../../components/profesionales/FormEditarProfesional';

type Tab = 'estadisticas' | 'atenciones' | 'editar';

const ROL_LABELS: Record<string, string> = {
  medico: 'Médico/a',
  tecnologo: 'Tecnólogo/a',
  enfermero: 'Enfermero/a',
  secretaria: 'Secretaria',
  admin: 'Administración',
};

const DIAS_SEMANA = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];

function computeBarData(porDia: Record<string, number>, periodo: Periodo): BarDatum[] {
  const now = new Date();

  if (periodo === 'hoy') {
    const today = now.toISOString().slice(0, 10);
    return [{ label: 'Hoy', value: porDia[today] ?? 0 }];
  }

  if (periodo === 'semana') {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now.getTime() - (6 - i) * 86400000);
      const key = d.toISOString().slice(0, 10);
      return { label: DIAS_SEMANA[d.getDay()], value: porDia[key] ?? 0 };
    });
  }

  if (periodo === 'mes') {
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const weeks: Record<number, number> = {};
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const week = Math.ceil(d / 7);
      const key = date.toISOString().slice(0, 10);
      weeks[week] = (weeks[week] ?? 0) + (porDia[key] ?? 0);
    }
    return Object.entries(weeks).map(([w, v]) => ({ label: `Sem ${w}`, value: v }));
  }

  // rango — by day
  const { desde, hasta } = periodo as { desde: Date; hasta: Date };
  const days: BarDatum[] = [];
  const current = new Date(desde);
  current.setHours(0, 0, 0, 0);
  const end = new Date(hasta);
  end.setHours(23, 59, 59, 999);
  while (current <= end) {
    const key = current.toISOString().slice(0, 10);
    days.push({ label: `${current.getDate()}/${current.getMonth() + 1}`, value: porDia[key] ?? 0 });
    current.setDate(current.getDate() + 1);
  }
  return days;
}

function toDateInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const ProfesionalPerfilPage: React.FC = () => {
  const { profesionalId } = useParams<{ profesionalId: string }>();
  const navigate = useNavigate();

  const [profesional, setProfesional] = useState<Profesional | null>(null);
  const [cargandoPerfil, setCargandoPerfil] = useState(true);
  const [tabActivo, setTabActivo] = useState<Tab>('estadisticas');

  // Período para stats tab
  const [periodoSel, setPeriodoSel] = useState<'hoy' | 'semana' | 'mes' | 'rango'>('mes');
  const [rangoDesde, setRangoDesde] = useState<string>(toDateInput(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [rangoHasta, setRangoHasta] = useState<string>(toDateInput(new Date()));

  const periodo: Periodo = useMemo(() => {
    if (periodoSel === 'rango') {
      return { desde: new Date(rangoDesde + 'T00:00:00'), hasta: new Date(rangoHasta + 'T23:59:59') };
    }
    return periodoSel;
  }, [periodoSel, rangoDesde, rangoHasta]);

  useEffect(() => {
    if (!profesionalId) return;
    getProfesional(profesionalId).then(p => {
      setProfesional(p);
      setCargandoPerfil(false);
    }).catch(() => setCargandoPerfil(false));
  }, [profesionalId]);

  const kpis = useProfesionalKPIs(profesionalId);
  const stats = useProfesionalStats(profesionalId, periodo);
  const barData = useMemo(() => computeBarData(stats.porDia, periodo), [stats.porDia, periodo]);

  function getInitials(nombre: string): string {
    return nombre.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  }

  if (cargandoPerfil) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 rounded-full border-2 border-[#0E7490] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!profesional) {
    return (
      <div className="py-24 text-center space-y-3">
        <p className="text-slate-500">Profesional no encontrado.</p>
        <button onClick={() => navigate('/profesionales')} className="text-[#0E7490] text-sm hover:underline">
          ← Volver al equipo
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back nav */}
      <button
        onClick={() => navigate('/profesionales')}
        className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Equipo
      </button>

      {/* Header del perfil */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
              style={{ backgroundColor: profesional.color }}
            >
              {getInitials(profesional.nombre)}
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-100">{profesional.nombre}</h1>
              <p className="text-sm text-slate-400">
                {ROL_LABELS[profesional.rol] ?? profesional.rol}
                {profesional.especialidad && ` · ${profesional.especialidad}`}
              </p>
              <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold mt-1.5 px-2.5 py-0.5 rounded-full border ${
                profesional.activo
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-slate-700/30 text-slate-500 border-slate-700/50'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${profesional.activo ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                {profesional.activo ? 'Activo' : 'Inactivo'}
              </span>
            </div>
          </div>
          <button
            onClick={() => setTabActivo('editar')}
            className="px-4 py-2 text-sm border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 rounded-xl transition-colors flex-shrink-0"
          >
            Editar
          </button>
        </div>

        {/* KPIs */}
        <StatsKPI
          cargando={kpis.cargando}
          kpis={[
            { label: 'Total', value: kpis.total },
            { label: 'Este mes', value: kpis.esteMes },
            { label: 'Semana', value: kpis.estaSemana },
            { label: 'Prom. duración', value: kpis.promedioMinutos, isMinutos: true },
          ]}
        />
      </div>

      {/* Tabs */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        {/* Tab nav */}
        <div className="flex border-b border-slate-800">
          {([
            { key: 'estadisticas', label: 'Estadísticas' },
            { key: 'atenciones', label: 'Exámenes / Atenciones' },
            { key: 'editar', label: 'Editar perfil' },
          ] as { key: Tab; label: string }[]).map(t => (
            <button
              key={t.key}
              onClick={() => setTabActivo(t.key)}
              className={`px-5 py-3.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                tabActivo === t.key
                  ? 'text-[#0E7490] border-[#0E7490]'
                  : 'text-slate-400 border-transparent hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-6">
          {/* ── Estadísticas ── */}
          {tabActivo === 'estadisticas' && (
            <div className="space-y-6">
              {/* Selector de período */}
              <div className="flex flex-wrap gap-2 items-center">
                {(['hoy', 'semana', 'mes', 'rango'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setPeriodoSel(p)}
                    className={`px-4 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                      periodoSel === p
                        ? 'bg-[#0E7490]/20 text-[#0E7490] border-[#0E7490]/40'
                        : 'text-slate-400 border-slate-700 hover:border-slate-600 hover:text-slate-200'
                    }`}
                  >
                    {p === 'hoy' ? 'Hoy' : p === 'semana' ? 'Esta semana' : p === 'mes' ? 'Este mes' : 'Rango...'}
                  </button>
                ))}

                {periodoSel === 'rango' && (
                  <div className="flex items-center gap-2 ml-1">
                    <input
                      type="date"
                      value={rangoDesde}
                      onChange={e => setRangoDesde(e.target.value)}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-[#0E7490]"
                    />
                    <span className="text-slate-500 text-xs">hasta</span>
                    <input
                      type="date"
                      value={rangoHasta}
                      onChange={e => setRangoHasta(e.target.value)}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-[#0E7490]"
                    />
                  </div>
                )}
              </div>

              {stats.cargando ? (
                <div className="h-40 flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full border-2 border-[#0E7490] border-t-transparent animate-spin" />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Gráfico de barras */}
                  <div className="bg-slate-800/30 rounded-xl p-4">
                    <p className="text-xs font-semibold text-slate-400 mb-3">Citas por período</p>
                    <GraficoBarras datos={barData} color={profesional.color} />
                  </div>

                  {stats.totalRealizadas > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Donut */}
                      <div className="bg-slate-800/30 rounded-xl p-4">
                        <p className="text-xs font-semibold text-slate-400 mb-3">Distribución por tipo</p>
                        <GraficoDonut datos={stats.porTipo} />
                      </div>

                      {/* Tabla resumen */}
                      <div>
                        <p className="text-xs font-semibold text-slate-400 mb-3">Resumen del período</p>
                        <TablaResumen porTipo={stats.porTipo} total={stats.totalRealizadas} />
                      </div>
                    </div>
                  )}

                  {stats.totalRealizadas === 0 && (
                    <div className="py-12 text-center text-slate-500 text-sm">
                      No hay atenciones realizadas en el período seleccionado.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Exámenes / Atenciones ── */}
          {tabActivo === 'atenciones' && (
            <ListaAtenciones
              profesionalId={profesional.id}
            />
          )}

          {/* ── Editar perfil ── */}
          {tabActivo === 'editar' && (
            <FormEditarProfesional
              profesional={profesional}
              onActualizado={p => setProfesional(p)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfesionalPerfilPage;
