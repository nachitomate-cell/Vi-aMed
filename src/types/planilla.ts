// ─────────────────────────────────────────────────────────────────────────────
// Modelo de la "Planilla Diaria / Caja" — réplica del Excel "_ECO JUNIO 2026".
// Cada jornada (un día + un profesional) tiene una tabla de pacientes y un
// cierre de caja (montos, comisión Trullenque, arqueo de billetes).
// ─────────────────────────────────────────────────────────────────────────────

/** Fila de paciente agendado dentro de una jornada. */
export interface FilaPlanilla {
  id: string;
  hora: string;            // "09:00"
  paciente: string;
  rut: string;
  edad: string;            // texto libre: "34 años", "11 meses"
  fechaNac: string;        // "01/01/1990"
  fono: string;
  correo: string;
  direccion: string;
  confirmaCorreo: boolean;
  prevision: string;       // Particular | Fonasa | Isapre...
  examen: string;
  codigo: string;
  ordenMedica: string;     // "SI" | "NO" | "X"
  preparacion: string;     // "Ayuno 8 horas" | "X" ...
  montoCancelar: number;   // lo que paga el paciente (copago / particular)
  modoPago: string;        // Débito | Crédito | Efectivo | Huella | Bono online...
  fonasa: number;          // monto Fonasa de referencia
  notas: string;
  estado?: EstadoPlanilla; // estado de la atención del paciente (flujo del día)
  prestacionId?: string;   // vínculo a gestion_prestaciones (si el examen está registrado)
  color?: string;          // color de fondo de la fila (click derecho)
}

/** Estados del flujo de atención del paciente agendado en la planilla. */
export const ESTADOS_PLANILLA = [
  'Agendado',
  'En atención',
  'Finalizado',
  'Reagendado',
  'No asistió / Canceló',
] as const;

export type EstadoPlanilla = typeof ESTADOS_PLANILLA[number];

/** Colores por estado (fondo / texto) para badges y selectores. */
export const ESTADO_PLANILLA_COLOR: Record<EstadoPlanilla, { bg: string; text: string; dot: string }> = {
  'Agendado':             { bg: '#F1F5F9', text: '#475569', dot: '#94A3B8' },
  'En atención':          { bg: '#DBEAFE', text: '#1D4ED8', dot: '#3B82F6' },
  'Finalizado':           { bg: '#D1FAE5', text: '#047857', dot: '#10B981' },
  'Reagendado':           { bg: '#FEF3C7', text: '#B45309', dot: '#F59E0B' },
  'No asistió / Canceló': { bg: '#FEE2E2', text: '#B91C1C', dot: '#EF4444' },
};

/** Línea del arqueo de caja (conteo de billetes/monedas). */
export interface ArqueoLinea {
  denominacion: number;
  cantidad: number;
}

/** Una jornada completa (equivale a una "hoja" del Excel). */
export interface Planilla {
  fecha: string;                 // "2026-06-01" (clave)
  profesionalIniciales: string;  // "JP" | "SM" | "Doctor"
  filas: FilaPlanilla[];
  arqueo: ArqueoLinea[];
  notas: string;
  actualizadoEn: number;         // epoch ms
}

/** Registro de un bono (hoja BONOS del Excel). */
export interface Bono {
  id: string;
  tipo: 'Web' | 'Fonasa';
  fecha: string;   // "2026-06-12"
  rut: string;
  folio: string;
  valor: number;
}

// ── Constantes del dominio ──────────────────────────────────────────────────

/** Profesionales que aparecen en el Excel (iniciales de cada jornada). */
export const PROFESIONALES_PLANILLA = [
  { iniciales: 'JP', nombre: 'Profesional JP', color: '#0E7490' },
  { iniciales: 'SM', nombre: 'Profesional SM', color: '#7C3AED' },
  { iniciales: 'Doctor', nombre: 'Doctor', color: '#B45309' },
] as const;

/** Denominaciones para el arqueo de caja (de mayor a menor). */
export const DENOMINACIONES = [20000, 10000, 5000, 2000, 1000, 500, 100, 50, 10] as const;

export const PREVISIONES = ['Particular', 'Fonasa', 'Isapre'] as const;

export const MODOS_PAGO = ['Débito', 'Crédito', 'Efectivo', 'Huella', 'Bono online', 'Transferencia'] as const;

/** Comisión que se descuenta sobre el total Fonasa (15% en el Excel). */
export const COMISION_TRULLENQUE = 0.15;

/** Crea una fila vacía con la hora indicada. */
export function filaVacia(hora = '', id?: string): FilaPlanilla {
  return {
    id: id ?? `f_${Math.round(performance.now() * 1000)}_${Math.floor(Math.random() * 1e6)}`,
    hora,
    paciente: '',
    rut: '',
    edad: '',
    fechaNac: '',
    fono: '',
    correo: '',
    direccion: '',
    confirmaCorreo: false,
    prevision: 'Particular',
    examen: '',
    codigo: '',
    ordenMedica: 'SI',
    preparacion: '',
    montoCancelar: 0,
    modoPago: 'Débito',
    fonasa: 0,
    notas: '',
    estado: 'Agendado',
  };
}

/** Arqueo en cero (una línea por denominación). */
export function arqueoVacio(): ArqueoLinea[] {
  return DENOMINACIONES.map(d => ({ denominacion: d, cantidad: 0 }));
}

// ── Horarios por día de la semana ────────────────────────────────────────────
// El horario por defecto de una jornada nueva depende del día de la semana de
// su fecha. Editar aquí para ajustar/agregar días.

/** Bloques de colación (almuerzo) — se marcan como descanso en la planilla. */
export const COLACION = new Set(['13:00', '13:15', '13:30', '13:45', '14:00']);

const HORARIO_LUNES = [
  '9:00', '9:15', '9:30', '9:45', '10:00', '10:15', '10:30', '10:45',
  '11:00', '11:15', '11:30', '11:45', '12:00', '12:15', '12:30', '12:45',
  '13:00', '13:15', '13:30', '13:45', '14:00', '14:15', '14:30', '14:45',
  '15:00', '15:30', '15:45', '16:00', '16:15', '16:30', '16:45',
];

const HORARIO_MIERCOLES = [
  '9:00', '9:15', '9:30', '9:45', '10:00', '10:15', '10:30', '10:45',
  '11:00', '11:15', '11:30', '11:45', '12:00', '12:15', '12:30', '12:45',
  '13:00', '13:15', '13:30', '13:45', '14:00', '14:15', '14:30', '14:45',
  '15:00', '15:30', '15:45', '16:00', '16:15', '16:30', '16:45', '17:00',
];

/** Horario por día de la semana (0=Dom, 1=Lun, … 6=Sáb). */
const HORARIOS_POR_DIA: Record<number, string[]> = {
  1: HORARIO_LUNES,
  3: HORARIO_MIERCOLES,
};

/** Devuelve la lista de bloques horarios para la fecha dada (YYYY-MM-DD). */
export function horarioDeFecha(fechaISO: string): string[] {
  const d = new Date(`${fechaISO}T00:00:00`);
  const dia = Number.isNaN(d.getTime()) ? 1 : d.getDay();
  return HORARIOS_POR_DIA[dia] ?? HORARIO_LUNES;
}

/** Construye las filas iniciales de una jornada nueva según su horario. */
export function construirFilasHorario(fechaISO: string): FilaPlanilla[] {
  return horarioDeFecha(fechaISO).map(h => filaVacia(h));
}

export function esColacion(hora: string): boolean {
  return COLACION.has((hora ?? '').trim());
}
