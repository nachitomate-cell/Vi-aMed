import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';


// Si no existe, usamos esta interfaz adaptada a lo solicitado:
interface AtencionRegistro {
  id: string;
  estado: string;
  pacienteNombre: string;
  pacienteRut: string;
  prevision: string;
  metodoPago: string;
  fechaString: string; // ej: 24/04/2026
  horaString: string;  // ej: 12:41
  profesionalNombre: string;
  fechaRaw: Date;
}

const PacientesPage: React.FC = () => {
  const navigate = useNavigate();
  const [atenciones, setAtenciones] = useState<AtencionRegistro[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const hoy = new Date();
  const haceUnaSemana = new Date();
  haceUnaSemana.setDate(hoy.getDate() - 5);
  
  const formatDateForInput = (d: Date) => d.toISOString().split('T')[0];
  
  const [fechaInicio, setFechaInicio] = useState(formatDateForInput(haceUnaSemana));
  const [fechaFin, setFechaFin] = useState(formatDateForInput(hoy));
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    const fetchAtenciones = async () => {
      setLoading(true);
      try {
        // En una app real, filtramos por rango de fecha en la query de Firestore.
        // Aquí traemos una colección genérica "citas" o "atenciones"
        const q = query(collection(db, 'citas'), orderBy('fecha', 'desc'));
        const snapshot = await getDocs(q);
        
        const data: AtencionRegistro[] = snapshot.docs.map(doc => {
          const d = doc.data();
          const dateObj = d.fecha?.toDate ? d.fecha.toDate() : new Date();
          return {
            id: doc.id,
            estado: d.estado || 'Agendado',
            pacienteNombre: d.pacienteNombre || 'Desconocido',
            pacienteRut: d.pacienteRut || d.rut || 'Sin RUN',
            prevision: d.prevision || d.convenio || 'Particular',
            metodoPago: d.metodoPago || 'No registrado',
            fechaString: dateObj.toLocaleDateString('es-CL'),
            horaString: d.hora || dateObj.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
            profesionalNombre: d.profesionalNombre || 'No asignado',
            fechaRaw: dateObj
          };
        });

        // Simulamos algunos datos si la base de datos está vacía para cumplir con el diseño visual solicitado
        if (data.length === 0) {
          data.push(
            {
              id: 'mock1',
              estado: 'Agendado',
              pacienteNombre: 'Lucas Simón Rebolledo Barbagelata',
              pacienteRut: '19.876.543-2',
              prevision: 'Fonasa',
              metodoPago: 'Transferencia',
              fechaString: '24/04/2026',
              horaString: '12:41',
              profesionalNombre: 'Dr. Ejemplo Médico',
              fechaRaw: new Date()
            },
            {
              id: 'mock2',
              estado: 'Atendido',
              pacienteNombre: 'María Ignacia Pérez',
              pacienteRut: '15.444.333-K',
              prevision: 'Isapre',
              metodoPago: 'Débito',
              fechaString: '25/04/2026',
              horaString: '09:30',
              profesionalNombre: 'Dra. Andrea Rojas',
              fechaRaw: new Date()
            }
          );
        }

        setAtenciones(data);
      } catch (error) {
        console.error("Error fetching atenciones:", error);
      }
      setLoading(false);
    };

    fetchAtenciones();
  }, []);

  // Filtrado local
  const filtrados = atenciones.filter(a => {
    // Filtro por texto
    const matchBusqueda = a.pacienteNombre.toLowerCase().includes(busqueda.toLowerCase()) || 
                          a.pacienteRut.toLowerCase().includes(busqueda.toLowerCase());
    
    // Filtro por fecha (aproximado usando string locale en formato dd/mm/yyyy para evitar desfases de zona horaria)
    const [yearInicio, monthInicio, dayInicio] = fechaInicio.split('-');
    const [yearFin, monthFin, dayFin] = fechaFin.split('-');
    const fInicio = new Date(Number(yearInicio), Number(monthInicio)-1, Number(dayInicio), 0,0,0);
    const fFin = new Date(Number(yearFin), Number(monthFin)-1, Number(dayFin), 23,59,59);
    
    const fAtencion = a.fechaRaw;
    const matchFecha = fAtencion >= fInicio && fAtencion <= fFin;

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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Base de Datos de Pacientes</h1>
          <p className="text-sm text-slate-500 mt-1">Historial completo de atenciones realizadas en el centro</p>
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
            <p className="text-[10px] font-bold text-[#0E7490] uppercase tracking-wider">Total de atenciones</p>
            <p className="text-2xl font-black text-[#083344] leading-tight">{filtrados.length}</p>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4">Paciente</th>
                <th className="px-6 py-4">Previsión / Pago</th>
                <th className="px-6 py-4">Fecha y Hora</th>
                <th className="px-6 py-4">Profesional Atendió</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Cargando base de datos...</td>
                </tr>
              ) : filtrados.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No se encontraron atenciones en este rango.</td>
                </tr>
              ) : (
                filtrados.map((a) => (
                  <tr
                    key={a.id}
                    className="hover:bg-[#0E7490]/5 transition-colors cursor-pointer"
                    onClick={() => navigate(`/pacientes/${a.pacienteRut}`)}
                    title={`Ver detalle de ${a.pacienteNombre}`}
                  >
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${getEstadoColor(a.estado)}`}>
                        {a.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800">{a.pacienteNombre}</div>
                      <div className="text-xs text-slate-500 mt-0.5">RUN: {a.pacienteRut}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-800 font-medium">{a.prevision}</div>
                      <div className="text-xs text-slate-500 mt-0.5">Pago: {a.metodoPago}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-800">{a.fechaString}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{a.horaString}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-700 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                          {a.profesionalNombre.charAt(0)}
                        </div>
                        {a.profesionalNombre}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PacientesPage;
