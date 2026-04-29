import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Profesional } from '../../types/agenda';

interface Props {
  profesional: Profesional;
  totalCitas: number;
  citasMes: number;
}

function getInitials(nombre: string): string {
  return nombre.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

const ROL_LABELS: Record<string, string> = {
  medico: 'Médico/a',
  tecnologo: 'Tecnólogo/a',
  enfermero: 'Enfermero/a',
  secretaria: 'Secretaria',
  admin: 'Administración',
};

export const TarjetaProfesional: React.FC<Props> = ({ profesional, totalCitas, citasMes }) => {
  const navigate = useNavigate();
  const { id, nombre, rol, especialidad, color, activo } = profesional;

  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 flex flex-col gap-4 hover:border-[#0E7490] transition-colors">
      {/* Badge estado */}
      <div className="flex justify-end">
        <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
          activo
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-slate-50 text-slate-500 border-slate-200'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${activo ? 'bg-emerald-500' : 'bg-slate-400'}`} />
          {activo ? 'Activo' : 'Inactivo'}
        </span>
      </div>

      {/* Avatar + info */}
      <div className="flex flex-col items-center gap-3 text-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
          style={{ backgroundColor: color }}
        >
          {getInitials(nombre)}
        </div>
        <div>
          <p className="font-semibold text-slate-800 text-sm leading-tight">{nombre}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {ROL_LABELS[rol] ?? rol}
            {especialidad && ` · ${especialidad}`}
          </p>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-slate-50 rounded-xl p-2.5 text-center">
          <div className="text-lg font-bold text-[#0E7490] font-mono leading-none">{totalCitas}</div>
          <div className="text-[10px] text-slate-500 mt-1">citas totales</div>
        </div>
        <div className="bg-slate-50 rounded-xl p-2.5 text-center">
          <div className="text-lg font-bold text-[#0E7490] font-mono leading-none">{citasMes}</div>
          <div className="text-[10px] text-slate-500 mt-1">este mes</div>
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={() => navigate(`/profesionales/${id}`)}
        className="w-full py-2 text-sm font-semibold text-[#0E7490] border border-[#0E7490]/30 rounded-xl hover:bg-[#0E7490]/10 transition-colors"
      >
        Ver perfil →
      </button>
    </div>
  );
};
