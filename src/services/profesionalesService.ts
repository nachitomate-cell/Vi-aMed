import {
  collection, doc, addDoc, updateDoc, getDoc, getDocs,
  query, where, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../lib/firebase';
import type { Profesional, Cita } from '../types/agenda';

export async function getProfesionales(): Promise<Profesional[]> {
  const snap = await getDocs(
    query(collection(db, 'profesionales'), orderBy('nombre', 'asc'))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Profesional));
}

export async function getProfesional(id: string): Promise<Profesional | null> {
  const snap = await getDoc(doc(db, 'profesionales', id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Profesional;
}

export async function getProfesionalByRut(rut: string): Promise<Profesional | null> {
  const q = query(collection(db, 'profesionales'), where('rut', '==', rut));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as Profesional;
}

export async function crearProfesional(
  datos: Omit<Profesional, 'id'>
): Promise<string> {
  const functions = getFunctions();
  const fn = httpsCallable(functions, 'crearProfesional');
  const result = await fn(datos) as { data: { uid: string } };
  return result.data.uid;
}

export async function actualizarProfesional(
  id: string,
  datos: Partial<Omit<Profesional, 'id'>>
): Promise<void> {
  await updateDoc(doc(db, 'profesionales', id), {
    ...datos,
    actualizadoEn: serverTimestamp(),
  });
}

export async function toggleActivoProfesional(id: string, activo: boolean): Promise<void> {
  await updateDoc(doc(db, 'profesionales', id), {
    activo,
    actualizadoEn: serverTimestamp(),
  });
}

export function exportarCitasCSV(citas: Cita[], nombreArchivo = 'citas.csv'): void {
  const headers = ['fecha', 'hora', 'paciente', 'rut', 'tipo_atencion', 'box', 'estado', 'notas'];
  const rows = citas.map(c => {
    const d = c.fecha.toDate();
    const fecha = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const hora = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    return [fecha, hora, c.pacienteNombre, c.pacienteRut, c.tipoAtencion, c.box, c.estado, c.notas ?? '']
      .map(v => `"${String(v).replace(/"/g, '""')}"`)
      .join(',');
  });
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
