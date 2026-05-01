import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import * as XLSX from 'xlsx';

// ── Types ─────────────────────────────────────────────────────

interface ValorPrevision {
  tipo: string;
  valor: number;
  copago: number;
}

interface PrestacionConfig {
  nombre: string;
  codigo: string;
  especialidad: string;
  valoresPrevision: ValorPrevision[];
  afecto: boolean;
}

interface PrestacionCita {
  prestacion: string;
  especialidad: string;
  prevision?: string;
}

interface CitaFinanciera {
  id: string;
  pacienteNombre: string;
  pacienteRut: string;
  fecha: Timestamp;
  estado: string;
  prestaciones?: PrestacionCita[];
  prevision?: string;
  box?: string;
  profesionalNombre?: string;
}

interface LineaFinanciera {
  fecha: Date;
  paciente: string;
  rut: string;
  prestacion: string;
  especialidad: string;
  prevision: string;
  valorBruto: number;
  copago: number;
  valorNeto: number;
  afecto: boolean;
  estado: string;
  profesional: string;
  box: string;
}

type Period = 'dia' | 'semana' | 'mes';

const PERIOD_LABELS: Record<Period, string> = {
  dia: 'Por turno (Hoy)',
  semana: 'Esta semana',
  mes: 'Este mes',
};

const fmt = (n: number) =>
  n.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 });

// ── Component ─────────────────────────────────────────────────

