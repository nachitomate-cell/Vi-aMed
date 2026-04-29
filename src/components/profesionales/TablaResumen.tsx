import React from 'react';

interface Props {
  porTipo: Record<string, number>;
  total: number;
}

export const TablaResumen: React.FC<Props> = ({ porTipo, total }) => {
  const filas = Object.entries(porTipo)
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-800 bg-slate-800/40">
            <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-400">Tipo de atención</th>
            <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-400">Cant.</th>
            <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-400">%</th>
          </tr>
        </thead>
        <tbody>
          {filas.map(([tipo, cant]) => (
            <tr key={tipo} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
              <td className="px-4 py-2.5 text-slate-300">{tipo}</td>
              <td className="px-4 py-2.5 text-right text-slate-300 font-mono">{cant}</td>
              <td className="px-4 py-2.5 text-right text-slate-400 font-mono">
                {total > 0 ? Math.round((cant / total) * 100) : 0}%
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-slate-800/40 border-t border-slate-700">
            <td className="px-4 py-2.5 text-xs font-bold text-slate-300 uppercase tracking-wide">Total</td>
            <td className="px-4 py-2.5 text-right text-slate-200 font-bold font-mono">{total}</td>
            <td className="px-4 py-2.5 text-right text-slate-400 font-mono">100%</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};
