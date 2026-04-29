import type { Timestamp } from 'firebase/firestore';

export type EstadoCita = 'solicitada' | 'confirmada' | 'realizada' | 'cancelada' | 'no_asistio';
export type RolProfesional = 'medico' | 'tecnologo' | 'enfermero' | 'secretaria' | 'admin';

export const BOXES = ['Box 1', 'Box 2', 'Sala de procedimientos', 'Sala de espera'] as const;
export type BoxCita = typeof BOXES[number];

export const DURACIONES_MINUTOS = [15, 30, 45, 60, 90] as const;

export const ESTADO_LABELS: Record<EstadoCita, string> = {
  solicitada: 'Solicitada',
  confirmada: 'Confirmada',
  realizada: 'Realizada',
  cancelada: 'Cancelada',
  no_asistio: 'No asistió',
};

export const ESTADO_COLORS: Record<EstadoCita, string> = {
  solicitada: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  confirmada: 'bg-cyan-700/15 text-cyan-400 border-cyan-500/30',
  realizada: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  cancelada: 'bg-red-500/15 text-red-400 border-red-500/30',
  no_asistio: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
};

export const ESTADO_BORDER: Record<EstadoCita, string> = {
  solicitada: 'border-l-amber-400',
  confirmada: 'border-l-cyan-500',
  realizada: 'border-l-slate-500',
  cancelada: 'border-l-red-500',
  no_asistio: 'border-l-orange-500',
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
}

export interface Profesional {
  id: string;
  nombre: string;
  rol: RolProfesional;
  especialidad: string;
  color: string;
  activo: boolean;
  email?: string;
}

export interface PacienteResultado {
  rut: string;
  nombre: string;
  telefono: string;
}
