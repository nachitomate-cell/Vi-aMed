import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Profesional } from '../../types/agenda';

interface Props {
  profesional: Profesional;
  totalCitas: number;
  citasMes: number;
  maxCitasMes?: number;
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

const ROL_COLORS: Record<string, string> = {
  medico:     'bg-violet-50 text-violet-700 border-violet-200',
  tecnologo:  'bg-cyan-50 text-cyan-700 border-cyan-200',
  enfermero:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  secretaria: 'bg-amber-50 text-amber-700 border-amber-200',
  admin:      'bg-slate-100 text-slate-600 border-slate-200',
};

export const TarjetaProfesional: React.FC<Props> = ({
  profesional,
  totalCitas,
  citasMes,
  maxCitasMes = 1,
}) => {
  const navigate = useNavigate();
  const { id, nombre, rol, especialidad, color, activo, fotoUrl, email, telefono, comision } = profesional;

  const actividadPct = maxCitasMes > 0 ? Math.min((citasMes / maxCitasMes) * 100, 100) : 0;

  return (
    <div
      onClick={() => navigate(`/profesionales/${id}`)}
      className={`bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden flex flex-col cursor-pointer transition-all duration-200 hover:shadow-md hover:border-[#0E7490]/40 hover:-translate-y-0.5 group ${!activo ? 'opacity-70' : ''}`}
    >
      {/* Franja de color superior */}
      <div className="h-1.5 w-full" style={{ backgroundColor: color }} />

      <div className="p-5 flex flex-col gap-4 flex-1">
        {/* Header: estado + avatar + nombre */}
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div
            className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-sm overflow-hidden bg-cover bg-center ring-2 ring-white shadow-sm"
            style={{
              backgroundColor: color,
              backgroundImage: fotoUrl ? `url(${fotoUrl})` : 'none',
            }}
          >
            {!fotoUrl && getInitials(nombre)}
          </div>

          {/* Nombre + rol + estado */}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-800 text-sm leading-tight truncate group-hover:text-[#0E7490] transition-colors">
              {nombre}
            </p>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${ROL_COLORS[rol] ?? 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                {ROL_LABELS[rol] ?? rol}
              </span>
              {especialidad && (
                <span className="text-[10px] text-slate-400 font-medium truncate">{especialidad}</span>
              )}
            </div>
          </div>

          {/* Badge activo */}
          <span className={`flex-shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
            activo
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-slate-50 text-slate-400 border-slate-200'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${activo ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            {activo ? 'Activo' : 'Inactivo'}
          </span>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-50 rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-[#0E7490] font-mono leading-none">{totalCitas}</div>
            <div className="text-[10px] text-slate-500 mt-1 font-medium">citas totales</div>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-[#0E7490] font-mono leading-none">{citasMes}</div>
            <div className="text-[10px] text-slate-500 mt-1 font-medium">este mes</div>
          </div>
        </div>

        {/* Barra de actividad del mes */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-slate-400 font-medium">Actividad mensual</span>
            <span className="text-[10px] font-semibold text-slate-500">{Math.round(actividadPct)}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${actividadPct}%`, backgroundColor: color }}
            />
          </div>
        </div>

        {/* Datos de contacto rápido */}
        {(email || telefono || comision != null) && (
          <div className="flex items-center gap-3 pt-1 border-t border-slate-100">
            {email && (
              <a
                href={`mailto:${email}`}
                onClick={e => e.stopPropagation()}
                title={email}
                className="text-slate-400 hover:text-[#0E7490] transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </a>
            )}
            {telefono && (
              <a
                href={`tel:${telefono}`}
                onClick={e => e.stopPropagation()}
                title={telefono}
                className="text-slate-400 hover:text-[#0E7490] transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </a>
            )}
            {comision != null && (
              <span className="text-[10px] text-slate-400 font-medium ml-auto">
                Comisión <span className="font-bold text-slate-600">{comision}%</span>
              </span>
            )}
          </div>
        )}

        {/* CTA */}
        <div className="mt-auto pt-1">
          <div className="w-full py-2 text-sm font-semibold text-[#0E7490] border border-[#0E7490]/30 rounded-xl group-hover:bg-[#0E7490] group-hover:text-white transition-all text-center">
            Ver perfil →
          </div>
        </div>
      </div>
    </div>
  );
};
