import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  Timestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Cita } from '../types/agenda';

type Period = 'dia' | 'semana' | 'mes';

const PERIOD_LABELS: Record<Period, string> = {
  dia: 'Hoy', 
  semana: 'Esta semana', 
  mes: 'Este mes',
};

const ReportesPage: React.FC = () => {
  const [period, setPeriod] = useState<Period>('dia');
  const [citas, setCitas] = useState<Cita[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const now = new Date();
    let start = new Date();

    if (period === 'dia') {
      start.setHours(0, 0, 0, 0);
    } else if (period === 'semana') {
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1); // lunes
      start.setDate(diff);
      start.setHours(0, 0, 0, 0);
    } else if (period === 'mes') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      start.setHours(0, 0, 0, 0);
    }

    const q = query(
      collection(db, 'citas'),
      where('fecha', '>=', Timestamp.fromDate(start)),
      orderBy('fecha', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Cita));
      setCitas(docs);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching report data:", err);
      setLoading(false);
    });

    return () => unsub();
  }, [period]);

  const total = citas.length;
  const eco = citas.filter(c => c.tipoAtencion.toLowerCase().includes('eco')).length;
  const muestras = total - eco;
  const fin = citas.filter(c => c.estado === 'realizada').length;

  const exportCSV = () => {
    const header = 'Fecha,Paciente,Tipo de examen,Box / Sala,Estado\n';
    const body = citas.map(c => {
      const date = c.fecha.toDate().toLocaleDateString('es-CL');
      const estado = c.estado === 'realizada' ? 'Fin de atención' : 'En proceso';
      return `${date},${c.pacienteNombre},${c.tipoAtencion},${c.box},${estado}`;
    }).join('\n');
    
    const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); 
    a.href = url; 
    a.download = `reporte-vinamed-${period}.csv`; 
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-5 space-y-5">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Reportes y Estadísticas</h1>
          <p className="text-sm text-slate-500 mt-0.5">Datos en tiempo real desde la agenda clínica</p>
        </div>
        {loading && (
          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <div className="w-3 h-3 border-2 border-slate-300 border-t-transparent animate-spin rounded-full" />
            Actualizando...
          </div>
        )}
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

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { lbl: 'Total exámenes', val: total, color: 'text-slate-800' },
          { lbl: 'Ecografías', val: eco, color: 'text-[#0E7490]' },
          { lbl: 'Muestras', val: muestras, color: 'text-emerald-600' },
          { lbl: 'Fin de atención', val: fin, color: 'text-emerald-700' },
        ].map(s => (
          <div key={s.lbl} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="text-xs text-slate-500 mb-1 font-medium">{s.lbl}</div>
            <div className={`font-bold text-3xl ${s.color}`}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={exportCSV}
          disabled={citas.length === 0}
          className="flex items-center gap-2 bg-[#0E7490] hover:bg-[#0c6680] disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
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

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50">
                {['Fecha', 'Paciente', 'Tipo de examen', 'Box / Sala', 'Estado'].map(h => (
                  <th key={h} className="text-left text-xs text-slate-500 uppercase tracking-wide px-4 py-3 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {citas.length === 0 && !loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-400 italic">
                    No se encontraron registros para este período.
                  </td>
                </tr>
              ) : (
                citas.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                      {c.fecha.toDate().toLocaleDateString('es-CL')}
                    </td>
                    <td className="px-4 py-3 text-slate-800 font-medium">
                      {c.pacienteNombre}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {c.tipoAtencion}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {c.box}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-bold border px-2.5 py-0.5 rounded-full uppercase ${
                        c.estado === 'realizada'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-[#0E7490]/10 text-[#0E7490] border-[#0E7490]/25'
                      }`}>
                        {c.estado === 'realizada' ? 'Fin de atención' : 'En proceso'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportesPage;
