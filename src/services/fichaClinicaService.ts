import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

/* ─── Modelo de datos de la ficha clínica ───────────────────────────────────
   fichas_clinicas/{rut}                      → datos persistentes del paciente
     · antecedentes (crónicos, cirugías), alergias y alertas (banner de riesgo)
   fichas_clinicas/{rut}/evoluciones/{citaId} → una consulta concreta
     · anamnesis, signos vitales, diagnóstico (CIE-10), indicaciones, motivo
   fichas_clinicas/{rut}/documentos/{docId}   → licencias / recetas / certificados
   ────────────────────────────────────────────────────────────────────────── */

export interface SignosVitales {
  pa?: string;     // presión arterial "120/80"
  fc?: string;     // frecuencia cardíaca
  fr?: string;     // frecuencia respiratoria
  temp?: string;   // temperatura °C
  sat?: string;    // saturación O2 %
  peso?: string;   // kg
  talla?: string;  // cm
}

export interface FichaClinica {
  rut: string;
  nombre?: string;
  antecedentes: string;
  alergias?: string;
  alertas?: string;
  ultimaActualizacion?: Timestamp;
}

export interface Evolucion {
  id: string;            // = citaId
  citaId: string;
  anamnesis: string;
  diagnostico?: string;
  cie10?: string;
  cie10Desc?: string;
  indicaciones?: string;
  signos?: SignosVitales;
  motivo?: string;
  profesionalUid?: string;
  profesionalNombre?: string;
  fecha?: Timestamp;     // fecha de la consulta (de la cita)
  actualizadoEn?: Timestamp;
}

export type TipoDocumentoMedico = 'Licencia Médica' | 'Receta Médica' | 'Certificado Médico';

export interface DocumentoMedico {
  id: string;
  citaId: string;
  tipo: TipoDocumentoMedico;
  contenido: string;
  profesionalUid?: string;
  profesionalNombre?: string;
  emitidoEn?: Timestamp;
}

const slugDoc = (tipo: TipoDocumentoMedico): string =>
  tipo === 'Licencia Médica' ? 'licencia' : tipo === 'Receta Médica' ? 'receta' : 'certificado';

/** Lee los datos persistentes del paciente (antecedentes, alergias, alertas). */
export async function getFichaClinica(rut: string): Promise<FichaClinica | null> {
  const snap = await getDoc(doc(db, 'fichas_clinicas', rut));
  if (!snap.exists()) return null;
  return { rut, ...(snap.data() as Omit<FichaClinica, 'rut'>) };
}

/** Historial de consultas, más reciente primero. */
export async function getEvoluciones(rut: string): Promise<Evolucion[]> {
  const snap = await getDocs(
    query(collection(db, 'fichas_clinicas', rut, 'evoluciones'), orderBy('fecha', 'desc'))
  );
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Evolucion, 'id'>) }));
}

/** Evolución asociada a una cita concreta (la consulta actual, si ya existía). */
export async function getEvolucionPorCita(rut: string, citaId: string): Promise<Evolucion | null> {
  const snap = await getDoc(doc(db, 'fichas_clinicas', rut, 'evoluciones', citaId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Evolucion, 'id'>) };
}

/** Último documento emitido de un tipo (para "reutilizar receta anterior"). */
export async function getUltimoDocumento(
  rut: string,
  tipo: TipoDocumentoMedico
): Promise<DocumentoMedico | null> {
  try {
    const snap = await getDocs(
      query(
        collection(db, 'fichas_clinicas', rut, 'documentos'),
        orderBy('emitidoEn', 'desc'),
        limit(20),
      )
    );
    const docs = snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<DocumentoMedico, 'id'>) }));
    return docs.find(d => d.tipo === tipo) ?? null;
  } catch (e) {
    console.error('getUltimoDocumento', e);
    return null;
  }
}

interface GuardarFichaParams {
  rut: string;
  nombre: string;
  citaId: string;
  antecedentes: string;
  alergias?: string;
  alertas?: string;
  anamnesis: string;
  diagnostico?: string;
  cie10?: string;
  cie10Desc?: string;
  indicaciones?: string;
  signos?: SignosVitales;
  motivo?: string;
  fechaCita?: Timestamp;
  profesionalUid?: string;
  profesionalNombre?: string;
}

/**
 * Guarda la consulta: datos persistentes a nivel paciente (antecedentes,
 * alergias, alertas) y la evolución fechada de esta cita (no pisa anteriores).
 */
export async function guardarFicha(p: GuardarFichaParams): Promise<void> {
  await setDoc(
    doc(db, 'fichas_clinicas', p.rut),
    {
      rut: p.rut,
      nombre: p.nombre,
      antecedentes: p.antecedentes,
      alergias: p.alergias ?? '',
      alertas: p.alertas ?? '',
      ultimaActualizacion: serverTimestamp(),
    },
    { merge: true }
  );

  await setDoc(
    doc(db, 'fichas_clinicas', p.rut, 'evoluciones', p.citaId),
    {
      citaId: p.citaId,
      anamnesis: p.anamnesis,
      diagnostico: p.diagnostico ?? '',
      cie10: p.cie10 ?? '',
      cie10Desc: p.cie10Desc ?? '',
      indicaciones: p.indicaciones ?? '',
      signos: p.signos ?? {},
      motivo: p.motivo ?? '',
      profesionalUid: p.profesionalUid ?? '',
      profesionalNombre: p.profesionalNombre ?? '',
      ...(p.fechaCita ? { fecha: p.fechaCita } : { fecha: serverTimestamp() }),
      actualizadoEn: serverTimestamp(),
    },
    { merge: true }
  );
}

/** Persiste una copia del documento emitido (licencia / receta / certificado).
 *  Id determinista por cita+tipo para que reimprimir actualice en vez de duplicar. */
export async function guardarDocumentoMedico(
  rut: string,
  citaId: string,
  tipo: TipoDocumentoMedico,
  contenido: string,
  profesional?: { uid?: string; nombre?: string }
): Promise<void> {
  await setDoc(
    doc(db, 'fichas_clinicas', rut, 'documentos', `${citaId}_${slugDoc(tipo)}`),
    {
      citaId,
      tipo,
      contenido,
      profesionalUid: profesional?.uid ?? '',
      profesionalNombre: profesional?.nombre ?? '',
      emitidoEn: serverTimestamp(),
    },
    { merge: true }
  );
}
