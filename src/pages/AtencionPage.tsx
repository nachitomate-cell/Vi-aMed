import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGestionDatos } from '../hooks/useGestionDatos';
import { collection, getDocs, getDoc, query, where, doc, updateDoc, addDoc, serverTimestamp, Timestamp, setDoc } from 'firebase/firestore';
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

interface PrestacionDB {
  id: string;
  nombre: string;
  especialidad: string;
  valoresPrevision: { tipo: string; valor: number; copago: number }[];
}

// Auxiliar para formatear cuerpo de RUT con puntos: 17.543.210
const formatCuerpoRut = (val: string): string => {
  const limpio = val.replace(/[^0-9]/g, '');
  return limpio
    .split('')
    .reverse()
    .reduce((acc, d, i) => (i % 3 === 0 && i !== 0 ? d + '.' + acc : d + acc), '');
};



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
    observaciones: '',
    estado: 'Agendado'
  });

  // Campos para nueva prestación
  const [nuevaPrestacion, setNuevaPrestacion] = useState<Partial<Prestacion>>({
    especialidad: '', profesional: '', prestacion: '', valor: 0, copago: 0, bonoComplementario: 0, observaciones: ''
  });
  
  const [profesionalesDB, setProfesionalesDB] = useState<Profesional[]>([]);
  const [catalogoPrestaciones, setCatalogoPrestaciones] = useState<PrestacionDB[]>([]);

  const [prestaciones, setPrestaciones] = useState<Prestacion[]>([]);
  
  // Validaciones
  const [showError, setShowError] = useState(false);

  // Autocomplete paciente
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PacienteData[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const { opciones } = useGestionDatos();
  
  // Search Prestacion
  const [prestacionSearch, setPrestacionSearch] = useState('');
  const [showPrestacionResults, setShowPrestacionResults] = useState(false);
  const filteredPrestaciones = catalogoPrestaciones.filter(p =>
    (!nuevaPrestacion.especialidad || p.especialidad === nuevaPrestacion.especialidad) &&
    p.nombre.toLowerCase().includes(prestacionSearch.toLowerCase())
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
            observaciones: data.observaciones || '',
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

  // Cargar profesionales y catálogo de prestaciones de Firebase
  useEffect(() => {
    getProfesionales().then(setProfesionalesDB).catch(console.error);
    getDocs(collection(db, 'gestion_prestaciones'))
      .then(snap => setCatalogoPrestaciones(snap.docs.map(d => ({ id: d.id, ...d.data() } as PrestacionDB))))
      .catch(console.error);
  }, []);

  // Buscar pacientes en Firestore (mock or real)
  useEffect(() => {
    const fetchPacientes = async () => {
      if (searchQuery.length < 3) {
        setSearchResults([]);
        setSearching(false);
        return;
      }

      setSearching(true);
      try {
        const queryClean = searchQuery.toLowerCase().trim();
        
        // Determinamos si es búsqueda por RUT (solo números y puntos)
        const isNumeric = /^[0-9.]+$/.test(queryClean);
        let rutSearch = queryClean;
        
        if (isNumeric) {
          // Si es numérico, formateamos como cuerpo de RUT canónico (con puntos)
          rutSearch = formatCuerpoRut(queryClean);
        }

        const [snapNombre, snapRut] = await Promise.all([
          getDocs(query(collection(db, 'pacientes'), where('nombre', '>=', queryClean), where('nombre', '<=', queryClean + ''))),
          getDocs(query(collection(db, 'pacientes'), where('rut', '>=', rutSearch), where('rut', '<=', rutSearch + ''))),
        ]);
        const seen = new Set<string>();
        const results: PacienteData[] = [];
        for (const snap of [snapNombre, snapRut]) {
          for (const doc of snap.docs) {
            if (!seen.has(doc.id)) {
              seen.add(doc.id);
              results.push({ id: doc.id, ...doc.data() } as PacienteData);
            }
          }
        }
        const filtered = results.filter(p =>
          p.nombre?.toLowerCase().includes(queryClean) ||
          p.rut?.replace(/[^0-9kK]/g, '').includes(queryClean.replace(/\./g, ''))
        );
        setSearchResults(filtered);
      } catch (error) {
        console.error('Error buscando pacientes', error);
      } finally {
        setSearching(false);
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
    setShowSearchResults(false);
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

  const [step, setStep] = useState(1);

  const handleSubmit = async () => {
    // Validar requeridos basicos
    if (!paciente.nombre || !paciente.rut || !datosAtencion.fecha || !datosAtencion.hora || !datosAtencion.estado) {
      setShowError(true);
      if (!paciente.nombre || !paciente.rut) setStep(1);
      else if (!datosAtencion.fecha || !datosAtencion.hora || !datosAtencion.estado) setStep(2);
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
        observaciones: datosAtencion.observaciones,
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

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {[
        { id: 1, label: 'Datos Paciente' },
        { id: 2, label: 'Datos Atención' },
        { id: 3, label: 'Prestaciones' }
      ].map((s, idx) => (
        <React.Fragment key={s.id}>
          <div className="flex flex-col items-center relative">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
              step === s.id ? 'bg-[#0E7490] text-white ring-4 ring-[#0E7490]/20' : 
              step > s.id ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
            }`}>
              {step > s.id ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              ) : s.id}
            </div>
            <span className={`absolute -bottom-6 whitespace-nowrap text-[10px] font-bold uppercase tracking-wider ${step === s.id ? 'text-[#0E7490]' : 'text-slate-400'}`}>
              {s.label}
            </span>
          </div>
          {idx < 2 && (
            <div className={`w-20 h-0.5 mx-2 transition-all duration-500 ${step > s.id ? 'bg-emerald-500' : 'bg-slate-100'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );

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

      {renderStepIndicator()}

      {showError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg font-bold animate-pulse text-center">
          COMPLETE TODOS LOS CAMPOS OBLIGATORIOS (*)
        </div>
      )}

      {/* PASO 1: DATOS PACIENTE */}
      {step === 1 && (
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2">1. Datos paciente</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative col-span-1 md:col-span-2">
              <label className="block text-xs font-bold text-[#0E7490] uppercase tracking-wider mb-2 flex items-center gap-2">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                Buscador de pacientes en Base de Datos *
              </label>
              <div className="relative group">
                <input 
                  value={searchQuery}
                  onChange={e => {
                    const val = e.target.value;
                    if (val.includes('-')) return;
                    if (/^[0-9.]+$/.test(val) && val.replace(/\./g, '').length > 9) return;
                    setSearchQuery(val);
                  }}
                  placeholder="Ej: 11111111 (Sin puntos ni DV) o Nombre..."
                  className="w-full bg-white border-2 border-slate-200 rounded-xl pl-12 pr-10 py-3 text-sm text-slate-800 focus:outline-none focus:border-[#0E7490] focus:ring-4 focus:ring-[#0E7490]/5 transition-all shadow-sm"
                  onFocus={() => setShowSearchResults(true)}
                  onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                </div>
                {searching && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 rounded-full border-2 border-[#0E7490] border-t-transparent animate-spin" />
                  </div>
                )}
              </div>
              
              {showSearchResults && (searchResults.length > 0 || (searchQuery.length >= 3 && !searching)) && (
                <div className="absolute z-30 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {searchResults.length > 0 ? 'Resultados encontrados' : 'Sin coincidencias'}
                    </span>
                    <span className="text-[10px] font-medium text-[#0E7490] bg-[#0E7490]/10 px-2 py-0.5 rounded-full">
                      Base de Datos Firestore
                    </span>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {searchResults.length > 0 ? (
                      searchResults.map((p, i) => (
                        <button 
                          key={i} 
                          onClick={() => selectPaciente(p)}
                          className="w-full px-4 py-3 hover:bg-[#0E7490]/5 flex items-center gap-4 text-left border-b border-slate-50 last:border-0 transition-colors group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-[#0E7490]/10 group-hover:text-[#0E7490] transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-slate-800 truncate">{p.nombre}</p>
                            <p className="text-xs text-slate-500">{p.rut}</p>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="p-8 text-center">
                        <p className="text-sm text-slate-400 italic">No se encontraron pacientes</p>
                      </div>
                    )}
                  </div>
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
          
          <div className="flex justify-end pt-4">
            <button 
              onClick={() => {
                if (!paciente.nombre || !paciente.rut || !paciente.prevision) {
                  setShowError(true);
                  return;
                }
                setShowError(false);
                setStep(2);
              }}
              className="px-8 py-3 bg-[#0E7490] text-white font-bold rounded-xl hover:bg-[#0C4A6E] transition-all flex items-center gap-2"
            >
              Siguiente Paso
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
      )}

      {/* PASO 2: DATOS ATENCIÓN */}
      {step === 2 && (
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2">2. Datos atención</h2>
          
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
                <option value="Agendado">Agendado</option>
                <option value="Confirmado">Confirmado</option>
                <option value="En espera">En espera</option>
                <option value="En atención">En atención</option>
                <option value="Rezagado">Rezagado</option>
                <option value="Finalizado">Finalizado</option>
                <option value="Anulado">Anulado</option>
                <option value="No asistió">No asistió</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">Observaciones generales de la atención</label>
              <textarea 
                value={datosAtencion.observaciones} 
                onChange={e => setDatosAtencion({...datosAtencion, observaciones: e.target.value})}
                rows={3}
                placeholder="Notas adicionales..."
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#0E7490] resize-none"
              />
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <button 
              onClick={() => setStep(1)}
              className="px-6 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Volver
            </button>
            <button 
              onClick={() => {
                if (!datosAtencion.fecha || !datosAtencion.hora || !datosAtencion.metodoPago || !datosAtencion.estado) {
                  setShowError(true);
                  return;
                }
                setShowError(false);
                setStep(3);
              }}
              className="px-8 py-3 bg-[#0E7490] text-white font-bold rounded-xl hover:bg-[#0C4A6E] transition-all flex items-center gap-2"
            >
              Siguiente Paso
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
      )}

      {/* PASO 3: PRESTACIONES */}
      {step === 3 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2">3. Agregar Prestación</h2>
            
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
                  <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-64 overflow-y-auto border-t-0 rounded-t-none">
                    {filteredPrestaciones.map((p, i) => {
                      const vp = p.valoresPrevision?.find(v => v.tipo === paciente.prevision);
                      return (
                        <div
                          key={i}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setNuevaPrestacion({
                              ...nuevaPrestacion,
                              prestacion: p.nombre,
                              valor: vp?.valor ?? 0,
                              copago: vp?.copago ?? 0,
                            });
                            setPrestacionSearch(p.nombre);
                            setShowPrestacionResults(false);
                          }}
                          className="px-4 py-2.5 hover:bg-[#0E7490]/5 cursor-pointer text-sm text-slate-700 border-b border-slate-50 last:border-0"
                        >
                          {p.nombre}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end mt-4">
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
              <button 
                onClick={handleAddPrestacion}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 rounded-xl transition-all h-[42px]"
              >
                Agregar
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">Prestaciones Agregadas ({prestaciones.length})</h3>
              {prestaciones.length > 0 && (
                <span className="text-xs font-bold text-[#0E7490] bg-[#0E7490]/10 px-3 py-1 rounded-full">
                  Total: ${prestaciones.reduce((acc, curr) => acc + (curr.copago || 0), 0).toLocaleString('es-CL')}
                </span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <tr>
                    <th className="px-6 py-4">Prestación</th>
                    <th className="px-6 py-4">Profesional</th>
                    <th className="px-6 py-4">Copago</th>
                    <th className="px-6 py-4">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {prestaciones.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center text-slate-400 italic">No hay prestaciones agregadas</td>
                    </tr>
                  ) : (
                    prestaciones.map((p, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-800">{p.prestacion}</td>
                        <td className="px-6 py-4 text-slate-600">{p.profesional}</td>
                        <td className="px-6 py-4 font-bold text-[#0E7490]">${p.copago.toLocaleString('es-CL')}</td>
                        <td className="px-6 py-4">
                          <button 
                            onClick={() => setPrestaciones(prestaciones.filter((_, idx) => idx !== i))}
                            className="text-red-500 hover:text-red-700 font-bold text-xs flex items-center gap-1"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            Quitar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-200">
            <button 
              onClick={() => setStep(2)}
              className="px-6 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Volver
            </button>
            <button 
              onClick={handleSubmit}
              className="px-10 py-3 bg-[#0E7490] text-white font-bold rounded-xl hover:bg-[#0C4A6E] transition-all shadow-lg shadow-[#0E7490]/30"
            >
              Finalizar y Guardar Atención
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AtencionPage;
