import type { Timestamp } from 'firebase/firestore';

export type EstadoCita = 'Agendado' | 'Confirmado' | 'En espera' | 'En atención' | 'Rezagado' | 'Finalizado' | 'Anulado' | 'No asistió';
export type RolProfesional = 'medico' | 'tecnologo' | 'enfermero' | 'secretaria' | 'admin';

export const BOXES = ['Box 1', 'Box 2', 'Sala de procedimientos', 'Sala de espera'] as const;
export type BoxCita = typeof BOXES[number];

export const DURACIONES_MINUTOS = [15, 30, 45, 60, 90] as const;

export const ESTADO_LABELS: Record<EstadoCita, string> = {
  'Agendado': 'Agendado',
  'Confirmado': 'Confirmado',
  'En espera': 'En espera',
  'En atención': 'En atención',
  'Rezagado': 'Rezagado',
  'Finalizado': 'Finalizado',
  'Anulado': 'Anulado',
  'No asistió': 'No asistió',
};

export const ESTADO_COLORS: Record<EstadoCita, string> = {
  'Agendado': 'bg-slate-500/15 text-slate-500 border-slate-500/30',
  'Confirmado': 'bg-blue-500/15 text-blue-600 border-blue-500/30',
  'En espera': 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  'En atención': 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  'Rezagado': 'bg-orange-500/15 text-orange-600 border-orange-500/30',
  'Finalizado': 'bg-indigo-500/15 text-indigo-600 border-indigo-500/30',
  'Anulado': 'bg-red-500/15 text-red-600 border-red-500/30',
  'No asistió': 'bg-rose-500/15 text-rose-600 border-rose-500/30',
};

export const ESTADO_BORDER: Record<EstadoCita, string> = {
  'Agendado': 'border-l-slate-400',
  'Confirmado': 'border-l-blue-500',
  'En espera': 'border-l-amber-500',
  'En atención': 'border-l-emerald-500',
  'Rezagado': 'border-l-orange-500',
  'Finalizado': 'border-l-indigo-600',
  'Anulado': 'border-l-red-500',
  'No asistió': 'border-l-rose-500',
};

export interface Cita {
  id: string;
  pacienteRut: string;
  pacienteNombre: string;
  pacienteTelefono: string;
  profesionalId: string;
  profesionalNombre: string;
  profesionalRol: RolProfesional;
  tipoAtencion: string;
  fecha: Timestamp;
  duracionMinutos: number;
  box: BoxCita;
  estado: EstadoCita;
  notas: string;
  creadoPor: string;
  creadoEn?: Timestamp;
  actualizadoEn?: Timestamp;
  visiblePaciente: boolean;
  origenCita?: string;
  informeId?: string;
  prestaciones?: Array<{
    prestacion: string;
    especialidad: string;
    prevision?: string;
  }>;
  prevision?: string;
}

export interface Profesional {
  id: string;
  nombre: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string;
  telefono?: string;
  comision?: number;
  rol: RolProfesional;
  especialidad: string;
  color: string;
  activo: boolean;
  email?: string;
  rut?: string;
  fotoUrl?: string;
  creadoEn?: Timestamp;
}

export interface PacienteResultado {
  rut: string;
  nombre: string;
  telefono: string;
}
