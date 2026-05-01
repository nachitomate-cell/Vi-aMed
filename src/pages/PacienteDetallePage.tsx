import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  collection, query, where, getDocs, doc, getDoc, orderBy, updateDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';

interface Paciente {
  id: string;
  nombre?: string;
  nombres?: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string;
  name?: string;
  rut?: string;
  email?: string;
  telefono?: string;
  fechaNacimiento?: string;
  edad?: string | number;
  sexo?: string;
  prevision?: string;
  direccion?: string;
  comuna?: string;
  nacionalidad?: string;
  creadoEn?: any;
}

interface CitaPaciente {
  id: string;
  fecha: any;
  tipoAtencion: string;
  estado: string;
  profesionalNombre?: string;
  box?: string;
}

const ESTADO_COLORS: Record<string, { bg: string; text: string }> = {
  solicitada:  { bg: '#FEF3C7', text: '#92400E' },
  confirmada:  { bg: '#CFFAFE', text: '#155E75' },
  realizada:   { bg: '#D1FAE5', text: '#065F46' },
  cancelada:   { bg: '#FEE2E2', text: '#991B1B' },
  no_asistio:  { bg: '#FFEDD5', text: '#9A3412' },
};

const PacienteDetallePage: React.FC = () => {
  const { pacienteId } = useParams<{ pacienteId: string }>();
  const navigate = useNavigate();

  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [citas, setCitas] = useState<CitaPaciente[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editando, setEditando] = useState(false);
  const [formData, setFormData] = useState<Partial<Paciente>>({});
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!pacienteId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Buscar en /pacientes por ID directo
        const pacSnap = await getDoc(doc(db, 'pacientes', pacienteId));
        let pac: Paciente | null = null;

        if (pacSnap.exists()) {
          pac = { id: pacSnap.id, ...pacSnap.data() } as Paciente;
        } else {
          // Buscar en /users
          const usersSnap = await getDoc(doc(db, 'users', pacienteId));
          if (usersSnap.exists()) {
            pac = { id: usersSnap.id, ...usersSnap.data() } as Paciente;
          } else {
            // Si no se encuentra por ID, intentar buscar por RUT en ambas colecciones
            const qPac = query(collection(db, 'pacientes'), where('rut', '==', pacienteId));
            const snapPacR = await getDocs(qPac);
            if (!snapPacR.empty) {
              pac = { id: snapPacR.docs[0].id, ...snapPacR.docs[0].data() } as Paciente;
            } else {
              const qUser = query(collection(db, 'users'), where('rut', '==', pacienteId));
              const snapUserR = await getDocs(qUser);
              if (!snapUserR.empty) {
                pac = { id: snapUserR.docs[0].id, ...snapUserR.docs[0].data() } as Paciente;
              }
            }
          }
        }

        if (!pac) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        setPaciente(pac);

        // Buscar citas por RUT
        const rut = pac.rut;
        if (rut) {
          const citasSnap = await getDocs(
            query(collection(db, 'citas'), where('pacienteRut', '==', rut), orderBy('fecha', 'desc'))
          );
          setCitas(citasSnap.docs.map(d => ({ id: d.id, ...d.data() } as CitaPaciente)));
        }
      } catch (err) {
        console.error('Error cargando paciente:', err);
      }
      setLoading(false);
    };

    fetchData();
  }, [pacienteId]);

  const handleEditClick = () => {
    if (!paciente) return;
    
    // Si nombres/apellidos no existen, intentar separar el nombre completo
    let n = paciente.nombres || '';
    let ap = paciente.apellidoPaterno || '';
    let am = paciente.apellidoMaterno || '';
    
    if (!n && !ap && paciente.nombre) {
      const parts = paciente.nombre.trim().split(' ');
      if (parts.length >= 3) {
        am = parts.pop() || '';
        ap = parts.pop() || '';
        n = parts.join(' ');
      } else if (parts.length === 2) {
        ap = parts.pop() || '';
        n = parts[0];
      } else {
        n = parts[0];
      }
    }

    setFormData({
      ...paciente,
      nombres: n,
      apellidoPaterno: ap,
      apellidoMaterno: am
    });
    setEditando(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paciente || !paciente.id) return;
    setGuardando(true);

    try {
      // Combinar nombre completo para backward compatibility
      const fullNombre = `${formData.nombres || ''} ${formData.apellidoPaterno || ''} ${formData.apellidoMaterno || ''}`.trim().replace(/\s+/g, ' ');
      
      const updateData = {
        ...formData,
        nombre: fullNombre
      };
      
      // Eliminar el ID de la data de actualización
      const { id, ...cleanData } = updateData;

      await updateDoc(doc(db, 'pacientes', paciente.id), cleanData);
      
      setPaciente({ ...paciente, ...updateData });
      setEditando(false);
      alert('Datos del paciente actualizados correctamente.');
    } catch (err) {
      console.error('Error actualizando paciente:', err);
      alert('Error al guardar los cambios.');
    } finally {
      setGuardando(false);
    }
  };

  const nombreDisplay = paciente?.nombre || paciente?.name || 'Paciente';
  const iniciales = nombreDisplay.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-[#0E7490] animate-spin" />
      </div>
    );
  }

  if (notFound || !paciente) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Volver
        </button>
        <div className="text-center py-20 text-slate-400">
          <p className="text-lg font-semibold">Paciente no encontrado</p>
          <p className="text-sm mt-1">El ID <code className="bg-slate-100 px-1 rounded">{pacienteId}</code> no existe.</p>
        </div>
      </div>
    );
  }

  const campos: { label: string; value: string | undefined }[] = [
    { label: 'RUN', value: paciente.rut },
    { label: 'Email', value: paciente.email },
    { label: 'Teléfono', value: paciente.telefono },
    { label: 'Fecha de nacimiento', value: paciente.fechaNacimiento },
    { label: 'Edad', value: paciente.edad ? String(paciente.edad) : undefined },
    { label: 'Sexo', value: paciente.sexo },
    { label: 'Previsión', value: paciente.prevision },
    { label: 'Dirección', value: paciente.direccion },
    { label: 'Comuna', value: paciente.comuna },
    { label: 'Nacionalidad', value: paciente.nacionalidad },
  ].filter(c => !!c.value);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Volver */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Volver a Pacientes
      </button>

      {/* Header del paciente */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex items-start gap-5">
        <div className="w-16 h-16 rounded-2xl bg-[#0E7490]/10 flex items-center justify-center text-2xl font-bold text-[#0E7490] flex-shrink-0">
          {iniciales}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-xl font-bold text-slate-800 truncate">{nombreDisplay}</h1>
            <button
              onClick={handleEditClick}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:border-[#0E7490] hover:text-[#0E7490] transition-all shadow-sm"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
              Editar Datos
            </button>
          </div>
          {paciente.rut && <p className="text-sm text-slate-500 mt-0.5">RUN: {paciente.rut}</p>}
          <div className="flex flex-wrap gap-2 mt-3">
            {paciente.prevision && (
              <span className="text-xs font-semibold bg-cyan-50 text-cyan-700 border border-cyan-200 px-2.5 py-0.5 rounded-full">
                {paciente.prevision}
              </span>
            )}
            {paciente.sexo && (
              <span className="text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-0.5 rounded-full">
                {paciente.sexo}
              </span>
            )}
            <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full">
              {citas.length} atención{citas.length !== 1 ? 'es' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Datos personales */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Datos Personales</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          {campos.map(c => (
            <div key={c.label}>
              <p className="text-xs text-slate-400 uppercase tracking-wider">{c.label}</p>
              <p className="text-sm font-medium text-slate-800 mt-0.5">{c.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Historial de citas */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Historial de Atenciones</h2>
        </div>
        {citas.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">Sin atenciones registradas.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {citas.map(cita => {
              const fecha = cita.fecha?.toDate?.();
              const fechaStr = fecha ? fecha.toLocaleDateString('es-CL') : '—';
              const horaStr = fecha ? fecha.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '—';
              const colores = ESTADO_COLORS[cita.estado] ?? { bg: '#F1F5F9', text: '#475569' };
              return (
                <div key={cita.id} className="flex items-center gap-4 px-6 py-3.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{cita.tipoAtencion || '—'}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {fechaStr} · {horaStr}
                      {cita.profesionalNombre && ` · ${cita.profesionalNombre}`}
                    </p>
                  </div>
                  <span
                    className="text-[10px] font-bold px-2.5 py-0.5 rounded-full flex-shrink-0 border"
                    style={{ background: colores.bg, color: colores.text, borderColor: colores.bg }}
                  >
                    {cita.estado?.replace('_', ' ') ?? '—'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de edición */}
      {editando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-200 animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Editar Datos del Paciente</h2>
              <button onClick={() => setEditando(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">(*) Obligatorio</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* RUT (Deshabilitado) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">RUT *</label>
                  <input
                    type="text"
                    value={formData.rut || ''}
                    disabled
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-400 cursor-not-allowed"
                  />
                  <p className="text-[10px] text-slate-400">El RUT no se puede editar.</p>
                </div>

                {/* Nombres */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Nombres *</label>
                  <input
                    type="text"
                    required
                    value={formData.nombres || ''}
                    onChange={e => setFormData({ ...formData, nombres: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#0E7490] focus:ring-4 focus:ring-[#0E7490]/5"
                  />
                </div>

                {/* Apellido Paterno */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Apellido paterno *</label>
                  <input
                    type="text"
                    required
                    value={formData.apellidoPaterno || ''}
                    onChange={e => setFormData({ ...formData, apellidoPaterno: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#0E7490] focus:ring-4 focus:ring-[#0E7490]/5"
                  />
                </div>

                {/* Apellido Materno */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Apellido materno *</label>
                  <input
                    type="text"
                    required
                    value={formData.apellidoMaterno || ''}
                    onChange={e => setFormData({ ...formData, apellidoMaterno: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#0E7490] focus:ring-4 focus:ring-[#0E7490]/5"
                  />
                </div>

                {/* Fecha Nacimiento */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Fecha de nacimiento *</label>
                  <input
                    type="date"
                    required
                    value={formData.fechaNacimiento || ''}
                    onChange={e => setFormData({ ...formData, fechaNacimiento: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#0E7490] focus:ring-4 focus:ring-[#0E7490]/5"
                  />
                </div>

                {/* Teléfono */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Teléfono *</label>
                  <input
                    type="tel"
                    required
                    value={formData.telefono || ''}
                    onChange={e => setFormData({ ...formData, telefono: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#0E7490] focus:ring-4 focus:ring-[#0E7490]/5"
                  />
                </div>

                {/* Correo */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Correo</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#0E7490] focus:ring-4 focus:ring-[#0E7490]/5"
                  />
                </div>

                {/* Sexo */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Sexo</label>
                  <select
                    value={formData.sexo || ''}
                    onChange={e => setFormData({ ...formData, sexo: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#0E7490] focus:ring-4 focus:ring-[#0E7490]/5"
                  >
                    <option value="">Seleccione...</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Femenino">Femenino</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>

                {/* Dirección */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Dirección</label>
                  <input
                    type="text"
                    value={formData.direccion || ''}
                    onChange={e => setFormData({ ...formData, direccion: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#0E7490] focus:ring-4 focus:ring-[#0E7490]/5"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditando(false)}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="flex-[2] px-4 py-3 bg-[#0E7490] text-white font-bold rounded-xl hover:bg-[#0c6680] transition-colors shadow-lg shadow-[#0E7490]/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {guardando ? (
                    <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  ) : 'FORMULARIO VÁLIDO - Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PacienteDetallePage;
