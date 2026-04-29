import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { getProfesionalByRut } from '../../services/profesionalesService';
import { useProfesionalKPIs } from '../../hooks/useProfesionalKPIs';
import type { Profesional } from '../../types/agenda';

const MobileProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [profesional, setProfesional] = useState<Profesional | null>(null);
  const [loading, setLoading] = useState(true);

  // Usamos el ID del documento encontrado en Firestore para los KPIs
  const kpis = useProfesionalKPIs(profesional?.id);

  useEffect(() => {
    if (!user?.rut) return;
    setLoading(true);
    getProfesionalByRut(user.rut)
      .then(p => {
        setProfesional(p);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error cargando perfil:', err);
        setLoading(false);
      });
  }, [user?.rut]);

  if (loading || kpis.cargando) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-[#0E7490] border-t-transparent animate-spin" />
        <p className="text-slate-400 text-sm font-medium">Cargando perfil...</p>
      </div>
    );
  }

  const getInitials = (nombre: string) => {
    return nombre.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  };

  return (
    <div className="px-4 py-6 space-y-6 pb-24">
      {/* Header Perfil */}
      <div className="flex flex-col items-center text-center space-y-4">
        <div 
          className="w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-xl border-4 border-white"
          style={{ backgroundColor: profesional?.color || '#0E7490' }}
        >
          {getInitials(profesional?.nombre || user?.name || 'U')}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{profesional?.nombre || user?.name}</h1>
          <p className="text-[#0E7490] font-medium capitalize">
            {profesional?.rol || 'Profesional'} {profesional?.especialidad ? `· ${profesional.especialidad}` : ''}
          </p>
          <p className="text-slate-400 text-sm mt-1">{profesional?.email || 'Sin correo'}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Total Exámenes</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{kpis.total}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Este Mes</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{kpis.esteMes}</p>
        </div>
      </div>

      {/* Información Detallada de Firebase */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
        <div className="px-5 py-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">RUT</p>
          <p className="text-slate-700 font-medium">{profesional?.rut || user?.rut}</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Rol en Sistema</p>
          <p className="text-slate-700 font-medium capitalize">{profesional?.rol || 'No asignado'}</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Especialidad</p>
          <p className="text-slate-700 font-medium">{profesional?.especialidad || 'General'}</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Miembro desde</p>
          <p className="text-slate-700 font-medium">
            {profesional?.creadoEn?.toDate 
              ? profesional.creadoEn.toDate().toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })
              : 'Reciente'}
          </p>
        </div>
        <div className="px-5 py-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Estado de Cuenta</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`w-2 h-2 rounded-full ${profesional?.activo ? 'bg-emerald-500' : 'bg-slate-300'}`} />
            <span className="text-slate-700 font-medium">{profesional?.activo ? 'Activa y Verificada' : 'Inactiva'}</span>
          </div>
        </div>
      </div>

      <div className="pt-2">
        <p className="text-center text-slate-400 text-[11px] px-8 leading-relaxed">
          ID de Usuario: <span className="font-mono text-[10px]">{user?.uid}</span>
        </p>
      </div>
    </div>
  );
};

export default MobileProfilePage;
