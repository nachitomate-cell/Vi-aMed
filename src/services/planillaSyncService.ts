// ─────────────────────────────────────────────────────────────────────────────
// PUENTE: la Planilla es el líder. Esta función genera/actualiza las CITAS
// (y los PACIENTES) a partir de las filas de una jornada, para que el resto del
// sistema —Box Ecografía, Box Medicina, Recepción, Reportes, Finanzas— que leen
// de la colección `citas`, queden alimentados por la planilla sin doble digitación.
//
// Es IDEMPOTENTE: cada cita usa un id determinístico (pl_<fecha>_<ini>_<filaId>),
// por lo que volver a sincronizar ACTUALIZA en vez de duplicar.
// ─────────────────────────────────────────────────────────────────────────────

import { doc, setDoc, Timestamp, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { normalizarRut } from '../utils/rut';
import type { Planilla, FilaPlanilla } from '../types/planilla';

export interface ResultadoSync {
  citas: number;
  pacientes: number;
  omitidas: number; // filas sin paciente
}

/** Especialidad a partir del nombre del examen (para enrutar al box correcto). */
function especialidadDeExamen(examen: string): string {
  const e = examen.toLowerCase();
  if (/eco|doppler|mamograf/.test(e)) return 'Ecografía';
  if (/consulta|medic|control/.test(e)) return 'Medicina';
  return 'Ecografía';
}

/** Estado de la fila (planilla) → estado de la cita (sistema). */
function estadoCita(estadoFila?: string): string {
  switch (estadoFila) {
    case 'En atención': return 'En atención';
    case 'Finalizado': return 'Finalizado';
    case 'Reagendado': return 'Confirmado';
    case 'No asistió / Canceló': return 'No asistió';
    case 'Agendado':
    default:
      return 'En espera'; // visible en los box, lista para atender
  }
}

/** "YYYY-MM-DD" + "H:MM" → Timestamp. */
function fechaHoraTimestamp(fechaISO: string, hora: string): Timestamp {
  const [y, m, d] = fechaISO.split('-').map(Number);
  const mm = (hora || '').match(/(\d{1,2}):(\d{2})/);
  const h = mm ? Number(mm[1]) : 9;
  const min = mm ? Number(mm[2]) : 0;
  return Timestamp.fromDate(new Date(y, (m || 1) - 1, d || 1, h, min, 0, 0));
}

/** "dd/mm/aaaa" → "aaaa-mm-dd" (para edad/ficha). Devuelve '' si no aplica. */
function fechaNacISO(fechaNac: string): string {
  const m = (fechaNac || '').trim().match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return /^\d{4}-\d{2}-\d{2}$/.test(fechaNac) ? fechaNac : '';
}

function citaId(fecha: string, iniciales: string, filaId: string): string {
  return `pl_${fecha}_${iniciales}_${filaId}`;
}

async function upsertPaciente(fila: FilaPlanilla): Promise<boolean> {
  const rut = normalizarRut(fila.rut);
  if (!rut) return false;
  const fnac = fechaNacISO(fila.fechaNac);
  await setDoc(
    doc(db, 'pacientes', rut),
    {
      rut,
      nombre: fila.paciente.trim(),
      nombreLower: fila.paciente.trim().toLowerCase(),
      telefono: fila.fono || '',
      correo: fila.correo || '',
      email: fila.correo || '',
      direccion: fila.direccion || '',
      prevision: fila.prevision || '',
      ...(fnac ? { fechaNacimiento: fnac } : {}),
      ...(fila.edad ? { edad: fila.edad } : {}),
      origen: 'planilla',
      actualizadoEn: serverTimestamp(),
    },
    { merge: true },
  );
  return true;
}

async function upsertCita(planilla: Planilla, fila: FilaPlanilla, profesionalNombre: string): Promise<void> {
  const rut = normalizarRut(fila.rut);
  const especialidad = especialidadDeExamen(fila.examen);
  const id = citaId(planilla.fecha, planilla.profesionalIniciales, fila.id);
  await setDoc(
    doc(db, 'citas', id),
    {
      pacienteRut: rut,
      pacienteNombre: fila.paciente.trim(),
      pacienteTelefono: fila.fono || '',
      pacienteFechaNacimiento: fechaNacISO(fila.fechaNac),
      pacienteEdad: fila.edad || '',
      fecha: fechaHoraTimestamp(planilla.fecha, fila.hora),
      estado: estadoCita(fila.estado),
      tipoAtencion: fila.examen || 'Ecografía',
      prestaciones: [{
        prestacion: fila.examen || 'Ecografía',
        especialidad,
        prevision: fila.prevision || '',
        codigo: fila.codigo || '',
        prestacionId: fila.prestacionId || '',
        montoCancelar: fila.montoCancelar || 0,
        fonasa: fila.fonasa || 0,
      }],
      prevision: fila.prevision || '',
      profesionalNombre,
      profesionalIniciales: planilla.profesionalIniciales,
      box: especialidad === 'Medicina' ? 'Box Medicina' : 'Box Ecografía',
      // Montos de la planilla (para Reportes / Finanzas).
      montoCancelar: fila.montoCancelar || 0,
      fonasa: fila.fonasa || 0,
      modoPago: fila.modoPago || '',
      notas: fila.preparacion || '',
      visiblePaciente: false,
      origen: 'planilla',
      planillaFecha: planilla.fecha,
      planillaIniciales: planilla.profesionalIniciales,
      planillaFila: fila.id,
      actualizadoEn: serverTimestamp(),
    },
    { merge: true },
  );
}

/**
 * Sincroniza una jornada completa hacia `citas` y `pacientes`.
 * Solo procesa filas que tengan nombre de paciente.
 */
export async function sincronizarJornadaConCitas(
  planilla: Planilla,
  profesionalNombre: string,
): Promise<ResultadoSync> {
  let citas = 0, pacientes = 0, omitidas = 0;
  for (const fila of planilla.filas) {
    if (!fila.paciente.trim()) { omitidas++; continue; }
    try {
      const okPac = await upsertPaciente(fila);
      if (okPac) pacientes++;
      await upsertCita(planilla, fila, profesionalNombre);
      citas++;
    } catch (e) {
      console.error('sync fila', fila.id, e);
    }
  }
  return { citas, pacientes, omitidas };
}
