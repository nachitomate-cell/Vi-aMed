import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';

const config = {
  apiKey:            "AIzaSyBdedhr4yUsc1F665UXeBWBEj03U-ttO6Y",
  authDomain:        "vinamed-10b76.firebaseapp.com",
  projectId:         "vinamed-10b76",
  storageBucket:     "vinamed-10b76.firebasestorage.app",
  messagingSenderId: "902644783277",
  appId:             "1:902644783277:web:ce55f4024a6ce4fd578e24",
};

const app = initializeApp(config);
const db = getFirestore(app);

async function main() {
  // 1. Actualizar valoresPrevision en gestion_prestaciones
  const prestSnap = await getDocs(collection(db, 'gestion_prestaciones'));
  let updated = 0;
  let skipped = 0;

  for (const docSnap of prestSnap.docs) {
    const data = docSnap.data();
    const vp = data.valoresPrevision ?? [];
    const tieneNivel2 = vp.some(v => v.tipo === 'Fonasa Nivel 2');
    const tieneFonasa = vp.some(v => v.tipo === 'Fonasa');

    if (!tieneNivel2) { skipped++; continue; }

    let nuevaVP;
    if (tieneFonasa) {
      // Ya existe "Fonasa" — solo eliminar "Fonasa Nivel 2"
      nuevaVP = vp.filter(v => v.tipo !== 'Fonasa Nivel 2');
    } else {
      // Renombrar "Fonasa Nivel 2" → "Fonasa"
      nuevaVP = vp.map(v => v.tipo === 'Fonasa Nivel 2' ? { ...v, tipo: 'Fonasa' } : v);
    }

    await updateDoc(doc(db, 'gestion_prestaciones', docSnap.id), { valoresPrevision: nuevaVP });
    console.log(`  ✓ ${data.nombre ?? docSnap.id}`);
    updated++;
  }

  console.log(`\ngestion_prestaciones: ${updated} actualizados, ${skipped} sin cambios.`);

  // 2. Eliminar "Fonasa Nivel 2" de gestion_previsiones
  const prevSnap = await getDocs(
    query(collection(db, 'gestion_previsiones'), where('nombre', '==', 'Fonasa Nivel 2'))
  );
  for (const d of prevSnap.docs) {
    await deleteDoc(doc(db, 'gestion_previsiones', d.id));
    console.log(`\ngestion_previsiones: eliminado "${d.data().nombre}" (${d.id})`);
  }
  if (prevSnap.empty) {
    console.log('\ngestion_previsiones: no se encontró "Fonasa Nivel 2".');
  }

  console.log('\nMigración completada.');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
