import type { Timestamp } from 'firebase/firestore';

// ─── Horario base semanal de un profesional ───────────────────────────────────
export interface Horario {
  id: string;
  profesionalId: string;
  /** 0=Dom 1=Lun 2=Mar 3=Mié 4=Jue 5=Vie 6=Sáb */
  diasSemana: number[];
  horaInicio: string;      // "08:00"
  horaFin: string;         // "17:00"
  duracionSlotMinutos: number;  // 30
  tiempoMuertoMinutos: number;  // 10
  activo: boolean;
  actualizadoEn?: Timestamp;
}

// ─── Bloqueo de horario ───────────────────────────────────────────────────────
export type TipoBloqueo = 'rango' | 'dia_completo' | 'tiempo_muerto';

export interface Bloqueo {
  id: string;
  /** null si es bloqueo de sala/box */
  profesionalId: string | null;
  tipo: TipoBloqueo;
  motivo: string;
  fecha: Timestamp;
  horaInicio?: string;   // solo tipo "rango"
  horaFin?: string;      // solo tipo "rango"
  diaCompleto: boolean;
  recurrente: boolean;
  diasRecurrencia: number[];
  fechaFinRecurrencia?: Timestamp;
  /** Timestamps de días excluidos de la recurrencia */
  fechasExcluidas?: number[];
  creadoPor: string;
  creadoEn?: Timestamp;
}

// ─── Slot renderizado ─────────────────────────────────────────────────────────
export type TipoSlot = 'libre' | 'cita' | 'bloqueado' | 'tiempo_muerto' | 'fuera_horario';

export interface Slot {
  hora: string;          // "08:00"
  minutosAbsolutos: number;
  tipo: TipoSlot;
  cita?: import('./agenda').Cita;
  bloqueo?: Bloqueo;
  duracionMinutos?: number;  // para citas y bloqueos multi-slot
  esSobrecupo?: boolean;
}

// ─── Columna de profesional para VistaColumnas ────────────────────────────────
export interface ColumnaAgenda {
  profesional: import('./agenda').Profesional;
  horario: Horario | null;
  slots: Slot[];
  totalCitas: number;
  totalLibres: number;
}
