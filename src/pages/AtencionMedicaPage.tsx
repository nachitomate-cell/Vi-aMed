import React from 'react';

const AtencionMedicaPage: React.FC = () => (
  <div className="p-5 flex items-center justify-center min-h-[60vh]">
    <div className="max-w-md w-full text-center space-y-6">
      <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto">
        <svg className="w-7 h-7 text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      </div>
      <div>
        <span className="inline-block bg-amber-500/10 text-amber-400 border border-amber-500/25 text-xs font-semibold px-3 py-1 rounded-full mb-3">
          Próximo módulo
        </span>
        <h2 className="text-xl font-bold text-slate-100">Fichas Rápidas</h2>
        <p className="text-sm text-slate-500 mt-2">
          Registro simplificado de atención médica con historial por paciente y búsqueda por RUT.
        </p>
      </div>
    </div>
  </div>
);

export default AtencionMedicaPage;
