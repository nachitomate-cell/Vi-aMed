import React from 'react';

const ValidarInformePage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <div className="w-16 h-16 bg-[#0E7490]/10 rounded-2xl flex items-center justify-center mb-6 border border-[#0E7490]/20">
        <svg className="w-8 h-8 text-[#0E7490]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-slate-800 mb-2">Validación de Informes</h1>
      <p className="text-slate-500 max-w-md">
        Acá llegarán las imágenes e informes para la validación por el médico radiólogo.
      </p>
      
      <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm flex items-center gap-3">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        Próximamente disponible
      </div>
    </div>
  );
};

export default ValidarInformePage;
