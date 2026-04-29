import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { normalizarRut } from '../utils/rut';

import { PRESTACIONES_ECO } from '../constants/prestacionesEco';

export interface DatosInformeEco {
  nombre: string;
  rut: string;
  edad: string;
  sexo: string;
  fecha: string;
  solicitante: string;
  codigo: string;
  tipo: string;
  region: string;
  indicacion: string;
  informante: string;
  hallazgos: string;
  diagnostico: string;
  recomendaciones: string;
}

export const INITIAL_FORM: DatosInformeEco = {
  nombre: '', rut: '', edad: '', sexo: '', fecha: '', solicitante: '',
  codigo: '', tipo: '', region: '', indicacion: '', informante: '',
  hallazgos: '', diagnostico: '', recomendaciones: '',
};

export function mapearTipoAtencionAExamen(tipoAtencion: string): string {
  // Buscar match exacto primero
  const exacto = PRESTACIONES_ECO.find(p => p.label === tipoAtencion);
  if (exacto) return exacto.label;

  // Si no hay match exacto, retornar el valor original
  // (citas antiguas con nomenclatura diferente)
  return tipoAtencion || '';
}

export async function guardarInformeEco(
  citaId: string,
  cita: { pacienteRut: string; pacienteNombre: string },
  form: DatosInformeEco,
  usuarioId: string, // Este es el UID de Firebase
): Promise<string> {
  const resultadoRef = await addDoc(collection(db, 'resultados'), {
    citaId,
    pacienteRut:         normalizarRut(cita.pacienteRut),
    pacienteNombre:      cita.pacienteNombre,
    tipoExamen:          form.tipo,
    regionAnatomica:     form.region || '',
    indicacionClinica:   form.indicacion || '',
    hallazgos:           form.hallazgos,
    impresionEcografica: form.diagnostico,
    recomendaciones:     form.recomendaciones || '',
    medicoSolicitante:   form.solicitante || '',
    medicoInformante:    form.informante,
    codigoExamen:        form.codigo || '',
    profesionalId:       usuarioId, // Vincular explícitamente al profesional
    creadoPor:           usuarioId,
    fecha:               serverTimestamp(),
    visiblePaciente:     true,
  });

  try {
    await updateDoc(doc(db, 'citas', citaId), {
      estado: 'realizada',
      informeId: resultadoRef.id,
      profesionalId: usuarioId, // IMPORTANTE: Para que aparezca en las estadísticas de /profesionales
      actualizadoEn: serverTimestamp(),
    });
  } catch (err) {
    console.warn('No se pudo actualizar la cita (puede que no exista en Firestore):', err);
  }

  return resultadoRef.id;
}

export async function getInformeExistente(
  citaId: string,
): Promise<any | null> {
  const snap = await getDoc(doc(db, 'citas', citaId));
  if (!snap.exists() || !snap.data().informeId) return null;
  const informeSnap = await getDoc(
    doc(db, 'resultados', snap.data().informeId as string)
  );
  return informeSnap.exists()
    ? { id: informeSnap.id, ...informeSnap.data() }
    : null;
}

export function escucharResultadosPaciente(
  rut: string,
  callback: (resultados: any[]) => void,
) {
  const q = query(
    collection(db, 'resultados'),
    where('pacienteRut', '==', normalizarRut(rut)),
    where('visiblePaciente', '==', true),
    orderBy('fecha', 'desc')
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

export function escucharTodosLosResultados(
  callback: (resultados: any[]) => void,
) {
  const q = query(
    collection(db, 'resultados'),
    orderBy('fecha', 'desc')
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

export function buildPreview(form: DatosInformeEco, today: string): string {
  if (!form.nombre) return 'Completar los campos para generar la vista previa...';
  const parts: string[] = ['INFORME ECOGRÁFICO', ''];
  parts.push(
    `Paciente: ${form.nombre}` +
    (form.rut ? ` · RUT: ${form.rut}` : '') +
    (form.edad ? ` · ${form.edad} años` : '') +
    (form.sexo ? ` · ${form.sexo}` : ''),
  );
  parts.push(`Fecha: ${form.fecha || today}`);
  if (form.solicitante) parts.push(`Médico solicitante: ${form.solicitante}`);
  if (form.codigo) parts.push(`Código: ${form.codigo}`);
  parts.push('');
  parts.push(`Examen: ${form.tipo || '—'}${form.region ? ` — ${form.region}` : ''}`);
  if (form.indicacion) parts.push(`Indicación: ${form.indicacion}`);
  if (form.hallazgos) { parts.push(''); parts.push('HALLAZGOS:'); parts.push(form.hallazgos); }
  if (form.diagnostico) { parts.push(''); parts.push('IMPRESIÓN ECOGRÁFICA:'); parts.push(form.diagnostico); }
  if (form.recomendaciones) { parts.push(''); parts.push('RECOMENDACIONES:'); parts.push(form.recomendaciones); }
  return parts.join('\n');
}
