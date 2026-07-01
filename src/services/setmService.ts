import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

// Crea órdenes de examen en la Sala de Toma de Muestras. Cada examen genera una
// orden (estado "pendiente") que aparece automáticamente en /setm vía onSnapshot.

export interface NuevaOrdenLab {
  pacienteNombre: string;
  pacienteRut: string;
  pacienteEdad?: string;
  tipoExamen: string;
  solicitante?: string;
  laboratorio?: string;
  observaciones?: string;
}

export async function crearOrdenLaboratorio(o: NuevaOrdenLab): Promise<void> {
  await addDoc(collection(db, 'setm_ordenes'), {
    pacienteNombre: o.pacienteNombre,
    pacienteRut: o.pacienteRut,
    pacienteEdad: o.pacienteEdad ?? '',
    tipoExamen: o.tipoExamen,
    solicitante: o.solicitante ?? '',
    laboratorio: o.laboratorio ?? '',
    observaciones: o.observaciones ?? '',
    estado: 'pendiente',
    creadoEn: serverTimestamp(),
  });
}

/** Crea varias órdenes (una por examen) en una sola llamada. */
export async function crearOrdenesLaboratorio(
  base: Omit<NuevaOrdenLab, 'tipoExamen'>,
  examenes: string[],
): Promise<number> {
  const limpios = examenes.map(e => e.trim()).filter(Boolean);
  await Promise.all(limpios.map(tipoExamen => crearOrdenLaboratorio({ ...base, tipoExamen })));
  return limpios.length;
}

// Exámenes de laboratorio frecuentes en medicina general.
export const EXAMENES_FRECUENTES: string[] = [
  'Hemograma',
  'Glicemia en ayunas',
  'Hemoglobina glicosilada (HbA1c)',
  'Perfil lipídico',
  'Perfil bioquímico',
  'Perfil hepático',
  'Creatinina / BUN',
  'Electrolitos plasmáticos',
  'TSH',
  'Orina completa',
  'Urocultivo',
  'VHS / PCR',
];