const GestionFinancieraPage: React.FC = () => {
  const [period, setPeriod] = useState<Period>('dia');
  const [citas, setCitas] = useState<CitaFinanciera[]>([]);
  const [prestacionesConfig, setPrestacionesConfig] = useState<PrestacionConfig[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch prestaciones config (con valoresPrevision)
  useEffect(() => {
    getDocs(collection(db, 'gestion_prestaciones')).then(snap => {
      setPrestacionesConfig(snap.docs.map(d => ({
        nombre: d.data().nombre ?? '',
        codigo: d.data().codigo ?? '',
        especialidad: d.data().especialidad ?? '',
        valoresPrevision: d.data().valoresPrevision ?? [],
        afecto: d.data().afecto ?? true,
      })));
    });
  }, []);

  // Fetch citas for period
  useEffect(() => {
    setLoading(true);
    const now = new Date();
    let start = new Date();
    if (period === 'dia') {
      start.setHours(0, 0, 0, 0);
    } else if (period === 'semana') {
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
      start.setHours(0, 0, 0, 0);
    } else {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const q = query(
      collection(db, 'citas'),
      where('fecha', '>=', Timestamp.fromDate(start)),
      orderBy('fecha', 'desc')
    );

    getDocs(q).then(snap => {
      setCitas(snap.docs.map(d => ({ id: d.id, ...d.data() } as CitaFinanciera)));
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [period]);

  // Build financial lines
  const lineas: LineaFinanciera[] = useMemo(() => {
    const result: LineaFinanciera[] = [];
    for (const cita of citas) {
      const prestsCita = cita.prestaciones ?? [];
      if (prestsCita.length === 0) continue;

      for (const prestCita of prestsCita) {
        // Find matching prestacion config
        const config = prestacionesConfig.find(
          p => p.nombre === prestCita.prestacion || p.codigo === prestCita.prestacion
        );

        const prevision = cita.prevision ?? prestCita.prevision ?? 'Particular';
        let valorBruto = 0;
        let copago = 0;

        if (config) {
          const vp = config.valoresPrevision.find(
            v => v.tipo.toLowerCase() === prevision.toLowerCase()
          ) ?? config.valoresPrevision[0];
          if (vp) {
            valorBruto = vp.valor;
            copago = vp.copago;
          }
        }

        result.push({
          fecha: cita.fecha.toDate(),
          paciente: cita.pacienteNombre,
          rut: cita.pacienteRut,
          prestacion: prestCita.prestacion,
          especialidad: prestCita.especialidad ?? '',
          prevision,
          valorBruto,
          copago,
          valorNeto: valorBruto - copago,
          afecto: config?.afecto ?? true,
          estado: cita.estado,
          profesional: cita.profesionalNombre ?? '—',
          box: cita.box ?? '—',
        });
      }
    }
    return result;
  }, [citas, prestacionesConfig]);

  // KPIs
  const totalBruto = lineas.reduce((s, l) => s + l.valorBruto, 0);
  const totalCopago = lineas.reduce((s, l) => s + l.copago, 0);
  const totalNeto = lineas.reduce((s, l) => s + l.valorNeto, 0);
  const totalAfecto = lineas.filter(l => l.afecto).reduce((s, l) => s + l.valorBruto, 0);
  const totalNoAfecto = lineas.filter(l => !l.afecto).reduce((s, l) => s + l.valorBruto, 0);

  // Por especialidad
  const porEspecialidad = useMemo(() => {
    const map: Record<string, number> = {};
    for (const l of lineas) {
      map[l.especialidad || 'Sin especialidad'] = (map[l.especialidad || 'Sin especialidad'] ?? 0) + l.valorBruto;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [lineas]);

  // Por previsión
  const porPrevision = useMemo(() => {
    const map: Record<string, { bruto: number; copago: number; count: number }> = {};
    for (const l of lineas) {
      if (!map[l.prevision]) map[l.prevision] = { bruto: 0, copago: 0, count: 0 };
      map[l.prevision].bruto += l.valorBruto;
      map[l.prevision].copago += l.copago;
      map[l.prevision].count++;
    }
    return Object.entries(map).sort((a, b) => b[1].bruto - a[1].bruto);
  }, [lineas]);

  // Export Excel detallado
  const exportExcel = () => {
    // Sheet 1: Detalle
    const detalle = lineas.map(l => ({
      'Fecha': l.fecha.toLocaleDateString('es-CL'),
      'Paciente': l.paciente,
      'RUT': l.rut,
      'Prestación': l.prestacion,
      'Especialidad': l.especialidad,
      'Previsión': l.prevision,
      'Valor Bruto ($)': l.valorBruto,
      'Copago ($)': l.copago,
      'Valor Neto ($)': l.valorNeto,
      'Afecto IVA': l.afecto ? 'Sí' : 'No',
      'Estado': l.estado,
      'Profesional': l.profesional,
      'Box/Sala': l.box,
    }));

    // Sheet 2: Resumen por previsión
    const resumenPrev = porPrevision.map(([prev, datos]) => ({
      'Previsión': prev,
      'Atenciones': datos.count,
      'Total Bruto ($)': datos.bruto,
      'Total Copago ($)': datos.copago,
      'Total Neto ($)': datos.bruto - datos.copago,
    }));

    // Sheet 3: Resumen por especialidad
    const resumenEsp = porEspecialidad.map(([esp, total]) => ({
      'Especialidad': esp,
      'Total Facturado ($)': total,
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detalle), 'Detalle');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumenPrev), 'Por Previsión');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumenEsp), 'Por Especialidad');

    const periodLabel = period === 'dia' ? 'turno' : period === 'semana' ? 'semana' : 'mes';
    const fecha = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `gestion-financiera-${periodLabel}-${fecha}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6]">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Gestión Financiera</h1>
              <p className="text-xs text-slate-500 mt-0.5">Reporte para contabilidad · Valores por previsión y prestación</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {loading && (
              <div className="flex items-center gap-2 text-slate-400 text-xs">
                <div className="w-3 h-3 border-2 border-slate-300 border-t-transparent animate-spin rounded-full" />
                Cargando...
              </div>
            )}
            <button
              onClick={exportExcel}
              disabled={lineas.length === 0}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="15" y2="15" />
              </svg>
              Exportar para Contador
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Period selector */}
        <div className="flex flex-wrap gap-2">
          {(Object.entries(PERIOD_LABELS) as [Period, string][]).map(([k, lbl]) => (
            <button
              key={k}
              onClick={() => setPeriod(k)}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                period === k
                  ? 'bg-emerald-600 border-emerald-600 text-white shadow-md'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { lbl: 'Total Bruto', val: fmt(totalBruto), sub: `${lineas.length} prest.`, color: 'text-slate-800', bg: 'bg-white', border: 'border-slate-200' },
            { lbl: 'Total Copago', val: fmt(totalCopago), sub: 'Cargo al paciente', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
            { lbl: 'Total Neto', val: fmt(totalNeto), sub: 'Ingreso clínica', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
            { lbl: 'Afecto IVA', val: fmt(totalAfecto), sub: 'Monto afecto', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
            { lbl: 'No Afecto IVA', val: fmt(totalNoAfecto), sub: 'Monto exento', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
          ].map(s => (
            <div key={s.lbl} className={`${s.bg} border ${s.border} rounded-2xl p-4 shadow-sm`}>
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">{s.lbl}</div>
              <div className={`text-xl font-extrabold ${s.color} tabular-nums`}>{s.val}</div>
              <div className="text-[10px] text-slate-400 mt-1">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Breakdown row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Por Previsión */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-700">Desglose por Previsión</h2>
            </div>
            {porPrevision.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-sm">Sin datos</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-5 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Previsión</th>
                    <th className="text-right px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Atenc.</th>
                    <th className="text-right px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Bruto</th>
                    <th className="text-right px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Copago</th>
                    <th className="text-right px-5 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Neto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {porPrevision.map(([prev, d]) => (
                    <tr key={prev} className="hover:bg-slate-50">
                      <td className="px-5 py-3 font-semibold text-slate-800">{prev}</td>
                      <td className="px-4 py-3 text-right text-slate-500">{d.count}</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-700">{fmt(d.bruto)}</td>
                      <td className="px-4 py-3 text-right font-mono text-amber-600">{fmt(d.copago)}</td>
                      <td className="px-5 py-3 text-right font-mono font-bold text-emerald-700">{fmt(d.bruto - d.copago)}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 border-t border-slate-200">
                    <td className="px-5 py-3 font-bold text-slate-800">TOTAL</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-600">{lineas.length}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">{fmt(totalBruto)}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-amber-700">{fmt(totalCopago)}</td>
                    <td className="px-5 py-3 text-right font-mono font-bold text-emerald-700">{fmt(totalNeto)}</td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>

          {/* Por Especialidad */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-700">Desglose por Especialidad</h2>
            </div>
            {porEspecialidad.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-sm">Sin datos</div>
            ) : (
              <div className="divide-y divide-slate-50">
                {porEspecialidad.map(([esp, total]) => {
                  const pct = totalBruto > 0 ? (total / totalBruto) * 100 : 0;
                  return (
                    <div key={esp} className="px-5 py-3.5 flex items-center gap-3 hover:bg-slate-50">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-slate-700 truncate">{esp}</div>
                        <div className="mt-1.5 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-slate-800 text-sm">{fmt(total)}</div>
                        <div className="text-[10px] text-slate-400">{pct.toFixed(1)}%</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Detail Table */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-700">Detalle de Prestaciones</h2>
            <span className="text-xs text-slate-400">{lineas.length} líneas</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['Fecha', 'Paciente', 'RUT', 'Prestación', 'Especialidad', 'Previsión', 'Valor Bruto', 'Copago', 'Valor Neto', 'Afecto', 'Profesional'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {lineas.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-12 text-center text-slate-400 italic">
                      No hay datos financieros para este período. Verifica que las prestaciones tengan valores por previsión configurados.
                    </td>
                  </tr>
                ) : (
                  lineas.map((l, i) => (
                    <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">
                        {l.fecha.toLocaleDateString('es-CL')}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">{l.paciente}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">{l.rut}</td>
                      <td className="px-4 py-3 text-slate-700 max-w-[180px] truncate" title={l.prestacion}>{l.prestacion}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium text-[#0E7490] bg-[#0E7490]/10 px-2 py-0.5 rounded-full">{l.especialidad || '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{l.prevision}</td>
                      <td className="px-4 py-3 font-mono font-semibold text-slate-800 whitespace-nowrap text-right">
                        {l.valorBruto > 0 ? fmt(l.valorBruto) : <span className="text-slate-400 font-normal text-xs">Sin valor</span>}
                      </td>
                      <td className="px-4 py-3 font-mono text-amber-600 whitespace-nowrap text-right">
                        {l.copago > 0 ? fmt(l.copago) : '—'}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-emerald-700 whitespace-nowrap text-right">
                        {l.valorNeto > 0 ? fmt(l.valorNeto) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${l.afecto ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                          {l.afecto ? 'Afecto' : 'Exento'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{l.profesional}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {lineas.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-50 border-t-2 border-slate-200 font-bold">
                    <td colSpan={6} className="px-4 py-3 text-slate-700 text-sm">TOTALES DEL PERÍODO</td>
                    <td className="px-4 py-3 font-mono text-slate-800 text-right whitespace-nowrap">{fmt(totalBruto)}</td>
                    <td className="px-4 py-3 font-mono text-amber-700 text-right whitespace-nowrap">{fmt(totalCopago)}</td>
                    <td className="px-4 py-3 font-mono text-emerald-700 text-right whitespace-nowrap">{fmt(totalNeto)}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GestionFinancieraPage;
