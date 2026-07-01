import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  query, orderBy, onSnapshot, Timestamp,
} from 'firebase/firestore';
import {
  ref, uploadBytes, getDownloadURL, deleteObject,
} from 'firebase/storage';
import { dbVinamed, storageVinamed } from '../lib/firebase';
import type { GeneradorPdfDoc } from '../types/generarPdf';

const COLECCION = 'generadorPdf';

export async function subirPdfStorage(
  blob: Blob,
  docId: string,
): Promise<{ path: string; url: string }> {
  const path = `generador-pdf/${docId}/resultado.pdf`;
  const storageRef = ref(storageVinamed, path);
  await uploadBytes(storageRef, blob, { contentType: 'application/pdf' });
  const url = await getDownloadURL(storageRef);
  return { path, url };
}

export async function crearRegistroPdf(
  data: Omit<GeneradorPdfDoc, 'id'>,
): Promise<string> {
  const docRef = await addDoc(collection(dbVinamed, COLECCION), data);
  return docRef.id;
}

export async function actualizarRegistroPdf(
  id: string,
  data: Partial<Omit<GeneradorPdfDoc, 'id'>>,
): Promise<void> {
  await updateDoc(doc(dbVinamed, COLECCION, id), data as Record<string, unknown>);
}

export async function eliminarRegistroPdf(
  id: string,
  pdfStoragePath: string,
): Promise<void> {
  if (pdfStoragePath) {
    try {
      await deleteObject(ref(storageVinamed, pdfStoragePath));
    } catch (_) {}
  }
  await deleteDoc(doc(dbVinamed, COLECCION, id));
}

export function escucharPdfsGenerados(
  callback: (docs: GeneradorPdfDoc[]) => void,
): () => void {
  const q = query(
    collection(dbVinamed, COLECCION),
    orderBy('creadoEn', 'desc'),
  );
  return onSnapshot(
    q,
    snap => {
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as GeneradorPdfDoc)));
    },
    err => {
      // Sin permisos o error de red: degradar a lista vacía en vez de
      // dejar que el error propague y rompa el cliente de Firestore.
      console.warn('escucharPdfsGenerados:', err.code ?? err.message);
      callback([]);
    },
  );
}

export function calcularDiasRestantes(expiraEn: Timestamp): number {
  const ms = expiraEn.toMillis() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export function fechaLegible(ts: Timestamp): string {
  return ts.toDate().toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
