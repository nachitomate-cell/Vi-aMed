import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  Timestamp,
  serverTimestamp,
  writeBatch,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Horario, Bloqueo } from '../types/horarios';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dayStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}
function dayEnd(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

// ─── HORARIOS ─────────────────────────────────────────────────────────────────

/** Obtiene el horario de un profesional (null si no existe) */
export async function getHorario(profesionalId: string): Promise<Horario | null> {
  const snap = await getDocs(
    query(collection(db, 'horarios'), where('profesionalId', '==', profesionalId))
  );
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as Horario;
}

/** Crea o actualiza el horario de un profesional */
export async function guardarHorario(
  horario: Omit<Horario, 'id' | 'actualizadoEn'>
): Promise<string> {
  const snap = await getDocs(
    query(collection(db, 'horarios'), where('profesionalId', '==', horario.profesionalId))
  );
  if (!snap.empty) {
    const ref = snap.docs[0].ref;
    await updateDoc(ref, { ...horario, actualizadoEn: serverTimestamp() });
    return ref.id;
  }
  const ref = await addDoc(collection(db, 'horarios'), {
    ...horario,
    actualizadoEn: serverTimestamp(),
  });
  return ref.id;
}

/** Suscripción en tiempo real al horario de un profesional */
export function subscribeHorario(
  profesionalId: string,
  callback: (h: Horario | null) => void
): Unsubscribe {
  const q = query(collection(db, 'horarios'), where('profesionalId', '==', profesionalId));
  return onSnapshot(q, snap => {
    if (snap.empty) { callback(null); return; }
    const d = snap.docs[0];
    callback({ id: d.id, ...d.data() } as Horario);
  });
}

/** Obtiene los horarios de todos los profesionales de una lista de IDs */
export async function getHorariosMultiples(profesionalIds: string[]): Promise<Map<string, Horario>> {
  const map = new Map<string, Horario>();
  if (profesionalIds.length === 0) return map;
  const snap = await getDocs(
    query(collection(db, 'horarios'), where('profesionalId', 'in', profesionalIds))
  );
  snap.docs.forEach(d => {
    const h = { id: d.id, ...d.data() } as Horario;
    map.set(h.profesionalId, h);
  });
  return map;
}

// ─── BLOQUEOS ─────────────────────────────────────────────────────────────────

/** Obtiene los bloqueos de un profesional para un día concreto (incluye recurrentes) */
export async function getBloqueosDia(
  profesionalId: string,
  fecha: Date
): Promise<Bloqueo[]> {
  const inicio = Timestamp.fromDate(dayStart(fecha));
  const fin = Timestamp.fromDate(dayEnd(fecha));
  const diaSemana = fecha.getDay();
  const fechaTs = Timestamp.fromDate(dayStart(fecha)).toMillis();

  // Bloqueos del día exacto
  const snapExacto = await getDocs(
    query(
      collection(db, 'bloqueos'),
      where('profesionalId', '==', profesionalId),
      where('fecha', '>=', inicio),
      where('fecha', '<=', fin)
    )
  );

  // Bloqueos recurrentes vigentes
  const snapRecurrente = await getDocs(
    query(
      collection(db, 'bloqueos'),
      where('profesionalId', '==', profesionalId),
      where('recurrente', '==', true)
    )
  );

  const bloqueos: Bloqueo[] = [];

  snapExacto.docs.forEach(d => {
    bloqueos.push({ id: d.id, ...d.data() } as Bloqueo);
  });

  snapRecurrente.docs.forEach(d => {
    const b = { id: d.id, ...d.data() } as Bloqueo;
    // Saltar si ya se incluyó (era exacto)
    if (bloqueos.some(x => x.id === b.id)) return;
    // Verificar que el día de la semana aplique
    if (!b.diasRecurrencia.includes(diaSemana)) return;
    // Verificar que la fecha no sea anterior al inicio del bloqueo
    if (b.fecha.toMillis() > Timestamp.fromDate(dayStart(fecha)).toMillis()) return;
    // Verificar que no haya expirado
    if (b.fechaFinRecurrencia && b.fechaFinRecurrencia.toMillis() < fechaTs) return;
    // Verificar que no esté en fechasExcluidas
    if (b.fechasExcluidas?.includes(fechaTs)) return;
    bloqueos.push(b);
  });

  return bloqueos;
}

/** Suscripción en tiempo real a bloqueos de un profesional para un día */
export function subscribeBloqueosDia(
  profesionalIds: string[],
  fecha: Date,
  callback: (bloqueos: Bloqueo[]) => void
): Unsubscribe {
  if (profesionalIds.length === 0) { callback([]); return () => {}; }
  const inicio = Timestamp.fromDate(dayStart(fecha));
  const fin = Timestamp.fromDate(dayEnd(fecha));

  // Escucha bloqueos del día y bloqueos recurrentes por separado
  const unsubs: Unsubscribe[] = [];
  let exactos: Bloqueo[] = [];
  let recurrentes: Bloqueo[] = [];

  const merge = () => {
    const diaSemana = fecha.getDay();
    const fechaTs = Timestamp.fromDate(dayStart(fecha)).toMillis();

    const vigentes = recurrentes.filter(b => {
      if (!b.diasRecurrencia.includes(diaSemana)) return false;
      if (b.fecha.toMillis() > fechaTs) return false;
      if (b.fechaFinRecurrencia && b.fechaFinRecurrencia.toMillis() < fechaTs) return false;
      if (b.fechasExcluidas?.includes(fechaTs)) return false;
      return true;
    });

    const ids = new Set(exactos.map(b => b.id));
    callback([...exactos, ...vigentes.filter(b => !ids.has(b.id))]);
  };

  // Bloqueos del día para los IDs dados
  const q1 = query(
    collection(db, 'bloqueos'),
    where('profesionalId', 'in', profesionalIds),
    where('fecha', '>=', inicio),
    where('fecha', '<=', fin)
  );
  unsubs.push(onSnapshot(q1, snap => {
    exactos = snap.docs.map(d => ({ id: d.id, ...d.data() } as Bloqueo));
    merge();
  }));

  // Bloqueos recurrentes
  const q2 = query(
    collection(db, 'bloqueos'),
    where('profesionalId', 'in', profesionalIds),
    where('recurrente', '==', true)
  );
  unsubs.push(onSnapshot(q2, snap => {
    recurrentes = snap.docs.map(d => ({ id: d.id, ...d.data() } as Bloqueo));
    merge();
  }));

  return () => unsubs.forEach(u => u());
}

/** Crea un bloqueo para un profesional */
export async function crearBloqueo(
  datos: Omit<Bloqueo, 'id' | 'creadoEn'>
): Promise<string> {
  const ref = await addDoc(collection(db, 'bloqueos'), {
    ...datos,
    creadoEn: serverTimestamp(),
  });
  return ref.id;
}

/** Crea bloqueos para ambos profesionales en batch atómico */
export async function crearBloqueoAmbos(
  profesionalIds: string[],
  datosBase: Omit<Bloqueo, 'id' | 'creadoEn' | 'profesionalId'>
): Promise<void> {
  const batch = writeBatch(db);
  profesionalIds.forEach(pid => {
    const ref = doc(collection(db, 'bloqueos'));
    batch.set(ref, {
      ...datosBase,
      profesionalId: pid,
      creadoEn: serverTimestamp(),
    });
  });
  await batch.commit();
}

/** Elimina un bloqueo completamente */
export async function eliminarBloqueo(bloqueoId: string): Promise<void> {
  await deleteDoc(doc(db, 'bloqueos', bloqueoId));
}

/**
 * Excluye un día de la recurrencia de un bloqueo (eliminar solo este día).
 * Agrega el timestamp del día a fechasExcluidas.
 */
export async function excluirDiaBloqueo(bloqueoId: string, fecha: Date): Promise<void> {
  const fechaTs = Timestamp.fromDate(dayStart(fecha)).toMillis();
  const ref = doc(db, 'bloqueos', bloqueoId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data() as Bloqueo;
  const excluidas = [...(data.fechasExcluidas ?? [])];
  if (!excluidas.includes(fechaTs)) excluidas.push(fechaTs);
  await updateDoc(ref, { fechasExcluidas: excluidas });
}

/**
 * Trunca la recurrencia hasta el día anterior (eliminar este y todos los siguientes).
 */
export async function truncarRecurrencia(bloqueoId: string, fecha: Date): Promise<void> {
  const ayer = new Date(fecha.getTime() - 86400000);
  await updateDoc(doc(db, 'bloqueos', bloqueoId), {
    fechaFinRecurrencia: Timestamp.fromDate(dayEnd(ayer)),
  });
}

/** Obtiene todos los bloqueos futuros de un profesional (para el panel de config) */
export async function getBloqueosFuturos(profesionalId: string): Promise<Bloqueo[]> {
  const ahora = Timestamp.fromDate(new Date());
  const snap = await getDocs(
    query(
      collection(db, 'bloqueos'),
      where('profesionalId', '==', profesionalId),
      where('fecha', '>=', ahora)
    )
  );
  const recSnap = await getDocs(
    query(
      collection(db, 'bloqueos'),
      where('profesionalId', '==', profesionalId),
      where('recurrente', '==', true)
    )
  );

  const ids = new Set<string>();
  const bloqueos: Bloqueo[] = [];

  snap.docs.forEach(d => {
    ids.add(d.id);
    bloqueos.push({ id: d.id, ...d.data() } as Bloqueo);
  });

  recSnap.docs.forEach(d => {
    if (!ids.has(d.id)) {
      const b = { id: d.id, ...d.data() } as Bloqueo;
      if (!b.fechaFinRecurrencia || b.fechaFinRecurrencia.toMillis() >= ahora.toMillis()) {
        bloqueos.push(b);
      }
    }
  });

  return bloqueos;
}
