import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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
  console.log('=== gestion_previsiones ===');
  const prevSnap = await getDocs(collection(db, 'gestion_previsiones'));
  prevSnap.docs.forEach(d => console.log(` "${d.data().nombre}" (${d.id})`));

  console.log('\n=== tipos en valoresPrevision (muestra de 5 prestaciones) ===');
  const prestSnap = await getDocs(collection(db, 'gestion_prestaciones'));
  let count = 0;
  for (const d of prestSnap.docs) {
    if (count++ >= 5) break;
    const vp = d.data().valoresPrevision ?? [];
    console.log(` ${d.data().nombre}: [${vp.map(v => `"${v.tipo}"`).join(', ')}]`);
  }

  // Colectar todos los tipos únicos
  const tipos = new Set();
  for (const d of prestSnap.docs) {
    (d.data().valoresPrevision ?? []).forEach(v => tipos.add(v.tipo));
  }
  console.log('\n=== Todos los tipos únicos en valoresPrevision ===');
  [...tipos].sort().forEach(t => console.log(` "${t}"`));

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
