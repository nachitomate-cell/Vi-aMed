import React from 'react';

const ROADMAP = [
  { title: 'Hoja de procedimiento', desc: 'Tipo de herida, clasificación, técnica, materiales' },
  { title: 'Medicación administrada', desc: 'Nombre, dosis, vía, hora, responsable (SIS)' },
  { title: 'Signos vitales', desc: 'PA, FC, FR, SatO₂, glicemia capilar' },
  { title: 'Exámenes Cardiológicos', desc: 'ECG de reposo, monitoreo de presión (MAPA), Holter' },
  { title: 'Procedimientos', desc: 'Suturas, extracciones, tomas de muestras especiales' },
  { title: 'Exportación PDF', desc: 'Hoja imprimible con firma del enfermero' },
];

const BoxEnfermeriaPage: React.FC = () => (
  <div className="p-5 flex items-center justify-center min-h-[60vh]">
    <div className="max-w-md w-full text-center space-y-6">
      <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto">
        <svg className="w-7 h-7 text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      </div>
      <div>
        <span className="inline-block bg-amber-500/10 text-amber-400 border border-amber-500/25 text-xs font-semibold px-3 py-1 rounded-full mb-3">
          Próximo módulo
        </span>
        <h2 className="text-xl font-bold text-slate-100">Box Enfermería</h2>
        <p className="text-sm text-slate-500 mt-2">
          Hoja de procedimientos, administración de medicamentos y curación avanzada de heridas.
        </p>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-xl divide-y divide-slate-800 text-left">
        {ROADMAP.map(item => (
          <div key={item.title} className="px-4 py-3">
            <span className="text-sm font-medium text-slate-300">{item.title} </span>
            <span className="text-sm text-slate-500">{item.desc}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default BoxEnfermeriaPage;
