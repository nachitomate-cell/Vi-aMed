import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Cita, Profesional, EstadoCita, PacienteResultado } from '../types/agenda';
import { normalizarRut } from '../utils/rut';

export async function crearCita(
  datos: Omit<Cita, 'id' | 'creadoEn' | 'actualizadoEn'>
): Promise<string> {
  const ref = await addDoc(collection(db, 'citas'), {
    ...datos,
    pacienteRut: normalizarRut(datos.pacienteRut),
    creadoEn: serverTimestamp(),
    actualizadoEn: serverTimestamp(),
  });
  return ref.id;
}

export async function actualizarEstadoCita(citaId: string, nuevoEstado: EstadoCita): Promise<void> {
  await updateDoc(doc(db, 'citas', citaId), {
    estado: nuevoEstado,
    actualizadoEn: serverTimestamp(),
  });
}

export async function actualizarCita(
  citaId: string,
  datos: Partial<Omit<Cita, 'id' | 'creadoEn' | 'actualizadoEn'>>
): Promise<void> {
  const updateData = { ...datos, actualizadoEn: serverTimestamp() };
  if (updateData.pacienteRut) {
    updateData.pacienteRut = normalizarRut(updateData.pacienteRut);
  }
  await updateDoc(doc(db, 'citas', citaId), updateData);
}

export async function getProfesionales(): Promise<Profesional[]> {
  const snap = await getDocs(
    query(collection(db, 'profesionales'), where('activo', '==', true))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Profesional));
}

export async function getTiposAtencion(): Promise<string[]> {
  const snap = await getDocs(collection(db, 'gestion_prestaciones'));
  if (snap.empty) {
    return [
      'Ecografía Abdominal',
      'Ecografía Partes Blandas',
      'Ecografía Pélvica',
      'Procedimiento de Enfermería',
      'Curación avanzada',
      'Control médico',
    ];
  }
  return snap.docs.map(d => d.data().nombre as string).filter(Boolean);
}

export async function buscarPaciente(termino: string): Promise<PacienteResultado[]> {
  try {
    const snap = await getDocs(collection(db, 'users'));
    const lower = termino.toLowerCase().trim();
    const searchRut = termino.replace(/[.\s-]/g, '').trim().toUpperCase(); // Quitar puntos, espacios, guiones y pasar a MAYÚSCULAS

    return snap.docs
      .map(d => {
        const data = d.data();
        return {
          rut: ((data.rut ?? '') as string),
          nombre: ((data.nombreCompleto || `${data.nombre || ''} ${data.apellido || ''}`.trim() || data.name || '') as string),
          telefono: ((data.telefono ?? data.phone ?? '') as string),
        };
      })
      .filter(p => {
        const pRutClean = p.rut.replace(/[.\s-]/g, '').toUpperCase();
        return pRutClean.includes(searchRut) || p.nombre.toLowerCase().includes(lower);
      })
      .slice(0, 6);
  } catch (err) {
    console.error('Error al buscar paciente:', err);
    return [];
  }
}

export async function verificarDisponibilidad(
  profesionalId: string,
  fechaInicio: Date,
  duracionMinutos: number,
  excluirCitaId?: string
): Promise<boolean> {
  const inicio = Timestamp.fromDate(fechaInicio);
  const fin = Timestamp.fromDate(new Date(fechaInicio.getTime() + duracionMinutos * 60_000));

  const snap = await getDocs(
    query(
      collection(db, 'citas'),
      where('profesionalId', '==', profesionalId),
      where('fecha', '>=', inicio),
      where('fecha', '<', fin)
    )
  );

  return snap.docs.filter(d => {
    if (d.id === excluirCitaId) return false;
    return !['cancelada', 'no_asistio'].includes(d.data().estado as string);
  }).length === 0;
}

export async function verificarDisponibilidadBox(
  box: string,
  fechaInicio: Date,
  duracionMinutos: number,
  excluirCitaId?: string
): Promise<boolean> {
  const inicio = Timestamp.fromDate(fechaInicio);
  const fin = Timestamp.fromDate(new Date(fechaInicio.getTime() + duracionMinutos * 60_000));

  const snap = await getDocs(
    query(
      collection(db, 'citas'),
      where('box', '==', box),
      where('fecha', '>=', inicio),
      where('fecha', '<', fin)
    )
  );

  return snap.docs.filter(d => {
    if (d.id === excluirCitaId) return false;
    return !['cancelada', 'no_asistio'].includes(d.data().estado as string);
  }).length === 0;
}
