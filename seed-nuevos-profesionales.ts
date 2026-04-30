/**
 * seed-nuevos-profesionales.ts
 * Agrega a Álvaro Trullenque y Felipe Ramírez a Firestore.
 * Ejecutar: npx tsx seed-nuevos-profesionales.ts
 */
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';

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

const profesionales = [
  {
    nombre: 'Álvaro Trullenque Sánchez',
    rut: '7.268.691-8',
    telefono: '992395982',
    rol: 'medico',
    especialidad: 'Radiología',
    cargo: 'Médico Radiólogo',
    color: '#7C3AED',
    activo: true,
  },
  {
    nombre: 'Felipe Ignacio Ramírez Blatter',
    rut: '19.983.482-7',
    telefono: '+56964882006',
    rol: 'medico',
    especialidad: 'Medicina',
    cargo: 'Médico General',
    color: '#0F766E',
    activo: true,
  },
];

async function main() {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║  ViñaMed — Seed Nuevos Profesionales         ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  for (const prof of profesionales) {
    const snap = await getDocs(
      query(collection(db, 'profesionales'), where('rut', '==', prof.rut))
    );

    if (!snap.empty) {
      console.log(`  ⚠️  ${prof.nombre} ya existe — saltando.`);
      continue;
    }

    await addDoc(collection(db, 'profesionales'), {
      ...prof,
      creadoEn: serverTimestamp(),
      actualizadoEn: serverTimestamp(),
    });
    console.log(`  ✅  Creado: ${prof.nombre} (${prof.especialidad})`);
  }

  console.log('\n✔  Completado.\n');
  process.exit(0);
}

main().catch(err => {
  console.error('\n❌ Error:', err);
  process.exit(1);
});
