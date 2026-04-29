import React, { useState } from 'react';

type Period = 'dia' | 'semana' | 'mes' | 'custom';
type Estado = 'Fin de atención' | 'En proceso';

interface Row {
  fecha: string;
  paciente: string;
  tipo: string;
  box: string;
  estado: Estado;
}

const ROWS: Row[] = [
  { fecha: '05/04/2026', paciente: 'MARÍA GONZÁLEZ', tipo: 'Ecografía Abdominal', box: 'Box Ecografía', estado: 'Fin de atención' },
  { fecha: '05/04/2026', paciente: 'CARLOS MUÑOZ', tipo: 'Hemograma + PCR', box: 'Sala Muestras', estado: 'En proceso' },
  { fecha: '05/04/2026', paciente: 'ANA RAMÍREZ', tipo: 'Ecografía Partes Blandas', box: 'Box Ecografía', estado: 'Fin de atención' },
  { fecha: '05/04/2026', paciente: 'SOFÍA VEGA', tipo: 'Orina completa', box: 'Sala Muestras', estado: 'En proceso' },
];

const PERIOD_LABELS: Record<Period, string> = {
  dia: 'Hoy', semana: 'Esta semana', mes: 'Este mes', custom: 'Personalizado',
};

const ReportesPage: React.FC = () => {
  const [period, setPeriod] = useState<Period>('dia');

  const total = ROWS.length;
  const eco = ROWS.filter(r => r.tipo.toLowerCase().includes('ecografía')).length;
  const muestras = ROWS.filter(r => !r.tipo.toLowerCase().includes('ecografía')).length;
  const fin = ROWS.filter(r => r.estado === 'Fin de atención').length;

  const exportCSV = () => {
    const header = 'Fecha,Paciente,Tipo de examen,Box / Sala,Estado\n';
    const body = ROWS.map(r => `${r.fecha},${r.paciente},${r.tipo},${r.box},${r.estado}`).join('\n');
    const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'reporte-vinamed.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-5 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Reportes y Estadísticas</h1>
        <p className="text-sm text-slate-500 mt-0.5">Desglose de exámenes por período · Exportable a CSV y Excel</p>
      </div>

      {/* Period chips */}
      <div className="flex flex-wrap gap-2">
        {(Object.entries(PERIOD_LABELS) as [Period, string][]).map(([k, lbl]) => (
          <button
            key={k}
            onClick={() => setPeriod(k)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
              period === k
                ? 'bg-[#0E7490]/10 border-[#0E7490]/40 text-[#0E7490]'
                : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
            }`}
          >
            {lbl}
          </button>
        ))}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { lbl: 'Total exámenes', val: total, cyan: false },
          { lbl: 'Ecografías', val: eco, cyan: true },
          { lbl: 'Muestras', val: muestras, cyan: false },
          { lbl: 'Fin de atención', val: fin, cyan: false },
        ].map(s => (
          <div key={s.lbl} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="text-xs text-slate-500 mb-1">{s.lbl}</div>
            <div className={`font-bold text-3xl ${s.cyan ? 'text-[#0E7490]' : 'text-emerald-600'}`}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 bg-[#0E7490] hover:bg-[#0c6680] text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Descargar CSV
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold px-4 py-2 rounded-xl border border-slate-200 transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" />
          </svg>
          Imprimir
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50">
                {['Fecha', 'Paciente', 'Tipo de examen', 'Box / Sala', 'Estado'].map(h => (
                  <th key={h} className="text-left text-xs text-slate-500 uppercase tracking-wide px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ROWS.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-500 font-mono text-xs">{r.fecha}</td>
                  <td className="px-4 py-3 text-slate-800 font-medium">{r.paciente}</td>
                  <td className="px-4 py-3 text-slate-600">{r.tipo}</td>
                  <td className="px-4 py-3 text-slate-500">{r.box}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold border px-2.5 py-0.5 rounded-full ${
                      r.estado === 'Fin de atención'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-[#0E7490]/10 text-[#0E7490] border-[#0E7490]/25'
                    }`}>
                      {r.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportesPage;
