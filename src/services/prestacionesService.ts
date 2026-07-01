// ─────────────────────────────────────────────────────────────────────────────
// Acceso a las prestaciones registradas (gestion_prestaciones) y a la lógica
// de precios por previsión, para autocompletar la planilla.
// ─────────────────────────────────────────────────────────────────────────────

import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface ValorPrevision {
  tipo: string;     // "Fonasa" | "Particular" | "Isapre" ...
  valor: number;    // monto de referencia (columna FONASA del Excel)
  copago: number;   // lo que paga el paciente
}

export interface PrestacionTarifa {
  id: string;
  codigo: string;
  nombre: string;
  especialidad: string;
  afecto: boolean;
  estado: string;
  valoresPrevision: ValorPrevision[];
}

/** Lista las prestaciones activas, ordenadas por nombre. */
export async function getPrestacionesActivas(): Promise<PrestacionTarifa[]> {
  const snap = await getDocs(collection(db, 'gestion_prestaciones'));
  return snap.docs
    .map(d => {
      const x = d.data() as any;
      return {
        id: d.id,
        codigo: x.codigo ?? '',
        nombre: x.nombre ?? '',
        especialidad: x.especialidad ?? '',
        afecto: !!x.afecto,
        estado: x.estado ?? 'activo',
        valoresPrevision: Array.isArray(x.valoresPrevision) ? x.valoresPrevision : [],
      } as PrestacionTarifa;
    })
    .filter(p => p.nombre && p.estado !== 'inactivo')
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

/** Lista los nombres de las previsiones registradas y activas. */
export async function getPrevisionesNombres(): Promise<string[]> {
  const snap = await getDocs(collection(db, 'gestion_previsiones'));
  return snap.docs
    .map(d => d.data() as any)
    .filter(x => x.activo !== false)
    .map(x => (x.nombre ?? x.name) as string)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, 'es'));
}

/**
 * Calcula el monto a cancelar y el monto Fonasa de referencia de una
 * prestación según la previsión elegida.
 *  - monto a cancelar = copago si es > 0; si no, el valor completo (particular).
 *  - fonasa (referencia) = valor.
 */
export function preciosDe(
  prestacion: PrestacionTarifa,
  prevision: string,
): { monto: number; fonasa: number; tipo: string } {
  const p = prevision.toLowerCase().trim();
  const vp =
    prestacion.valoresPrevision.find(v => v.tipo.toLowerCase().trim() === p) ??
    prestacion.valoresPrevision.find(v => v.tipo.toLowerCase().trim().startsWith(p)) ??
    prestacion.valoresPrevision.find(v => p.startsWith(v.tipo.toLowerCase().trim())) ??
    prestacion.valoresPrevision[0];

  if (!vp) return { monto: 0, fonasa: 0, tipo: prevision };
  const monto = vp.copago > 0 ? vp.copago : vp.valor;
  return { monto, fonasa: vp.valor, tipo: vp.tipo };
}
