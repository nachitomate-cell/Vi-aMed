/**
 * fix-profesionales.ts
 * Asegura que los profesionales Álvaro y Felipe tengan el RUT normalizado y email asociado.
 */
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, updateDoc, doc, addDoc, serverTimestamp } from 'firebase/firestore';

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

// Normalizador local para no depender de imports complejos en el script
function normalizar(rut: string): string {
  const limpio = rut.replace(/[^0-9kK]/g, '').toUpperCase();
  if (limpio.length < 2) return limpio;
  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  const cuerpoFormateado = cuerpo.split('').reverse().reduce((acc, d, i) => (i % 3 === 0 && i !== 0) ? d + '.' + acc : d + acc, '');
  return `${cuerpoFormateado}-${dv}`;
}

const profesionales = [
  {
    nombre: 'Álvaro Trullenque Sánchez',
    rut: '7.268.691-8',
    email: 'alvaro.trullenque@vinamed.cl',
    especialidad: 'Radiología',
    rol: 'medico',
    color: '#7C3AED'
  },
  {
    nombre: 'Felipe Ignacio Ramírez Blatter',
    rut: '19.983.482-7',
    email: 'felipe.ramirez@vinamed.cl',
    especialidad: 'Medicina',
    rol: 'medico',
    color: '#0F766E'
  }
];

async function run() {
  console.log('Iniciando corrección de profesionales...');
  const colRef = collection(db, 'profesionales');

  for (const p of profesionales) {
    const rutNorm = normalizar(p.rut);
    const q = query(colRef, where('rut', '==', rutNorm));
    const snap = await getDocs(q);

    if (snap.empty) {
      console.log(`Creando profesional: ${p.nombre}`);
      await addDoc(colRef, {
        ...p,
        rut: rutNorm,
        activo: true,
        creadoEn: serverTimestamp(),
        actualizadoEn: serverTimestamp()
      });
    } else {
      console.log(`Actualizando profesional: ${p.nombre}`);
      const d = snap.docs[0];
      await updateDoc(doc(db, 'profesionales', d.id), {
        email: p.email,
        rut: rutNorm,
        actualizadoEn: serverTimestamp()
      });
    }
  }
  console.log('Proceso terminado.');
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
