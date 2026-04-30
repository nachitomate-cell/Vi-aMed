/**
 * clear-prestaciones-eco.ts
 * Elimina todas las prestaciones con especialidad "Ecografía" de Firestore.
 * Ejecutar: npx tsx clear-prestaciones-eco.ts
 */
import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore, collection, getDocs, query, where, deleteDoc, doc
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

// IDs hardcoded de las prestaciones de eco que se seedearon antes
const ECO_IDS = [
  'eco-doppler-color','eco-doppler-renal','eco-doppler-arterial','eco-doppler-venoso',
  'eco-doppler-testicular','eco-vascular-periferico','eco-vasos-cuello',
  'eco-tiroidea-cuello','eco-region-facial','eco-region-cervical',
  'eco-dedos-manos','eco-munecas-codos','eco-hombros','eco-region-axilar',
  'eco-pies-tobillos','eco-rodillas','eco-caderas','eco-unas',
  'eco-piel','eco-abdominal','eco-renal','eco-pelviana','eco-inguinal',
  'eco-pediatrica','eco-mamaria','eco-testicular',
];

async function clearCollection(colName: string) {
  let count = 0;
  // 1. Borrar por id conocido
  for (const id of ECO_IDS) {
    try {
      await deleteDoc(doc(db, colName, id));
      count++;
    } catch {}
  }

  // 2. Borrar por campo especialidad = Ecografía
  const byEsp = await getDocs(query(collection(db, colName), where('especialidad', '==', 'Ecografía')));
  for (const d of byEsp.docs) {
    await deleteDoc(doc(db, colName, d.id));
    count++;
  }

  // 3. Borrar por campo grupo que empiece con 'eco'
  const all = await getDocs(collection(db, colName));
  for (const d of all.docs) {
    const data = d.data();
    if (
      (data.id && String(data.id).startsWith('eco-')) ||
      (data.codigo && String(data.codigo).startsWith('eco-')) ||
      (data.nombre && String(data.nombre).toLowerCase().includes('ecograf'))
    ) {
      await deleteDoc(doc(db, colName, d.id));
      count++;
    }
  }

  return count;
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║  ViñaMed — Limpiar Prestaciones Ecografía   ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  const collections = ['gestion_prestaciones', 'tiposAtencion'];
  for (const col of collections) {
    console.log(`  🗑️  Limpiando ${col}...`);
    const n = await clearCollection(col);
    console.log(`     → ${n} documentos eliminados.`);
  }

  console.log('\n✔  Completado.\n');
  process.exit(0);
}

main().catch(err => {
  console.error('\n❌ Error:', err);
  process.exit(1);
});
