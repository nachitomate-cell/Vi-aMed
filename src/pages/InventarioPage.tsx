import React from 'react';

const InventarioPage: React.FC = () => (
  <div className="p-5 flex items-center justify-center min-h-[60vh]">
    <div className="max-w-md w-full text-center space-y-6">
      <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto">
        <svg className="w-7 h-7 text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        </svg>
      </div>
      <div>
        <span className="inline-block bg-amber-500/10 text-amber-400 border border-amber-500/25 text-xs font-semibold px-3 py-1 rounded-full mb-3">
          Próximo módulo
        </span>
        <h2 className="text-xl font-bold text-slate-100">Inventario / REAS</h2>
        <p className="text-sm text-slate-500 mt-2">
          Control de insumos clínicos, alertas de stock crítico y registro de residuos especiales (REAS).
        </p>
      </div>
    </div>
  </div>
);

export default InventarioPage;
