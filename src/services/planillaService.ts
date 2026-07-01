// ─────────────────────────────────────────────────────────────────────────────
// Persistencia de la Planilla Diaria / Caja en Firestore.
//
// Colecciones:
//   planillas/{fecha_INICIALES}      → una jornada (día + profesional)
//   planillas_meta/bonos             → { items: Bono[] }
//
// La API (async) se mantiene igual que la versión anterior en localStorage,
// por lo que el componente no necesita cambios.
// ─────────────────────────────────────────────────────────────────────────────

import { collection, doc, getDoc, getDocs, onSnapshot, query, setDoc, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Planilla, Bono, ArqueoLinea, EstadoPlanilla } from '../types/planilla';
import { arqueoVacio } from '../types/planilla';

const COL_PLANILLAS = 'planillas';
const META_BONOS = { col: 'planillas_meta', id: 'bonos' };

function jornadaId(fecha: string, iniciales: string): string {
  return `${fecha}_${iniciales}`;
}

/** Carga una jornada (día + profesional). Devuelve null si no existe. */
export async function cargarPlanilla(fecha: string, iniciales: string): Promise<Planilla | null> {
  try {
    const snap = await getDoc(doc(db, COL_PLANILLAS, jornadaId(fecha, iniciales)));
    if (!snap.exists()) return null;
    const p = snap.data() as Planilla;
    if (!Array.isArray(p.arqueo) || p.arqueo.length === 0) p.arqueo = arqueoVacio();
    if (!Array.isArray(p.filas)) p.filas = [];
    return p;
  } catch (e) {
    console.error('cargarPlanilla', e);
    return null;
  }
}

/** Guarda (crea o reemplaza) una jornada. */
export async function guardarPlanilla(planilla: Planilla): Promise<void> {
  const data: Planilla = { ...planilla, actualizadoEn: Date.now() };
  await setDoc(doc(db, COL_PLANILLAS, jornadaId(planilla.fecha, planilla.profesionalIniciales)), data);
}

/** Lista las jornadas guardadas (para las pestañas de días). */
export async function listarJornadas(): Promise<Array<{ fecha: string; iniciales: string }>> {
  try {
    const snap = await getDocs(collection(db, COL_PLANILLAS));
    return snap.docs
      .map(d => {
        const x = d.data() as any;
        return { fecha: x.fecha as string, iniciales: x.profesionalIniciales as string };
      })
      .filter(j => j.fecha && j.iniciales)
      .sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
  } catch (e) {
    console.error('listarJornadas', e);
    return [];
  }
}

/**
 * Suscribe (en vivo) a todas las jornadas de una fecha dada (todos los
 * profesionales). Útil para mostrar la agenda del día en el dashboard.
 * Devuelve la función para cancelar la suscripción.
 */
export function suscribirJornadasDeFecha(
  fecha: string,
  cb: (jornadas: Planilla[]) => void,
): () => void {
  const q = query(collection(db, COL_PLANILLAS), where('fecha', '==', fecha));
  return onSnapshot(
    q,
    snap => {
      const jornadas = snap.docs.map(d => {
        const p = d.data() as Planilla;
        if (!Array.isArray(p.filas)) p.filas = [];
        return p;
      });
      cb(jornadas);
    },
    err => { console.error('suscribirJornadasDeFecha', err); cb([]); },
  );
}

/**
 * Actualiza el estado de una fila (paciente) dentro de una jornada.
 * Lee la jornada, modifica solo esa fila y la vuelve a guardar.
 */
export async function actualizarEstadoFila(
  fecha: string,
  iniciales: string,
  filaId: string,
  estado: EstadoPlanilla,
): Promise<void> {
  const ref = doc(db, COL_PLANILLAS, jornadaId(fecha, iniciales));
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const p = snap.data() as Planilla;
  const filas = (p.filas ?? []).map(f => (f.id === filaId ? { ...f, estado } : f));
  await setDoc(ref, { ...p, filas, actualizadoEn: Date.now() });
}

// ── Bonos ────────────────────────────────────────────────────────────────────

export async function cargarBonos(): Promise<Bono[]> {
  try {
    const snap = await getDoc(doc(db, META_BONOS.col, META_BONOS.id));
    if (!snap.exists()) return [];
    const items = (snap.data() as any).items;
    return Array.isArray(items) ? items : [];
  } catch (e) {
    console.error('cargarBonos', e);
    return [];
  }
}

export async function guardarBonos(bonos: Bono[]): Promise<void> {
  await setDoc(doc(db, META_BONOS.col, META_BONOS.id), { items: bonos, actualizadoEn: Date.now() });
}

// ── Cálculos de caja ─────────────────────────────────────────────────────────

export function totalArqueo(arqueo: ArqueoLinea[]): number {
  return arqueo.reduce((s, l) => s + l.denominacion * (l.cantidad || 0), 0);
}
