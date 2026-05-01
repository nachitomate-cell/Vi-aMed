import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';


// Si no existe, usamos esta interfaz adaptada a lo solicitado:
interface PacienteRegistro {
  id: string;
  nombre: string;
  rut: string;
  email: string;
  telefono: string;
  prevision: string;
  fechaRegistro: Date;
  fechaString: string;
}

const PacientesPage: React.FC = () => {
  const navigate = useNavigate();
  const [pacientes, setPacientes] = useState<PacienteRegistro[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const hoy = new Date();
  const haceUnaSemana = new Date();
  haceUnaSemana.setDate(hoy.getDate() - 5);
  
  const formatDateForInput = (d: Date) => d.toISOString().split('T')[0];
  
  const [fechaInicio, setFechaInicio] = useState(formatDateForInput(haceUnaSemana));
  const [fechaFin, setFechaFin] = useState(formatDateForInput(hoy));
  const [busqueda, setBusqueda] = useState('');
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [fechaInicio, fechaFin, busqueda]);

  useEffect(() => {
    const fetchPacientes = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'pacientes'), orderBy('creadoEn', 'desc'));
        const snapshot = await getDocs(q);
        
        const data: PacienteRegistro[] = snapshot.docs.map(doc => {
          const d = doc.data();
          const dateObj = d.creadoEn?.toDate ? d.creadoEn.toDate() : new Date();
          return {
            id: doc.id,
            nombre: d.nombre || d.name || 'Desconocido',
            rut: d.rut || 'Sin RUN',
            email: d.email || '—',
            telefono: d.telefono || '—',
            prevision: d.prevision || d.convenio || 'No registrada',
            fechaRegistro: dateObj,
            fechaString: dateObj.toLocaleDateString('es-CL'),
          };
        });

        setPacientes(data);
      } catch (error) {
        console.error("Error fetching pacientes:", error);
      }
      setLoading(false);
    };

    fetchPacientes();
  }, []);

  // Filtrado local
  const filtrados = pacientes.filter(p => {
    // Filtro por texto
    const matchBusqueda = p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
                          p.rut.toLowerCase().includes(busqueda.toLowerCase());
    
    // Filtro por fecha (usando fecha de registro)
    const [yearInicio, monthInicio, dayInicio] = fechaInicio.split('-');
    const [yearFin, monthFin, dayFin] = fechaFin.split('-');
    const fInicio = new Date(Number(yearInicio), Number(monthInicio)-1, Number(dayInicio), 0,0,0);
    const fFin = new Date(Number(yearFin), Number(monthFin)-1, Number(dayFin), 23,59,59);
    
    const fRegistro = p.fechaRegistro;
    const matchFecha = fRegistro >= fInicio && fRegistro <= fFin;

    return matchBusqueda && matchFecha;
  });

  const getEstadoColor = (estado: string) => {
    switch(estado.toLowerCase()) {
      case 'agendado': return 'bg-blue-100 text-blue-700';
      case 'en espera': return 'bg-amber-100 text-amber-700';
      case 'en atención': return 'bg-purple-100 text-purple-700';
      case 'atendido':
      case 'finalizado': return 'bg-emerald-100 text-emerald-700';
      case 'rezagado': return 'bg-orange-100 text-orange-700';
      case 'anulado': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const totalPages = Math.max(1, Math.ceil(filtrados.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginados = filtrados.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handlePrevTwo = () => setCurrentPage(prev => Math.max(prev - 2, 1));
  const handlePrev = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const handleNext = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const handleNextTwo = () => setCurrentPage(prev => Math.min(prev + 2, totalPages));
  const handlePageSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentPage(Number(e.target.value));
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Base de Datos de Pacientes</h1>
          <p className="text-sm text-slate-500 mt-1">Directorio completo de pacientes registrados en el centro</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-5">
        {/* Filtros */}
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Seleccione un rango de fechas.</label>
            <div className="flex items-center gap-2">
              <input 
                type="date" 
                value={fechaInicio}
                onChange={e => setFechaInicio(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#0E7490]"
              />
              <span className="text-slate-400 font-bold">-</span>
              <input 
                type="date" 
                value={fechaFin}
                onChange={e => setFechaFin(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#0E7490]"
              />
            </div>
          </div>
          
          <div className="flex-1 space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Buscar paciente</label>
            <div className="relative">
              <input 
                type="text"
                placeholder="Buscar por nombre o RUT..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#0E7490]"
              />
              <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          <div className="bg-[#0E7490]/10 border border-[#0E7490]/20 rounded-xl px-4 py-2 text-center min-w-[150px]">
            <p className="text-[10px] font-bold text-[#0E7490] uppercase tracking-wider">Total de pacientes</p>
            <p className="text-2xl font-black text-[#083344] leading-tight">{filtrados.length}</p>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Paciente</th>
                <th className="px-6 py-4">RUT</th>
                <th className="px-6 py-4">Contacto</th>
                <th className="px-6 py-4">Previsión</th>
                <th className="px-6 py-4">Fecha de Registro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Cargando base de datos...</td>
                </tr>
              ) : paginados.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No se encontraron pacientes en este rango.</td>
                </tr>
              ) : (
                paginados.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-[#0E7490]/5 transition-colors cursor-pointer"
                    onClick={() => navigate(`/pacientes/${p.rut}`)}
                    title={`Ver detalle de ${p.nombre}`}
                  >
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800">{p.nombre}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-600 font-mono text-xs">{p.rut}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-800 font-medium">{p.telefono}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{p.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-semibold bg-cyan-50 text-cyan-700 border border-cyan-200 px-2.5 py-0.5 rounded-full">
                        {p.prevision}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-700">{p.fechaString}</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Controles de Paginación */}
        {filtrados.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <div className="text-sm text-slate-500">
              Mostrando <span className="font-semibold text-slate-800">{startIndex + 1}</span> a <span className="font-semibold text-slate-800">{Math.min(startIndex + ITEMS_PER_PAGE, filtrados.length)}</span> de <span className="font-semibold text-slate-800">{filtrados.length}</span> pacientes
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={handlePrevTwo} 
                disabled={currentPage <= 2}
                className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Retroceder 2 páginas"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>
              <button 
                onClick={handlePrev} 
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Anterior"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <div className="flex items-center gap-2 px-2">
                <span className="text-sm text-slate-600">Página</span>
                <select 
                  value={currentPage}
                  onChange={handlePageSelect}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-sm text-slate-800 focus:outline-none focus:border-[#0E7490]"
                >
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                    <option key={pageNum} value={pageNum}>{pageNum}</option>
                  ))}
                </select>
                <span className="text-sm text-slate-600">de {totalPages}</span>
              </div>

              <button 
                onClick={handleNext} 
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Siguiente"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <button 
                onClick={handleNextTwo} 
                disabled={currentPage >= totalPages - 1}
                className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Avanzar 2 páginas"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PacientesPage;
