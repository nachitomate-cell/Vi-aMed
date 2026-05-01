import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { Profesional, Cita } from '../../types/agenda';
import { getProfesionales } from '../../services/profesionalesService';
import { TarjetaProfesional } from '../../components/profesionales/TarjetaProfesional';
import { ModalAgregarProfesional } from '../../components/profesionales/ModalAgregarProfesional';

const ProfesionalesPage: React.FC = () => {
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [conteos, setConteos] = useState<Record<string, { total: number; mes: number }>>({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);

  const cargarProfesionales = () => {
    setError(null);
    getProfesionales().then(data => {
      const sorted = [...data].sort((a, b) => {
        if (a.activo !== b.activo) return a.activo ? -1 : 1;
        return a.nombre.localeCompare(b.nombre, 'es');
      });
      setProfesionales(sorted);
      setCargando(false);
    }).catch((err) => {
      console.error('Error cargando profesionales:', err);
      setError(err as Error);
      setCargando(false);
    });
  };

  useEffect(() => {
    cargarProfesionales();
  }, []);

  useEffect(() => {
    // Escuchar todas las citas (excepto canceladas si se desea, pero aquí contamos todo para "totales")
    const q = query(collection(db, 'citas'));
    
    const unsub = onSnapshot(q, snap => {
      const now = new Date();
      const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
      const counts: Record<string, { total: number; mes: number }> = {};
      
      snap.docs.forEach(d => {
        const data = d.data() as Cita;
        const pid = data.profesionalId;
        
        if (!pid) return;
        if (data.estado === 'Anulado') return; // No contar anuladas

        if (!counts[pid]) counts[pid] = { total: 0, mes: 0 };
        
        counts[pid].total++;
        
        const fechaCita = data.fecha?.toDate ? data.fecha.toDate() : null;
        if (fechaCita && fechaCita >= inicioMes) {
          counts[pid].mes++;
        }
      });
      
      setConteos(counts);
    }, (err) => {
      console.error("Error en tiempo real de citas:", err);
    });
    
    return () => unsub();
  }, []);

  const activos = profesionales.filter(p => p.activo).length;

  return (
    <div className="p-5 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Equipo ViñaMed</h1>
          {!cargando && !error && (
            <p className="text-sm text-slate-500 mt-0.5">
              {activos} profesional{activos !== 1 ? 'es' : ''} activo{activos !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <button
          onClick={() => setModalAbierto(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#0E7490] hover:bg-[#0c6680] text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Agregar
        </button>
      </div>

      {/* Grid */}
      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-800 text-sm">
          <p className="font-semibold">Error al cargar el equipo:</p>
          <p>{error.message}</p>
        </div>
      ) : cargando ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-64 bg-white border border-slate-200 rounded-2xl animate-pulse shadow-sm" />
          ))}
        </div>
      ) : profesionales.length === 0 ? (
        <div className="py-20 text-center space-y-4">
          <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div className="space-y-1">
            <p className="text-slate-800 font-medium">No hay profesionales</p>
            <p className="text-slate-500 text-sm">Comienza agregando uno nuevo o usa el botón de carga rápida.</p>
          </div>
          <button
            onClick={async () => {
              try {
                const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');
                const profs = [
                  { nombre: 'Ignacio Gabriel', rut: '11.111.111-1', rol: 'enfermero', especialidad: '', color: '#0C4A6E', activo: true },
                  { nombre: 'Juan Pablo Cárdenas Galleguillos', rut: '17.479.898-2', rol: 'tecnologo', especialidad: 'Ecografía', color: '#0E7490', activo: true },
                  { nombre: 'Sebastián Monsalve Astudillo', rut: '18.553.131-7', rol: 'tecnologo', especialidad: 'Ecografía', color: '#0F766E', activo: true }
                ];
                for (const p of profs) {
                  await addDoc(collection(db, 'profesionales'), { ...p, creadoEn: serverTimestamp() });
                }
                cargarProfesionales();
              } catch (e) { console.error(e); alert('Error: ' + (e as Error).message); }
            }}
            className="inline-flex items-center gap-2 text-white bg-[#0E7490] hover:bg-[#0c6680] text-sm px-5 py-2.5 rounded-xl transition-colors font-semibold"
          >
            Carga Rápida (Equipo Base)
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {profesionales.map(p => (
            <TarjetaProfesional
              key={p.id}
              profesional={p}
              totalCitas={conteos[p.id]?.total ?? 0}
              citasMes={conteos[p.id]?.mes ?? 0}
            />
          ))}
        </div>
      )}

      {/* Modal agregar */}
      {modalAbierto && (
        <ModalAgregarProfesional
          onCreado={() => { setModalAbierto(false); cargarProfesionales(); }}
          onCerrar={() => setModalAbierto(false)}
        />
      )}
    </div>
  );
};

export default ProfesionalesPage;
