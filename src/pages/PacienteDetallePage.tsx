import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  collection, query, where, getDocs, doc, getDoc, orderBy
} from 'firebase/firestore';
import { db } from '../lib/firebase';

interface Paciente {
  id: string;
  nombre?: string;
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
          <h1 className="text-xl font-bold text-slate-800 truncate">{nombreDisplay}</h1>
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
    </div>
  );
};

export default PacienteDetallePage;
