/**
 * seed-especialidades.ts
 * Agrega las especialidades solicitadas a Firestore.
 */
import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore, collection, getDocs, addDoc, query, where
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBdedhr4yUsc1F665UXeBWBEj03U-ttO6Y",
  authDomain: "vinamed-10b76.firebaseapp.com",
  projectId: "vinamed-10b76",
  storageBucket: "vinamed-10b76.firebasestorage.app",
  messagingSenderId: "902644783277",
  appId: "1:902644783277:web:ce55f4024a6ce4fd578e24",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);

const ESPECIALIDADES = [
  'Ecografia',
  'Medicina',
  'Radiología',
  'Consulta medica salud mental'
];

async function seed() {
  console.log('Iniciando carga de especialidades...');
  const colRef = collection(db, 'gestion_especialidades');

  for (const nombre of ESPECIALIDADES) {
    const q = query(colRef, where('nombre', '==', nombre));
    const snap = await getDocs(q);
    
    if (snap.empty) {
      await addDoc(colRef, { 
        nombre,
        activo: true,
        creadoEn: new Date().toISOString()
      });
      console.log(`✅ Añadida: ${nombre}`);
    } else {
      console.log(`⚠ Saltada (ya existe): ${nombre}`);
    }
  }

  console.log('Proceso completado.');
  process.exit(0);
}

seed().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
