import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGestionDatos } from '../hooks/useGestionDatos';
import { collection, getDocs, getDoc, query, where, or, doc, updateDoc, addDoc, serverTimestamp, Timestamp, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getProfesionales } from '../services/agendaService';
import type { Profesional } from '../types/agenda';

interface PacienteData {
  id?: string;
  nombre: string;
  rut: string;
  fechaNacimiento: string;
  sexo: string;
  telefono: string;
  correo: string;
  prevision: string;
}

interface Prestacion {
  especialidad: string;
  profesional: string;
  prestacion: string;
  valor: number;
  copago: number;
  bonoComplementario: number;
  observaciones: string;
}



const AtencionPage: React.FC = () => {
  const navigate = useNavigate();
  const { atencionId } = useParams();
  
  // Formulario principal
  const [paciente, setPaciente] = useState<PacienteData>({
    nombre: '', rut: '', fechaNacimiento: '', sexo: '', telefono: '', correo: '', prevision: ''
  });
  
  const [datosAtencion, setDatosAtencion] = useState({
    fecha: new Date().toISOString().split('T')[0], 
    hora: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }), 
    metodoPago: '', 
    nroOperacion: '', 
    estado: 'Agendado'
  });

  // Campos para nueva prestación
  const [nuevaPrestacion, setNuevaPrestacion] = useState<Partial<Prestacion>>({
    especialidad: '', profesional: '', prestacion: '', valor: 0, copago: 0, bonoComplementario: 0, observaciones: ''
  });
  
  const [profesionalesDB, setProfesionalesDB] = useState<Profesional[]>([]);
  
  const [prestaciones, setPrestaciones] = useState<Prestacion[]>([]);
  
  // Validaciones
  const [showError, setShowError] = useState(false);

  // Autocomplete paciente
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PacienteData[]>([]);

  const { opciones } = useGestionDatos();
  
  // Search Prestacion
  const [prestacionSearch, setPrestacionSearch] = useState('');
  const [showPrestacionResults, setShowPrestacionResults] = useState(false);
  const filteredPrestaciones = opciones.prestaciones.filter(p => 
    p.toLowerCase().includes(prestacionSearch.toLowerCase())
  );

  // Cargar datos si estamos editando
  useEffect(() => {
    if (!atencionId) return;

    const fetchAtencion = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'citas', atencionId));
        if (docSnap.exists()) {
          const data = docSnap.data();
          const fechaObj = data.fecha instanceof Timestamp ? data.fecha.toDate() : new Date(data.fecha);
          
          setPaciente({
            nombre: data.pacienteNombre || '',
            rut: data.pacienteRut || '',
            fechaNacimiento: data.pacienteFechaNacimiento || '',
            sexo: data.pacienteSexo || '',
            telefono: data.pacienteTelefono || '',
            correo: data.pacienteCorreo || '',
            prevision: data.prevision || ''
          });

          setDatosAtencion({
            fecha: fechaObj.toISOString().split('T')[0],
            hora: fechaObj.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
            metodoPago: data.metodoPago || '',
            nroOperacion: data.nOperacion || '',
            estado: data.estado || 'Agendado'
          });

          if (data.prestaciones) {
            setPrestaciones(data.prestaciones);
          }
          
          setSearchQuery(data.pacienteNombre || '');
        }
      } catch (err) {
        console.error('Error al cargar atención:', err);
      }
    };

    fetchAtencion();
  }, [atencionId]);

  // Cargar profesionales de Firebase
  useEffect(() => {
    getProfesionales().then(setProfesionalesDB).catch(console.error);
  }, []);

  // Buscar pacientes en Firestore (mock or real)
  useEffect(() => {
    const fetchPacientes = async () => {
      if (searchQuery.length < 3) {
        setSearchResults([]);
        return;
      }

      try {
        const q = query(
          collection(db, 'pacientes'),
          or(
            where('nombre', '>=', searchQuery),
            where('rut', '>=', searchQuery)
          )
        );
        const snapshot = await getDocs(q);
        const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PacienteData));
        // Filtrar en memoria por si acaso
        const filtered = results.filter(p => 
          p.nombre?.toLowerCase().includes(searchQuery.toLowerCase()) || 
          p.rut?.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setSearchResults(filtered);
      } catch (error) {
        console.error('Error buscando pacientes', error);
      }

    };

    const debounce = setTimeout(fetchPacientes, 500);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const selectPaciente = (p: PacienteData) => {
    setPaciente({
      nombre: p.nombre || '',
      rut: p.rut || '',
      fechaNacimiento: p.fechaNacimiento || '',
      sexo: p.sexo || '',
      telefono: p.telefono || '',
      correo: p.correo || '',
      prevision: p.prevision || ''
    });
    setSearchQuery(p.nombre || p.rut || '');
    setSearchResults([]);
  };

  const handleAddPrestacion = () => {
    if (!nuevaPrestacion.especialidad || !nuevaPrestacion.profesional || !nuevaPrestacion.prestacion) {
      alert('Especialidad, Profesional y Prestación son obligatorios para agregar la prestación.');
      return;
    }
    setPrestaciones([...prestaciones, nuevaPrestacion as Prestacion]);
    setNuevaPrestacion({ especialidad: '', profesional: '', prestacion: '', valor: 0, copago: 0, bonoComplementario: 0, observaciones: '' });
    setPrestacionSearch('');
  };

  const handleSubmit = async () => {
    // Validar requeridos basicos
    if (!paciente.nombre || !paciente.rut || !datosAtencion.fecha || !datosAtencion.hora || !datosAtencion.estado) {
      setShowError(true);
      return;
    }
    setShowError(false);

    try {
      const [year, month, day] = datosAtencion.fecha.split('-').map(Number);
      const [hour, min] = datosAtencion.hora.split(':').map(Number);
      const fechaCita = new Date(year, month - 1, day, hour, min);

      const payload = {
        pacienteNombre: paciente.nombre,
        pacienteRut: paciente.rut,
        pacienteFechaNacimiento: paciente.fechaNacimiento,
        pacienteSexo: paciente.sexo,
        pacienteTelefono: paciente.telefono,
        pacienteCorreo: paciente.correo,
        prevision: paciente.prevision,
        fecha: Timestamp.fromDate(fechaCita),
        metodoPago: datosAtencion.metodoPago,
        nOperacion: datosAtencion.nroOperacion,
        estado: datosAtencion.estado,
        prestaciones: prestaciones,
        actualizadoEn: serverTimestamp()
      };

      // Guardar paciente en la base de datos de pacientes automáticamente
      const pacientePayload = {
        nombre: paciente.nombre,
        rut: paciente.rut,
        fechaNacimiento: paciente.fechaNacimiento,
        sexo: paciente.sexo,
        telefono: paciente.telefono,
        correo: paciente.correo,
        prevision: paciente.prevision,
        actualizadoEn: serverTimestamp()
      };
      
      try {
        await setDoc(doc(db, 'pacientes', paciente.rut), pacientePayload, { merge: true });
      } catch (e) {
        console.error("No se pudo guardar el paciente:", e);
      }

      if (atencionId) {
        await updateDoc(doc(db, 'citas', atencionId), payload);
        alert('Atención actualizada correctamente');
      } else {
        await addDoc(collection(db, 'citas'), {
          ...payload,
          creadoEn: serverTimestamp()
        });
        alert('Atención guardada correctamente');
      }
      
      navigate('/recepcion');
    } catch (err) {
      console.error('Error al guardar:', err);
      alert('Error al guardar la atención');
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {atencionId ? `Editar atención ${datosAtencion.fecha.split('-').reverse().join('/')}` : 'Agregar Atención'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {atencionId ? 'Modifica los datos del registro clínico' : 'Ingresa los datos del paciente y de la atención'}
          </p>
        </div>
        <button
          onClick={() => navigate('/recepcion')}
          className="px-4 py-2 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 transition-colors"
        >
          Volver a Recepción
        </button>
      </div>

      <p className="text-sm font-medium text-amber-600 bg-amber-50 px-4 py-2 rounded-lg border border-amber-200 inline-block">
        (*) Obligatorio
      </p>

      {showError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg font-bold animate-pulse">
          FORMULARIO INVÁLIDO
        </div>
      )}

      {/* DATOS PACIENTE */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2">Datos paciente</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative col-span-1 md:col-span-2">
            <label className="block text-xs font-medium text-slate-500 mb-1">Paciente (Nombre o RUT) *</label>
            <input 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar en base de datos de firestore..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#0E7490] focus:ring-1 focus:ring-[#0E7490]/20"
            />
            {searchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                {searchResults.map((p, i) => (
                  <div 
                    key={i} 
                    onClick={() => selectPaciente(p)}
                    className="px-4 py-2 hover:bg-slate-50 cursor-pointer text-sm text-slate-700 border-b border-slate-100 last:border-0"
                  >
                    <span className="font-semibold">{p.nombre}</span> - {p.rut}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Nombre Completo *</label>
            <input 
              value={paciente.nombre} onChange={e => setPaciente({...paciente, nombre: e.target.value})}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#0E7490]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">RUT *</label>
            <input 
              value={paciente.rut} onChange={e => setPaciente({...paciente, rut: e.target.value})}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#0E7490]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Fecha nacimiento</label>
            <input 
              type="date"
              value={paciente.fechaNacimiento} onChange={e => setPaciente({...paciente, fechaNacimiento: e.target.value})}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#0E7490]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Sexo</label>
            <select 
              value={paciente.sexo} onChange={e => setPaciente({...paciente, sexo: e.target.value})}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#0E7490]"
            >
              <option value="">Seleccionar...</option>
              {opciones.sexos.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Teléfono</label>
            <input 
              value={paciente.telefono} onChange={e => setPaciente({...paciente, telefono: e.target.value})}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#0E7490]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Correo</label>
            <input 
              type="email"
              value={paciente.correo} onChange={e => setPaciente({...paciente, correo: e.target.value})}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#0E7490]"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-500 mb-1">Previsión o convenio *</label>
            <select 
              value={paciente.prevision} onChange={e => setPaciente({...paciente, prevision: e.target.value})}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#0E7490]"
            >
              <option value="">Seleccionar...</option>
              {opciones.previsiones.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* DATOS ATENCION */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2">Datos atención</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Fecha de atención *</label>
            <input 
              type="date"
              value={datosAtencion.fecha} onChange={e => setDatosAtencion({...datosAtencion, fecha: e.target.value})}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#0E7490]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Hora de atención *</label>
            <input 
              type="time"
              value={datosAtencion.hora} onChange={e => setDatosAtencion({...datosAtencion, hora: e.target.value})}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#0E7490]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Método de pago *</label>
            <select 
              value={datosAtencion.metodoPago} onChange={e => setDatosAtencion({...datosAtencion, metodoPago: e.target.value})}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#0E7490]"
            >
              <option value="">Seleccionar...</option>
              {opciones.metodosPago.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Número de operación o transferencia</label>
            <input 
              value={datosAtencion.nroOperacion} onChange={e => setDatosAtencion({...datosAtencion, nroOperacion: e.target.value})}
              placeholder="Ingrese N°"
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#0E7490]"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-500 mb-1">Estado *</label>
            <select 
              value={datosAtencion.estado} onChange={e => setDatosAtencion({...datosAtencion, estado: e.target.value})}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#0E7490]"
            >
              <option value="">Seleccionar...</option>
              <option value="Agendado">Agendado</option>
              <option value="En espera">En espera</option>
              <option value="En atención">En atención</option>
              <option value="Rezagado">Rezagado</option>
              <option value="Finalizado">Finalizado</option>
              <option value="Anulado">Anulado</option>
            </select>
          </div>
        </div>
      </div>

      {/* PREVISUALIZAR PRESTACION */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2">Agregar Prestación</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Especialidad *</label>
            <select 
              value={nuevaPrestacion.especialidad} onChange={e => setNuevaPrestacion({...nuevaPrestacion, especialidad: e.target.value})}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#0E7490]"
            >
              <option value="">Seleccionar...</option>
              {opciones.especialidades.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Profesional *</label>
            <select 
              value={nuevaPrestacion.profesional} onChange={e => setNuevaPrestacion({...nuevaPrestacion, profesional: e.target.value})}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#0E7490]"
            >
              <option value="">Seleccionar...</option>
              {profesionalesDB.filter(p => !nuevaPrestacion.especialidad || p.especialidad === nuevaPrestacion.especialidad).map(p => (
                <option key={p.id} value={p.nombre}>{p.nombre}</option>
              ))}
            </select>
          </div>
          <div className="relative">
            <label className="block text-xs font-medium text-slate-500 mb-1">Prestación *</label>
            <input 
              type="text"
              placeholder="Buscar prestación..."
              value={prestacionSearch || nuevaPrestacion.prestacion}
              onChange={(e) => {
                setPrestacionSearch(e.target.value);
                setShowPrestacionResults(true);
              }}
              onFocus={() => setShowPrestacionResults(true)}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#0E7490]"
              onBlur={() => setTimeout(() => setShowPrestacionResults(false), 200)}
            />
            {showPrestacionResults && (
              <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-64 overflow-y-auto border-t-0 rounded-t-none scrollbar-thin scrollbar-thumb-slate-200">
                {filteredPrestaciones.length > 0 ? (
                  filteredPrestaciones.map((p, i) => (
                    <div 
                      key={i} 
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setNuevaPrestacion({...nuevaPrestacion, prestacion: p});
                        setPrestacionSearch(p);
                        setShowPrestacionResults(false);
                      }}
                      className="px-4 py-2.5 hover:bg-[#0E7490]/5 cursor-pointer text-sm text-slate-700 border-b border-slate-50 last:border-0 transition-colors"
                    >
                      {p}
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-3 text-sm text-slate-400 italic text-center">No hay resultados</div>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-end mt-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Valor</label>
            <input 
              type="number"
              value={nuevaPrestacion.valor} onChange={e => setNuevaPrestacion({...nuevaPrestacion, valor: Number(e.target.value)})}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#0E7490]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Copago</label>
            <input 
              type="number"
              value={nuevaPrestacion.copago} onChange={e => setNuevaPrestacion({...nuevaPrestacion, copago: Number(e.target.value)})}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#0E7490]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Bono comp.</label>
            <input 
              type="number"
              value={nuevaPrestacion.bonoComplementario} onChange={e => setNuevaPrestacion({...nuevaPrestacion, bonoComplementario: Number(e.target.value)})}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#0E7490]"
            />
          </div>
          <div>
            <button 
              onClick={handleAddPrestacion}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2.5 rounded-xl transition-colors"
            >
              Agregar
            </button>
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-xs font-medium text-slate-500 mb-1">Observaciones</label>
          <input 
            value={nuevaPrestacion.observaciones} onChange={e => setNuevaPrestacion({...nuevaPrestacion, observaciones: e.target.value})}
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#0E7490]"
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-800">Prestaciones</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
              <tr>
                <th className="px-6 py-3">Prestación</th>
                <th className="px-6 py-3">Profesional</th>
                <th className="px-6 py-3">Valor</th>
                <th className="px-6 py-3">Copago</th>
                <th className="px-6 py-3">Bono complementario</th>
                <th className="px-6 py-3">Observaciones</th>
              </tr>
            </thead>
            <tbody>
              {prestaciones.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-400 italic">
                    Sin registros
                  </td>
                </tr>
              ) : (
                prestaciones.map((p, i) => (
                  <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-800">{p.prestacion} <span className="text-xs text-slate-400 block">{p.especialidad}</span></td>
                    <td className="px-6 py-4">{p.profesional}</td>
                    <td className="px-6 py-4">${p.valor}</td>
                    <td className="px-6 py-4">${p.copago}</td>
                    <td className="px-6 py-4">${p.bonoComplementario}</td>
                    <td className="px-6 py-4 text-xs text-slate-500">{p.observaciones}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ACCIONES FINALES */}
      <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
        <button 
          onClick={() => navigate('/recepcion')}
          className="px-6 py-2.5 border border-slate-200 text-slate-600 font-medium rounded-xl hover:bg-slate-50 transition-colors"
        >
          Cancelar
        </button>
        <button 
          onClick={handleSubmit}
          className="px-6 py-2.5 bg-[#0E7490] hover:bg-[#0C4A6E] text-white font-semibold rounded-xl shadow-lg shadow-[#0E7490]/20 transition-all"
        >
          Guardar Atención
        </button>
      </div>

    </div>
  );
};

export default AtencionPage;
