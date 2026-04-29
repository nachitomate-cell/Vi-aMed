import {
  collection, doc, addDoc, updateDoc, query,
  where, orderBy, onSnapshot, serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { normalizarRut } from '../utils/rut';
import type { EstadoCita } from '../types/agenda';

// ─── Tipos auxiliares ───────────────────────────────────────
interface PacienteData {
  rut: string;
  nombre: string;
  telefono: string;
}

interface SolicitudFormData {
  tipoAtencion: string;
  preferenciaFecha: string;
  preferenciaHora: string;
  notas?: string;
}

interface AsignacionData {
  profesionalId: string;
  profesionalNombre: string;
  fecha: Date;
  duracion: number;
  box: string;
}

// ─── APP MÓVIL — paciente solicita cita ─────────────────────
export async function solicitarCita(paciente: PacienteData, formData: SolicitudFormData) {
  return await addDoc(collection(db, 'citas'), {
    pacienteRut:      normalizarRut(paciente.rut),
    pacienteNombre:   paciente.nombre,
    pacienteTelefono: paciente.telefono,
    tipoAtencion:     formData.tipoAtencion,
    preferenciaFecha: formData.preferenciaFecha,
    preferenciaHora:  formData.preferenciaHora,
    notas:            formData.notas || '',
    estado:           'solicitada',
    visiblePaciente:  true,
    creadoEn:         serverTimestamp(),
    actualizadoEn:    serverTimestamp(),
  });
}

// ─── PORTAL CLÍNICO — secretaría confirma y asigna ──────────
export async function confirmarCita(citaId: string, asignacion: AsignacionData) {
  await updateDoc(doc(db, 'citas', citaId), {
    profesionalId:     asignacion.profesionalId,
    profesionalNombre: asignacion.profesionalNombre,
    fecha:             Timestamp.fromDate(asignacion.fecha),
    duracionMinutos:   asignacion.duracion,
    box:               asignacion.box,
    estado:            'confirmada',
    actualizadoEn:     serverTimestamp(),
  });
}

// ─── PORTAL CLÍNICO — cambiar cualquier estado ─────────────
export async function actualizarEstadoCita(citaId: string, nuevoEstado: EstadoCita) {
  await updateDoc(doc(db, 'citas', citaId), {
    estado:        nuevoEstado,
    actualizadoEn: serverTimestamp(),
  });
}

// ─── PORTAL CLÍNICO — escuchar citas de un día en tiempo real
export function escucharCitasDelDia(fecha: Date, callback: (citas: any[]) => void) {
  const inicio = new Date(fecha);
  inicio.setHours(0, 0, 0, 0);
  const fin = new Date(fecha);
  fin.setHours(23, 59, 59, 999);

  const q = query(
    collection(db, 'citas'),
    where('fecha', '>=', Timestamp.fromDate(inicio)),
    where('fecha', '<=', Timestamp.fromDate(fin)),
    orderBy('fecha', 'asc')
  );

  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

// ─── PORTAL CLÍNICO — escuchar citas solicitadas sin fecha ──
export function escucharCitasSolicitadas(callback: (citas: any[]) => void) {
  const q = query(
    collection(db, 'citas'),
    where('estado', '==', 'solicitada'),
    orderBy('creadoEn', 'asc')
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

// ─── APP MÓVIL / PORTAL PACIENTE — citas de un paciente ─────
export function escucharCitasPaciente(rut: string, callback: (citas: any[]) => void) {
  const q = query(
    collection(db, 'citas'),
    where('pacienteRut', '==', normalizarRut(rut)),
    where('visiblePaciente', '==', true),
    orderBy('fecha', 'desc')
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}
