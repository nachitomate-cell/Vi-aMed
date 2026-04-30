/**
 * seed-metodos-pago.ts
 * Agrega los métodos de pago solicitados a Firestore.
 * Ejecutar: npx tsx seed-metodos-pago.ts
 */
import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore, collection, getDocs, addDoc, query, where, deleteDoc, doc
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

const METODOS = [
  'Efectivo',
  'Débito',
  'Credito',
  'Transferencia',
  'Debito y efectivo',
  'Credito y efectivo',
  'Transferencia y efectivo',
  'Bono web'
];

async function seed() {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║  ViñaMed — Sembrar Métodos de Pago          ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  const colName = 'gestion_metodos_pago';
  const colRef = collection(db, colName);

  // 1. Opcional: Limpiar existentes para evitar duplicados si se prefiere
  // const snap = await getDocs(colRef);
  // for (const d of snap.docs) await deleteDoc(doc(db, colName, d.id));

  for (const nombre of METODOS) {
    const q = query(colRef, where('nombre', '==', nombre));
    const snap = await getDocs(q);
    
    if (snap.empty) {
      await addDoc(colRef, { nombre });
      console.log(`  ✅ Añadido: ${nombre}`);
    } else {
      console.log(`  ⚠  Saltado (ya existe): ${nombre}`);
    }
  }

  console.log('\n✔  Proceso completado.\n');
  process.exit(0);
}

seed().catch(err => {
  console.error('\n❌ Error:', err);
  process.exit(1);
});
