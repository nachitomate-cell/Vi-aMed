// ─────────────────────────────────────────────────────────────────────────────
// Sincroniza los pacientes escritos en la Planilla Diaria con la base de datos
// de pacientes (colección `pacientes`, una doc por RUT).
//
// Reconoce qué pacientes ya existen (para preguntar si se actualizan) y cuáles
// son nuevos (se agregan directamente con los datos ingresados en la planilla).
// ─────────────────────────────────────────────────────────────────────────────

import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { FilaPlanilla } from '../types/planilla';
import { normalizarRut } from '../utils/rut';

/** Separa el nombre completo en nombres / apellidos (convención chilena). */
function separarNombre(completo: string): { nombres: string; apellidoPaterno: string; apellidoMaterno: string } {
  const partes = completo.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return { nombres: '', apellidoPaterno: '', apellidoMaterno: '' };
  if (partes.length === 1) return { nombres: partes[0], apellidoPaterno: '', apellidoMaterno: '' };
  if (partes.length === 2) return { nombres: partes[0], apellidoPaterno: partes[1], apellidoMaterno: '' };
  // 3 o más palabras: los últimos 2 términos son apellidos.
  return {
    nombres: partes.slice(0, -2).join(' '),
    apellidoPaterno: partes[partes.length - 2],
    apellidoMaterno: partes[partes.length - 1],
  };
}

/** Convierte "DD/MM/AAAA" o "DD-MM-AAAA" a "AAAA-MM-DD". Deja intacto si ya es ISO. */
function fechaNacAISO(fechaNac: string): string {
  const s = (fechaNac ?? '').trim();
  if (!s) return '';
  let m = s.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})$/); // DD/MM/AAAA
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  m = s.match(/^(\d{4})[/\-](\d{1,2})[/\-](\d{1,2})$/);     // AAAA-MM-DD
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  return s;
}

/** Extrae la edad numérica de un texto libre ("34 años", "11"). '' si no aplica. */
function edadNumerica(edad: string): number | '' {
  const n = parseInt((edad ?? '').replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(n) ? n : '';
}

/** Doc id canónico (RUT normalizado). '' si la fila no tiene un RUT utilizable. */
export function rutDocId(rut: string): string {
  const limpio = (rut ?? '').replace(/[^0-9kK]/g, '');
  return limpio.length >= 2 ? normalizarRut(rut) : '';
}

/** Construye el payload de paciente a partir de una fila de la planilla. */
function filaToPayload(fila: FilaPlanilla): Record<string, unknown> {
  const nombre = fila.paciente.trim();
  const { nombres, apellidoPaterno, apellidoMaterno } = separarNombre(nombre);
  const correo = fila.correo.trim();
  return {
    nombre,
    nombreLower: nombre.toLowerCase(),
    nombres,
    apellidoPaterno,
    apellidoMaterno,
    rut: normalizarRut(fila.rut),
    fechaNacimiento: fechaNacAISO(fila.fechaNac),
    edad: edadNumerica(fila.edad),
    telefono: fila.fono.trim(),
    correo,
    email: correo, // compatibilidad: distintas vistas leen `correo` o `email`
    prevision: fila.prevision.trim(),
    direccion: fila.direccion.trim(),
    actualizadoEn: serverTimestamp(),
  };
}

export interface ResumenSync {
  /** Filas cuyo RUT no existe aún en la base de datos. */
  nuevos: FilaPlanilla[];
  /** Filas cuyo RUT ya existe en la base de datos. */
  existentes: FilaPlanilla[];
  /** Filas con nombre pero sin un RUT válido (no se pueden sincronizar). */
  sinRut: FilaPlanilla[];
}

/**
 * Revisa cada fila con nombre de paciente y determina si ya existe en la base de
 * datos (por RUT). No escribe nada.
 */
export async function analizarPacientesPlanilla(filas: FilaPlanilla[]): Promise<ResumenSync> {
  const candidatas = filas.filter(f => f.paciente.trim());
  const nuevos: FilaPlanilla[] = [];
  const existentes: FilaPlanilla[] = [];
  const sinRut: FilaPlanilla[] = [];

  await Promise.all(candidatas.map(async fila => {
    const id = rutDocId(fila.rut);
    if (!id) { sinRut.push(fila); return; }
    try {
      const snap = await getDoc(doc(db, 'pacientes', id));
      (snap.exists() ? existentes : nuevos).push(fila);
    } catch (e) {
      console.error('analizarPacientesPlanilla', e);
      nuevos.push(fila);
    }
  }));

  return { nuevos, existentes, sinRut };
}

/**
 * Escribe las filas indicadas en la colección `pacientes` (merge).
 * Si `marcarComoNuevo` es true, agrega también `creadoEn`.
 * Devuelve la cantidad de pacientes escritos correctamente.
 */
export async function guardarPacientesPlanilla(filas: FilaPlanilla[], marcarComoNuevo: boolean): Promise<number> {
  let escritos = 0;
  for (const fila of filas) {
    const id = rutDocId(fila.rut);
    if (!id) continue;
    try {
      const payload = filaToPayload(fila);
      if (marcarComoNuevo) payload.creadoEn = serverTimestamp();
      await setDoc(doc(db, 'pacientes', id), payload, { merge: true });
      escritos++;
    } catch (e) {
      console.error('guardarPacientesPlanilla', e);
    }
  }
  return escritos;
}
