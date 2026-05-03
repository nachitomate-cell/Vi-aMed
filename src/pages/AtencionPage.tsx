import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGestionDatos } from '../hooks/useGestionDatos';
import { collection, getDocs, getDoc, query, where, doc, updateDoc, addDoc, serverTimestamp, Timestamp, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getProfesionales } from '../services/agendaService';
import type { Profesional } from '../types/agenda';

interface PacienteData {
  id?: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  nombre?: string; // Para compatibilidad
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

const calcularEdad = (fechaNacimiento: string): number => {
  if (!fechaNacimiento) return 0;
  const [year, month, day] = fechaNacimiento.split('-').map(Number);
  const hoy = new Date();
  let edad = hoy.getFullYear() - year;
  if (hoy < new Date(hoy.getFullYear(), month - 1, day)) edad--;
  return edad;
};

// Auxiliar para formatear cuerpo de RUT con puntos: 17.543.210
const formatCuerpoRut = (val: string): string => {
  const limpio = val.replace(/[^0-9]/g, '');
  return limpio
    .split('')
    .reverse()
    .reduce((acc, d, i) => (i % 3 === 0 && i !== 0 ? d + '.' + acc : d + acc), '');
};

const normalizeEstado = (est: string): string => {
  const mapping: Record<string, string> = {
    solicitada: 'Agendado',
    confirmada: 'Confirmado',
    realizada: 'En espera',
    atendido: 'En atención',
    finalizado: 'Finalizado',
    cancelada: 'Anulado',
    no_asistio: 'No asistió',
  };
  return mapping[est] || est || 'Agendado';
};



const AtencionPage: React.FC = () => {
  const navigate = useNavigate();
  const { atencionId } = useParams();
  
  // Formulario principal
  const [paciente, setPaciente] = useState<PacienteData>({
    nombres: '', apellidoPaterno: '', apellidoMaterno: '', nombre: '', 
    rut: '', fechaNacimiento: '', sexo: '', telefono: '', correo: '', prevision: ''
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
  
  // Validaciones y notificaciones
  const [showError, setShowError] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Autocomplete paciente
  const searchRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PacienteData[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState(false);

  const { opciones } = useGestionDatos();
  
  // Search Prestacion
  const [prestacionSearch, setPrestacionSearch] = useState('');
  const [showPrestacionResults, setShowPrestacionResults] = useState(false);
  const filteredPrestaciones = catalogoPrestaciones.filter(p =>
    (!nuevaPrestacion.especialidad || p.especialidad === nuevaPrestacion.especialidad) &&
    p.nombre.toLowerCase().includes(prestacionSearch.toLowerCase())
  );

  // Auto-focus en buscador al crear nueva atención
  useEffect(() => {
    if (!atencionId) {
      const t = setTimeout(() => searchRef.current?.focus(), 150);
      return () => clearTimeout(t);
    }
  }, [atencionId]);

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
            nombres: data.pacienteNombres || data.nombres || '',
            apellidoPaterno: data.pacienteApellidoPaterno || data.apellidoPaterno || '',
            apellidoMaterno: data.pacienteApellidoMaterno || data.apellidoMaterno || '',
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
            estado: normalizeEstado(data.estado || 'Agendado')
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

  // Buscar pacientes en Firestore
  useEffect(() => {
    const fetchPacientes = async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        setSearching(false);
        return;
      }

      setSearching(true);
      try {
        const queryClean = searchQuery.toLowerCase().trim();
        const isNumeric = /^[0-9.]+$/.test(queryClean);
        const rutSearch = isNumeric ? formatCuerpoRut(queryClean) : queryClean;

        const queries: Promise<any>[] = [
          getDocs(query(collection(db, 'pacientes'), where('nombreLower', '>=', queryClean), where('nombreLower', '<=', queryClean + ''))),
          getDocs(query(collection(db, 'pacientes'), where('nombre', '>=', queryClean), where('nombre', '<=', queryClean + ''))),
        ];

        if (isNumeric) {
          queries.push(
            getDocs(query(collection(db, 'pacientes'), where('rut', '>=', rutSearch), where('rut', '<=', rutSearch + '')))
          );
        }

        const snaps = await Promise.all(queries);
        const seen = new Set<string>();
        const results: PacienteData[] = [];
        for (const snap of snaps) {
          for (const d of snap.docs) {
            if (!seen.has(d.id)) {
              seen.add(d.id);
              results.push({ id: d.id, ...d.data() } as PacienteData);
            }
          }
        }

        const rutNorm = (s: string) => s.replace(/[^0-9kK]/gi, '');
        const filtered = results.filter(p =>
          p.nombre?.toLowerCase().includes(queryClean) ||
          rutNorm(p.rut ?? '').includes(rutNorm(queryClean))
        );
        setSearchResults(filtered);
      } catch (error) {
        console.error('Error buscando pacientes', error);
      } finally {
        setSearching(false);
      }
    };

    const debounce = setTimeout(fetchPacientes, 200);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const selectPaciente = (p: PacienteData) => {
    // Si no tiene los campos separados, intentar separar el nombre completo como fallback
    let nombres = p.nombres || '';
    let apPaterno = p.apellidoPaterno || '';
    let apMaterno = p.apellidoMaterno || '';

    if (!nombres && p.nombre) {
      const parts = p.nombre.split(' ');
      if (parts.length >= 3) {
        nombres = parts.slice(0, parts.length - 2).join(' ');
        apPaterno = parts[parts.length - 2];
        apMaterno = parts[parts.length - 1];
      } else if (parts.length === 2) {
        nombres = parts[0];
        apPaterno = parts[1];
      } else {
        nombres = parts[0];
      }
    }

    setPaciente({
      nombres,
      apellidoPaterno: apPaterno,
      apellidoMaterno: apMaterno,
      nombre: p.nombre || `${nombres} ${apPaterno} ${apMaterno}`.trim(),
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
    setPacienteSeleccionado(true);
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

  const resetForm = () => {
    setPaciente({ nombres: '', apellidoPaterno: '', apellidoMaterno: '', nombre: '', rut: '', fechaNacimiento: '', sexo: '', telefono: '', correo: '', prevision: '' });
    setDatosAtencion({ fecha: new Date().toISOString().split('T')[0], hora: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }), metodoPago: '', nroOperacion: '', observaciones: '', estado: 'Agendado' });
    setPrestaciones([]);
    setNuevaPrestacion({ especialidad: '', profesional: '', prestacion: '', valor: 0, copago: 0, bonoComplementario: 0, observaciones: '' });
    setSearchQuery('');
    setPrestacionSearch('');
    setPacienteSeleccionado(false);
    setStep(1);
    setShowError(false);
    setNotification(null);
    setTimeout(() => searchRef.current?.focus(), 150);
  };

  const [step, setStep] = useState(1);
  const handleSubmit = async (opts?: { andNew?: boolean }) => {
    const fullNombre = `${paciente.nombres} ${paciente.apellidoPaterno} ${paciente.apellidoMaterno}`.trim();
    
    // Validar requeridos basicos
    if (!paciente.nombres || !paciente.apellidoPaterno || !paciente.rut || !datosAtencion.fecha || !datosAtencion.hora || !datosAtencion.estado) {
      setShowError(true);
      if (!paciente.nombres || !paciente.apellidoPaterno || !paciente.rut) setStep(1);
      else if (!datosAtencion.fecha || !datosAtencion.hora || !datosAtencion.estado) setStep(2);
      return;
    }
    setShowError(false);

    try {
      const [year, month, day] = datosAtencion.fecha.split('-').map(Number);
      const [hour, min] = datosAtencion.hora.split(':').map(Number);
      const fechaCita = new Date(year, month - 1, day, hour, min);

      // Derivar tipoAtencion desde las prestaciones (priorizar ecografía)
      const ecoPresta = prestaciones.find(p => p.especialidad.toLowerCase().includes('eco'));
      const tipoAtencion = ecoPresta
        ? ecoPresta.prestacion
        : (prestaciones[0]?.prestacion || prestaciones[0]?.especialidad || '');

      const edadCalculada = calcularEdad(paciente.fechaNacimiento);
      const payload = {
        pacienteNombre: fullNombre,
        pacienteNombres: paciente.nombres,
        pacienteApellidoPaterno: paciente.apellidoPaterno,
        pacienteApellidoMaterno: paciente.apellidoMaterno,
        pacienteRut: paciente.rut,
        pacienteFechaNacimiento: paciente.fechaNacimiento,
        pacienteEdad: edadCalculada || '',
        pacienteSexo: paciente.sexo,
        pacienteTelefono: paciente.telefono,
        pacienteCorreo: paciente.correo,
        prevision: paciente.prevision,
        fecha: Timestamp.fromDate(fechaCita),
        metodoPago: datosAtencion.metodoPago,
        nOperacion: datosAtencion.nroOperacion,
        observaciones: datosAtencion.observaciones,
        estado: !atencionId && datosAtencion.estado === 'Agendado' ? 'En espera' : datosAtencion.estado,
        prestaciones: prestaciones,
        tipoAtencion,
        actualizadoEn: serverTimestamp()
      };

      // Guardar paciente en la base de datos de pacientes automáticamente
      try {
        const pacienteRef = doc(db, 'pacientes', paciente.rut);
        const pacienteSnap = await getDoc(pacienteRef);
        const pacientePayload: Record<string, unknown> = {
          nombre: fullNombre,
          nombres: paciente.nombres,
          apellidoPaterno: paciente.apellidoPaterno,
          apellidoMaterno: paciente.apellidoMaterno,
          nombreLower: fullNombre.toLowerCase(),
          rut: paciente.rut,
          fechaNacimiento: paciente.fechaNacimiento,
          edad: edadCalculada || '',
          sexo: paciente.sexo,
          telefono: paciente.telefono,
          correo: paciente.correo,
          prevision: paciente.prevision,
          actualizadoEn: serverTimestamp(),
        };
        if (!pacienteSnap.exists()) {
          pacientePayload.creadoEn = serverTimestamp();
        }
        await setDoc(pacienteRef, pacientePayload, { merge: true });
      } catch (e) {
        console.error("No se pudo guardar el paciente:", e);
      }

      if (atencionId) {
        await updateDoc(doc(db, 'citas', atencionId), payload);
        setNotification({ type: 'success', msg: 'Atención actualizada correctamente' });
        setTimeout(() => navigate('/recepcion'), 1200);
      } else {
        await addDoc(collection(db, 'citas'), { ...payload, creadoEn: serverTimestamp() });
        if (opts?.andNew) {
          resetForm();
          setNotification({ type: 'success', msg: `Atención de ${fullNombre} guardada. ¡Listo para el siguiente!` });
        } else {
          navigate('/recepcion');
        }
      }
    } catch (err) {
      console.error('Error al guardar:', err);
      setNotification({ type: 'error', msg: 'Error al guardar la atención. Intente nuevamente.' });
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

      {notification && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border font-semibold text-sm animate-in fade-in slide-in-from-top-2 duration-300 ${
          notification.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {notification.type === 'success'
            ? <svg className="w-5 h-5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            : <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          }
          {notification.msg}
          <button onClick={() => setNotification(null)} className="ml-auto text-current opacity-50 hover:opacity-100">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      {showError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Complete todos los campos obligatorios (*)
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
                Buscador de pacientes en Base de Datos
              </label>
              <div className="relative group">
                <input
                  ref={searchRef}
                  value={searchQuery}
                  onChange={e => {
                    const val = e.target.value;
                    if (val.includes('-')) return;
                    if (/^[0-9.]+$/.test(val) && val.replace(/\./g, '').length > 9) return;
                    setSearchQuery(val);
                    setPacienteSeleccionado(false);
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

            {/* Confirmación de paciente seleccionado */}
            {pacienteSeleccionado && paciente.rut && (
              <div className="md:col-span-2 flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 animate-in fade-in duration-200">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-emerald-800 truncate">
                    {[paciente.nombres, paciente.apellidoPaterno, paciente.apellidoMaterno].filter(Boolean).join(' ')}
                  </p>
                  <p className="text-xs text-emerald-600 font-mono">{paciente.rut}{paciente.prevision && ` · ${paciente.prevision}`}</p>
                </div>
                <button
                  onClick={() => { setSearchQuery(''); setPacienteSeleccionado(false); setPaciente({ nombres: '', apellidoPaterno: '', apellidoMaterno: '', nombre: '', rut: '', fechaNacimiento: '', sexo: '', telefono: '', correo: '', prevision: '' }); setTimeout(() => searchRef.current?.focus(), 50); }}
                  className="text-emerald-500 hover:text-emerald-700 text-xs font-semibold"
                >
                  Cambiar
                </button>
              </div>
            )}

            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Nombres *</label>
                <input 
                  value={paciente.nombres} onChange={e => setPaciente({...paciente, nombres: e.target.value})}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#0E7490]"
                  placeholder="Ej: Juan José"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Apellido Paterno *</label>
                <input 
                  value={paciente.apellidoPaterno} onChange={e => setPaciente({...paciente, apellidoPaterno: e.target.value})}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#0E7490]"
                  placeholder="Ej: Pérez"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Apellido Materno</label>
                <input 
                  value={paciente.apellidoMaterno} onChange={e => setPaciente({...paciente, apellidoMaterno: e.target.value})}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#0E7490]"
                  placeholder="Ej: González"
                />
              </div>
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
                if (!paciente.nombres || !paciente.apellidoPaterno || !paciente.rut || !paciente.prevision) {
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

          <div className="flex justify-between pt-4 border-t border-slate-200 flex-wrap gap-3">
            <button
              onClick={() => setStep(2)}
              className="px-6 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Volver
            </button>
            <div className="flex gap-3 flex-wrap">
              {!atencionId && (
                <button
                  onClick={() => handleSubmit({ andNew: true })}
                  className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all flex items-center gap-2"
                  title="Guardar esta atención y dejar el formulario listo para el siguiente paciente"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                  Guardar y registrar otro
                </button>
              )}
              <button
                onClick={() => handleSubmit()}
                className="px-10 py-3 bg-[#0E7490] text-white font-bold rounded-xl hover:bg-[#0C4A6E] transition-all shadow-lg shadow-[#0E7490]/30 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                Finalizar y Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AtencionPage;
