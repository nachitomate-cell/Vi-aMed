import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
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

  useEffect(() => { cargarProfesionales(); }, []);

  useEffect(() => {
    const q = query(collection(db, 'citas'), where('estado', '==', 'realizada'));
    const unsub = onSnapshot(q, snap => {
      const now = new Date();
      const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
      const counts: Record<string, { total: number; mes: number }> = {};
      snap.docs.forEach(d => {
        const data = d.data() as Cita;
        const pid = (data as unknown as { profesionalId: string }).profesionalId;
        if (!pid) return;
        if (!counts[pid]) counts[pid] = { total: 0, mes: 0 };
        counts[pid].total++;
        if ((data.fecha as { toDate(): Date }).toDate() >= inicioMes) counts[pid].mes++;
      });
      setConteos(counts);
    });
    return () => unsub();
  }, []);

  const activos = profesionales.filter(p => p.activo).length;

  return (
    <div className="space-y-6">
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
          className="flex items-center gap-2 px-4 py-2 bg-[#0E7490] hover:bg-[#0c6680] text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Agregar
        </button>
      </div>

      {/* Grid */}
      {error ? (
        <div style={{
          background: '#FEF2F2',
          border: '0.5px solid #FECACA',
          borderRadius: 12,
          padding: '16px 20px',
          color: '#991B1B',
          fontSize: 14
        }}>
          No se pudo cargar el equipo. Verifica la conexión con Firestore o las reglas.
          <br />
          <code style={{ fontSize: 12, display: 'block', marginTop: 8 }}>{error.message}</code>
        </div>
      ) : cargando ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-60 bg-white border border-slate-200 rounded-2xl animate-pulse shadow-sm" />
          ))}
        </div>
      ) : profesionales.length === 0 ? (
        <div className="py-24 text-center space-y-3">
          <p className="text-slate-500 text-sm">No hay profesionales registrados.</p>
          <button
            onClick={async () => {
              try {
                const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');
                const profs = [
                  { nombre: 'Juan Pablo Cárdenas Galleguillos', rut: '17.479.898-2', rol: 'tecnologo', especialidad: 'Ecografía', color: '#0E7490', activo: true },
                  { nombre: 'Sebastián Monsalve Astudillo', rut: '18.553.131-7', rol: 'tecnologo', especialidad: 'Ecografía', color: '#0F766E', activo: true },
                  { nombre: 'Felipe Ramírez Blatter', rut: '', rol: 'medico', especialidad: 'Consulta Médica General', color: '#0E7490', activo: true }
                ];
                for (const p of profs) await addDoc(collection(db, 'profesionales'), { ...p, creadoEn: serverTimestamp() });
                cargarProfesionales();
              } catch (e) { console.error(e); alert('Error: ' + (e as Error).message); }
            }}
            className="text-white bg-[#0E7490] hover:bg-[#0c6680] text-sm px-4 py-2 rounded-xl transition-colors font-semibold"
          >
            Ejecutar Seed (Crear 2 tecnólogos)
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
