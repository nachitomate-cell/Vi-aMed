import {
  collection, addDoc, updateDoc, doc,
  query, where, orderBy, onSnapshot,
  serverTimestamp, Timestamp
} from 'firebase/firestore';
import {
  ref, uploadBytesResumable, getDownloadURL
} from 'firebase/storage';
import { dbVinamed, storageVinamed } from '../lib/firebase';
import { normalizarRut }             from '../utils/rut';

export async function subirMamografia(
  archivo: File, 
  datos: { 
    pacienteRut: string; 
    pacienteNombre: string; 
    descripcion?: string; 
    lado?: string; 
    medicoSolicitante?: string; 
    usuarioId: string; 
  }, 
  onProgreso?: (porcentaje: number) => void
) {
  // 1. Validar archivo
  if (!archivo.name.match(/\.(dcm|dicom)$/i)) {
    throw new Error('Solo se aceptan archivos .dcm o .dicom');
  }
  if (archivo.size > 200 * 1024 * 1024) {
    throw new Error('El archivo supera el límite de 200MB');
  }

  // 2. Registrar en Firestore con estado 'subiendo'
  const docRef = await addDoc(collection(dbVinamed, 'imagenes'), {
    pacienteRut:       normalizarRut(datos.pacienteRut),
    pacienteNombre:    datos.pacienteNombre,
    tipo:              'mamografia',
    modalidad:         'MG',
    descripcion:       datos.descripcion       || 'Mamografía digital',
    lado:              datos.lado              || 'bilateral',
    medicoSolicitante: datos.medicoSolicitante || '',
    tamanoBytes:       archivo.size,
    estado:            'subiendo',
    visiblePaciente:   false,
    subidoPor:         datos.usuarioId,
    subidoEn:          serverTimestamp(),
  });

  // 3. Subir a Firebase Storage
  const storagePath = `imagenes/${docRef.id}/${archivo.name}`;
  const storageRef  = ref(storageVinamed, storagePath);
  const uploadTask  = uploadBytesResumable(storageRef, archivo);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      snap => {
        if (onProgreso) {
          onProgreso(Math.round((snap.bytesTransferred / snap.totalBytes) * 100));
        }
      },
      async err => {
        await updateDoc(doc(dbVinamed, 'imagenes', docRef.id), {
          estado: 'error',
        });
        reject(err);
      },
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        await updateDoc(doc(dbVinamed, 'imagenes', docRef.id), {
          storageRef: storagePath,
          storageUrl: url,
          estado:     'disponible',
        });
        resolve({ id: docRef.id, url });
      }
    );
  });
}

export function escucharMamografiasHoy(callback: (lista: any[]) => void) {
  const inicio = new Date();
  inicio.setHours(0, 0, 0, 0);

  const q = query(
    collection(dbVinamed, 'imagenes'),
    where('tipo',     '==', 'mamografia'),
    where('subidoEn', '>=', Timestamp.fromDate(inicio)),
    orderBy('subidoEn', 'desc')
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

export function escucharMamografiasPaciente(rut: string, callback: (lista: any[]) => void) {
  const q = query(
    collection(dbVinamed, 'imagenes'),
    where('pacienteRut',     '==', normalizarRut(rut)),
    where('tipo',            '==', 'mamografia'),
    where('estado',          '==', 'disponible'),
    where('visiblePaciente', '==', true),
    orderBy('subidoEn', 'desc')
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

export async function autorizarVisibilidad(imagenId: string, usuarioId: string) {
  await updateDoc(doc(dbVinamed, 'imagenes', imagenId), {
    visiblePaciente: true,
    autorizadoPor:   usuarioId,
    autorizadoEn:    serverTimestamp(),
  });
}
