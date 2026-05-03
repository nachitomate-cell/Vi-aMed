import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '../../lib/firebase';
import type { Profesional, Cita } from '../../types/agenda';
import { getProfesionales } from '../../services/profesionalesService';
import { TarjetaProfesional } from '../../components/profesionales/TarjetaProfesional';

const ROLES = ['medico', 'tecnologo', 'enfermero', 'secretaria', 'admin'] as const;
const ROL_LABELS: Record<string, string> = {
  medico: 'Médico/a', tecnologo: 'Tecnólogo/a', enfermero: 'Enfermero/a',
  secretaria: 'Secretaria', admin: 'Administración',
};

type FiltroEstado = 'todos' | 'activos' | 'inactivos';
type OrdenBy = 'nombre' | 'citas_mes' | 'citas_total';

const ProfesionalesPage: React.FC = () => {
  const navigate = useNavigate();
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [conteos, setConteos] = useState<Record<string, { total: number; mes: number; hoy: number }>>({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('activos');
  const [filtroRol, setFiltroRol] = useState<string>('todos');
  const [ordenBy, setOrdenBy] = useState<OrdenBy>('nombre');

  const cargarProfesionales = () => {
    setError(null);
    getProfesionales().then(data => {
      setProfesionales(data);
      setCargando(false);
    }).catch((err) => {
      console.error('Error cargando profesionales:', err);
      setError(err as Error);
      setCargando(false);
    });
  };

  useEffect(() => { cargarProfesionales(); }, []);

  useEffect(() => {
    const q = query(collection(db, 'citas'));
    const unsub = onSnapshot(q, snap => {
      const now = new Date();
      const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
      const inicioHoy = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const counts: Record<string, { total: number; mes: number; hoy: number }> = {};

      snap.docs.forEach(d => {
        const data = d.data() as Cita;
        const pid = data.profesionalId;
        if (!pid || data.estado === 'Anulado') return;
        if (!counts[pid]) counts[pid] = { total: 0, mes: 0, hoy: 0 };
        counts[pid].total++;
        const fechaCita = data.fecha?.toDate ? data.fecha.toDate() : null;
        if (fechaCita && fechaCita >= inicioMes) counts[pid].mes++;
        if (fechaCita && fechaCita >= inicioHoy) counts[pid].hoy++;
      });

      setConteos(counts);
    }, err => console.error('Error en tiempo real de citas:', err));

    return () => unsub();
  }, []);

  // Stats globales
  const statsGlobales = useMemo(() => {
    const activos = profesionales.filter(p => p.activo).length;
    const totalCitesMes = Object.values(conteos).reduce((s, c) => s + c.mes, 0);
    const totalHoy = Object.values(conteos).reduce((s, c) => s + c.hoy, 0);
    const maxCitasMes = Math.max(...profesionales.map(p => conteos[p.id]?.mes ?? 0), 1);
    return { activos, totalCitesMes, totalHoy, maxCitasMes };
  }, [profesionales, conteos]);

  // Filtrado + ordenamiento
  const profesionalesFiltrados = useMemo(() => {
    let lista = [...profesionales];

    if (filtroEstado === 'activos') lista = lista.filter(p => p.activo);
    else if (filtroEstado === 'inactivos') lista = lista.filter(p => !p.activo);

    if (filtroRol !== 'todos') lista = lista.filter(p => p.rol === filtroRol);

    if (busqueda.trim()) {
      const q = busqueda.toLowerCase().trim();
      lista = lista.filter(p =>
        p.nombre.toLowerCase().includes(q) ||
        (p.especialidad ?? '').toLowerCase().includes(q)
      );
    }

    lista.sort((a, b) => {
      if (ordenBy === 'citas_mes') return (conteos[b.id]?.mes ?? 0) - (conteos[a.id]?.mes ?? 0);
      if (ordenBy === 'citas_total') return (conteos[b.id]?.total ?? 0) - (conteos[a.id]?.total ?? 0);
      return a.nombre.localeCompare(b.nombre, 'es');
    });

    return lista;
  }, [profesionales, conteos, filtroEstado, filtroRol, busqueda, ordenBy]);

  // Top performer del mes
  const topPerformer = useMemo(() => {
    if (profesionales.length === 0) return null;
    return profesionales.reduce((top, p) =>
      (conteos[p.id]?.mes ?? 0) > (conteos[top.id]?.mes ?? 0) ? p : top
    , profesionales[0]);
  }, [profesionales, conteos]);

  return (
    <div className="p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Equipo ViñaMed</h1>
          {!cargando && !error && (
            <p className="text-sm text-slate-500 mt-0.5">
              {statsGlobales.activos} profesional{statsGlobales.activos !== 1 ? 'es' : ''} activo{statsGlobales.activos !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <button
          onClick={() => navigate('/nuevo-profesional')}
          className="flex items-center gap-2 px-4 py-2 bg-[#0E7490] hover:bg-[#0c6680] text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Agregar
        </button>
      </div>

      {/* Stats globales */}
      {!cargando && !error && profesionales.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="text-2xl font-bold text-[#0E7490] font-mono leading-none">{statsGlobales.activos}</div>
            <div className="text-xs text-slate-500 mt-1 font-medium">Profesionales activos</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="text-2xl font-bold text-[#0E7490] font-mono leading-none">{statsGlobales.totalCitesMes}</div>
            <div className="text-xs text-slate-500 mt-1 font-medium">Citas este mes</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="text-2xl font-bold text-[#0E7490] font-mono leading-none">{statsGlobales.totalHoy}</div>
            <div className="text-xs text-slate-500 mt-1 font-medium">Citas hoy</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm overflow-hidden">
            {topPerformer && (conteos[topPerformer.id]?.mes ?? 0) > 0 ? (
              <>
                <div className="text-xs text-slate-500 font-medium mb-1">Top del mes</div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[9px] font-bold"
                    style={{ backgroundColor: topPerformer.color }}
                  >
                    {topPerformer.nombre.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-700 truncate leading-tight">{topPerformer.nombre.split(' ')[0]}</div>
                    <div className="text-[10px] text-[#0E7490] font-semibold">{conteos[topPerformer.id]?.mes ?? 0} citas</div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-slate-300 font-mono leading-none">—</div>
                <div className="text-xs text-slate-400 mt-1 font-medium">Top del mes</div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Barra de búsqueda y filtros */}
      {!cargando && !error && profesionales.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Buscador */}
          <div className="relative flex-1 min-w-0">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por nombre o especialidad…"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0E7490]/20 focus:border-[#0E7490] placeholder:text-slate-400"
            />
          </div>

          {/* Filtro estado */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 flex-shrink-0">
            {(['todos', 'activos', 'inactivos'] as FiltroEstado[]).map(f => (
              <button
                key={f}
                onClick={() => setFiltroEstado(f)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  filtroEstado === f
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {f === 'todos' ? 'Todos' : f === 'activos' ? 'Activos' : 'Inactivos'}
              </button>
            ))}
          </div>

          {/* Filtro rol */}
          <select
            value={filtroRol}
            onChange={e => setFiltroRol(e.target.value)}
            className="text-sm bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0E7490]/20 focus:border-[#0E7490] flex-shrink-0"
          >
            <option value="todos">Todos los roles</option>
            {ROLES.map(r => <option key={r} value={r}>{ROL_LABELS[r]}</option>)}
          </select>

          {/* Orden */}
          <select
            value={ordenBy}
            onChange={e => setOrdenBy(e.target.value as OrdenBy)}
            className="text-sm bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0E7490]/20 focus:border-[#0E7490] flex-shrink-0"
          >
            <option value="nombre">A–Z nombre</option>
            <option value="citas_mes">↓ Citas este mes</option>
            <option value="citas_total">↓ Citas totales</option>
          </select>
        </div>
      )}

      {/* Grid / estados */}
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
      ) : profesionalesFiltrados.length === 0 ? (
        <div className="py-16 text-center space-y-2">
          <p className="text-slate-500 font-medium">Sin resultados</p>
          <p className="text-sm text-slate-400">Prueba cambiando los filtros o la búsqueda.</p>
          <button
            onClick={() => { setBusqueda(''); setFiltroEstado('todos'); setFiltroRol('todos'); }}
            className="mt-2 text-sm text-[#0E7490] hover:underline"
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {profesionalesFiltrados.map(p => (
            <TarjetaProfesional
              key={p.id}
              profesional={p}
              totalCitas={conteos[p.id]?.total ?? 0}
              citasMes={conteos[p.id]?.mes ?? 0}
              maxCitasMes={statsGlobales.maxCitasMes}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ProfesionalesPage;
