import { initializeApp, getApps } from 'firebase/app';
import { getFirestore }           from 'firebase/firestore';
import { getAuth }                from 'firebase/auth';
import { getStorage }             from 'firebase/storage';

// ── Firebase PROPIO de ViñaMed ──────────────────────────────
const configVinamed = {
  apiKey:            "AIzaSyBdedhr4yUsc1F665UXeBWBEj03U-ttO6Y",
  authDomain:        "vinamed-10b76.firebaseapp.com",
  projectId:         "vinamed-10b76",
  storageBucket:     "vinamed-10b76.firebasestorage.app",
  messagingSenderId: "902644783277",
  appId:             "1:902644783277:web:ce55f4024a6ce4fd578e24",
  measurementId:     "G-HFLJ6HBZSF"
};

// ── Firebase del OTRO centro (solo lectura DICOM) ───────────
// Mantener las credenciales que ya tenías antes — no modificar
const configDicom = {
  apiKey:            "AIzaSyCgoawmXfCPe5tVYOaJTcyUIWo-x65sXwo",
  authDomain:        "medicenter-3cb92.firebaseapp.com",
  projectId:         "medicenter-3cb92",
  storageBucket:     "medicenter-3cb92.firebasestorage.app",
  messagingSenderId: "809252346571",
  appId:             "1:809252346571:web:3252e23d05d8136caed94e"
};

// ── Inicializar evitando duplicados en hot-reload ───────────
const appVinamed = getApps().find(a => a.name === 'vinamed')
  ?? initializeApp(configVinamed, 'vinamed');

const appDicom = getApps().find(a => a.name === 'dicom')
  ?? initializeApp(configDicom, 'dicom');

// ── Exportar servicios ──────────────────────────────────────
export const dbVinamed      = getFirestore(appVinamed); // citas, informes, horarios, profesionales
export const authVinamed    = getAuth(appVinamed);      // login del equipo médico
export const storageVinamed = getStorage(appVinamed);   // imágenes mamografía

export const dbDicom        = getFirestore(appDicom);   // solo lectura DICOM — no escribir aquí
export const storageDicom   = getStorage(appDicom);     // archivos DICOM externos

// ── Alias retrocompatible ───────────────────────────────────
// Todos los archivos existentes importan { db } — este alias
// evita tener que reescribir 10+ archivos de golpe.
// Ir migrando progresivamente a { dbVinamed }.
export const db = dbVinamed;
